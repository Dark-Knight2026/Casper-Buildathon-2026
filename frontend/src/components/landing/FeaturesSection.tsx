import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Shield,
  TrendingUp,
  Users,
  FileText,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Search,
    title: 'Advanced Search',
    description: 'Find your perfect property with powerful filters, AI-powered recommendations, and real-time market data.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Secure Transactions',
    description: 'Bank-level encryption, verified listings, and secure payment processing for peace of mind.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: TrendingUp,
    title: 'Market Analytics',
    description: 'Real-time market trends, price predictions, and investment insights powered by AI.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Users,
    title: 'Expert Support',
    description: '24/7 customer support from real estate professionals ready to assist you.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: FileText,
    title: 'Digital Documentation',
    description: 'E-signatures, document storage, and automated paperwork for seamless transactions.',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    icon: Zap,
    title: 'Instant Notifications',
    description: 'Get real-time alerts for new listings, price changes, and important updates.',
    color: 'from-yellow-500 to-orange-500',
  },
];

export default function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Why Choose Our Platform
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to buy, sell, or rent properties with confidence
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group hover:-translate-y-2">
                  <CardContent className="p-6 sm:p-8">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}