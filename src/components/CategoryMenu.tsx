import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Home, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Plus, 
  Search, 
  Filter,
  ArrowRight,
  Building,
  Key,
  Handshake,
  PieChart
} from 'lucide-react';

interface CategoryMenuProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  propertyCounts: {
    buy: number;
    sell: number;
    rent: number;
    investment: number;
  };
}

export default function CategoryMenu({ activeCategory, onCategoryChange, propertyCounts }: CategoryMenuProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const categories = [
    {
      id: 'buy',
      title: 'Buy Properties',
      subtitle: 'Find Your Dream Home',
      description: 'Properties listed for sale or lease-to-own. Build equity and own your dream property.',
      icon: Home,
      color: 'from-green-600 to-emerald-600',
      bgColor: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      count: propertyCounts.buy,
      features: [
        'Direct Purchase Options',
        'Lease-to-Own Programs',
        'Mortgage Assistance',
        'Property Inspections',
        'Legal Documentation'
      ],
      actions: [
        { label: 'Browse Properties', action: () => onCategoryChange('for-sale') },
        { label: 'Saved Properties', action: () => onCategoryChange('favorites') },
        { label: 'Price Alerts', action: () => {} }
      ]
    },
    {
      id: 'sell',
      title: 'Sell Properties',
      subtitle: 'List Your Property',
      description: 'List your properties for sale on our platform. Reach thousands of potential buyers.',
      icon: DollarSign,
      color: 'from-blue-600 to-cyan-600',
      bgColor: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      count: 0, // This would be user's listings
      features: [
        'Professional Photography',
        'Market Analysis',
        'Listing Optimization',
        'Buyer Screening',
        'Transaction Support'
      ],
      actions: [
        { label: 'List Property', action: () => {} },
        { label: 'My Listings', action: () => {} },
        { label: 'Market Insights', action: () => {} }
      ]
    },
    {
      id: 'rent',
      title: 'Rent Properties',
      subtitle: 'Flexible Living Solutions',
      description: 'Daily, monthly, and lease-to-own rental options. Find your perfect temporary or long-term home.',
      icon: Calendar,
      color: 'from-purple-600 to-pink-600',
      bgColor: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-800',
      count: propertyCounts.rent,
      features: [
        'Daily Rentals',
        'Monthly Leases',
        'Flexible Terms',
        'Furnished Options',
        'Utilities Included'
      ],
      actions: [
        { label: 'Find Rentals', action: () => onCategoryChange('rentals') },
        { label: 'Application Status', action: () => {} },
        { label: 'Rental History', action: () => {} }
      ]
    },
    {
      id: 'investment',
      title: 'Investment Properties',
      subtitle: 'Build Your Portfolio',
      description: 'Equity investment opportunities in real estate portfolios with professional management and returns.',
      icon: TrendingUp,
      color: 'from-orange-600 to-red-600',
      bgColor: 'from-orange-50 to-red-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-800',
      count: propertyCounts.investment,
      features: [
        'Equity Investments',
        'Professional Management',
        'Quarterly Returns',
        'Portfolio Diversification',
        'Exit Strategies'
      ],
      actions: [
        { label: 'View Opportunities', action: () => onCategoryChange('investment') },
        { label: 'My Investments', action: () => {} },
        { label: 'Performance Reports', action: () => {} }
      ]
    }
  ];

  return (
    <div className="w-full">
      {/* Main Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {categories.map((category) => {
          const IconComponent = category.icon;
          const isActive = activeCategory === category.id || 
            (category.id === 'buy' && activeCategory === 'for-sale') ||
            (category.id === 'rent' && activeCategory === 'rentals');
          const isHovered = hoveredCategory === category.id;

          return (
            <Card
              key={category.id}
              className={`relative overflow-hidden transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-xl ${
                isActive ? `ring-2 ring-opacity-50 ${category.borderColor.replace('border-', 'ring-')}` : ''
              }`}
              onMouseEnter={() => setHoveredCategory(category.id)}
              onMouseLeave={() => setHoveredCategory(null)}
              onClick={() => category.actions[0].action()}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${category.bgColor} opacity-50`} />
              
              {/* Content */}
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-3 rounded-full bg-gradient-to-r ${category.color} text-white shadow-lg`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`${category.bgColor} ${category.textColor} border ${category.borderColor}`}
                  >
                    {category.count} available
                  </Badge>
                </div>
                
                <CardTitle className="text-xl font-bold text-gray-900 mb-1">
                  {category.title}
                </CardTitle>
                <p className="text-sm text-gray-600 font-medium">
                  {category.subtitle}
                </p>
              </CardHeader>

              <CardContent className="relative pt-0">
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  {category.description}
                </p>

                {/* Features List */}
                <div className="space-y-1 mb-4">
                  {category.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center text-xs text-gray-600">
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${category.color} mr-2`} />
                      {feature}
                    </div>
                  ))}
                  {category.features.length > 3 && (
                    <div className="flex items-center text-xs text-gray-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2" />
                      +{category.features.length - 3} more features
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  className={`w-full bg-gradient-to-r ${category.color} hover:opacity-90 text-white shadow-md transition-all duration-200 ${
                    isHovered ? 'shadow-lg' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    category.actions[0].action();
                  }}
                >
                  {category.actions[0].label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>

              {/* Hover Overlay */}
              {isHovered && (
                <div className="absolute inset-0 bg-black bg-opacity-5 pointer-events-none transition-opacity duration-300" />
              )}
            </Card>
          );
        })}
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>List Property</span>
              </Button>
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <span>Advanced Search</span>
              </Button>
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Save Search</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Building className="h-4 w-4" />
              <span>{propertyCounts.buy + propertyCounts.rent + propertyCounts.investment} Total Properties</span>
            </div>
            <div className="flex items-center space-x-1">
              <Key className="h-4 w-4" />
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center space-x-1">
              <Handshake className="h-4 w-4" />
              <span>Verified Listings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category-Specific Menu */}
      {activeCategory !== 'all' && (
        <div className="mt-8">
          {(() => {
            const currentCategory = categories.find(cat => 
              cat.id === activeCategory || 
              (cat.id === 'buy' && activeCategory === 'for-sale') ||
              (cat.id === 'rent' && activeCategory === 'rentals') ||
              cat.id === activeCategory
            );
            
            if (!currentCategory) return null;

            return (
              <Card className={`border-2 ${currentCategory.borderColor} bg-gradient-to-r ${currentCategory.bgColor}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full bg-gradient-to-r ${currentCategory.color} text-white`}>
                        <currentCategory.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className={`${currentCategory.textColor}`}>
                          {currentCategory.title} Menu
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          Specialized tools and options for {currentCategory.title.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${currentCategory.bgColor} ${currentCategory.textColor} border ${currentCategory.borderColor}`}>
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentCategory.actions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={action.action}
                        className={`${currentCategory.borderColor} ${currentCategory.textColor} hover:bg-white/50`}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className={`font-semibold ${currentCategory.textColor} mb-2`}>Available Features:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {currentCategory.features.map((feature, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <PieChart className="h-3 w-3 mr-2 text-gray-400" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}
    </div>
  );
}