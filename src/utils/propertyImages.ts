// Property image mapping utility
export interface PropertyImageData {
  src: string;
  alt: string;
  type: 'exterior' | 'interior' | 'amenity';
}

// Image collections for different property types
export const propertyImageCollections = {
  apartment: [
    {
      src: '/assets/apartment-luxury-exterior.jpg',
      alt: 'Modern luxury apartment exterior',
      type: 'exterior' as const
    },
    {
      src: '/assets/apartment-interior-cozy.jpg',
      alt: 'Cozy apartment living room with city view',
      type: 'interior' as const
    },
    {
      src: '/assets/interior-living-room-modern.jpg',
      alt: 'Spacious modern living room',
      type: 'interior' as const
    },
    {
      src: '/assets/interior-kitchen-luxury.jpg',
      alt: 'Luxury kitchen with marble countertops',
      type: 'interior' as const
    },
    {
      src: '/assets/interior-bedroom-master.jpg',
      alt: 'Master bedroom with modern decor',
      type: 'interior' as const
    },
    {
      src: '/assets/interior-bathroom-luxury.jpg',
      alt: 'Luxury bathroom with marble tiles',
      type: 'interior' as const
    }
  ],
  house: [
    {
      src: '/assets/house-suburban-exterior.jpg',
      alt: 'Elegant single-family house exterior',
      type: 'exterior' as const
    },
    {
      src: '/assets/interior-living-room-modern_variant_1.jpg',
      alt: 'Spacious modern living room',
      type: 'interior' as const
    },
    {
      src: '/assets/interior-kitchen-luxury_variant_1.jpg',
      alt: 'Luxury kitchen with marble countertops',
      type: 'interior' as const
    },
    {
      src: '/assets/interior-bedroom-master_variant_1.jpg',
      alt: 'Master bedroom with modern decor',
      type: 'interior' as const
    },
    {
      src: '/assets/interior-bathroom-luxury_variant_1.jpg',
      alt: 'Luxury bathroom with marble tiles',
      type: 'interior' as const
    }
  ],
  villa: [
    {
      src: '/assets/villa-luxury-pool.jpg',
      alt: 'Luxury villa with swimming pool',
      type: 'exterior' as const
    },
    {
      src: '/assets/interior-living-room-modern_variant_2.jpg',
      alt: 'Spacious modern living room',
      type: 'interior' as const
    },
    {
      src: '/assets/interior-kitchen-luxury_variant_2.jpg',
      alt: 'Luxury kitchen with marble countertops',
      type: 'interior' as const
    },
    {
      src: '/assets/interior-bedroom-master_variant_2.jpg',
      alt: 'Master bedroom with modern decor',
      type: 'interior' as const
    },
    {
      src: '/assets/interior-bathroom-luxury_variant_2.jpg',
      alt: 'Luxury bathroom with marble tiles',
      type: 'interior' as const
    }
  ],
  office: [
    {
      src: '/assets/office-modern-building.jpg',
      alt: 'Modern office building exterior',
      type: 'exterior' as const
    },
    {
      src: '/assets/office-interior-modern.jpg',
      alt: 'Modern office interior with open floor plan',
      type: 'interior' as const
    }
  ],
  commercial: [
    {
      src: '/assets/office-modern-building_variant_1.jpg',
      alt: 'Modern commercial building exterior',
      type: 'exterior' as const
    },
    {
      src: '/assets/office-interior-modern_variant_1.jpg',
      alt: 'Commercial space interior',
      type: 'interior' as const
    }
  ]
};

// Function to get images for a property type
export function getPropertyImages(propertyType: string): PropertyImageData[] {
  const type = propertyType.toLowerCase();
  
  if (type in propertyImageCollections) {
    return propertyImageCollections[type as keyof typeof propertyImageCollections];
  }
  
  // Default to apartment images if type not found
  return propertyImageCollections.apartment;
}

// Function to get a single featured image for property cards
export function getFeaturedImage(propertyType: string): PropertyImageData {
  const images = getPropertyImages(propertyType);
  return images[0]; // Return the first (exterior) image
}

// Function to get random images for variety
export function getRandomPropertyImages(count: number = 4): PropertyImageData[] {
  const allImages = Object.values(propertyImageCollections).flat();
  const shuffled = [...allImages].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}