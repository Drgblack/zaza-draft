"use client"
import { useAuth } from '@/lib/auth/hooks';
import { getUserProfile } from '@/lib/firestore/usage';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function BillingPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);
      } catch (e) {
        toast.error('Could not load billing info');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  async function handleManage() {
    setPortalLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      toast.error('Could not open Stripe portal');
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleStartSubscription() {
    setPortalLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      toast.error('Could not start subscription');
    } finally {
      setPortalLoading(false);
    }
  }

  if (!user) return <div className="p-8">Please sign in to view billing.</div>;
  if (loading) return <div className="p-8">Loadingâ€¦</div>;

  return (
    <main className="max-w-lg mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-semibold mb-4">Billing & Subscription</h1>
      <div className="border rounded p-4 space-y-2">
        <div data-testid="plan-status">
          <strong>Plan:</strong> {profile?.plan === 'pro' ? 'Pro' : 'Free'}
        </div>
        <div>
          <strong>Usage this month:</strong> {profile?.usage?.snippetsThisMonth ?? 0} / {profile?.plan === 'pro' ? 'âˆž' : '10'}
        </div>
        <div>
          <strong>Status:</strong> {profile?.stripeSubscriptionStatus ?? 'N/A'}
        </div>
      </div>
      {profile?.stripeCustomerId ? (
        <button
          onClick={handleManage}
          disabled={portalLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
          data-testid="manage-subscription"
        >
          {portalLoading ? 'Openingâ€¦' : 'Manage Subscription'}
        </button>
      ) : (
        <button
          onClick={handleStartSubscription}
          disabled={portalLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
          data-testid="start-subscription"
        >
          {portalLoading ? 'Redirectingâ€¦' : 'Start Subscription'}
        </button>
      )}
    </main>
  );
}

