import { Link } from 'react-router-dom';
import { Home, User, Briefcase, Building2, Search, Mail } from 'lucide-react';

import { LandingHeader } from '@/components/LandingHeader';
import { QuickActionCard } from '@/components/help/QuickActionCard';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

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

// Falls back to a sensible default so the page never renders an empty mailto.
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? 'support@leasefi.com';

const FAQ = [
  {
    q: 'Do I need a crypto wallet to sign up?',
    a: 'No. Sign up with an email or supported social account — we set up everything you need behind the scenes. You don\'t need to know anything about crypto to use LeaseFi.',
  },
  {
    q: 'Is LeaseFi free?',
    a: 'Browsing listings and creating an account are free. Listing a property carries a small network fee paid by the landlord. Tenant rent payments include the standard payment-processor fee.',
  },
  {
    q: 'What ID documents are accepted for verification?',
    a: 'A government-issued photo ID — passport, driver\'s license, or national ID card. Verification is handled by a licensed identity provider; documents are not stored on the LeaseFi platform.',
  },
  {
    q: 'How long does verification take?',
    a: 'Most users complete verification in 1–5 minutes. Occasionally a manual review extends this to a few hours.',
  },
  {
    q: 'Can I switch between tenant and landlord roles later?',
    a: 'Each account has one role, set when you first sign up. To use a different role, create a separate account with a different login.',
  },
  {
    q: 'Do I need to verify my identity to browse listings?',
    a: 'No. Browsing is open to anyone, no account or verification required. Verification is only needed when you list a property or apply to rent.',
  },
  {
    q: 'What happens if I don\'t complete identity verification?',
    a: 'You can still browse and create an account, but listing a property and applying to rent are blocked until verification is complete.',
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

        <p className="mb-12 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>

        <section aria-labelledby="faq-heading" className="mb-12">
          <h2 id="faq-heading" className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="rounded-lg border bg-card text-card-foreground shadow-sm">
            {FAQ.map((item, idx) => (
              <AccordionItem key={item.q} value={`faq-${idx}`} className="px-4 last:border-b-0 ">
                <AccordionTrigger className="text-left text-sm font-medium">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section aria-labelledby="support-heading" className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 text-center">
          <h2 id="support-heading" className="mb-2 text-base font-semibold">
            Still need help?
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Our team is happy to walk you through any part of the platform.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {SUPPORT_EMAIL}
          </a>
        </section>
      </main>
    </div>
  );
}
