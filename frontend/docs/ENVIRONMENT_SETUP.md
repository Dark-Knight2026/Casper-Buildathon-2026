# Environment Setup Guide

This guide explains how to configure all external services required for the Lease Management System.

## Overview

The application integrates with the following external services:
- **Supabase**: Database, authentication, and storage
- **Stripe**: Payment processing
- **Resend**: Email notifications
- **Twilio**: SMS notifications (optional)

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Access to create accounts on external services

---

## 1. Supabase Configuration

### 1.1 Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - **Name**: lease-management-system
   - **Database Password**: (generate a strong password)
   - **Region**: Choose closest to your users
5. Wait for project to be created (~2 minutes)

### 1.2 Get API Credentials

1. Go to Project Settings → API
2. Copy the following:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

### 1.3 Create Storage Buckets

1. Go to Storage in Supabase dashboard
2. Create three buckets:
   - **documents**: For general lease documents
   - **lease-agreements**: For signed lease agreements
   - **signatures**: For e-signature files

3. Set bucket policies:
   - **documents**: Private (authenticated users only)
   - **lease-agreements**: Private (authenticated users only)
   - **signatures**: Private (authenticated users only)

### 1.4 Run Database Migrations

```bash
cd /workspace/shadcn-ui
# Execute the migration script in Supabase SQL Editor
# Copy contents of src/lib/supabase/phase1-database-migration.sql
# Paste into SQL Editor and run
```

---

## 2. Stripe Configuration

### 2.1 Create Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Sign up for a new account
3. Complete business verification (can use test mode initially)

### 2.2 Get API Keys

1. Go to Developers → API Keys
2. Copy the following:
   - **Publishable Key**: `pk_test_...` or `pk_live_...`
   - **Secret Key**: `sk_test_...` or `sk_live_...` (keep secret!)

### 2.3 Configure Webhooks (Production Only)

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Enter endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the **Webhook Signing Secret**: `whsec_...`

### 2.4 Test Mode vs Live Mode

- **Test Mode**: Use for development
  - Test card: `4242 4242 4242 4242`
  - Any future expiry date
  - Any 3-digit CVC
- **Live Mode**: Use for production
  - Real credit cards
  - Real money transactions

---

## 3. Resend Configuration

### 3.1 Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a new account
3. Choose a plan:
   - **Free**: 100 emails/day (good for testing)
   - **Paid**: Higher limits for production

### 3.2 Get API Key

1. Go to API Keys
2. Click "Create API Key"
3. Name: "Lease Management System"
4. Copy the API key: `re_...` (keep secret!)

### 3.3 Verify Domain (Production Only)

1. Go to Domains
2. Click "Add Domain"
3. Enter your domain: `yourdomain.com`
4. Add DNS records provided by Resend:
   - SPF record
   - DKIM record
   - DMARC record (optional)
5. Wait for verification (~24 hours)

### 3.4 Test Email Sending

For testing, you can use Resend's sandbox domain:
- From: `onboarding@resend.dev`
- To: Your verified email

For production, use your verified domain:
- From: `noreply@yourdomain.com`

---

## 4. Twilio Configuration (Optional)

### 4.1 Create Twilio Account

1. Go to [https://twilio.com](https://twilio.com)
2. Sign up for a new account
3. Verify your phone number
4. Get $15 free trial credit

### 4.2 Get API Credentials

1. Go to Console Dashboard
2. Copy the following:
   - **Account SID**: `ACxxxxx...`
   - **Auth Token**: `xxxxx...` (keep secret!)

### 4.3 Get Phone Number

1. Go to Phone Numbers → Manage → Buy a number
2. Choose a number with SMS capability
3. Copy the phone number: `+1234567890`

### 4.4 Configure Messaging Service (Optional)

1. Go to Messaging → Services
2. Create a new service
3. Add your phone number to the service
4. Copy the **Messaging Service SID**: `MGxxxxx...`

---

## 5. Environment Variables Setup

### 5.1 Create .env File

Create a `.env` file in the project root:

```bash
cd /workspace/shadcn-ui
touch .env
```

### 5.2 Add Environment Variables

Copy the following template and fill in your values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend Configuration
RESEND_API_KEY=re_...

# Twilio Configuration (Optional)
TWILIO_ACCOUNT_SID=ACxxxxx...
TWILIO_AUTH_TOKEN=xxxxx...
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx...

# Application Configuration
VITE_APP_URL=http://localhost:5173
NODE_ENV=development
```

### 5.3 Add .env to .gitignore

Ensure `.env` is in `.gitignore`:

```bash
echo ".env" >> .gitignore
```

**IMPORTANT**: Never commit `.env` to version control!

---

## 6. Verification Steps

### 6.1 Verify Supabase Connection

```bash
# Start the development server
pnpm run dev

# Open browser to http://localhost:5173
# Try to sign up/login
# Check browser console for errors
```

### 6.2 Verify Stripe Integration

```bash
# Test payment intent creation
# Use Stripe test card: 4242 4242 4242 4242
# Check Stripe Dashboard → Payments for test transactions
```

### 6.3 Verify Resend Email

```bash
# Trigger an email notification (e.g., sign up, password reset)
# Check your email inbox
# Check Resend Dashboard → Logs for sent emails
```

### 6.4 Verify Twilio SMS (Optional)

```bash
# Trigger an SMS notification
# Check your phone for SMS
# Check Twilio Console → Logs for sent messages
```

---

## 7. Production Deployment

### 7.1 Environment Variables on Hosting Platform

When deploying to production (Vercel, Netlify, etc.), add all environment variables in the hosting platform's dashboard:

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add each variable from `.env`
3. Set environment: Production

**Netlify:**
1. Go to Site Settings → Build & Deploy → Environment
2. Add each variable from `.env`

### 7.2 Switch to Production Keys

Replace all test keys with production keys:
- Stripe: `pk_live_...` and `sk_live_...`
- Supabase: Production project URL and keys
- Resend: Verified domain
- Twilio: Production credentials

### 7.3 Configure Webhooks

Update webhook URLs to production domain:
- Stripe webhook: `https://yourdomain.com/api/stripe/webhook`

---

## 8. Troubleshooting

### Supabase Connection Issues

**Error**: "Missing Supabase environment variables"
- **Solution**: Check `.env` file exists and contains correct values
- **Solution**: Restart development server after adding `.env`

**Error**: "Invalid API key"
- **Solution**: Verify you copied the correct key from Supabase dashboard
- **Solution**: Check for extra spaces or line breaks in the key

### Stripe Payment Issues

**Error**: "No such payment_intent"
- **Solution**: Ensure you're using the correct Stripe keys (test vs live)
- **Solution**: Check Stripe Dashboard for payment intent status

**Error**: "Invalid API key"
- **Solution**: Verify secret key starts with `sk_test_` or `sk_live_`

### Resend Email Issues

**Error**: "Domain not verified"
- **Solution**: Use sandbox domain for testing: `onboarding@resend.dev`
- **Solution**: Wait for domain verification (up to 24 hours)

**Error**: "Rate limit exceeded"
- **Solution**: Upgrade to paid plan
- **Solution**: Reduce email sending frequency

### Twilio SMS Issues

**Error**: "Unverified phone number"
- **Solution**: In trial mode, verify recipient phone numbers in Twilio Console
- **Solution**: Upgrade to paid account to send to any number

**Error**: "Insufficient balance"
- **Solution**: Add credits to Twilio account

---

## 9. Security Best Practices

### 9.1 API Key Management

- ✅ Store API keys in `.env` file
- ✅ Add `.env` to `.gitignore`
- ✅ Use different keys for development and production
- ✅ Rotate keys regularly (every 90 days)
- ❌ Never commit API keys to version control
- ❌ Never share API keys in public channels

### 9.2 Supabase Security

- Enable Row-Level Security (RLS) on all tables
- Use anon key for client-side operations
- Use service role key only for server-side operations
- Enable email verification for new users
- Set up rate limiting on authentication endpoints

### 9.3 Stripe Security

- Use webhook signing secret to verify webhook events
- Never expose secret key to client-side code
- Enable 3D Secure for card payments
- Set up fraud detection rules in Stripe Dashboard

### 9.4 Resend Security

- Use API key only on server-side
- Verify domain to prevent spoofing
- Set up DMARC policy to prevent email fraud
- Monitor email logs for suspicious activity

---

## 10. Cost Estimation

### Development (Free Tier)

- **Supabase**: Free (500 MB database, 1 GB storage)
- **Stripe**: Free (test mode)
- **Resend**: Free (100 emails/day)
- **Twilio**: $15 trial credit

**Total**: $0/month

### Production (Small Scale)

- **Supabase**: $25/month (Pro plan)
- **Stripe**: 2.9% + $0.30 per transaction
- **Resend**: $20/month (50,000 emails)
- **Twilio**: $0.0079 per SMS

**Estimated Total**: $50-100/month (depends on usage)

### Production (Medium Scale)

- **Supabase**: $599/month (Team plan)
- **Stripe**: 2.9% + $0.30 per transaction
- **Resend**: $80/month (500,000 emails)
- **Twilio**: $0.0079 per SMS

**Estimated Total**: $700-1000/month (depends on usage)

---

## 11. Support & Resources

### Documentation

- **Supabase**: https://supabase.com/docs
- **Stripe**: https://stripe.com/docs
- **Resend**: https://resend.com/docs
- **Twilio**: https://www.twilio.com/docs

### Community Support

- **Supabase Discord**: https://discord.supabase.com
- **Stripe Discord**: https://discord.gg/stripe
- **Resend Discord**: https://discord.gg/resend

### Contact

For issues specific to this application:
- Check `/workspace/shadcn-ui/docs/` for additional documentation
- Review integration test results in `INTEGRATION_TEST_RESULTS.md`
- Contact development team

---

**Last Updated**: 2026-01-04
**Version**: 1.0.0