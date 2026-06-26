import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Home, TrendingUp, DollarSign } from 'lucide-react';

export default function HeroSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyType, setPropertyType] = useState('all');
  const [priceRange, setPriceRange] = useState('all');

  const handleSearch = () => {
    console.log('Search:', { searchTerm, propertyType, priceRange });
  };

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-black/30"></div>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            backgroundSize: '200% 200%',
          }}
        />
      </div>

      {/* Floating Elements */}
      <motion.div
        className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"
        animate={{
          y: [0, 20, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute top-1/2 right-1/4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl"
        animate={{
          y: [0, -15, 0],
          x: [0, 15, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-8"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Find Your{' '}
            <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              Dream Property
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
            Discover exceptional properties for rent, sale, and investment opportunities in prime locations worldwide
          </p>
        </motion.div>

        {/* Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl max-w-5xl mx-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Location, property type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 bg-white/90 border-0 text-gray-900 placeholder-gray-500 focus:bg-white transition-all duration-300"
                aria-label="Search location or property type"
              />
            </div>

            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger className="h-12 bg-white/90 border-0 text-gray-900 focus:bg-white transition-all duration-300" aria-label="Select property type">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="h-12 bg-white/90 border-0 text-gray-900 focus:bg-white transition-all duration-300" aria-label="Select price range">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Price</SelectItem>
                <SelectItem value="0-1000">$0 - $1,000</SelectItem>
                <SelectItem value="1000-3000">$1,000 - $3,000</SelectItem>
                <SelectItem value="3000-5000">$3,000 - $5,000</SelectItem>
                <SelectItem value="5000+">$5,000+</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleSearch}
              className="h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              aria-label="Search properties"
            >
              Search Properties
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-white">
            <motion.div
              className="text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-center mb-2">
                <Home className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400 mr-2" />
                <span className="text-xl sm:text-2xl font-bold">50,000+</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-300">Properties Listed</p>
            </motion.div>
            <motion.div
              className="text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-center mb-2">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-green-400 mr-2" />
                <span className="text-xl sm:text-2xl font-bold">150+</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-300">Cities Covered</p>
            </motion.div>
            <motion.div
              className="text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 mr-2" />
                <span className="text-xl sm:text-2xl font-bold">98.5%</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-300">Satisfaction Rate</p>
            </motion.div>
            <motion.div
              className="text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400 mr-2" />
                <span className="text-xl sm:text-2xl font-bold">$2.5B+</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-300">Transaction Volume</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}