import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Bed, 
  Bath, 
  Square, 
  Star, 
  Heart, 
  Eye, 
  MapPin, 
  User,
  Calendar,
  Phone,
  Mail,
  Share2,
  Send,
  Loader2
} from 'lucide-react';
import { Property } from '@/types/property';
import { getPropertyImages } from '@/utils/propertyImages';
import PropertyImageGallery from './PropertyImageGallery';

interface PropertyModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onFavorite: (propertyId: string) => void;
  isFavorited?: boolean;
}

export default function PropertyModal({ property, isOpen, onClose, onFavorite, isFavorited = false }: PropertyModalProps) {
  const [showContactForm, setShowContactForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const { toast } = useToast();

  if (!property) return null;

  const formatPrice = (price: number, type: string) => {
    if (type === 'sale') {
      return `$${price.toLocaleString()}`;
    } else if (type === 'equity') {
      return `$${price.toLocaleString()} equity`;
    } else if (type === 'lease_to_own') {
      return `$${price.toLocaleString()}/month (lease-to-own)`;
    } else {
      return `$${price.toLocaleString()}/${type}`;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-green-100 text-green-800 border-green-200';
      case 'daily': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'monthly': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'lease_to_own': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'equity': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: property.description,
          url: window.location.href
        });
        toast({
          title: "Shared successfully",
          description: "Property details have been shared.",
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(`${property.title} - ${window.location.href}`);
      toast({
        title: "Link copied",
        description: "Property link has been copied to clipboard.",
      });
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Message sent!",
      description: "The property owner will contact you soon.",
    });
    
    setContactForm({ name: '', email: '', phone: '', message: '' });
    setShowContactForm(false);
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
  };

  // Get all images for this property
  const propertyImages = getPropertyImages(property.propertyType || 'apartment');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
                {property.title}
              </DialogTitle>
              <div className="flex items-center text-gray-600 mb-2">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{property.address}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getTypeColor(property.type)} border`}>
                {property.type === 'lease_to_own' ? 'Lease-to-Own' : property.type}
              </Badge>
              {property.featured && (
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  Featured
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enhanced Image Gallery */}
          <div className="relative">
            <PropertyImageGallery 
              images={propertyImages}
              className="h-96"
              showThumbnails={true}
              autoPlay={false}
            />
            
            {/* Action buttons overlay */}
            <div className="absolute top-4 right-4 flex space-x-2 z-10">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleShare}
                className="bg-white/90 hover:bg-white transition-all hover:scale-105"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onFavorite(property.id)}
                className={`bg-white/90 hover:bg-white transition-all hover:scale-105 ${isFavorited ? 'text-red-500' : ''}`}
              >
                <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Price and Key Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-4">
                {formatPrice(property.price, property.type)}
              </div>

              {/* Property Details */}
              {(property.bedrooms > 0 || property.bathrooms > 0) && (
                <div className="flex items-center space-x-6 text-gray-600 mb-4">
                  {property.bedrooms > 0 && (
                    <div className="flex items-center">
                      <Bed className="h-5 w-5 mr-2" />
                      <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {property.bathrooms > 0 && (
                    <div className="flex items-center">
                      <Bath className="h-5 w-5 mr-2" />
                      <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Square className="h-5 w-5 mr-2" />
                    <span>{property.sqft.toLocaleString()} sq ft</span>
                  </div>
                </div>
              )}

              {/* Rating and Stats */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 mr-1" />
                  <span className="font-medium">{property.rating}</span>
                  <span className="text-gray-600 ml-1">({property.reviews} reviews)</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {property.views} views
                  </div>
                  <div className="flex items-center">
                    <Heart className="h-4 w-4 mr-1" />
                    {property.favorites} favorites
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Info and Contact */}
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mr-3">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{property.owner}</p>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                        <span className="text-sm text-gray-600">{property.ownerRating} rating</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-1" />
                    {property.availability}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>(555) 123-4567</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>contact@{property.owner.toLowerCase().replace(' ', '')}.com</span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowContactForm(!showContactForm)}
                  className="w-full mt-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          {showContactForm && (
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 animate-in fade-in-0 slide-in-from-top-4 duration-300">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Contact Property Owner</h3>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Your Name"
                    value={contactForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                  <Input
                    type="email"
                    placeholder="Your Email"
                    value={contactForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <Input
                  type="tel"
                  placeholder="Your Phone Number"
                  value={contactForm.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={isSubmitting}
                />
                <Textarea
                  placeholder="Your message..."
                  value={contactForm.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  rows={4}
                  required
                  disabled={isSubmitting}
                />
                <div className="flex space-x-3">
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowContactForm(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          <Separator />

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed">{property.description}</p>
          </div>

          {/* Amenities */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {property.amenities.map((amenity: string, index: number) => (
                <Badge key={index} variant="outline" className="justify-center py-2">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Property Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Property Type:</span>
                  <span className="font-medium">{property.propertyType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Square Footage:</span>
                  <span className="font-medium">{property.sqft.toLocaleString()} sq ft</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Availability:</span>
                  <span className="font-medium">{property.availability}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Bedrooms:</span>
                  <span className="font-medium">{property.bedrooms || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bathrooms:</span>
                  <span className="font-medium">{property.bathrooms || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Property ID:</span>
                  <span className="font-medium">#{property.id.toString().padStart(6, '0')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}