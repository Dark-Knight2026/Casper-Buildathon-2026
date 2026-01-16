import { supabase } from '@/lib/supabase/client';
import type { BackgroundCheck } from '@/types/application';

export type BackgroundCheckType = 'credit' | 'criminal' | 'eviction' | 'employment' | 'rental';

export interface BackgroundCheckRequest {
  applicationId: string;
  checkType: BackgroundCheckType;
  provider?: string;
}

export interface BackgroundCheckResult {
  passed: boolean;
  score?: number;
  details?: string;
  findings?: string[];
}

interface DatabaseBackgroundCheck {
  id: string;
  application_id: string;
  check_type: string;
  status: string;
  provider?: string;
  request_date: string;
  completion_date?: string;
  results?: BackgroundCheckResult;
  cost?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Mock Background Check Service
 * In production, this would integrate with actual background check providers
 * like TransUnion, Experian, Checkr, etc.
 */
export class BackgroundCheckService {
  /**
   * Request a background check
   */
  static async requestBackgroundCheck(
    request: BackgroundCheckRequest
  ): Promise<BackgroundCheck> {
    const { data, error } = await supabase
      .from('background_checks')
      .insert({
        application_id: request.applicationId,
        check_type: request.checkType,
        status: 'pending',
        provider: request.provider || 'Mock Provider',
        request_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // In production, this would trigger an API call to the background check provider
    // For now, we'll simulate the check with a delay
    this.simulateBackgroundCheck(data.id, request.checkType);

    return this.mapToBackgroundCheck(data as DatabaseBackgroundCheck);
  }

  /**
   * Get background check by ID
   */
  static async getBackgroundCheck(id: string): Promise<BackgroundCheck> {
    const { data, error } = await supabase
      .from('background_checks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapToBackgroundCheck(data as DatabaseBackgroundCheck);
  }

  /**
   * Get all background checks for an application
   */
  static async getBackgroundChecksByApplication(
    applicationId: string
  ): Promise<BackgroundCheck[]> {
    const { data, error } = await supabase
      .from('background_checks')
      .select('*')
      .eq('application_id', applicationId)
      .order('request_date', { ascending: false });

    if (error) throw error;
    return (data as DatabaseBackgroundCheck[]).map(this.mapToBackgroundCheck);
  }

  /**
   * Update background check status and results
   */
  static async updateBackgroundCheck(
    id: string,
    status: BackgroundCheck['status'],
    results?: BackgroundCheckResult,
    cost?: number
  ): Promise<BackgroundCheck> {
    const updateData: Record<string, string | number | BackgroundCheckResult> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed') {
      updateData.completion_date = new Date().toISOString();
    }

    if (results) {
      updateData.results = results;
    }

    if (cost !== undefined) {
      updateData.cost = cost;
    }

    const { data, error } = await supabase
      .from('background_checks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToBackgroundCheck(data as DatabaseBackgroundCheck);
  }

  /**
   * Calculate total cost of background checks for an application
   */
  static async calculateTotalCost(applicationId: string): Promise<number> {
    interface CostRecord {
      cost: number | null;
    }

    const { data, error } = await supabase
      .from('background_checks')
      .select('cost')
      .eq('application_id', applicationId);

    if (error) throw error;

    return (data as CostRecord[]).reduce((total, check) => total + (check.cost || 0), 0);
  }

  /**
   * Check if all required checks are completed
   */
  static async areAllChecksCompleted(
    applicationId: string,
    requiredChecks: BackgroundCheckType[]
  ): Promise<boolean> {
    interface CheckStatus {
      check_type: string;
      status: string;
    }

    const { data, error } = await supabase
      .from('background_checks')
      .select('check_type, status')
      .eq('application_id', applicationId)
      .in('check_type', requiredChecks);

    if (error) throw error;

    const completedChecks = (data as CheckStatus[])
      .filter((check) => check.status === 'completed')
      .map((check) => check.check_type);

    return requiredChecks.every((type) => completedChecks.includes(type));
  }

  /**
   * Simulate background check (for development/testing)
   * In production, this would be replaced with actual API calls
   */
  private static async simulateBackgroundCheck(
    checkId: string,
    checkType: BackgroundCheckType
  ): Promise<void> {
    // Simulate processing delay (2-5 seconds)
    const delay = Math.floor(Math.random() * 3000) + 2000;

    setTimeout(async () => {
      let results: BackgroundCheckResult;
      let cost: number;

      switch (checkType) {
        case 'credit':
          results = this.simulateCreditCheck();
          cost = 30.00;
          break;
        case 'criminal':
          results = this.simulateCriminalCheck();
          cost = 25.00;
          break;
        case 'eviction':
          results = this.simulateEvictionCheck();
          cost = 20.00;
          break;
        case 'employment':
          results = this.simulateEmploymentCheck();
          cost = 15.00;
          break;
        case 'rental':
          results = this.simulateRentalCheck();
          cost = 15.00;
          break;
        default:
          results = { passed: true, details: 'Check completed' };
          cost = 10.00;
      }

      await this.updateBackgroundCheck(checkId, 'completed', results, cost);
    }, delay);
  }

  /**
   * Simulate credit check results
   */
  private static simulateCreditCheck(): BackgroundCheckResult {
    const scores = [580, 620, 680, 720, 760, 800];
    const score = scores[Math.floor(Math.random() * scores.length)];

    return {
      passed: score >= 650,
      score,
      details: `Credit score: ${score}`,
      findings: score >= 650
        ? ['Good payment history', 'Low credit utilization', 'No recent delinquencies']
        : ['Some late payments', 'High credit utilization', 'Recent delinquencies'],
    };
  }

  /**
   * Simulate criminal background check results
   */
  private static simulateCriminalCheck(): BackgroundCheckResult {
    const passed = Math.random() > 0.15; // 85% pass rate

    return {
      passed,
      details: passed ? 'No criminal record found' : 'Criminal record found',
      findings: passed
        ? ['No felonies', 'No misdemeanors', 'Clean record']
        : ['Misdemeanor found (5 years ago)', 'Non-violent offense'],
    };
  }

  /**
   * Simulate eviction check results
   */
  private static simulateEvictionCheck(): BackgroundCheckResult {
    const passed = Math.random() > 0.1; // 90% pass rate

    return {
      passed,
      details: passed ? 'No eviction history found' : 'Eviction history found',
      findings: passed
        ? ['No evictions', 'No judgments', 'Clean rental record']
        : ['Eviction filed 3 years ago', 'Case dismissed'],
    };
  }

  /**
   * Simulate employment verification results
   */
  private static simulateEmploymentCheck(): BackgroundCheckResult {
    const passed = Math.random() > 0.05; // 95% pass rate

    return {
      passed,
      details: passed ? 'Employment verified' : 'Employment could not be verified',
      findings: passed
        ? ['Current employment confirmed', 'Income verified', 'Position verified']
        : ['Unable to contact employer', 'Verification pending'],
    };
  }

  /**
   * Simulate rental history verification results
   */
  private static simulateRentalCheck(): BackgroundCheckResult {
    const passed = Math.random() > 0.1; // 90% pass rate

    return {
      passed,
      details: passed ? 'Positive rental references' : 'Mixed rental references',
      findings: passed
        ? ['Landlord confirmed tenancy', 'Always paid on time', 'Good tenant']
        : ['Landlord could not be reached', 'Some late payments reported'],
    };
  }

  /**
   * Get typical costs for each check type
   */
  static getTypicalCosts(): Record<BackgroundCheckType, number> {
    return {
      credit: 30.00,
      criminal: 25.00,
      eviction: 20.00,
      employment: 15.00,
      rental: 15.00,
    };
  }

  /**
   * Get recommended checks for standard screening
   */
  static getRecommendedChecks(): BackgroundCheckType[] {
    return ['credit', 'criminal', 'eviction'];
  }

  /**
   * Map database record to BackgroundCheck type
   */
  private static mapToBackgroundCheck(data: DatabaseBackgroundCheck): BackgroundCheck {
    return {
      id: data.id,
      applicationId: data.application_id,
      checkType: data.check_type as BackgroundCheckType,
      status: data.status as BackgroundCheck['status'],
      provider: data.provider,
      requestDate: data.request_date,
      completionDate: data.completion_date,
      results: data.results,
      cost: data.cost,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}