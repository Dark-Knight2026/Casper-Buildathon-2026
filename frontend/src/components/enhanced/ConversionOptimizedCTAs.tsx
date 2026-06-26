import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowRight,
  Calendar,
  MessageSquare,
  Star,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  Home,
  DollarSign
} from 'lucide-react';

interface CTAProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Extracted components to avoid re-creation on every render
const PrimaryCTA = ({ variant = 'primary', size = 'lg', className = '' }: CTAProps) => {
  const { user, isAuthenticated } = useAuth();
  
  const getCTAContent = () => {
    if (!isAuthenticated || !user) {
      return { text: "Get Your Free Property Analysis", subtext: "See your home's value in 60 seconds", icon: <TrendingUp className="h-5 w-5" /> };
    }
    switch (user.role) {
      case 'buyer': return { text: "Schedule Private Property Tours", subtext: "Book viewings with local experts", icon: <Calendar className="h-5 w-5" /> };
      case 'seller': return { text: "Get a Free Market Analysis", subtext: "Know your property's true value", icon: <DollarSign className="h-5 w-5" /> };
      case 'landlord': return { text: "List Your Rental Property", subtext: "Find quality tenants fast", icon: <Home className="h-5 w-5" /> };
      default: return { text: "Access Your Dashboard", subtext: "Manage your real estate business", icon: <ArrowRight className="h-5 w-5" /> };
    }
  };
  const ctaContent = getCTAContent();
  return (
    <Button size={size} className={`group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}>
      <div className="flex items-center space-x-3">
        {ctaContent.icon}
        <div className="text-left">
          <div className="font-semibold">{ctaContent.text}</div>
          <div className="text-xs opacity-90">{ctaContent.subtext}</div>
        </div>
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </div>
      <div className="absolute inset-0 bg-white/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
    </Button>
  );
};

const QuickContactCTA = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 2000);
  };
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Get Instant Property Alerts</h3>
          <p className="text-gray-600">Be the first to know about new listings in your area.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12" />
          <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? 'Setting up alerts...' : 'Get Property Alerts'}
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-3 text-center">No spam. Unsubscribe anytime.</p>
      </CardContent>
    </Card>
  );
};

const SocialProofCTA = () => (
  <Card className="bg-white shadow-lg border-0">
    <CardContent className="p-6 text-center">
      <div className="flex justify-center mb-3">
        {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />)}
      </div>
      <p className="text-lg font-semibold text-gray-900 mb-2">"Best real estate experience ever!"</p>
      <p className="text-gray-600 mb-4">"The KeyChain team helped us find our dream home in just 2 weeks. Professional, knowledgeable, and truly caring."</p>
      <div className="flex items-center justify-center space-x-3 mb-4">
        <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
        <div>
          <p className="font-medium text-gray-900">Sarah & Mike Johnson</p>
          <p className="text-sm text-gray-600">Virginia Beach Homeowners</p>
        </div>
      </div>
      <Button className="w-full bg-green-600 hover:bg-green-700">
        <MessageSquare className="h-4 w-4 mr-2" /> Read More Success Stories
      </Button>
    </CardContent>
  </Card>
);

const UrgencyCTA = () => (
  <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
    <CardContent className="p-6">
      <div className="flex items-start space-x-4">
        <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Clock className="h-6 w-6 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Limited Time: Free Home Valuation</h3>
          <p className="text-gray-600 mb-3">Get a professional property analysis worth $500, completely free. Only 50 spots available this month.</p>
          <div className="flex items-center space-x-4 mb-4">
            <Badge className="bg-red-100 text-red-800"><Clock className="h-3 w-3 mr-1" />48 hours left</Badge>
            <Badge className="bg-orange-100 text-orange-800"><Users className="h-3 w-3 mr-1" />12 spots remaining</Badge>
          </div>
          <Button className="w-full bg-red-600 hover:bg-red-700">
            <CheckCircle className="h-4 w-4 mr-2" /> Claim Your Free Valuation
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

// eslint-disable-next-line react-refresh/only-export-components
export function useConversionOptimizedCTAs() {
  return { PrimaryCTA, QuickContactCTA, SocialProofCTA, UrgencyCTA };
}

// Example showcase component
export function CTAShowcase() {
  const { PrimaryCTA, QuickContactCTA, SocialProofCTA, UrgencyCTA } = useConversionOptimizedCTAs();
  return (
    <div className="space-y-12 p-8">
      <section className="flex flex-col sm:flex-row gap-4 justify-center">
        <PrimaryCTA />
      </section>
      <section className="grid md:grid-cols-2 gap-8">
        <QuickContactCTA />
        <SocialProofCTA />
      </section>
      <section>
        <UrgencyCTA />
      </section>
    </div>
  );
}