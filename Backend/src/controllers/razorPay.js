const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay');
const User = require('../models/user');
const notify = require('../utils/notify');

const createSubscription = async (req, res) => {
    try {
        const user = req.result;

        if (user.isPremium && user.subscriptionStatus === 'active') {
            return res.status(400).json({ error: 'You already have an active premium subscription' });
        }

        const nonTerminalStatuses = ['created', 'authenticated', 'paused', 'halted'];
        if (user.razorpaySubscriptionId && nonTerminalStatuses.includes(user.subscriptionStatus)) {
            try {
                await razorpayInstance.subscriptions.cancel(user.razorpaySubscriptionId);
            } catch (err) {

            }
        }

        if (!user.razorpayCustomerId) {
            const customer = await razorpayInstance.customers.create({
                name: `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`,
                email: user.emailId
            });
            user.razorpayCustomerId = customer.id;
        }

        const subscription = await razorpayInstance.subscriptions.create({
            plan_id: process.env.RAZORPAY_PLAN_ID,
            customer_notify: 1,
            total_count: 120,
            notes: {
                userId: user._id.toString()
            }
        });

        user.razorpaySubscriptionId = subscription.id;
        user.subscriptionStatus = 'created';
        await user.save();

        res.status(200).json({
            subscriptionId: subscription.id,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create subscription: ' + err.message });
    }
};

const verifySubscription = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

        if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment verification details' });
        }

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        const user = req.result;
        if (user.razorpaySubscriptionId !== razorpay_subscription_id) {
            return res.status(403).json({ error: 'Subscription does not belong to this user' });
        }

        user.isPremium = true;
        user.subscriptionStatus = 'active';
        await user.save();

        await notify(user._id, 'premium_purchased', 'Welcome to Coddex Premium!', 'Your premium subscription is now active. Enjoy video solutions, hints, and reference solutions for every problem.', '/premium');

        res.status(200).json({ message: 'Subscription activated successfully', isPremium: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Verification failed: ' + err.message });
    }
};

const cancelSubscription = async (req, res) => {
    try {
        const user = req.result;

        if (!user.razorpaySubscriptionId) {
            return res.status(400).json({ error: 'No active subscription found' });
        }

        await razorpayInstance.subscriptions.cancel(user.razorpaySubscriptionId);

        user.subscriptionStatus = 'cancelled';
        user.isPremium = false;
        await user.save();

        await notify(user._id, 'premium_cancelled', 'Premium subscription cancelled', 'Your Coddex Premium subscription has been cancelled. You can resubscribe anytime to regain access to premium content.', '/premium');

        res.status(200).json({ message: 'Subscription cancelled successfully' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to cancel subscription: ' + err.message });
    }
};

const getPlanDetails = async (req, res) => {
    try {
        const plan = await razorpayInstance.plans.fetch(process.env.RAZORPAY_PLAN_ID);

        res.status(200).json({
            amount: plan.item.amount / 100,
            currency: plan.item.currency,
            period: plan.period,
            interval: plan.interval
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch plan details: ' + err.message });
    }
};

const getSubscriptionStatus = async (req, res) => {
    try {
        const user = req.result;
        res.status(200).json({
            isPremium: user.isPremium,
            subscriptionStatus: user.subscriptionStatus
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch subscription status: ' + err.message });
    }
};

const razorpayWebhook = async (req, res) => {
    try {
        const webhookSignature = req.headers['x-razorpay-signature'];

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(req.rawBody)
            .digest('hex');

        const signatureValid = webhookSignature
            && webhookSignature.length === expectedSignature.length
            && crypto.timingSafeEqual(Buffer.from(webhookSignature), Buffer.from(expectedSignature));

        if (!signatureValid) {
            return res.status(400).send('Invalid webhook signature');
        }

        const { event, payload } = req.body;
        const subscriptionEntity = payload?.subscription?.entity;

        if (!subscriptionEntity) {
            return res.status(200).send('Ignored');
        }

        const user = await User.findOne({ razorpaySubscriptionId: subscriptionEntity.id });
        if (!user) {
            return res.status(200).send('Ignored');
        }

        const wasPremium = user.isPremium;

        switch (event) {
            case 'subscription.authenticated':
                user.subscriptionStatus = 'authenticated';
                break;
            case 'subscription.activated':
            case 'subscription.charged':
                user.isPremium = true;
                user.subscriptionStatus = 'active';
                if (!wasPremium) {
                    await notify(user._id, 'premium_purchased', 'Welcome to Coddex Premium!', 'Your premium subscription is now active. Enjoy video solutions, hints, and reference solutions for every problem.', '/premium');
                }
                break;
            case 'subscription.pending':
            case 'subscription.halted':
                user.isPremium = false;
                user.subscriptionStatus = 'halted';
                await notify(user._id, 'premium_expiring', 'Your Premium subscription is at risk', 'A recent payment for your Coddex Premium subscription failed. Please update your payment method to avoid losing access.', '/premium');
                break;
            case 'subscription.paused':
                user.isPremium = false;
                user.subscriptionStatus = 'paused';
                break;
            case 'subscription.cancelled':
                user.isPremium = false;
                user.subscriptionStatus = 'cancelled';
                await notify(user._id, 'premium_cancelled', 'Premium subscription cancelled', 'Your Coddex Premium subscription has been cancelled.', '/premium');
                break;
            case 'subscription.completed':
                user.isPremium = false;
                user.subscriptionStatus = 'completed';
                await notify(user._id, 'premium_expiring', 'Premium subscription ended', 'Your Coddex Premium subscription has completed its billing cycles and is no longer active.', '/premium');
                break;
            default:
                break;
        }

        await user.save();
        res.status(200).send('OK');
    }
    catch (err) {
        res.status(500).send('Webhook processing failed: ' + err.message);
    }
};

module.exports = { createSubscription, verifySubscription, cancelSubscription, getSubscriptionStatus, getPlanDetails, razorpayWebhook };
