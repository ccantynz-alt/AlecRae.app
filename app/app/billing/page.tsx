'use client';

import { useState } from 'react';
import Link from 'next/link';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    features: ['10 dictations/month', 'Basic transcription', '3 document modes (General, Email, Notes)', 'Copy to clipboard'],
    cta: 'Current Plan',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 29,
    period: '/month',
    features: [
      '500 dictations/month',
      'All 12 document modes',
      'Custom vocabulary',
      'Priority Whisper processing',
      'Export to .docx',
      'Firm profile',
      'Document templates',
      'Auto-detect document type',
      'Audio playback',
      'Batch file upload',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    period: '/month',
    features: [
      'Unlimited dictations',
      'All Professional features',
      'Multi-user access',
      'Team vocabulary sharing',
      'SSO (Google, Microsoft)',
      'Admin dashboard & analytics',
      'White-label branding',
      'Custom domain',
      'Priority support',
      'API access',
    ],
    cta: 'Upgrade to Enterprise',
    highlight: false,
  },
];

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan] = useState('free'); // TODO: fetch from user session

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
      }
    } catch {
      alert('Failed to start checkout');
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
      }
    } catch {
      alert('Failed to open billing portal');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 border-b border-ink-800/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-ink-400 hover:text-ink-200 text-sm">&larr; Back</Link>
          <h1 className="font-display text-lg text-ink-50">
            Plans & <span className="text-gold-400">Billing</span>
          </h1>
        </div>
        {currentPlan !== 'free' && (
          <button onClick={handleManage} className="px-3 py-1.5 rounded-lg text-xs bg-ink-800 text-ink-300 hover:text-ink-100">
            Manage Subscription
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display text-ink-50 mb-2">Professional dictation, priced for professionals</h2>
            <p className="text-ink-400 text-sm">Purpose-built for legal and accounting firms. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`rounded-xl border p-5 flex flex-col ${
                  plan.highlight
                    ? 'border-gold-500/50 bg-ink-900/80 ring-1 ring-gold-500/20'
                    : 'border-ink-800/50 bg-ink-900/40'
                }`}
              >
                {plan.highlight && (
                  <span className="self-start text-[10px] bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full mb-3 font-medium">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-lg font-display text-ink-50">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-display text-gold-400">${plan.price}</span>
                  <span className="text-ink-500 text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink-300">
                      <svg className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={plan.id === currentPlan || loading === plan.id}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                    plan.id === currentPlan
                      ? 'bg-ink-800 text-ink-500 cursor-default'
                      : plan.highlight
                      ? 'bg-gold-500 text-ink-950 hover:bg-gold-400'
                      : 'bg-ink-800 text-ink-200 hover:bg-ink-700'
                  }`}
                >
                  {loading === plan.id ? 'Redirecting...' : plan.id === currentPlan ? 'Current Plan' : plan.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-ink-600">All plans include end-to-end encryption and SOC 2 compliance.</p>
            <p className="text-xs text-ink-600">Need a custom plan for your firm? Contact us at support@alecrae.app</p>
          </div>
        </div>
      </div>
    </div>
  );
}
