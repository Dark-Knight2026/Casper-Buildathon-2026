import { lazy, Suspense, useEffect } from 'react';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import StatisticsSection from '@/components/landing/StatisticsSection';
import FinalCTASection from '@/components/landing/FinalCTASection';
import FooterSection from '@/components/landing/FooterSection';
import SkeletonLoader from '@/components/landing/SkeletonLoader';
import SEOHead from '@/components/SEOHead';
import { landingPageSchema } from '@/utils/structuredData';
import { trackPageView, trackScrollDepth, trackTimeOnPage } from '@/utils/analytics';

// Lazy load heavy components
const TestimonialsSection = lazy(() => import('@/components/landing/TestimonialsSection'));
const PricingSection = lazy(() => import('@/components/landing/PricingSection'));

export default function EnhancedHomePage() {
  useEffect(() => {
    // Track page view
    trackPageView('/');

    // Track scroll depth
    let maxScroll = 0;
    const handleScroll = () => {
      const scrollPercentage = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      if (scrollPercentage > maxScroll && scrollPercentage % 25 === 0) {
        maxScroll = scrollPercentage;
        trackScrollDepth(scrollPercentage);
      }
    };

    // Track time on page
    const startTime = Date.now();
    const trackTime = () => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);
      trackTimeOnPage(timeOnPage);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('beforeunload', trackTime);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', trackTime);
    };
  }, []);

  return (
    <>
      {/* SEO Meta Tags and Structured Data */}
      <SEOHead
        title="Find Your Dream Property | Real Estate Management Platform"
        description="Discover exceptional properties for rent, sale, and investment. Browse 50,000+ verified listings with advanced search, secure transactions, and expert support. 98.5% satisfaction rate."
        keywords="real estate, property search, homes for sale, rental properties, investment properties, buy house, sell house, property management, real estate platform, property listings"
        ogImage="https://propertyhub.com/images/og-image.jpg"
        ogUrl="https://propertyhub.com"
        canonicalUrl="https://propertyhub.com"
        structuredData={landingPageSchema}
      />

      <div className="min-h-screen">
        {/* Critical above-the-fold content - load immediately */}
        <HeroSection />
        
        {/* Below-the-fold content - load immediately but could be optimized further */}
        <FeaturesSection />
        <HowItWorksSection />
        
        {/* Heavy components - lazy load with skeleton loaders */}
        <Suspense 
          fallback={
            <div className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SkeletonLoader type="testimonials" count={3} />
              </div>
            </div>
          }
        >
          <TestimonialsSection />
        </Suspense>
        
        <Suspense 
          fallback={
            <div className="py-16 sm:py-20 lg:py-24 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SkeletonLoader type="pricing" count={3} />
              </div>
            </div>
          }
        >
          <PricingSection />
        </Suspense>
        
        <StatisticsSection />
        <FinalCTASection />
        <FooterSection />
      </div>
    </>
  );
}