import { Property } from '@/types/property';

export const mockProperties: Property[] = [
  {
    id: 1,
    title: 'Modern Downtown Apartment',
    description: 'Beautiful modern apartment in the heart of downtown with stunning city views. Features hardwood floors, stainless steel appliances, and floor-to-ceiling windows.',
    price: 2500,
    address: '123 Main St, Downtown, CA 90012',
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    propertyType: 'apartment',
    images: [
      '/images/Apartment.jpg',
      '/images/photo1765085650.jpg',
      '/images/photo1765085648.jpg'
    ],
    amenities: [
      'Parking',
      'Gym',
      'Pool',
      'Pet Friendly',
      'Balcony',
      'In-unit Laundry',
      'Dishwasher',
      'Air Conditioning'
    ],
    rating: 4.8,
    location: {
      lat: 34.0522,
      lng: -118.2437
    },
    available: true,
    listedDate: '2024-01-15'
  },
  {
    id: 2,
    title: 'Spacious Family House',
    description: 'Charming 3-bedroom house perfect for families. Large backyard, updated kitchen, and close to excellent schools.',
    price: 3200,
    address: '456 Oak Ave, Suburbia, CA 90210',
    bedrooms: 3,
    bathrooms: 2.5,
    sqft: 2000,
    propertyType: 'house',
    images: [
      '/images/photo1765085648.jpg',
      '/images/photo1765085650.jpg',
      '/images/House.jpg'
    ],
    amenities: [
      'Parking',
      'Backyard',
      'Pet Friendly',
      'Garage',
      'Central Heating',
      'Fireplace',
      'Dishwasher'
    ],
    rating: 4.6,
    location: {
      lat: 34.0736,
      lng: -118.4004
    },
    available: true,
    listedDate: '2024-01-20'
  },
  {
    id: 3,
    title: 'Luxury Penthouse Suite',
    description: 'Stunning penthouse with panoramic views, private terrace, and high-end finishes throughout. Building amenities include concierge service.',
    price: 5500,
    address: '789 Skyline Dr, Beverly Hills, CA 90211',
    bedrooms: 3,
    bathrooms: 3,
    sqft: 2500,
    propertyType: 'condo',
    images: [
      '/images/Condo.jpg',
      '/images/Condo.jpg',
      '/images/Condo.jpg'
    ],
    amenities: [
      'Parking',
      'Gym',
      'Pool',
      'Concierge',
      'Rooftop Terrace',
      'In-unit Laundry',
      'Smart Home',
      'Wine Cellar'
    ],
    rating: 4.9,
    location: {
      lat: 34.0736,
      lng: -118.4004
    },
    available: true,
    listedDate: '2024-01-25'
  },
  {
    id: 4,
    title: 'Cozy Studio Apartment',
    description: 'Efficient studio apartment perfect for young professionals. Recently renovated with modern fixtures and great natural light.',
    price: 1800,
    address: '321 Pine St, Arts District, CA 90013',
    bedrooms: 1,
    bathrooms: 1,
    sqft: 600,
    propertyType: 'apartment',
    images: [
      '/images/Apartment.jpg',
      '/images/photo1765085649.jpg',
      '/images/Apartment.jpg'
    ],
    amenities: [
      'Gym',
      'Bike Storage',
      'Package Room',
      'High-speed Internet',
      'Air Conditioning'
    ],
    rating: 4.3,
    location: {
      lat: 34.0407,
      lng: -118.2468
    },
    available: true,
    listedDate: '2024-02-01'
  },
  {
    id: 5,
    title: 'Beachfront Villa',
    description: 'Spectacular beachfront property with direct beach access. Open floor plan, chef\'s kitchen, and multiple outdoor living spaces.',
    price: 8000,
    address: '555 Ocean Blvd, Malibu, CA 90265',
    bedrooms: 4,
    bathrooms: 4,
    sqft: 3500,
    propertyType: 'house',
    images: [
      '/images/MalibuHouse.jpg',
      '/images/MalibuHouse.jpg',
      '/images/MalibuHouse.jpg'
    ],
    amenities: [
      'Parking',
      'Beach Access',
      'Pool',
      'Hot Tub',
      'Outdoor Kitchen',
      'Fire Pit',
      'Smart Home',
      'Security System'
    ],
    rating: 5.0,
    location: {
      lat: 34.0259,
      lng: -118.7798
    },
    available: true,
    listedDate: '2024-02-05'
  },
  {
    id: 6,
    title: 'Urban Loft Space',
    description: 'Industrial-chic loft in converted warehouse. Exposed brick, high ceilings, and open layout perfect for creative professionals.',
    price: 2800,
    address: '888 Factory Ln, Arts District, CA 90021',
    bedrooms: 2,
    bathrooms: 1.5,
    sqft: 1400,
    propertyType: 'loft',
    images: [
      '/images/Loft.jpg',
      '/images/Loft.jpg',
      '/images/photo1765085650.jpg'
    ],
    amenities: [
      'Parking',
      'Pet Friendly',
      'Bike Storage',
      'Rooftop Access',
      'High Ceilings',
      'Exposed Brick',
      'In-unit Laundry'
    ],
    rating: 4.7,
    location: {
      lat: 34.0407,
      lng: -118.2348
    },
    available: true,
    listedDate: '2024-02-10'
  },
  {
    id: 7,
    title: 'Garden Apartment',
    description: 'Ground floor apartment with private garden patio. Quiet neighborhood, pet-friendly, and close to parks.',
    price: 2200,
    address: '444 Garden Way, Pasadena, CA 91101',
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1100,
    propertyType: 'apartment',
    images: [
      '/images/Apartment.jpg',
      '/images/Apartment.jpg',
      '/assets/property-1_variant_1.jpg'
    ],
    amenities: [
      'Parking',
      'Pet Friendly',
      'Private Patio',
      'Garden',
      'Storage',
      'Dishwasher',
      'Air Conditioning'
    ],
    rating: 4.5,
    location: {
      lat: 34.1478,
      lng: -118.1445
    },
    available: true,
    listedDate: '2024-02-12'
  },
  {
    id: 8,
    title: 'Mountain View Retreat',
    description: 'Peaceful retreat with stunning mountain views. Perfect for nature lovers seeking tranquility while staying close to the city.',
    price: 3500,
    address: '777 Summit Dr, Glendale, CA 91206',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    propertyType: 'house',
    images: [
      '/assets/property-2_variant_1.jpg',
      '/assets/property-3_variant_1.jpg',
      '/assets/property-4_variant_1.jpg'
    ],
    amenities: [
      'Parking',
      'Deck',
      'Mountain Views',
      'Fireplace',
      'Garage',
      'Pet Friendly',
      'Central Heating'
    ],
    rating: 4.8,
    location: {
      lat: 34.1425,
      lng: -118.2551
    },
    available: true,
    listedDate: '2024-02-15'
  },
  {
    id: 9,
    title: 'Contemporary Townhouse',
    description: 'Modern townhouse with three levels of living space. Attached garage, rooftop deck, and energy-efficient features.',
    price: 3800,
    address: '999 Metro Ct, Culver City, CA 90232',
    bedrooms: 3,
    bathrooms: 3,
    sqft: 2200,
    propertyType: 'townhouse',
    images: [
      '/assets/property-5_variant_1.jpg',
      '/assets/property-6_variant_1.jpg',
      '/assets/property-7_variant_1.jpg'
    ],
    amenities: [
      'Parking',
      'Garage',
      'Rooftop Deck',
      'Smart Home',
      'Solar Panels',
      'In-unit Laundry',
      'Security System'
    ],
    rating: 4.6,
    location: {
      lat: 34.0211,
      lng: -118.3965
    },
    available: true,
    listedDate: '2024-02-18'
  },
  {
    id: 10,
    title: 'Historic Craftsman Home',
    description: 'Beautifully restored craftsman home with original details. Hardwood floors, built-in cabinetry, and charming front porch.',
    price: 4200,
    address: '222 Heritage Ln, South Pasadena, CA 91030',
    bedrooms: 4,
    bathrooms: 2.5,
    sqft: 2400,
    propertyType: 'house',
    images: [
      '/assets/property-8_variant_1.jpg',
      '/assets/property-9_variant_1.jpg',
      '/assets/property-10_variant_1.jpg'
    ],
    amenities: [
      'Parking',
      'Backyard',
      'Front Porch',
      'Hardwood Floors',
      'Original Details',
      'Updated Kitchen',
      'Central Air'
    ],
    rating: 4.9,
    location: {
      lat: 34.1161,
      lng: -118.1503
    },
    available: true,
    listedDate: '2024-02-20'
  }
];