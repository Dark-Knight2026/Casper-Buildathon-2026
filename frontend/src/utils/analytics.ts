// Google Analytics 4 Event Tracking

// Import to ensure Window type augmentation is available
import '@/lib/monitoring/performance';

export interface GAEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

// Initialize Google Analytics (to be called in main app)
export const initGA = (measurementId: string) => {
  if (typeof window !== 'undefined') {
    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: (string | Date | Record<string, unknown>)[]) {
      window.dataLayer.push(args);
    }
    gtag('js', new Date());
    gtag('config', measurementId, {
      page_path: window.location.pathname,
    });
  }
};

// Track page view
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: url,
    });
  }
};

// Track custom event
export const trackEvent = ({ action, category, label, value }: GAEvent) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Predefined event trackers for landing page

export const trackSearchQuery = (query: string, propertyType: string, priceRange: string) => {
  trackEvent({
    action: 'search',
    category: 'Property Search',
    label: `${query} | ${propertyType} | ${priceRange}`,
  });
};

export const trackCTAClick = (ctaLocation: string, ctaText: string) => {
  trackEvent({
    action: 'click',
    category: 'CTA',
    label: `${ctaLocation} - ${ctaText}`,
  });
};

export const trackPricingCardClick = (planName: string, action: string) => {
  trackEvent({
    action: 'click',
    category: 'Pricing',
    label: `${planName} - ${action}`,
  });
};

export const trackNewsletterSignup = (email: string) => {
  trackEvent({
    action: 'signup',
    category: 'Newsletter',
    label: 'Footer Newsletter',
  });
};

export const trackTestimonialNavigation = (direction: 'next' | 'previous', currentIndex: number) => {
  trackEvent({
    action: 'navigate',
    category: 'Testimonials',
    label: direction,
    value: currentIndex,
  });
};

export const trackFeatureCardClick = (featureName: string) => {
  trackEvent({
    action: 'click',
    category: 'Features',
    label: featureName,
  });
};

export const trackSocialClick = (platform: string, location: string) => {
  trackEvent({
    action: 'click',
    category: 'Social Media',
    label: `${platform} - ${location}`,
  });
};

// Conversion tracking
export const trackConversion = (conversionType: string, value?: number) => {
  trackEvent({
    action: 'conversion',
    category: 'Conversions',
    label: conversionType,
    value: value,
  });
};

// User engagement tracking
export const trackScrollDepth = (depth: number) => {
  trackEvent({
    action: 'scroll',
    category: 'Engagement',
    label: `${depth}% scrolled`,
    value: depth,
  });
};

export const trackTimeOnPage = (seconds: number) => {
  trackEvent({
    action: 'time_on_page',
    category: 'Engagement',
    label: 'Landing Page',
    value: seconds,
  });
};

// Note: Window.gtag type is declared in @/lib/monitoring/performance.ts