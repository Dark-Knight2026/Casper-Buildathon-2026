import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import FeaturedProperties from '@/components/FeaturedProperties';
import LandingHeader from '@/components/LandingHeader';
import {
  Search,
  Home,
  TrendingUp,
  Shield,
  Users,
  Star,
  ChevronRight,
  Play,
  Award,
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export default function PropertyLanding() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: <Search className="h-8 w-8 text-primary" />,
      title: "Smart Property Search",
      description: "AI-powered search that understands your preferences and finds your perfect match.",
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Secure Transactions",
      description: "Bank-level security with encrypted communications and verified listings.",
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Expert Guidance",
      description: "Connect with top-rated agents and get professional advice every step of the way.",
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Market Insights",
      description: "Real-time market data and analytics to make informed decisions.",
    }
  ];

  const stats = [
    { number: "50K+", label: "Properties Listed", icon: <Home className="h-6 w-6" /> },
    { number: "25K+", label: "Happy Clients", icon: <Users className="h-6 w-6" /> },
    { number: "500+", label: "Expert Agents", icon: <Award className="h-6 w-6" /> },
    { number: "99%", label: "Success Rate", icon: <Star className="h-6 w-6" /> }
  ];

  return (
    <div className="min-h-screen bg-secondary">
      <LandingHeader />
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-border">
        <div className="absolute inset-0" style={{ backgroundImage: "url('/images/ModernApartment.jpg')", backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: "center 30%" }} />
        <div className="absolute inset-0 bg-primary/75" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-full pt-20
        ">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* <Badge className="mb-4 mt-4 bg-white/20 text-white border-white/30">
              New Enhanced Features Available
            </Badge> */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Find Your{' '}
              <span className="text-white/80">Dream Home</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/70 mb-8 max-w-3xl mx-auto leading-relaxed">
              Discover the perfect property with our AI-powered platform. From cozy apartments to luxury estates,
              we make finding your next home effortless and exciting.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                onClick={() => navigate('/listings')}
                size="lg"
                className="px-8 py-4 bg-white text-primary hover:bg-white/90 text-lg font-semibold rounded-md shadow-sm"
              >
                <Search className="mr-2 h-5 w-5" />
                Explore Properties
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-4 bg-transparent border-white text-white hover:bg-white/10 hover:text-white text-lg font-semibold rounded-md"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                >
                  <div className="flex items-center justify-center mb-2 text-white/80">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.number}</div>
                  <div className="text-white/60 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="py-20 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-secondary text-secondary-foreground border-border">
              Featured Listings
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Discover Amazing{' '}
              <span className="text-primary">Properties</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Handpicked properties from our premium collection. Each listing is verified and comes with detailed insights.
            </p>
          </div>
          <FeaturedProperties />
        </div>
      </section>

      {/* Why Choose Our Platform Section */}
      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-background text-secondary-foreground border-border">
              Why Choose Us
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Built for Modern{' '}
              <span className="text-primary">Home Buyers</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience the future of real estate with cutting-edge technology and personalized service.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-background border border-border rounded-md hover:shadow-md transition-shadow duration-200"
              >
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 mx-auto mb-6 rounded-md bg-secondary flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-secondary text-secondary-foreground border-border">
              Simple Process
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              How It{' '}
              <span className="text-primary">Works</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Finding your dream home has never been easier. Follow these simple steps to get started.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Search & Discover",
                description: "Use our advanced filters to find properties that match your criteria perfectly.",
                icon: <Search className="h-8 w-8 text-primary" />
              },
              {
                step: "02",
                title: "Connect & Explore",
                description: "Schedule viewings and connect with verified agents for expert guidance.",
                icon: <Users className="h-8 w-8 text-primary" />
              },
              {
                step: "03",
                title: "Secure & Move",
                description: "Complete secure transactions and get the keys to your new home.",
                icon: <CheckCircle className="h-8 w-8 text-primary" />
              }
            ].map((item, index) => (
              <div key={index} className="text-center relative">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
                  {item.icon}
                </div>
                <div className="text-sm font-bold text-primary mb-2">STEP {item.step}</div>
                <h3 className="text-2xl font-bold text-foreground mb-4">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                {index < 2 && (
                  <ChevronRight className="hidden md:block absolute top-10 -right-4 h-8 w-8 text-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Find Your Dream Home?
          </h2>
          <p className="text-xl mb-8 opacity-80">
            Join thousands of satisfied customers who found their perfect property with us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/listings')}
              size="lg"
              variant="secondary"
              className="px-8 py-4 text-lg font-semibold rounded-md"
            >
              <Search className="mr-2 h-5 w-5" />
              Start Your Search
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-4 text-lg font-semibold rounded-md border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Clock className="mr-2 h-5 w-5" />
              Schedule Consultation
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
