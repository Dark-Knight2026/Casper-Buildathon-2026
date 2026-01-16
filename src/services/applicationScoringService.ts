import type { TenantApplication, ApplicationScoreBreakdown, BackgroundCheck } from '@/types/application';
import { supabase } from '@/lib/supabase/client';

export interface ScoringWeights {
  incomeVerification: number; // default: 30
  creditScore: number; // default: 25
  rentalHistory: number; // default: 20
  employmentStability: number; // default: 15
  backgroundCheck: number; // default: 10
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  incomeVerification: 30,
  creditScore: 25,
  rentalHistory: 20,
  employmentStability: 15,
  backgroundCheck: 10,
};

export class ApplicationScoringService {
  /**
   * Calculate application score with breakdown
   */
  static async calculateScore(
    application: TenantApplication,
    propertyRent: number,
    weights: ScoringWeights = DEFAULT_WEIGHTS
  ): Promise<ApplicationScoreBreakdown> {
    const breakdown: ApplicationScoreBreakdown = {
      incomeVerification: this.scoreIncomeVerification(application, propertyRent, weights.incomeVerification),
      creditScore: await this.scoreCreditScore(application.id, weights.creditScore),
      rentalHistory: this.scoreRentalHistory(application, weights.rentalHistory),
      employmentStability: this.scoreEmploymentStability(application, weights.employmentStability),
      backgroundCheck: await this.scoreBackgroundCheck(application.id, weights.backgroundCheck),
      totalScore: 0,
      maxTotalScore: 100,
      rating: 'poor',
    };

    // Calculate total score
    breakdown.totalScore = 
      breakdown.incomeVerification.score +
      breakdown.creditScore.score +
      breakdown.rentalHistory.score +
      breakdown.employmentStability.score +
      breakdown.backgroundCheck.score;

    // Determine rating
    if (breakdown.totalScore >= 80) {
      breakdown.rating = 'excellent';
    } else if (breakdown.totalScore >= 60) {
      breakdown.rating = 'good';
    } else if (breakdown.totalScore >= 40) {
      breakdown.rating = 'fair';
    } else {
      breakdown.rating = 'poor';
    }

    // Save score to database
    await supabase
      .from('tenants')
      .update({ application_score: breakdown.totalScore })
      .eq('id', application.id);

    return breakdown;
  }

  /**
   * Score income verification (0-30 points)
   * Requirement: Monthly income should be at least 3x the rent
   */
  private static scoreIncomeVerification(
    application: TenantApplication,
    propertyRent: number,
    maxScore: number
  ): { score: number; maxScore: number; details: string } {
    const monthlyIncome = application.employmentInfo.currentEmployer.monthlyIncome;
    const requiredIncome = propertyRent * 3;
    const incomeRatio = monthlyIncome / requiredIncome;

    let score = 0;
    let details = '';

    if (incomeRatio >= 4) {
      score = maxScore; // Full points for 4x or more
      details = `Excellent income: $${monthlyIncome.toLocaleString()}/month (${incomeRatio.toFixed(1)}x rent)`;
    } else if (incomeRatio >= 3.5) {
      score = maxScore * 0.9;
      details = `Strong income: $${monthlyIncome.toLocaleString()}/month (${incomeRatio.toFixed(1)}x rent)`;
    } else if (incomeRatio >= 3) {
      score = maxScore * 0.75;
      details = `Adequate income: $${monthlyIncome.toLocaleString()}/month (${incomeRatio.toFixed(1)}x rent)`;
    } else if (incomeRatio >= 2.5) {
      score = maxScore * 0.5;
      details = `Below recommended: $${monthlyIncome.toLocaleString()}/month (${incomeRatio.toFixed(1)}x rent)`;
    } else {
      score = maxScore * 0.25;
      details = `Insufficient income: $${monthlyIncome.toLocaleString()}/month (${incomeRatio.toFixed(1)}x rent)`;
    }

    return { score: Math.round(score), maxScore, details };
  }

  /**
   * Score credit score (0-25 points)
   * Based on credit check results
   */
  private static async scoreCreditScore(
    applicationId: string,
    maxScore: number
  ): Promise<{ score: number; maxScore: number; details: string }> {
    const { data: creditCheck } = await supabase
      .from('background_checks')
      .select('*')
      .eq('application_id', applicationId)
      .eq('check_type', 'credit')
      .eq('status', 'completed')
      .single();

    if (!creditCheck || !creditCheck.results?.score) {
      return {
        score: 0,
        maxScore,
        details: 'Credit check not completed',
      };
    }

    const creditScore = creditCheck.results.score;
    let score = 0;
    let details = '';

    if (creditScore >= 750) {
      score = maxScore;
      details = `Excellent credit: ${creditScore}`;
    } else if (creditScore >= 700) {
      score = maxScore * 0.85;
      details = `Good credit: ${creditScore}`;
    } else if (creditScore >= 650) {
      score = maxScore * 0.65;
      details = `Fair credit: ${creditScore}`;
    } else if (creditScore >= 600) {
      score = maxScore * 0.4;
      details = `Below average credit: ${creditScore}`;
    } else {
      score = maxScore * 0.2;
      details = `Poor credit: ${creditScore}`;
    }

    return { score: Math.round(score), maxScore, details };
  }

  /**
   * Score rental history (0-20 points)
   * Based on positive references and rental duration
   */
  private static scoreRentalHistory(
    application: TenantApplication,
    maxScore: number
  ): { score: number; maxScore: number; details: string } {
    const currentLandlord = application.rentalHistory.currentLandlord;
    const previousLandlords = application.rentalHistory.previousLandlords || [];

    // Calculate rental duration at current place
    const leaseStart = new Date(currentLandlord.leaseStartDate);
    const now = new Date();
    const monthsAtCurrent = Math.floor(
      (now.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    let score = 0;
    let details = '';

    // Score based on duration and references
    if (monthsAtCurrent >= 24 && previousLandlords.length >= 1) {
      score = maxScore;
      details = `Strong rental history: ${monthsAtCurrent} months at current, ${previousLandlords.length} previous landlords`;
    } else if (monthsAtCurrent >= 12) {
      score = maxScore * 0.75;
      details = `Good rental history: ${monthsAtCurrent} months at current location`;
    } else if (monthsAtCurrent >= 6) {
      score = maxScore * 0.5;
      details = `Limited rental history: ${monthsAtCurrent} months at current location`;
    } else {
      score = maxScore * 0.25;
      details = `Short rental history: ${monthsAtCurrent} months at current location`;
    }

    return { score: Math.round(score), maxScore, details };
  }

  /**
   * Score employment stability (0-15 points)
   * Based on employment duration
   */
  private static scoreEmploymentStability(
    application: TenantApplication,
    maxScore: number
  ): { score: number; maxScore: number; details: string } {
    const employmentStart = new Date(application.employmentInfo.currentEmployer.startDate);
    const now = new Date();
    const monthsEmployed = Math.floor(
      (now.getTime() - employmentStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    let score = 0;
    let details = '';

    if (monthsEmployed >= 36) {
      score = maxScore;
      details = `Excellent stability: ${Math.floor(monthsEmployed / 12)} years at current employer`;
    } else if (monthsEmployed >= 24) {
      score = maxScore * 0.85;
      details = `Strong stability: ${Math.floor(monthsEmployed / 12)} years at current employer`;
    } else if (monthsEmployed >= 12) {
      score = maxScore * 0.65;
      details = `Good stability: ${monthsEmployed} months at current employer`;
    } else if (monthsEmployed >= 6) {
      score = maxScore * 0.4;
      details = `Limited stability: ${monthsEmployed} months at current employer`;
    } else {
      score = maxScore * 0.2;
      details = `New employment: ${monthsEmployed} months at current employer`;
    }

    return { score: Math.round(score), maxScore, details };
  }

  /**
   * Score background check (0-10 points)
   * Based on criminal and eviction checks
   */
  private static async scoreBackgroundCheck(
    applicationId: string,
    maxScore: number
  ): Promise<{ score: number; maxScore: number; details: string }> {
    const { data: checks } = await supabase
      .from('background_checks')
      .select('*')
      .eq('application_id', applicationId)
      .in('check_type', ['criminal', 'eviction'])
      .eq('status', 'completed');

    if (!checks || checks.length === 0) {
      return {
        score: 0,
        maxScore,
        details: 'Background checks not completed',
      };
    }

    const criminalCheck = checks.find((c: BackgroundCheck) => c.checkType === 'criminal');
    const evictionCheck = checks.find((c: BackgroundCheck) => c.checkType === 'eviction');

    let score = maxScore;
    const issues: string[] = [];

    // Deduct points for criminal history
    if (criminalCheck && !criminalCheck.results?.passed) {
      score -= maxScore * 0.5;
      issues.push('criminal record found');
    }

    // Deduct points for eviction history
    if (evictionCheck && !evictionCheck.results?.passed) {
      score -= maxScore * 0.5;
      issues.push('eviction history found');
    }

    const details = issues.length > 0
      ? `Issues found: ${issues.join(', ')}`
      : 'Clean background check';

    return { score: Math.max(0, Math.round(score)), maxScore, details };
  }

  /**
   * Get score rating description
   */
  static getScoreRatingDescription(rating: ApplicationScoreBreakdown['rating']): string {
    switch (rating) {
      case 'excellent':
        return 'Excellent applicant - Highly recommended for approval';
      case 'good':
        return 'Good applicant - Recommended for approval with standard terms';
      case 'fair':
        return 'Fair applicant - Consider conditional approval or additional requirements';
      case 'poor':
        return 'Poor applicant - Not recommended for approval';
      default:
        return 'Unknown rating';
    }
  }

  /**
   * Get score threshold recommendations
   */
  static getScoreThresholds() {
    return {
      excellent: { min: 80, max: 100, action: 'Auto-approve eligible' },
      good: { min: 60, max: 79, action: 'Manual review recommended' },
      fair: { min: 40, max: 59, action: 'Conditional approval possible' },
      poor: { min: 0, max: 39, action: 'Likely denial' },
    };
  }
}