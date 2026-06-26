import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, 
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
  Bookmark,
  Images
} from 'lucide-react';
import { Property } from '@/types/property';
import { getFeaturedImage, getPropertyImages } from '@/utils/propertyImages';

interface PropertyCardProps {
  property: Property;
  onViewDetails: (property: Property) => void;
  onFavorite: (propertyId: string) => void;
  isFavorited?: boolean;
}

export default function PropertyCard({ property, onViewDetails, onFavorite, isFavorited = false }: PropertyCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { toast } = useToast();

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

  const handleContact = () => {
    setShowContactInfo(!showContactInfo);
  };

  // Get the featured image for this property
  const featuredImage = getFeaturedImage(property.propertyType || 'apartment');
  const allImages = getPropertyImages(property.propertyType || 'apartment');

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
        property.featured ? 'ring-2 ring-purple-400 ring-opacity-50' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {property.featured && (
        <div className="absolute top-4 left-4 z-10">
          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            Featured
          </Badge>
        </div>
      )}

      {/* Property Image */}
      <div className="relative h-64 overflow-hidden">
        {!imageError ? (
          <>
            <img
              src={featuredImage.src}
              alt={featuredImage.alt}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
            
            {/* Image Count Badge */}
            <div className="absolute top-4 right-4 z-10">
              <Badge 
                variant="secondary" 
                className="bg-black/70 text-white border-0 flex items-center space-x-1"
              >
                <Images className="h-3 w-3" />
                <span>{allImages.length}</span>
              </Badge>
            </div>
          </>
        ) : (
          // Fallback to original placeholder if image fails to load
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Camera className="h-16 w-16 text-gray-400" />
          </div>
        )}
        
        {/* Hover Overlay with Quick Actions */}
        <div className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex space-x-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onViewDetails(property)}
              data-onboarding="view-details"
              className="bg-white/90 hover:bg-white text-gray-900 transition-all hover:scale-105"
            >
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleShare}
              className="bg-white/90 hover:bg-white text-gray-900 transition-all hover:scale-105"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Property Stats Overlay */}
        <div className="absolute bottom-4 left-4 flex space-x-2">
          <Badge variant="secondary" className="bg-white/90 text-gray-900">
            <Eye className="h-3 w-3 mr-1" />
            {property.views}
          </Badge>
          <Badge variant="secondary" className="bg-white/90 text-gray-900">
            <Heart className="h-3 w-3 mr-1" />
            {property.favorites}
          </Badge>
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => onFavorite(property.id)}
          data-onboarding="favorite-button"
          className="absolute top-4 right-16 p-2 rounded-full bg-white/90 hover:bg-white transition-all duration-200 hover:scale-110"
        >
          <Heart 
            className={`h-5 w-5 transition-colors duration-200 ${
              isFavorited ? 'text-red-500 fill-red-500' : 'text-gray-600'
            }`} 
          />
        </button>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-200">
              {property.title}
            </h3>
            <div className="flex items-center text-gray-600 mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">{property.address}</span>
            </div>
          </div>
          <Badge className={`${getTypeColor(property.type)} border`}>
            {property.type === 'lease_to_own' ? 'Lease-to-Own' : property.type}
          </Badge>
        </div>

        <div className="text-2xl font-bold text-purple-600 mb-3">
          {formatPrice(property.price, property.type)}
        </div>

        {/* Property Details */}
        {(property.bedrooms > 0 || property.bathrooms > 0) && (
          <div className="flex items-center space-x-4 text-gray-600 mb-3">
            {property.bedrooms > 0 && (
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                <span className="text-sm">{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                <span className="text-sm">{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
              </div>
            )}
            <div className="flex items-center">
              <Square className="h-4 w-4 mr-1" />
              <span className="text-sm">{property.sqft.toLocaleString()} sq ft</span>
            </div>
          </div>
        )}

        {/* Rating and Reviews */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
            <span className="text-sm font-medium">{property.rating}</span>
            <span className="text-sm text-gray-600 ml-1">({property.reviews} reviews)</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-1" />
            {property.availability}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {property.description}
        </p>

        {/* Amenities */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {property.amenities.slice(0, 3).map((amenity, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {amenity}
              </Badge>
            ))}
            {property.amenities.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{property.amenities.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Owner Info */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mr-2">
              <User className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{property.owner}</p>
              <div className="flex items-center">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 mr-1" />
                <span className="text-xs text-gray-600">{property.ownerRating}</span>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleContact}
            className="text-xs"
          >
            Contact
          </Button>
        </div>

        {/* Contact Info (Expandable) */}
        {showContactInfo && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-blue-800">
                <Phone className="h-4 w-4 mr-2" />
                <span>(555) 123-4567</span>
              </div>
              <div className="flex items-center text-sm text-blue-800">
                <Mail className="h-4 w-4 mr-2" />
                <span>contact@{property.owner.toLowerCase().replace(' ', '')}.com</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button 
            onClick={() => onViewDetails(property)}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            View Details
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onFavorite(property.id)}
            className={`transition-all hover:scale-110 ${isFavorited ? 'bg-red-50 border-red-200' : ''}`}
          >
            <Bookmark className={`h-4 w-4 ${isFavorited ? 'text-red-500 fill-red-500' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}