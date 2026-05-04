import { Link } from 'react-router-dom';
import { Home, User, Briefcase, Building2, Search } from 'lucide-react';

import { LandingHeader } from '@/components/LandingHeader';
import { QuickActionCard } from '@/components/help/QuickActionCard';

const ACCOUNT_CARDS = [
  {
    icon: Home,
    title: 'Create landlord account',
    description: 'List rentals, manage tenants, track payments and maintenance.',
    href: '/auth/register?role=landlord',
    duration: '~2 min',
    requirements: 'an email, ID for verification',
  },
  {
    icon: User,
    title: 'Create tenant account',
    description: 'Find a place, apply, and pay rent online.',
    href: '/auth/register?role=tenant',
    duration: '~2 min',
    requirements: 'an email, ID for verification when applying',
  },
  {
    icon: Briefcase,
    title: 'Create property manager account',
    description: 'Manage portfolios on behalf of multiple landlords.',
    badge: 'Coming soon',
    disabled: true,
  },
] as const;

const ACTION_CARDS = [
  {
    icon: Building2,
    title: 'List a property',
    description: 'Add a rental listing in minutes — photos, terms, availability.',
    href: '/landlord/properties/create',
    duration: '~5 min',
    requirements: 'a landlord account, property details and photos',
  },
  {
    icon: Search,
    title: 'Look for a property',
    description: 'Browse rentals and filter by price, size, and amenities.',
    href: '/listings',
    duration: '<1 min',
    requirements: 'nothing — browsing is free, no account required',
  },
] as const;

export default function HelpHub() {
  return (
    <div className="min-h-screen bg-gray-50">
      <LandingHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <header className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl">Get started with LeaseFi</h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
            LeaseFi is a property platform for landlords, tenants, and managers. Sign up takes
            about 2 minutes. ID verification is required to list or rent a place; browsing
            listings is free and works without an account.
          </p>
        </header>

        <section aria-labelledby="account-heading" className="mb-10">
          <h2 id="account-heading" className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Create your account
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACCOUNT_CARDS.map((card) => (
              <QuickActionCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <section aria-labelledby="action-heading" className="mb-10">
          <h2 id="action-heading" className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Jump to a flow
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ACTION_CARDS.map((card) => (
              <QuickActionCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
