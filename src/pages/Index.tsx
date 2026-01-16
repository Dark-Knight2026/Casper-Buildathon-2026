import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Bot, 
  PieChart, 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function Index() {
  const features = [
    {
      icon: Building2,
      title: 'Property Management',
      description: 'Comprehensive tools for managing both long-term and short-term rentals'
    },
    {
      icon: Bot,
      title: 'AI-Powered Agents',
      description: 'Automated marketing, customer service, payments, and maintenance coordination'
    },
    {
      icon: PieChart,
      title: 'Fractional Ownership',
      description: 'Enable fractional equity sales and investment opportunities'
    },
    {
      icon: Users,
      title: 'Tenant Management',
      description: 'Streamlined lease agreements, renewals, and terminations'
    },
    {
      icon: Shield,
      title: 'Blockchain Security',
      description: 'Built on Casper Network for transparent and secure transactions'
    },
    {
      icon: Zap,
      title: 'Smart Automation',
      description: 'Automated rent collection, maintenance scheduling, and lease management'
    }
  ];

  const benefits = [
    'Decentralized property ownership and management',
    'AI-driven tenant screening and marketing',
    'Automated payment processing and collections',
    'Smart contract-based lease agreements',
    'Fractional investment opportunities',
    'Real-time property analytics and reporting'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <Badge className="mb-4 bg-blue-500/20 text-blue-100 border-blue-400/30">
              Powered by Casper Network
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              The Future of
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">
                Real Estate Management
              </span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              A comprehensive DApp combining AI agents, fractional ownership, and blockchain technology 
              to revolutionize property management on the Casper Network.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                  Launch Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/properties">
                <Button size="lg" variant="outline" className="border-blue-300 text-white hover:bg-blue-700">
                  Explore Properties
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Property Management Suite
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Leverage cutting-edge AI and blockchain technology to streamline every aspect 
              of real estate management and investment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Why Choose PropDApp?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our platform combines the power of blockchain technology with intelligent automation 
                to create the most advanced property management solution available.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:pl-8">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-2xl text-blue-900">
                    Ready to Get Started?
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Join the future of decentralized real estate management today.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to="/dashboard">
                    <Button className="w-full" size="lg">
                      Access Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/fractional">
                    <Button variant="outline" className="w-full" size="lg">
                      Explore Investments
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}