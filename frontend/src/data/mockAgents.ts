import { AgentReview, ReviewStats } from '@/types/review';

export interface RealEstateAgent {
  id: string;
  name: string;
  companyName: string;
  agentType: 'agent' | 'broker' | 'team_lead';
  licenseNumber: string;
  yearsExperience: number;
  serviceArea: string[];
  rating: number;
  totalReviews: number;
  activeListings: number;
  soldProperties: number;
  averageSalePrice: number;
  specialties: string[];
  description: string;
  phone: string;
  email: string;
  profileImage?: string;
  certifications: string[];
  languages: string[];
  availability: 'available' | 'busy' | 'unavailable';
  responseTime: string;
  marketExpertise: string[];
  awards: string[];
  reviews?: AgentReview[];
  reviewStats?: ReviewStats;
}

// Mock reviews data
const mockReviews: Record<string, AgentReview[]> = {
  '1': [
    {
      id: 'r1',
      agentId: '1',
      clientName: 'John Smith',
      clientInitials: 'JS',
      rating: 5,
      title: 'Exceptional Service!',
      comment: 'Emily made our first home buying experience smooth and stress-free. She was always available to answer questions and guided us through every step. Her knowledge of the coastal market is unmatched!',
      date: '2024-11-15',
      verified: true,
      helpfulCount: 24,
      transactionType: 'buy',
      propertyType: 'Single Family Home',
      agentResponse: {
        text: 'Thank you so much, John! It was a pleasure helping you and your family find your dream home. Wishing you many happy years there!',
        date: '2024-11-16'
      }
    },
    {
      id: 'r2',
      agentId: '1',
      clientName: 'Maria Garcia',
      clientInitials: 'MG',
      rating: 5,
      title: 'Highly Recommend',
      comment: 'Emily sold our waterfront property above asking price in just 2 weeks! Her marketing strategy and negotiation skills are top-notch. Professional and responsive throughout.',
      date: '2024-10-28',
      verified: true,
      helpfulCount: 18,
      transactionType: 'sell',
      propertyType: 'Waterfront Condo'
    },
    {
      id: 'r3',
      agentId: '1',
      clientName: 'David Lee',
      clientInitials: 'DL',
      rating: 4,
      title: 'Great Experience',
      comment: 'Very knowledgeable about the Virginia Beach area. Helped us find exactly what we were looking for within our budget. Would work with her again!',
      date: '2024-10-05',
      verified: true,
      helpfulCount: 12,
      transactionType: 'buy',
      propertyType: 'Townhouse'
    }
  ],
  '2': [
    {
      id: 'r4',
      agentId: '2',
      clientName: 'Robert Johnson',
      clientInitials: 'RJ',
      rating: 5,
      title: 'Investment Expert',
      comment: 'David helped me build a portfolio of 5 rental properties. His market analysis and investment advice have been invaluable. True professional with deep market knowledge.',
      date: '2024-11-20',
      verified: true,
      helpfulCount: 31,
      transactionType: 'buy',
      propertyType: 'Multi-Family Investment',
      agentResponse: {
        text: 'Thank you, Robert! It\'s been great working with you on building your investment portfolio. Looking forward to our next deal!',
        date: '2024-11-21'
      }
    },
    {
      id: 'r5',
      agentId: '2',
      clientName: 'Sarah Williams',
      clientInitials: 'SW',
      rating: 5,
      title: 'Commercial Real Estate Pro',
      comment: 'David handled our commercial property purchase with expertise and professionalism. His negotiation skills saved us thousands. Highly recommended for commercial deals.',
      date: '2024-09-14',
      verified: true,
      helpfulCount: 22,
      transactionType: 'buy',
      propertyType: 'Commercial Building'
    }
  ],
  '3': [
    {
      id: 'r6',
      agentId: '3',
      clientName: 'Lt. Michael Brown',
      clientInitials: 'MB',
      rating: 5,
      title: 'Perfect for Military Families',
      comment: 'Sarah understood the unique needs of military families. She helped us find a home near the base with great schools. Her MRP certification really shows!',
      date: '2024-11-10',
      verified: true,
      helpfulCount: 19,
      transactionType: 'buy',
      propertyType: 'Single Family Home'
    },
    {
      id: 'r7',
      agentId: '3',
      clientName: 'Jennifer Davis',
      clientInitials: 'JD',
      rating: 4,
      title: 'New Construction Expert',
      comment: 'Sarah guided us through the new construction process. She was there for every walk-through and inspection. Very detail-oriented and professional.',
      date: '2024-10-22',
      verified: true,
      helpfulCount: 14,
      transactionType: 'buy',
      propertyType: 'New Construction'
    }
  ],
  '4': [
    {
      id: 'r8',
      agentId: '4',
      clientName: 'Elizabeth Taylor',
      clientInitials: 'ET',
      rating: 5,
      title: 'Luxury Home Specialist',
      comment: 'Michael and his team sold our luxury estate in record time. Their marketing was exceptional - professional photography, virtual tours, and targeted advertising. Worth every penny!',
      date: '2024-11-25',
      verified: true,
      helpfulCount: 28,
      transactionType: 'sell',
      propertyType: 'Luxury Estate',
      agentResponse: {
        text: 'Thank you, Elizabeth! It was an honor to represent such a beautiful property. Wishing you all the best in your new home!',
        date: '2024-11-26'
      }
    },
    {
      id: 'r9',
      agentId: '4',
      clientName: 'James Anderson',
      clientInitials: 'JA',
      rating: 5,
      title: 'Outstanding Team',
      comment: 'Michael\'s team made our relocation seamless. They handled everything from finding our new home to coordinating the move. Truly full-service experience.',
      date: '2024-10-18',
      verified: true,
      helpfulCount: 21,
      transactionType: 'buy',
      propertyType: 'Luxury Home'
    }
  ],
  '5': [
    {
      id: 'r10',
      agentId: '5',
      clientName: 'Thomas Wilson',
      clientInitials: 'TW',
      rating: 5,
      title: 'Investment Property Pro',
      comment: 'Jennifer helped me purchase and set up 3 rental properties. Her knowledge of cash flow analysis and property management is exceptional. Great ROI on all properties!',
      date: '2024-11-05',
      verified: true,
      helpfulCount: 26,
      transactionType: 'buy',
      propertyType: 'Investment Properties'
    },
    {
      id: 'r11',
      agentId: '5',
      clientName: 'Patricia Martinez',
      clientInitials: 'PM',
      rating: 4,
      title: 'Rental Expert',
      comment: 'Very knowledgeable about rental properties and landlord regulations. Helped me find a great investment property with strong rental potential.',
      date: '2024-09-30',
      verified: true,
      helpfulCount: 15,
      transactionType: 'buy',
      propertyType: 'Duplex'
    }
  ],
  '6': [
    {
      id: 'r12',
      agentId: '6',
      clientName: 'Christopher Moore',
      clientInitials: 'CM',
      rating: 5,
      title: 'First-Time Buyer Champion',
      comment: 'Robert made our first home purchase easy and stress-free. He explained everything clearly and helped us navigate the VA loan process. Couldn\'t ask for a better agent!',
      date: '2024-11-12',
      verified: true,
      helpfulCount: 17,
      transactionType: 'buy',
      propertyType: 'Starter Home',
      agentResponse: {
        text: 'Congratulations on your first home, Christopher! It was my pleasure to help you through the process. Enjoy your new place!',
        date: '2024-11-13'
      }
    },
    {
      id: 'r13',
      agentId: '6',
      clientName: 'Linda Chen',
      clientInitials: 'LC',
      rating: 5,
      title: 'Affordable Housing Expert',
      comment: 'Robert helped us find an affordable home in a great neighborhood. His knowledge of FHA loans and down payment assistance programs was invaluable.',
      date: '2024-10-08',
      verified: true,
      helpfulCount: 13,
      transactionType: 'buy',
      propertyType: 'Condo'
    }
  ]
};

// Calculate review stats
const calculateReviewStats = (reviews: AgentReview[]): ReviewStats => {
  const totalReviews = reviews.length;
  const verifiedCount = reviews.filter(r => r.verified).length;
  
  const ratingDistribution = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  };
  
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
  
  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews,
    ratingDistribution,
    verifiedPercentage: Math.round((verifiedCount / totalReviews) * 100)
  };
};

export const mockRealEstateAgents: RealEstateAgent[] = [
  {
    id: '1',
    name: 'Emily Rodriguez',
    companyName: 'Coastal Realty Group',
    agentType: 'agent',
    licenseNumber: 'RE123456',
    yearsExperience: 8,
    serviceArea: ['Virginia Beach', 'Norfolk', 'Chesapeake'],
    rating: 4.9,
    totalReviews: 156,
    activeListings: 24,
    soldProperties: 187,
    averageSalePrice: 485000,
    specialties: ['First-Time Buyers', 'Luxury Homes', 'Waterfront Properties'],
    description: 'Experienced real estate agent specializing in coastal properties and first-time homebuyers. Dedicated to providing exceptional service and achieving the best outcomes for my clients.',
    phone: '(757) 555-0123',
    email: 'emily@coastalrealty.com',
    certifications: ['ABR (Accredited Buyer Representative)', 'CRS (Certified Residential Specialist)'],
    languages: ['English', 'Spanish'],
    availability: 'available',
    responseTime: '< 1 hour',
    marketExpertise: ['Residential', 'Luxury', 'Waterfront'],
    awards: ['Top Producer 2023', 'Client Choice Award'],
    reviews: mockReviews['1'],
    reviewStats: calculateReviewStats(mockReviews['1'])
  },
  {
    id: '2',
    name: 'David Wilson',
    companyName: 'Premier Properties LLC',
    agentType: 'broker',
    licenseNumber: 'BK987654321',
    yearsExperience: 15,
    serviceArea: ['Virginia Beach', 'Norfolk', 'Portsmouth', 'Suffolk'],
    rating: 4.8,
    totalReviews: 289,
    activeListings: 45,
    soldProperties: 423,
    averageSalePrice: 650000,
    specialties: ['Investment Properties', 'Commercial Real Estate', 'Property Management'],
    description: 'Licensed broker with extensive experience in residential and commercial real estate. Helping investors and homeowners achieve their real estate goals for over 15 years.',
    phone: '(757) 555-0456',
    email: 'david@premierproperties.com',
    certifications: ['CCIM (Certified Commercial Investment Member)', 'CPM (Certified Property Manager)'],
    languages: ['English'],
    availability: 'available',
    responseTime: '< 2 hours',
    marketExpertise: ['Commercial', 'Investment', 'Residential'],
    awards: ['Broker of the Year 2023', 'Million Dollar Club'],
    reviews: mockReviews['2'],
    reviewStats: calculateReviewStats(mockReviews['2'])
  },
  {
    id: '3',
    name: 'Sarah Mitchell',
    companyName: 'Hampton Roads Realty',
    agentType: 'agent',
    licenseNumber: 'RE456789',
    yearsExperience: 6,
    serviceArea: ['Norfolk', 'Portsmouth', 'Hampton'],
    rating: 4.7,
    totalReviews: 98,
    activeListings: 18,
    soldProperties: 134,
    averageSalePrice: 325000,
    specialties: ['Military Relocation', 'New Construction', 'Condominiums'],
    description: 'Dedicated to serving military families and first-time homebuyers. Specializing in new construction and condominium sales in the Hampton Roads area.',
    phone: '(757) 555-0789',
    email: 'sarah@hamptonroadsrealty.com',
    certifications: ['MRP (Military Relocation Professional)', 'New Home Sales Certification'],
    languages: ['English'],
    availability: 'busy',
    responseTime: '< 3 hours',
    marketExpertise: ['Military Housing', 'New Construction', 'Condos'],
    awards: ['Rising Star Award', 'Military Appreciation Award'],
    reviews: mockReviews['3'],
    reviewStats: calculateReviewStats(mockReviews['3'])
  },
  {
    id: '4',
    name: 'Michael Thompson',
    companyName: 'Elite Real Estate Partners',
    agentType: 'team_lead',
    licenseNumber: 'RE789012',
    yearsExperience: 12,
    serviceArea: ['Virginia Beach', 'Chesapeake', 'Great Bridge'],
    rating: 4.9,
    totalReviews: 234,
    activeListings: 32,
    soldProperties: 298,
    averageSalePrice: 425000,
    specialties: ['Luxury Homes', 'Estate Sales', 'Relocation Services'],
    description: 'Team leader with a proven track record in luxury home sales and estate transactions. Leading a team of 6 agents to provide comprehensive real estate services.',
    phone: '(757) 555-0321',
    email: 'michael@eliterealestate.com',
    certifications: ['CLHMS (Certified Luxury Home Marketing Specialist)', 'SRES (Seniors Real Estate Specialist)'],
    languages: ['English', 'French'],
    availability: 'available',
    responseTime: '< 30 minutes',
    marketExpertise: ['Luxury', 'Estates', 'Relocation'],
    awards: ['Luxury Home Specialist 2023', 'Team Leader Excellence'],
    reviews: mockReviews['4'],
    reviewStats: calculateReviewStats(mockReviews['4'])
  },
  {
    id: '5',
    name: 'Jennifer Martinez',
    companyName: 'Tidewater Realty Solutions',
    agentType: 'agent',
    licenseNumber: 'RE345678',
    yearsExperience: 9,
    serviceArea: ['Norfolk', 'Virginia Beach', 'Chesapeake'],
    rating: 4.6,
    totalReviews: 167,
    activeListings: 21,
    soldProperties: 203,
    averageSalePrice: 375000,
    specialties: ['Investment Properties', 'Rental Properties', 'Property Flipping'],
    description: 'Investment property specialist helping clients build wealth through real estate. Expert in rental properties, fix-and-flip projects, and portfolio development.',
    phone: '(757) 555-0654',
    email: 'jennifer@tidewaterrealty.com',
    certifications: ['REIS (Real Estate Investment Specialist)', 'Property Management License'],
    languages: ['English', 'Spanish'],
    availability: 'available',
    responseTime: '< 2 hours',
    marketExpertise: ['Investment', 'Rental', 'Rehab Properties'],
    awards: ['Investment Specialist Award', 'Client Satisfaction Excellence'],
    reviews: mockReviews['5'],
    reviewStats: calculateReviewStats(mockReviews['5'])
  },
  {
    id: '6',
    name: 'Robert Chen',
    companyName: 'Chesapeake Bay Realty',
    agentType: 'agent',
    licenseNumber: 'RE567890',
    yearsExperience: 4,
    serviceArea: ['Chesapeake', 'Portsmouth', 'Suffolk'],
    rating: 4.8,
    totalReviews: 76,
    activeListings: 15,
    soldProperties: 89,
    averageSalePrice: 295000,
    specialties: ['First-Time Buyers', 'Affordable Housing', 'FHA/VA Loans'],
    description: 'Passionate about helping first-time homebuyers achieve their dream of homeownership. Specializing in affordable housing options and government loan programs.',
    phone: '(757) 555-0987',
    email: 'robert@chesapeakebayrealty.com',
    certifications: ['AHWD (At Home with Diversity)', 'VA Loan Specialist'],
    languages: ['English', 'Mandarin'],
    availability: 'available',
    responseTime: '< 1 hour',
    marketExpertise: ['First-Time Buyers', 'Affordable Housing', 'Government Loans'],
    awards: ['Rookie of the Year 2022', 'Community Service Award'],
    reviews: mockReviews['6'],
    reviewStats: calculateReviewStats(mockReviews['6'])
  }
];