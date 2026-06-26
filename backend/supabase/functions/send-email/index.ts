// Supabase Edge Function for sending email notifications
// Deploy with: supabase functions deploy send-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface ContactEmailData {
  property_id: string
  sender_name: string
  sender_email: string
  sender_phone: string
  message: string
  landlord_id: string
}

interface ViewingEmailData {
  property_id: string
  viewing_date: string
  viewing_time: string
  user_id: string
  landlord_id: string
}

interface ApplicationEmailData {
  property_id: string
  full_name: string
  email: string
  phone: string
  monthly_income: number
  move_in_date: string
  landlord_id: string
}

serve(async (req) => {
  try {
    const { type, data } = await req.json()

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }

    // Initialize Supabase client
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get landlord email
    const { data: landlordData, error: landlordError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', data.landlord_id)
      .single()

    if (landlordError || !landlordData) {
      throw new Error('Failed to fetch landlord email')
    }

    const landlordEmail = landlordData.email

    // Get property details
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('title, address, city, state')
      .eq('id', data.property_id)
      .single()

    if (propertyError || !propertyData) {
      throw new Error('Failed to fetch property details')
    }

    let emailHtml = ''
    let emailSubject = ''

    // Generate email based on type
    switch (type) {
      case 'contact':
        emailSubject = `New Message About ${propertyData.title}`
        emailHtml = generateContactEmail(data as ContactEmailData, propertyData)
        break
      case 'viewing':
        emailSubject = `New Viewing Request for ${propertyData.title}`
        emailHtml = generateViewingEmail(data as ViewingEmailData, propertyData)
        break
      case 'application':
        emailSubject = `New Rental Application for ${propertyData.title}`
        emailHtml = generateApplicationEmail(data as ApplicationEmailData, propertyData)
        break
      default:
        throw new Error('Invalid email type')
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Property Management <noreply@yourdomain.com>',
        to: [landlordEmail],
        subject: emailSubject,
        html: emailHtml,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send email: ${error}`)
    }

    const result = await response.json()

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// ==================== EMAIL TEMPLATES ====================

function generateContactEmail(data: ContactEmailData, property: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Message</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
        .property-info { background-color: white; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        .sender-info { background-color: white; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        .message-box { background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; }
        .label { font-weight: bold; color: #4b5563; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Contact Message</h1>
        </div>
        <div class="content">
          <div class="property-info">
            <p class="label">Property:</p>
            <p><strong>${property.title}</strong></p>
            <p>${property.address}, ${property.city}, ${property.state}</p>
          </div>
          
          <div class="sender-info">
            <p class="label">From:</p>
            <p><strong>${data.sender_name}</strong></p>
            <p>Email: ${data.sender_email}</p>
            <p>Phone: ${data.sender_phone}</p>
          </div>
          
          <div class="message-box">
            <p class="label">Message:</p>
            <p>${data.message}</p>
          </div>
          
          <a href="https://yourdomain.com/landlord/messages" class="button">View in Dashboard</a>
        </div>
        <div class="footer">
          <p>This is an automated notification from your Property Management System</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateViewingEmail(data: ViewingEmailData, property: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Viewing Request</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
        .property-info { background-color: white; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        .viewing-info { background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #059669; }
        .label { font-weight: bold; color: #4b5563; }
        .highlight { font-size: 24px; color: #059669; font-weight: bold; }
        .button { display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; margin-right: 10px; }
        .button-secondary { background-color: #6b7280; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Viewing Request</h1>
        </div>
        <div class="content">
          <div class="property-info">
            <p class="label">Property:</p>
            <p><strong>${property.title}</strong></p>
            <p>${property.address}, ${property.city}, ${property.state}</p>
          </div>
          
          <div class="viewing-info">
            <p class="label">Requested Viewing Time:</p>
            <p class="highlight">${data.viewing_date} at ${data.viewing_time}</p>
          </div>
          
          <div style="margin-top: 20px;">
            <a href="https://yourdomain.com/landlord/viewings?action=confirm&id=${data.property_id}" class="button">Confirm Viewing</a>
            <a href="https://yourdomain.com/landlord/viewings" class="button button-secondary">View All Requests</a>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from your Property Management System</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateApplicationEmail(data: ApplicationEmailData, property: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Rental Application</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
        .property-info { background-color: white; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        .applicant-info { background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #7c3aed; }
        .label { font-weight: bold; color: #4b5563; }
        .highlight { color: #7c3aed; font-weight: bold; }
        .button { display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Rental Application</h1>
        </div>
        <div class="content">
          <div class="property-info">
            <p class="label">Property:</p>
            <p><strong>${property.title}</strong></p>
            <p>${property.address}, ${property.city}, ${property.state}</p>
          </div>
          
          <div class="applicant-info">
            <p class="label">Applicant:</p>
            <p><strong>${data.full_name}</strong></p>
            <p>Email: ${data.email}</p>
            <p>Phone: ${data.phone}</p>
            <p>Monthly Income: $${data.monthly_income.toLocaleString()}</p>
            <p>Desired Move-in Date: ${data.move_in_date}</p>
          </div>
          
          <p style="margin-top: 20px;">A new rental application has been submitted for your property. Please review the complete application in your dashboard.</p>
          
          <a href="https://yourdomain.com/landlord/applications" class="button">Review Application</a>
        </div>
        <div class="footer">
          <p>This is an automated notification from your Property Management System</p>
        </div>
      </div>
    </body>
    </html>
  `
}