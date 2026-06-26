import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Search, FileCheck, Key } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Search & Discover',
    description: 'Browse thousands of verified properties with advanced filters and AI-powered recommendations.',
    color: 'from-blue-500 to-cyan-500',
    number: '01',
  },
  {
    icon: FileCheck,
    title: 'Review & Compare',
    description: 'Compare properties, view detailed analytics, and schedule virtual or in-person tours.',
    color: 'from-purple-500 to-pink-500',
    number: '02',
  },
  {
    icon: Key,
    title: 'Secure & Move In',
    description: 'Complete secure transactions with digital documentation and move into your dream property.',
    color: 'from-green-500 to-emerald-500',
    number: '03',
  },
];

export default function HowItWorksSection() {
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
            How It Works
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Three simple steps to find and secure your perfect property
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection Line - Desktop Only */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 transform -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="relative"
                >
                  <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 group hover:-translate-y-2">
                    {/* Step Number */}
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-r from-gray-900 to-gray-700 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto lg:mx-0`}>
                      <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 text-center lg:text-left">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed text-center lg:text-left">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow - Mobile Only */}
                  {index < steps.length - 1 && (
                    <div className="lg:hidden flex justify-center my-6">
                      <div className="w-1 h-12 bg-gradient-to-b from-gray-300 to-gray-400 rounded-full" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}