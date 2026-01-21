import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import GenericOnboardingTour from '@/components/dashboard/GenericOnboardingTour';
import { BUYER_TOUR_STEPS } from '@/config/tourSteps';
import { PropertyRecommendations } from '@/components/buyer/PropertyRecommendations';
import { RecentlyViewed } from '@/components/dashboard/RecentlyViewed';
import { MarketTrendInsights } from '@/components/dashboard/MarketTrendInsights';
import { PropertyAlerts } from '@/components/buyer/PropertyAlerts';
import { NeighborhoodComparison } from '@/components/buyer/NeighborhoodComparison';
import { PropertyDetailsModal } from '@/components/buyer/PropertyDetailsModal';
import { TourScheduler } from '@/components/buyer/TourScheduler';
import { OfferCreator } from '@/components/buyer/OfferCreator';
import { PropertyComparison } from '@/components/buyer/PropertyComparison';
import { TaxSummaryCard } from '@/components/dashboard/tax/TaxSummaryCard';
import { DeductionTracker } from '@/components/dashboard/tax/DeductionTracker';
import { TaxCalendar } from '@/components/dashboard/tax/TaxCalendar';
import { TaxSavingsCalculator } from '@/components/dashboard/tax/TaxSavingsCalculator';
import { useBuyerDashboard } from '@/hooks/useBuyerDashboard';
import { useToast } from '@/hooks/use-toast';
import { taxService } from '@/services/taxService';
import { Property } from '@/types/buyer';
import { TemplateSelector } from '@/components/dashboard/TemplateSelector';
import { DashboardTemplate } from '@/types/dashboard';
import { EnhancedStatCard } from '@/components/dashboard/shared/EnhancedStatCard';
import { EnhancedChartContainer } from '@/components/dashboard/shared/EnhancedChartContainer';
import { TaxSummary, TaxDeduction, TaxCalendarEvent } from '@/types/tax';
import {
  Heart,
  Calendar,
  FileText,
  CheckCircle2,
  GitCompare,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OfferData {
  offerAmount: number;
  earnestMoney: number;
  downPayment: number;
  closingDate: string;
  contingencies: string[];
  additionalTerms: string;
  financingType: 'cash' | 'conventional' | 'fha' | 'va';
}

export default function BuyerOverview() {
  const { toast } = useToast();
  const [template, setTemplate] = useState<DashboardTemplate>('grid');
  const {
    isLoading,
    allProperties,
    convertedProperties,
    recentlyViewedProperties,
    recommendedProperties,
    wishlistPropertyIds,
    setWishlistPropertyIds,
    viewedPropertyIds,
    setViewedPropertyIds,
    comparisonProperties,
    setComparisonProperties,
    upcomingTours,
    activeOffers,
    mockBuyerProfile,
  } = useBuyerDashboard();

  const [showComparison, setShowComparison] = useState(false);
  const [showTourScheduler, setShowTourScheduler] = useState(false);
  const [tourProperty, setTourProperty] = useState<Property | null>(null);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [detailsProperty, setDetailsProperty] = useState<Property | null>(null);
  const [showOfferCreator, setShowOfferCreator] = useState(false);
  const [offerProperty, setOfferProperty] = useState<Property | null>(null);

  // Tax Center State
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [taxDeductions, setTaxDeductions] = useState<TaxDeduction[]>([]);
  const [taxCalendar, setTaxCalendar] = useState<TaxCalendarEvent[]>([]);
  const [taxLoading, setTaxLoading] = useState(true);

  useEffect(() => {
    const loadTaxData = async () => {
      setTaxLoading(true);
      try {
        const [summary, deductions, calendar] = await Promise.all([
          taxService.getBuyerTaxSummary('buyer_123'),
          taxService.getFirstTimeBuyerCredits(),
          taxService.getTaxCalendar(2025)
        ]);
        setTaxSummary(summary);
        setTaxDeductions(deductions);
        setTaxCalendar(calendar);
      } catch (error) {
        console.error('Failed to load tax data', error);
      } finally {
        setTaxLoading(false);
      }
    };
    loadTaxData();
  }, []);

  const handleToggleWishlist = (propertyId: string) => {
    setWishlistPropertyIds((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );
  };

  const handleScheduleTour = (propertyId: string) => {
    const property = allProperties.find((p) => p.id === propertyId);
    if (property) {
      setTourProperty(property);
      setShowTourScheduler(true);
    }
  };

  const handleViewDetails = (property: Property) => {
    if (!viewedPropertyIds.includes(property.id)) {
      setViewedPropertyIds((prev) => [property.id, ...prev.slice(0, 9)]);
    }
    setDetailsProperty(property);
    setShowPropertyDetails(true);
  };

  const handleMakeOffer = (propertyId: string) => {
    const property = allProperties.find((p) => p.id === propertyId);
    if (property) {
      setOfferProperty(property);
      setShowOfferCreator(true);
    }
  };

  const handleRemoveFromComparison = (propertyId: string) => {
    setComparisonProperties((prev) => prev.filter((p) => p.id !== propertyId));
  };

  const handleTourScheduled = (tourDetails: {
    date: string;
    time: string;
    type: string;
    notes?: string;
  }) => {
    toast({
      title: "Tour Scheduled",
      description: `Tour scheduled for ${tourDetails.date} at ${tourDetails.time}`,
    });
    setShowTourScheduler(false);
  };

  const handleOfferSubmit = (offerData: OfferData) => {
    toast({
      title: "Offer Submitted",
      description: "Your offer has been submitted successfully!",
    });
    setShowOfferCreator(false);
  };

  const handleTaxSavingsCalculate = async (deductions: number, taxBracket: number): Promise<number> => {
    // Simple calculation: deductions * tax bracket percentage
    return Math.round(deductions * (taxBracket / 100));
  };

  const renderQuickStats = () => {
    if (isLoading) {
      return Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ));
    }

    return (
      <>
        <EnhancedStatCard
          label="Saved Properties"
          value={wishlistPropertyIds.length}
          icon={Heart}
          colorScheme="primary"
          trend={{ value: 2, direction: 'up', label: 'New this week' }}
          onClick={() => {}}
        />

        <EnhancedStatCard
          label="Upcoming Tours"
          value={upcomingTours}
          icon={Calendar}
          colorScheme="secondary"
          trend={{ value: 1, direction: 'up', label: 'Scheduled' }}
        />

        <EnhancedStatCard
          label="Active Offers"
          value={activeOffers}
          icon={FileText}
          colorScheme="accent"
          trend={{ value: 0, direction: 'up', label: 'Pending review' }}
        />

        <EnhancedStatCard
          label="Pre-qualified"
          value={`$${(mockBuyerProfile.prequalificationAmount! / 1000).toFixed(0)}K`}
          icon={CheckCircle2}
          colorScheme="success"
          trend={{ value: 0, direction: 'up', label: 'Valid for 30 days' }}
        />
      </>
    );
  };

  return (
    <ErrorBoundary>
      <GenericOnboardingTour steps={BUYER_TOUR_STEPS} storageKey="buyer-dashboard-tour-completed" />

      <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Buyer Dashboard</h1>
            <p className="text-gray-500 mt-2 text-lg">Find your dream home and track your offers.</p>
          </div>
          <TemplateSelector
            dashboardId="buyer-overview"
            currentTemplate={template}
            onTemplateChange={setTemplate}
          />
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderQuickStats()}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recommendations Section */}
            <EnhancedChartContainer
              title="Recommended for You"
              description="Properties matching your criteria"
            >
              <div className="h-full overflow-y-auto pr-2">
                <PropertyRecommendations
                  recommendations={recommendedProperties}
                  onViewDetails={handleViewDetails}
                  onToggleWishlist={handleToggleWishlist}
                  wishlistIds={wishlistPropertyIds}
                />
              </div>
            </EnhancedChartContainer>

            {/* Recently Viewed */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Recently Viewed</h2>
                <Button variant="ghost" size="sm" className="text-primary-600">View All</Button>
              </div>
              <RecentlyViewed
                properties={recentlyViewedProperties}
                onViewDetails={handleViewDetails}
                onToggleWishlist={handleToggleWishlist}
                onScheduleTour={handleScheduleTour}
                wishlistedPropertyIds={wishlistPropertyIds}
              />
            </div>

            {/* Market Insights */}
            <MarketTrendInsights properties={convertedProperties} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Tax Center Widget */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Tax Center</h3>
                <Badge variant="secondary" className="bg-primary-100 text-primary-700">New</Badge>
              </div>
              <div className="p-4 space-y-4">
                <TaxSummaryCard summary={taxSummary} isLoading={taxLoading} />
                <TaxSavingsCalculator onCalculate={handleTaxSavingsCalculate} />
                <div className="pt-2">
                  <Button variant="outline" className="w-full text-sm">View Full Tax Report</Button>
                </div>
              </div>
            </div>

            <PropertyAlerts />
            <NeighborhoodComparison />
          </div>
        </div>

        {comparisonProperties.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Button
              onClick={() => setShowComparison(true)}
              className="shadow-xl bg-gray-900 text-white hover:bg-gray-800 rounded-full px-6 py-6 h-auto"
              size="lg"
            >
              <GitCompare className="w-5 h-5 mr-2" />
              Compare ({comparisonProperties.length})
            </Button>
          </div>
        )}
      </div>

      {showComparison && (
        <PropertyComparison
          properties={comparisonProperties}
          onRemoveProperty={handleRemoveFromComparison}
          onClose={() => setShowComparison(false)}
        />
      )}

      {showTourScheduler && tourProperty && (
        <TourScheduler
          propertyId={tourProperty.id}
          propertyTitle={tourProperty.title}
          propertyAddress={`${tourProperty.address}, ${tourProperty.city}`}
          onClose={() => {
            setShowTourScheduler(false);
            setTourProperty(null);
          }}
          onSchedule={handleTourScheduled}
        />
      )}

      {showPropertyDetails && detailsProperty && (
        <PropertyDetailsModal
          property={detailsProperty}
          onClose={() => {
            setShowPropertyDetails(false);
            setDetailsProperty(null);
          }}
          onToggleWishlist={handleToggleWishlist}
          onScheduleTour={handleScheduleTour}
          onMakeOffer={handleMakeOffer}
          isInWishlist={wishlistPropertyIds.includes(detailsProperty.id)}
          similarProperties={allProperties.filter((p) => p.id !== detailsProperty.id).slice(0, 4)}
        />
      )}

      {showOfferCreator && offerProperty && (
        <OfferCreator
          property={offerProperty}
          onClose={() => {
            setShowOfferCreator(false);
            setOfferProperty(null);
          }}
          onSubmit={handleOfferSubmit}
        />
      )}
    </ErrorBoundary>
  );
}