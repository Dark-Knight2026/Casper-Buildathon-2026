import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Home, Users, DollarSign, Star, Award, TrendingUp } from 'lucide-react';

const statistics = [
  {
    icon: Home,
    value: '50,000+',
    label: 'Properties Listed',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Users,
    value: '100,000+',
    label: 'Happy Clients',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: DollarSign,
    value: '$2.5B+',
    label: 'Transaction Volume',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Star,
    value: '4.9/5',
    label: 'Average Rating',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Award,
    value: '98.5%',
    label: 'Satisfaction Rate',
    color: 'from-red-500 to-pink-500',
  },
  {
    icon: TrendingUp,
    value: '150+',
    label: 'Cities Covered',
    color: 'from-indigo-500 to-purple-500',
  },
];

export default function StatisticsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" style={{ backgroundSize: '200% 200%' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Trusted by Thousands
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
            Join a growing community of satisfied clients who found their perfect property
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8">
          {statistics.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center group"
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-sm sm:text-base text-gray-300">
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 pt-16 border-t border-white/10"
        >
          <p className="text-center text-gray-300 mb-8">Trusted by leading organizations</p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {['Partner 1', 'Partner 2', 'Partner 3', 'Partner 4', 'Partner 5'].map((partner, index) => (
              <div
                key={index}
                className="text-white/60 hover:text-white transition-colors duration-300 text-lg font-semibold"
              >
                {partner}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}