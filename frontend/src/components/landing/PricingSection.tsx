import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

const pricingPlans = [
  {
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for browsing and exploring properties',
    badge: null,
    features: [
      'Browse unlimited properties',
      'Save up to 10 favorites',
      'Basic search filters',
      'Email notifications',
      'Mobile app access',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: 29,
    period: 'month',
    description: 'For serious buyers, sellers, and renters',
    badge: 'Most Popular',
    features: [
      'Everything in Free',
      'Unlimited saved properties',
      'Advanced search & filters',
      'Market analytics & insights',
      'Priority support',
      'Virtual tour scheduling',
      'Price drop alerts',
      'Neighborhood reports',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    period: 'month',
    description: 'For professionals and property managers',
    badge: null,
    features: [
      'Everything in Pro',
      'Multi-property management',
      'Team collaboration tools',
      'Custom branding',
      'API access',
      'Dedicated account manager',
      'Advanced analytics',
      'White-label solution',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the plan that's right for you. No hidden fees, cancel anytime.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={plan.popular ? 'lg:-mt-4' : ''}
            >
              <Card
                className={`h-full border-2 transition-all duration-300 hover:shadow-2xl ${
                  plan.popular
                    ? 'border-purple-500 shadow-xl scale-105'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <CardHeader className="text-center pb-8 pt-8">
                  {plan.badge && (
                    <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                      {plan.badge}
                    </Badge>
                  )}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600 ml-2">/ {plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full h-12 font-semibold transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Money-back guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-gray-600">
            All paid plans include a <span className="font-semibold text-gray-900">30-day money-back guarantee</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}