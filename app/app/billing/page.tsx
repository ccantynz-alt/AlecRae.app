'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type PlanId = 'free' | 'personal' | 'pro' | 'enterprise';

interface BillingStatus {
  plan: PlanId;
  subscriptionStatus: 'active' | 'past_due' | 'cancelled' | 'none';
  stripeConfigured: boolean;
  databaseConfigured: boolean;
}

const PLANS = [
  {
    id: 'free' as PlanId,
    name: 'Free',
    price: 0,
    period: '',
    features: [
      'Voice compose — speak, get formatted text',
      'Real-time streaming transcription',
      'Voice search across dictations',
      '12 document mode AI enhancement',
      'Legal & accounting vocabulary (5,000+ terms)',
      'Export to .docx',
      'Voice commands (punctuation, paragraphs)',
    ],
    cta: 'Current Plan',
    highlight: false,
  },
  {
    id: 'personal' as PlanId,
    name: 'Personal',
    price: 9,
    period: '/month',
    features: [
      'Everything in Free, plus:',
      'Voice replies — speak in your tone',
      'Morning briefing — spoken inbox summary',
      'Voice notes on any document',
      'Text-to-speech read-aloud',
      'Multiple TTS voice options',
      'Audio playback of recordings',
    ],
    cta: 'Upgrade to Personal',
    highlight: true,
  },
  {
    id: 'pro' as PlanId,
    name: 'Pro',
    price: 19,
    period: '/month',
    features: [
      'Everything in Personal, plus:',
      'Real-time voice translation (35+ languages)',
      'Voice cloning — AI speaks in your voice',
      'Voice commands — control everything by speaking',
      'Meeting mode — speaker diarization',
      'Sentiment analysis — detect tone and mood',
      'Premium TTS voices',
      'Batch file transcription',
      'Document templates',
    ],
    cta: 'Upgrade to Pro',
    highlight: false,
  },
  {
    id: 'enterprise' as PlanId,
    name: 'Enterprise',
    price: -1,
    period: '',
    features: [
      'Everything in Pro, plus:',
      'Voiceprint biometric authentication',
      'Call-to-email bridge',
      'Team voice channels',
      'SSO (Google, Microsoft)',
      'Custom voice model training',
      'Admin dashboard & analytics',
      'White-label branding',
      'SOC 2 / HIPAA compliance',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const currentPlan: PlanId = billingStatus?.plan ?? 'free';

  const fetchBillingStatus = useCallback(async () => {
    try {
      setFetchError(false);
      const res = await fetch('/api/billing/status');
      if (!res.ok) throw new Error('Failed to fetch billing status');
      const data: BillingStatus = await res.json();
      setBillingStatus(data);
    } catch {
      setFetchError(true);
      // Default to free on error so the page remains usable
      setBillingStatus({ plan: 'free', subscriptionStatus: 'none', stripeConfigured: false, databaseConfigured: false });
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingStatus();
  }, [fetchBillingStatus]);

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free' || planId === currentPlan) return;
    setLoading(planId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('Failed to open billing portal. Please try again.');
    }
  };

  const isPastDue = billingStatus?.subscriptionStatus === 'past_due';

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 border-b border-ink-800/60 bg-ink-950/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-ink-400 hover:text-ink-200 text-sm transition-colors">&larr; Back to app</Link>
          <div className="w-px h-5 bg-ink-800" />
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            <h1 className="font-display text-lg text-ink-50">
              Plans & <span className="text-gold-400">Billing</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isPastDue && (
            <span className="text-[11px] bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full font-medium">
              Payment Past Due
            </span>
          )}
          {currentPlan !== 'free' && (
            <button onClick={handleManage} className="px-3 py-1.5 rounded-lg text-xs bg-ink-800 text-ink-300 hover:text-ink-100 transition-colors">
              Manage Subscription
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display text-ink-50 mb-2">Professional dictation, priced for professionals</h2>
            <p className="text-ink-400 text-sm">Purpose-built for legal and accounting firms. Cancel anytime.</p>
          </div>

          {/* Past-due banner */}
          {isPastDue && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
              <p className="text-red-300 text-sm font-medium">Your payment is past due. Please update your payment method to avoid service interruption.</p>
              <button
                onClick={handleManage}
                className="mt-2 px-4 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors font-medium"
              >
                Update Payment Method
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {initialLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="rounded-xl border border-ink-800/50 bg-ink-900/40 p-5 flex flex-col animate-pulse">
                  <div className="h-5 w-24 bg-ink-800 rounded mb-4" />
                  <div className="h-9 w-20 bg-ink-800 rounded mb-6" />
                  <div className="space-y-2 mb-6 flex-1">
                    {[0, 1, 2, 3].map(j => (
                      <div key={j} className="h-4 bg-ink-800/60 rounded w-full" />
                    ))}
                  </div>
                  <div className="h-10 bg-ink-800 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Error notice (non-blocking — page still renders) */}
              {fetchError && (
                <div className="mb-6 rounded-xl border border-ink-700/50 bg-ink-900/60 p-4 flex items-center justify-between">
                  <p className="text-ink-400 text-sm">Unable to verify your subscription status. Showing default plan.</p>
                  <button
                    onClick={fetchBillingStatus}
                    className="px-3 py-1 rounded-lg text-xs bg-ink-800 text-ink-300 hover:text-ink-100 transition-colors shrink-0 ml-4"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Plan cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PLANS.map(plan => {
                  const isCurrent = plan.id === currentPlan;
                  const tierRank: Record<PlanId, number> = { free: 0, personal: 1, pro: 2, enterprise: 3 };
                  const isDowngrade = tierRank[plan.id] < tierRank[currentPlan];

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-xl border p-6 flex flex-col transition-all duration-200 ${
                        isCurrent
                          ? 'border-gold-500/50 bg-ink-900/80 ring-1 ring-gold-500/20 shadow-[0_0_30px_-5px_rgba(196,162,58,0.15)]'
                          : plan.highlight && !isDowngrade
                          ? 'border-gold-500/30 bg-ink-900/60 hover:border-gold-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-ink-950/50'
                          : 'border-ink-800/50 bg-ink-900/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-ink-950/50 hover:border-ink-700/50'
                      }`}
                    >
                      {isCurrent ? (
                        <span className="self-start text-[10px] bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full mb-3 font-medium tracking-wide">
                          CURRENT PLAN
                        </span>
                      ) : plan.highlight && !isDowngrade ? (
                        <span className="self-start text-[10px] bg-gold-500/10 text-gold-500/80 px-2 py-0.5 rounded-full mb-3 font-medium tracking-wide">
                          MOST POPULAR
                        </span>
                      ) : (
                        <div className="mb-3 h-[18px]" /> // Spacer to keep cards aligned
                      )}

                      <h3 className="text-lg font-display text-ink-50">{plan.name}</h3>
                      <div className="mt-2 mb-4">
                        <span className={`text-3xl font-display ${isCurrent ? 'text-gold-400' : 'text-ink-100'}`}>
                          {plan.price === -1 ? 'Custom' : `$${plan.price}`}
                        </span>
                        <span className="text-ink-500 text-sm">{plan.period}</span>
                      </div>

                      <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-start gap-2 text-sm text-ink-300">
                            <svg className={`w-4 h-4 shrink-0 mt-0.5 ${isCurrent ? 'text-gold-400' : 'text-gold-500/70'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {f}
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isCurrent || plan.id === 'free' || loading === plan.id}
                        className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isCurrent
                            ? 'bg-gold-500/10 text-gold-400/80 cursor-default border border-gold-500/20'
                            : isDowngrade
                            ? 'bg-ink-800/60 text-ink-500 cursor-default'
                            : plan.highlight
                            ? 'bg-gold-500 text-ink-950 hover:bg-gold-400 active:bg-gold-600'
                            : plan.id === 'free'
                            ? 'bg-ink-800/60 text-ink-500 cursor-default'
                            : 'bg-ink-800 text-ink-200 hover:bg-ink-700 active:bg-ink-600'
                        }`}
                      >
                        {loading === plan.id
                          ? 'Redirecting...'
                          : isCurrent
                          ? 'Current Plan'
                          : isDowngrade
                          ? 'Manage to Downgrade'
                          : plan.id === 'free'
                          ? 'Free Tier'
                          : plan.cta}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-ink-600">All plans include end-to-end encryption and SOC 2 compliance.</p>
            <p className="text-xs text-ink-600">Need a custom plan for your firm? Contact us at support@alecrae.app</p>
          </div>
        </div>
      </div>
    </div>
  );
}
