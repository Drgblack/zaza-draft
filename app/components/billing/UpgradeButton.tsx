"use client";
import { useState } from 'react';
import { useAuth } from '@/lib/auth/hooks';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface UpgradeButtonProps {
  snippetsUsed: number;
  snippetsLimit: number;
  className?: string;
}

export function UpgradeButton({ snippetsUsed, snippetsLimit, className = '' }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  async function handleUpgrade() {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to start checkout');
      
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      console.error(e);
      toast.error('Could not start checkout');
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <div className="text-sm text-gray-600 mb-2">
        {snippetsUsed} / {snippetsLimit} drafts used this month
      </div>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Starting checkout...' : 'Upgrade to Pro'}
      </button>
    </div>
  );
}



