# Email/SMS Notification Channels Setup Guide

This guide explains how to set up email and SMS notifications for critical events in your real estate management platform.

## Overview

The notification system supports multiple delivery channels:
- **In-App**: Always enabled, shows notifications in the application
- **Email**: Sends emails for high-priority and urgent notifications
- **SMS**: Sends text messages for urgent notifications
- **Push**: (Future implementation)

## Architecture

```
Database Event → useNotificationTriggers Hook → Multi-Channel Notification System
                                                  ├─ In-App (NotificationContext)
                                                  ├─ Email (SMTP via Edge Function)
                                                  └─ SMS (Twilio via Edge Function)
```

## Prerequisites

### 1. Supabase Project Setup

Ensure your Supabase project is configured with:
- Project URL
- Service Role Key
- Edge Functions enabled

### 2. Database Tables

Run the migration to create required tables:

```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/create_notification_tables.sql
```

This creates:
- `notification_preferences`: User notification preferences
- `notification_delivery_log`: Delivery tracking and analytics

## Email Setup (SMTP)

### Option 1: Gmail SMTP

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Copy the generated 16-character password

3. **Set Environment Variables** in Supabase:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_FROM=your-email@gmail.com
   ```

### Option 2: SendGrid

1. **Create SendGrid Account** at https://sendgrid.com
2. **Generate API Key**:
   - Settings → API Keys → Create API Key
   - Select "Full Access" or "Mail Send" permissions

3. **Set Environment Variables**:
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASSWORD=your-sendgrid-api-key
   SMTP_FROM=noreply@yourdomain.com
   ```

### Option 3: AWS SES

1. **Verify Domain/Email** in AWS SES Console
2. **Create SMTP Credentials**:
   - SES Console → SMTP Settings → Create My SMTP Credentials

3. **Set Environment Variables**:
   ```bash
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-smtp-username
   SMTP_PASSWORD=your-smtp-password
   SMTP_FROM=noreply@yourdomain.com
   ```

## SMS Setup (Twilio)

### 1. Create Twilio Account

1. Sign up at https://www.twilio.com
2. Complete phone number verification
3. Get a Twilio phone number (or use trial number for testing)

### 2. Get API Credentials

1. Go to Twilio Console Dashboard
2. Copy your **Account SID** and **Auth Token**
3. Note your **Twilio Phone Number**

### 3. Set Environment Variables

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Phone Number Format

All phone numbers must be in **E.164 format**:
- Include country code with `+` prefix
- No spaces, dashes, or parentheses
- Examples:
  - US: `+14155551234`
  - UK: `+447911123456`
  - Australia: `+61412345678`

## Deploy Edge Functions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Link to Your Project

```bash
supabase link --project-ref your-project-ref
```

### 3. Deploy Functions

```bash
# Deploy email function
supabase functions deploy send-email

# Deploy SMS function
supabase functions deploy send-sms
```

### 4. Set Secrets

```bash
# Email secrets
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_SECURE=false
supabase secrets set SMTP_USER=your-email@gmail.com
supabase secrets set SMTP_PASSWORD=your-app-password
supabase secrets set SMTP_FROM=your-email@gmail.com

# SMS secrets
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your-auth-token
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
```

## User Preferences Configuration

Users can configure their notification preferences through the database:

```sql
-- Example: Enable email notifications for high-priority events
UPDATE notification_preferences
SET 
  channels = '{"in_app": true, "email": true, "sms": false, "push": false}'::jsonb,
  priority_thresholds = '{"email": "high", "sms": "urgent"}'::jsonb,
  email_address = 'user@example.com',
  quiet_hours = '{"enabled": true, "start": "22:00", "end": "08:00", "timezone": "America/Los_Angeles"}'::jsonb
WHERE user_id = 'user-uuid';
```

### Preference Fields

- **channels**: Enable/disable each notification channel
- **priority_thresholds**: Minimum priority level for email/SMS
  - `low`, `medium`, `high`, `urgent`
- **quiet_hours**: Don't send email/SMS during specified hours
  - Only urgent notifications bypass quiet hours
- **email_address**: User's email for notifications
- **phone_number**: User's phone in E.164 format

## Notification Priority Levels

| Priority | Description | Email | SMS | Examples |
|----------|-------------|-------|-----|----------|
| **Low** | Informational | ❌ | ❌ | Payment completed, showing completed |
| **Medium** | Important updates | ❌ | ❌ | New message, appointment scheduled |
| **High** | Requires attention | ✅ | ❌ | Payment failed, document requires signature |
| **Urgent** | Immediate action needed | ✅ | ✅ | Payment overdue, offer received, lease expiring |

## Critical Notification Events

The following events automatically trigger email/SMS for high/urgent priority:

### Urgent (Email + SMS)
- Payment overdue
- New offer received
- Offer accepted
- Offer expiring in 24 hours
- Lease expiring in 7 days
- Lease expired
- Appointment in 1 hour

### High (Email Only)
- Payment failed
- New lease created
- Document requires signature
- New appointment scheduled
- Maintenance request (urgent priority)

## Testing

### Test Email Function

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Notification",
    "html": "<h1>Test</h1><p>This is a test email.</p>",
    "text": "Test: This is a test email.",
    "priority": "high"
  }'
```

### Test SMS Function

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/send-sms \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Test notification from your real estate platform",
    "priority": "urgent"
  }'
```

## Monitoring & Analytics

### View Delivery Logs

```sql
-- Recent email deliveries
SELECT * FROM notification_delivery_log
WHERE channel = 'email'
ORDER BY sent_at DESC
LIMIT 50;

-- Failed deliveries
SELECT * FROM notification_delivery_log
WHERE status = 'failed'
ORDER BY sent_at DESC;

-- Delivery success rate by channel
SELECT 
  channel,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM notification_delivery_log
GROUP BY channel;
```

## Troubleshooting

### Email Not Sending

1. **Check SMTP credentials**: Verify environment variables are correct
2. **Check spam folder**: Emails might be filtered
3. **Verify sender email**: Some SMTP providers require verified sender addresses
4. **Check logs**: View edge function logs in Supabase dashboard
5. **Test SMTP connection**: Use a tool like `telnet smtp.gmail.com 587`

### SMS Not Sending

1. **Verify phone number format**: Must be E.164 format with country code
2. **Check Twilio balance**: Ensure account has sufficient credits
3. **Verify Twilio number**: Ensure phone number is active and SMS-enabled
4. **Check recipient country**: Some countries have restrictions
5. **Review Twilio logs**: Check message logs in Twilio console

### Quiet Hours Not Working

1. **Check timezone**: Ensure user's timezone is correctly set
2. **Verify time format**: Use 24-hour format (HH:mm)
3. **Test with urgent notifications**: Only urgent notifications bypass quiet hours

## Cost Considerations

### Email Costs
- **Gmail**: Free (with limits: 500 emails/day)
- **SendGrid**: Free tier (100 emails/day), paid plans from $15/month
- **AWS SES**: $0.10 per 1,000 emails

### SMS Costs (Twilio)
- **US/Canada**: ~$0.0075 per SMS
- **International**: Varies by country ($0.02-$0.50 per SMS)
- **Monthly phone number**: $1.00/month

### Recommendations
- Start with email-only for most notifications
- Reserve SMS for truly urgent events only
- Set appropriate priority thresholds to control costs
- Monitor delivery logs to optimize notification strategy

## Security Best Practices

1. **Never commit secrets**: Use environment variables only
2. **Use service role key**: For edge functions accessing user data
3. **Validate phone numbers**: Prevent SMS to invalid numbers
4. **Rate limiting**: Implement limits to prevent abuse
5. **Audit logs**: Regularly review notification_delivery_log
6. **User consent**: Ensure users opt-in to email/SMS notifications
7. **Unsubscribe option**: Provide easy way to disable notifications

## Future Enhancements

- [ ] Push notifications (web push, mobile)
- [ ] Notification templates with variables
- [ ] A/B testing for notification content
- [ ] User notification preferences UI
- [ ] Notification scheduling and batching
- [ ] Rich email templates with branding
- [ ] SMS short links for better UX
- [ ] WhatsApp integration
- [ ] Slack/Teams integration for team notifications

## Support

For issues or questions:
1. Check Supabase edge function logs
2. Review notification_delivery_log for errors
3. Test with curl commands above
4. Verify environment variables are set correctly
5. Check provider (Gmail/SendGrid/Twilio) documentation