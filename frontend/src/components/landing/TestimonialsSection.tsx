import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'First-Time Homebuyer',
    image: '/images/Testimonials.jpg',
    rating: 5,
    text: 'The platform made buying my first home incredibly easy. The search filters helped me find exactly what I needed, and the support team guided me through every step.',
  },
  {
    name: 'Michael Chen',
    role: 'Real Estate Investor',
    image: '/images/photo1767966846.jpg',
    rating: 5,
    text: 'As an investor, the market analytics and ROI calculators are invaluable. I\'ve closed 5 deals in 6 months using this platform. Highly recommended!',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Property Manager',
    image: '/images/PropertyManagement.jpg',
    rating: 5,
    text: 'Managing multiple properties has never been easier. The tenant screening and automated documentation save me hours every week.',
  },
  {
    name: 'David Thompson',
    role: 'Landlord',
    image: '/images/RentalManagement.jpg',
    rating: 5,
    text: 'The rental management tools are fantastic. I can track payments, maintenance requests, and communicate with tenants all in one place.',
  },
  {
    name: 'Jessica Martinez',
    role: 'Home Seller',
    image: '/images/HomeSeller.jpg',
    rating: 5,
    text: 'Sold my house in just 3 weeks! The professional photography and listing optimization made all the difference. Couldn\'t be happier!',
  },
  {
    name: 'Robert Anderson',
    role: 'Commercial Buyer',
    image: '/images/CommercialRealEstate.jpg',
    rating: 5,
    text: 'The commercial property search tools are top-notch. Found the perfect office space for my growing business. Excellent service!',
  },
];

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const itemsPerPage = 3;
  const maxIndex = Math.max(0, testimonials.length - itemsPerPage);

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

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
            What Our Clients Say
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of satisfied clients who found their perfect property with us
          </p>
        </motion.div>

        <div className="relative">
          {/* Testimonials Grid */}
          <div className="overflow-hidden">
            <motion.div
              className="flex gap-6"
              animate={{ x: `-${currentIndex * (100 / itemsPerPage)}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  className="min-w-full md:min-w-[calc(50%-12px)] lg:min-w-[calc(33.333%-16px)]"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300">
                    <CardContent className="p-6 sm:p-8">
                      {/* Quote Icon */}
                      <Quote className="h-10 w-10 text-purple-500 mb-4 opacity-50" />

                      {/* Rating */}
                      <div className="flex items-center gap-1 mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>

                      {/* Testimonial Text */}
                      <p className="text-gray-700 leading-relaxed mb-6 italic">
                        "{testimonial.text}"
                      </p>

                      {/* Author Info - Using gradient avatar instead of image */}
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                          role="img"
                          aria-label={`${testimonial.name}'s avatar`}
                        >
                          {testimonial.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                          <p className="text-sm text-gray-600">{testimonial.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="rounded-full w-12 h-12 disabled:opacity-50"
              aria-label="Previous testimonials"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Dots Indicator */}
            <div className="flex items-center gap-2">
              {[...Array(maxIndex + 1)].map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    currentIndex === index
                      ? 'bg-purple-600 w-8'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to testimonial set ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex === maxIndex}
              className="rounded-full w-12 h-12 disabled:opacity-50"
              aria-label="Next testimonials"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}