export interface AgentReview {
  id: string;
  agentId: string;
  clientName: string;
  clientInitials: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  helpfulCount: number;
  agentResponse?: {
    text: string;
    date: string;
  };
  transactionType?: 'buy' | 'sell' | 'rent';
  propertyType?: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  verifiedPercentage: number;
}