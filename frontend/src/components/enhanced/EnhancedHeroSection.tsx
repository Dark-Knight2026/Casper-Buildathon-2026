import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, 
  MapPin, 
  Star, 
  Users, 
  Home, 
  TrendingUp, 
  Shield, 
  Award,
  Play,
  ChevronRight,
  Phone,
  Calendar
} from 'lucide-react';

export default function EnhancedHeroSection() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // Dynamic headlines based on user role
  const getHeadlineForUser = () => {
    if (!isAuthenticated || !user) {
      return {
        main: "Discover Your Dream Property in Virginia Beach",
        sub: "Connect with 25+ real estate professionals for a seamless buying, selling, or investing experience."
      };
    }
    
    switch (user.role) {
      case 'buyer':
        return {
          main: "Find Properties That Match Your Lifestyle",
          sub: "Get personalized recommendations from local experts who know the Virginia Beach market."
        };
      case 'seller':
        return {
          main: "Sell Your Property for Maximum Value",
          sub: "Leverage professional marketing, staging, and negotiation to get the best possible price."
        };
      case 'landlord':
        return {
          main: "Maximize Your Rental Property Returns",
          sub: "Access professional property management and tenant screening services."
        };
      case 'agent':
        return {
          main: "Grow Your Real Estate Business with KeyChain",
          sub: "Access powerful tools and collaborate with 25+ professionals in every transaction."
        };
      case 'broker':
        return {
          main: "Scale Your Brokerage Operations Seamlessly",
          sub: "A comprehensive platform for managing agents, clients, and complex transactions."
        };
      default:
        return {
          main: "Comprehensive Real Estate Services",
          sub: "Expert guidance for all your property needs in Virginia Beach, powered by KeyChain."
        };
    }
  };

  const headlines = getHeadlineForUser();

  // Primary CTAs based on user role
  const getPrimaryCTA = () => {
    if (!isAuthenticated || !user) {
      return { text: "Start Your Property Search", action: "search" };
    }
    
    switch (user.role) {
      case 'buyer':
        return { text: "Schedule Property Tours", action: "schedule" };
      case 'seller':
        return { text: "Get a Free Market Analysis", action: "analysis" };
      case 'landlord':
        return { text: "List Your Rental Property", action: "list" };
      case 'agent':
        return { text: "Go to Agent Dashboard", action: "dashboard" };
      case 'broker':
        return { text: "Manage Your Team", action: "manage" };
      default:
        return { text: "Explore Your Services", action: "explore" };
    }
  };

  const primaryCTA = getPrimaryCTA();

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="flex flex-wrap gap-4 items-center">
              <Badge variant="secondary" className="bg-green-100 text-green-800 px-3 py-1">
                <Shield className="h-3 w-3 mr-1" />
                Licensed & Insured
              </Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-3 py-1">
                <Award className="h-3 w-3 mr-1" />
                Top Rated 2024
              </Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 px-3 py-1">
                <Users className="h-3 w-3 mr-1" />
                25+ Professionals
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                {headlines.main}
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                {headlines.sub}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Home className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">5,000+</p>
                  <p className="text-sm text-gray-600">Properties Listed</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">98%</p>
                  <p className="text-sm text-gray-600">Client Satisfaction</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
                <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">4.9/5</p>
                  <p className="text-sm text-gray-600">Average Rating</p>
                </div>
              </div>
            </div>

            {!isAuthenticated && (
              <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Find Your Perfect Property</h3>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Enter location, property type, or price"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-12 text-base"
                        />
                      </div>
                      <Button size="lg" className="h-12 px-6">
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="h-14 px-8 text-lg font-semibold bg-blue-600 hover:bg-blue-700">
                {primaryCTA.text}
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold border-2">
                <Phone className="h-5 w-5 mr-2" />
                (757) 555-0100
              </Button>
            </div>
          </div>

          {/* Right Column - Visual Content */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              {!isVideoPlaying ? (
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&crop=center"
                    alt="Beautiful Virginia Beach waterfront property"
                    className="w-full h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20"></div>
                  <button
                    onClick={() => setIsVideoPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center group"
                  >
                    <div className="h-20 w-20 bg-white/90 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                      <Play className="h-8 w-8 text-blue-600 ml-1" />
                    </div>
                  </button>
                  <div className="absolute bottom-6 left-6 right-6">
                    <Card className="bg-white/95 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">Oceanfront Villa</h4>
                            <p className="text-sm text-gray-600">Virginia Beach, VA</p>
                            <p className="text-lg font-bold text-blue-600">$1,250,000</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">Just Listed</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="w-full h-[500px] bg-gray-900 flex items-center justify-center">
                  <p className="text-white">Video Player Placeholder</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  );
}