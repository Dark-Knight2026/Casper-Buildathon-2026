// Edge Function: generate-listing-description
// Generates AI-powered property descriptions using OpenAI GPT-4

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

interface DescriptionRequest {
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage?: number;
  features: string[];
  location: string;
  price: number;
  tone?: 'professional' | 'casual' | 'luxury' | 'family_friendly';
  length?: 'short' | 'medium' | 'long';
}

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Description generation request received`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request body
    const request: DescriptionRequest = await req.json();
    
    console.log(`[${requestId}] Generating description for ${request.propertyType}`);

    // Build prompt
    const tone = request.tone || 'professional';
    const length = request.length || 'medium';
    
    const lengthGuide = {
      short: '100-150 words',
      medium: '200-300 words',
      long: '400-500 words',
    };

    const toneGuide = {
      professional: 'professional and informative',
      casual: 'friendly and conversational',
      luxury: 'sophisticated and elegant',
      family_friendly: 'warm and welcoming',
    };

    const prompt = `Generate a compelling real estate listing description for the following property:

Property Type: ${request.propertyType}
Bedrooms: ${request.bedrooms}
Bathrooms: ${request.bathrooms}
${request.squareFootage ? `Square Footage: ${request.squareFootage} sq ft` : ''}
Location: ${request.location}
Price: $${request.price.toLocaleString()}
Features: ${request.features.join(', ')}

Tone: ${toneGuide[tone]}
Length: ${lengthGuide[length]}

Please provide:
1. A catchy title (max 80 characters)
2. A full property description
3. 5 key highlights (bullet points)
4. 10 SEO keywords
5. Marketing remarks for MLS (brief, 50 words)

Format the response as JSON with these keys: title, description, highlights, seoKeywords, marketingRemarks`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert real estate copywriter who creates compelling property descriptions that attract buyers and generate inquiries.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0].message.content;
    
    // Parse JSON response
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      // If not valid JSON, try to extract structured data
      result = {
        title: content.split('\n')[0].replace(/^Title:\s*/i, '').trim(),
        description: content,
        highlights: [],
        seoKeywords: [],
        marketingRemarks: content.substring(0, 200),
      };
    }

    console.log(`[${requestId}] Description generated successfully`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${requestId}] Error generating description:`, error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to generate description',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});