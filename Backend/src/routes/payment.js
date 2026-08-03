const express = require('express');
const paymentRouter = express.Router();
const userMiddleware = require('../middleware/userMiddleware');
const { createSubscription, verifySubscription, cancelSubscription, getSubscriptionStatus, getPlanDetails, razorpayWebhook } = require('../controllers/razorPay');

paymentRouter.post('/subscribe', userMiddleware, createSubscription);
paymentRouter.post('/verify', userMiddleware, verifySubscription);
paymentRouter.post('/cancel', userMiddleware, cancelSubscription);
paymentRouter.get('/status', userMiddleware, getSubscriptionStatus);
paymentRouter.get('/plan', getPlanDetails);
paymentRouter.post('/webhook', razorpayWebhook);

module.exports = paymentRouter;
