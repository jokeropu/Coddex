import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router';
import { Check, Coins, ShieldCheck } from 'lucide-react';
import axiosClient from '../utils/axiosClient';
import { checkAuth } from '../authSlice';
import AppShell from '../design/AppShell';
import { cn } from '../design/cn';
import {
  Module, ModuleHead, PageHeader, PageBody, Button, Note, Stamp,
} from '../design/primitives';
import { Dialog, DialogContent } from '../design/overlays';

const PREMIUM_INCLUDES = [
  'Video walkthroughs on every problem',
  'Hints and reference solutions, unlocked',
  'No per-problem credit spend',
  'Cancel any time',
];

const CREDIT_ROUTE = [
  'Solve the Daily Challenge inside its window',
  'Hold a 7-, 30-, or 365-day streak',
  'Place in the top 20 of a contest you entered',
];

function Premium() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await axiosClient.get('/payment/status');
        setStatus(data);
      } catch (err) {
        console.error(err);
      }
    };
    const fetchPlan = async () => {
      try {
        const { data } = await axiosClient.get('/payment/plan');
        setPlan(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStatus();
    fetchPlan();
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosClient.post('/payment/subscribe');
      const { subscriptionId, keyId } = data;

      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: 'Coddex Premium',
        description: 'Monthly Premium Subscription',
        theme: { color: '#3ecfff' },
        handler: async (response) => {
          try {
            await axiosClient.post('/payment/verify', response);
            await dispatch(checkAuth());
            navigate('/');
          } catch (err) {
            setError('Payment verification failed. Please contact support if money was deducted.');
          } finally {
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start the subscription. Please try again.');
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setConfirmCancel(false);
    try {
      await axiosClient.post('/payment/cancel');
      await dispatch(checkAuth());
      setStatus((prev) => ({ ...prev, isPremium: false, subscriptionStatus: 'cancelled' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not cancel the subscription.');
    }
  };

  const isActive = status?.isPremium && status?.subscriptionStatus === 'active';

  const periodUnit = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[plan?.period] || plan?.period;
  const periodLabel = plan && (plan.interval === 1 ? `/${periodUnit}` : `/${plan.interval} ${periodUnit}s`);
  const formattedAmount =
    plan &&
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: plan.currency,
      maximumFractionDigits: plan.amount % 1 === 0 ? 0 : 2,
    }).format(plan.amount);

  return (
    <AppShell>
      <PageBody width="max-w-4xl">
        <PageHeader
          title="Premium"
          detail="Two honest routes unlock the same content. Pay for it, or earn it — neither is the lesser path."
        />

        {error && <Note tone="redline" className="mb-4">{error}</Note>}

        <div className="grid gap-4 md:grid-cols-2">
          <Module ticks className="flex flex-col">
            <ModuleHead
              label="Premium"
              right={isActive ? <span className="t-micro text-approved">Active</span> : null}
            />
            <div className="flex flex-1 flex-col p-4">
              {isActive ? (
                <div className="mb-4 self-start">
                  <Stamp verdict="approved" label="Active" sub="Subscription running" />
                </div>
              ) : (
                <div className="mb-4 flex items-baseline gap-1.5">
                  {plan ? (
                    <>
                      <span className="font-mono text-3xl font-semibold tabular-nums leading-none text-ink">
                        {formattedAmount}
                      </span>
                      <span className="t-data-lg text-ink-3">{periodLabel}</span>
                    </>
                  ) : (
                    <span className="plotting h-6 w-28 bg-rule-faint" aria-label="Loading price" />
                  )}
                </div>
              )}

              <ul className="mb-5 flex flex-col gap-1.5">
                {PREMIUM_INCLUDES.map((f) => (
                  <li key={f} className="t-body flex items-start gap-2 text-ink-2">
                    <Check className="mt-[3px] h-3 w-3 shrink-0 text-approved" strokeWidth={3} aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {isActive ? (
                  <Button tone="danger" size="md" className="w-full" onClick={() => setConfirmCancel(true)}>
                    Cancel subscription
                  </Button>
                ) : (
                  <Button
                    tone="line"
                    size="lg"
                    className="w-full"
                    loading={loading}
                    disabled={!plan}
                    onClick={handleSubscribe}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
                    Subscribe
                  </Button>
                )}
              </div>
            </div>
          </Module>

          <Module ticks className="flex flex-col">
            <ModuleHead
              label="Credits"
              right={
                <span className="t-data text-ink-3">{(user?.credits ?? 0).toLocaleString()} held</span>
              }
            />
            <div className="flex flex-1 flex-col p-4">
              <div className="mb-4 flex items-baseline gap-2">
                <Coins className="h-5 w-5 shrink-0 self-center text-caution" strokeWidth={1.5} aria-hidden />
                <span className="t-h2 text-ink">Earn it instead</span>
              </div>

              <p className="t-body mb-4 text-ink-2">
                Credits unlock the same hints, solutions and videos, one problem at a time. They can’t
                be bought at any price — only minted by turning up.
              </p>

              <ul className="mb-5 flex flex-col gap-1.5">
                {CREDIT_ROUTE.map((f) => (
                  <li key={f} className="t-body flex items-start gap-2 text-ink-2">
                    <span className="mt-[7px] h-[3px] w-[3px] shrink-0 bg-caution" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Button size="md" className="w-full" asChild>
                  <Link to="/daily-challenge">Go to today’s challenge</Link>
                </Button>
              </div>
            </div>
          </Module>
        </div>
      </PageBody>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent
          title="Cancel Premium?"
          description="Your subscription will not renew."
          width="max-w-md"
          footer={
            <>
              <Button size="sm" tone="quiet" onClick={() => setConfirmCancel(false)}>Keep Premium</Button>
              <Button size="sm" tone="redline" onClick={handleCancel}>Cancel subscription</Button>
            </>
          }
        >
          <p className="t-body text-ink-2">
            You’ll keep access until the current period ends. After that, videos, hints and
            reference solutions go back to being unlocked per problem with credits.
          </p>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default Premium;
