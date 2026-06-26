import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Clock, Award } from 'lucide-react';

export default function FinalCTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-600 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Find Your Perfect Property?
          </h2>
          <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto mb-12">
            Join thousands of satisfied clients and start your property journey today. No credit card required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100 h-14 px-8 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 group"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-2 border-white text-white hover:bg-white/10 h-14 px-8 text-lg font-semibold"
            >
              Schedule a Demo
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center text-white"
            >
              <Shield className="h-10 w-10 mb-3" />
              <h3 className="font-semibold mb-1">Secure & Safe</h3>
              <p className="text-sm text-white/80">Bank-level encryption</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col items-center text-white"
            >
              <Clock className="h-10 w-10 mb-3" />
              <h3 className="font-semibold mb-1">24/7 Support</h3>
              <p className="text-sm text-white/80">Always here to help</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col items-center text-white"
            >
              <Award className="h-10 w-10 mb-3" />
              <h3 className="font-semibold mb-1">Money-Back Guarantee</h3>
              <p className="text-sm text-white/80">30-day refund policy</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}