// Organization Schema
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'PropertyHub',
  description: 'Leading real estate management platform for buying, selling, and renting properties',
  url: 'https://propertyhub.com',
  logo: 'https://propertyhub.com/images/logo.png',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-555-123-4567',
    contactType: 'Customer Service',
    email: 'info@propertyhub.com',
    areaServed: 'US',
    availableLanguage: ['English'],
  },
  sameAs: [
    'https://www.facebook.com/propertyhub',
    'https://twitter.com/propertyhub',
    'https://www.instagram.com/propertyhub',
    'https://www.linkedin.com/company/propertyhub',
  ],
  address: {
    '@type': 'PostalAddress',
    streetAddress: '123 Real Estate Ave',
    addressLocality: 'New York',
    addressRegion: 'NY',
    postalCode: '10001',
    addressCountry: 'US',
  },
};

// WebSite Schema with Search Action
export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'PropertyHub',
  url: 'https://propertyhub.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://propertyhub.com/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

// Product/Service Schema for Pricing
export const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Real Estate Platform',
  provider: {
    '@type': 'Organization',
    name: 'PropertyHub',
  },
  areaServed: {
    '@type': 'Country',
    name: 'United States',
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Real Estate Services',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Free Plan',
          description: 'Perfect for browsing and exploring properties',
        },
        price: '0',
        priceCurrency: 'USD',
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Pro Plan',
          description: 'For serious buyers, sellers, and renters',
        },
        price: '29',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '29',
          priceCurrency: 'USD',
          referenceQuantity: {
            '@type': 'QuantitativeValue',
            value: '1',
            unitCode: 'MON',
          },
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Enterprise Plan',
          description: 'For professionals and property managers',
        },
        price: '99',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '99',
          priceCurrency: 'USD',
          referenceQuantity: {
            '@type': 'QuantitativeValue',
            value: '1',
            unitCode: 'MON',
          },
        },
      },
    ],
  },
};

// AggregateRating Schema for Testimonials
export const aggregateRatingSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'PropertyHub Real Estate Platform',
  description: 'Comprehensive real estate management platform',
  brand: {
    '@type': 'Brand',
    name: 'PropertyHub',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    bestRating: '5',
    worstRating: '1',
    ratingCount: '100000',
    reviewCount: '6',
  },
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '99',
    priceCurrency: 'USD',
    offerCount: '3',
  },
};

// BreadcrumbList Schema
export const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://propertyhub.com',
    },
  ],
};

// FAQ Schema (for potential FAQ section)
export const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I search for properties?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Use our advanced search bar to filter by location, property type, price range, and more. Our AI-powered recommendations help you find your perfect property.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is my transaction secure?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, we use bank-level encryption and secure payment processing. All listings are verified, and we provide comprehensive transaction protection.',
      },
    },
    {
      '@type': 'Question',
      name: 'What are the pricing plans?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We offer three plans: Free (browse unlimited properties), Pro ($29/month with advanced features), and Enterprise ($99/month for professionals).',
      },
    },
  ],
};

// Combined Schema for Landing Page
export const landingPageSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    organizationSchema,
    websiteSchema,
    serviceSchema,
    aggregateRatingSchema,
    breadcrumbSchema,
  ],
};