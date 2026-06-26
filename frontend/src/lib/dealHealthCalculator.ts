import { Transaction, DealHealthScore, DealAlert, ScoringConfiguration, DEFAULT_SCORING_CONFIG } from '@/types/dealHealth';

export class DealHealthCalculator {
  private config: ScoringConfiguration;

  constructor(config?: ScoringConfiguration) {
    this.config = config || DEFAULT_SCORING_CONFIG;
  }

  /**
   * Update the scoring configuration
   */
  setConfiguration(config: ScoringConfiguration): void {
    this.config = config;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ScoringConfiguration {
    return this.config;
  }

  /**
   * Calculate comprehensive health score for a transaction
   */
  calculateHealthScore(transaction: Transaction): DealHealthScore {
    const factors = {
      documentCompletion: this.calculateDocumentScore(transaction),
      activityLevel: this.calculateActivityScore(transaction),
      timelineAdherence: this.calculateTimelineScore(transaction),
      financingStrength: this.calculateFinancingScore(transaction),
      communicationQuality: this.calculateCommunicationScore(transaction)
    };

    // Weighted average calculation using custom weights
    const overallScore = Math.round(
      factors.documentCompletion * this.config.weights.documentCompletion +
      factors.activityLevel * this.config.weights.activityLevel +
      factors.timelineAdherence * this.config.weights.timelineAdherence +
      factors.financingStrength * this.config.weights.financingStrength +
      factors.communicationQuality * this.config.weights.communicationQuality
    );

    const riskLevel = this.determineRiskLevel(overallScore);
    const alerts = this.generateAlerts(transaction, factors);
    const recommendations = this.generateRecommendations(transaction, factors, alerts);

    return {
      transactionId: transaction.id,
      overallScore,
      riskLevel,
      factors,
      alerts,
      recommendations,
      lastUpdated: new Date(),
      configurationUsed: this.config.id
    };
  }

  private calculateDocumentScore(transaction: Transaction): number {
    const totalDocumentsExpected = 15; // Standard document count
    const missingCount = transaction.missingDocuments.length;
    const completionRate = Math.max(0, (totalDocumentsExpected - missingCount) / totalDocumentsExpected);
    
    // Penalize heavily if closing is near and documents are missing
    let score = completionRate * 100;
    if (transaction.daysUntilClosing < this.config.alertThresholds.criticalDocumentsMissing && missingCount > 2) {
      score *= 0.6;
    } else if (transaction.daysUntilClosing < this.config.alertThresholds.warningDocumentsMissing && missingCount > 3) {
      score *= 0.8;
    }
    
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  private calculateActivityScore(transaction: Transaction): number {
    const daysSinceActivity = this.calculateDaysSince(transaction.lastActivityDate);
    
    // Activity expectations based on deal stage
    let maxAcceptableDays = this.config.alertThresholds.warningActivityGap;
    if (transaction.status === 'closing') {
      maxAcceptableDays = 1;
    } else if (transaction.status === 'escrow') {
      maxAcceptableDays = 2;
    }

    if (daysSinceActivity <= maxAcceptableDays) {
      return 100;
    } else if (daysSinceActivity <= maxAcceptableDays * 2) {
      return 70;
    } else if (daysSinceActivity <= maxAcceptableDays * 3) {
      return 40;
    } else {
      return 20;
    }
  }

  private calculateTimelineScore(transaction: Transaction): number {
    const expectedProgress = this.calculateExpectedProgress(transaction);
    const actualProgress = transaction.progress;
    const deviation = actualProgress - expectedProgress;

    if (deviation >= 0) {
      return 100; // On track or ahead
    } else if (deviation >= -10) {
      return 85; // Slightly behind
    } else if (deviation >= -20) {
      return 60; // Moderately behind
    } else if (deviation >= -30) {
      return 35; // Significantly behind
    } else {
      return 15; // Critically behind
    }
  }

  private calculateFinancingScore(transaction: Transaction): number {
    const financingScores = {
      approved: 100,
      conditional: 70,
      pending: 50,
      not_started: 30
    };

    let baseScore = financingScores[transaction.financingStatus];

    // Adjust based on days until closing using custom thresholds
    if (transaction.daysUntilClosing < this.config.alertThresholds.criticalFinancingDeadline && 
        transaction.financingStatus !== 'approved') {
      baseScore *= 0.7;
    }

    return Math.round(baseScore);
  }

  private calculateCommunicationScore(transaction: Transaction): number {
    const frequency = transaction.communicationFrequency;
    
    // Expected: 3-5 communications per week for healthy deal
    if (frequency >= 3 && frequency <= 7) {
      return 100;
    } else if (frequency >= 2) {
      return 80;
    } else if (frequency >= 1) {
      return 60;
    } else {
      return 30;
    }
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= this.config.riskThresholds.low) return 'low';
    if (score >= this.config.riskThresholds.medium) return 'medium';
    if (score >= this.config.riskThresholds.high) return 'high';
    return 'critical';
  }

  private generateAlerts(
    transaction: Transaction, 
    factors: {
      documentCompletion: number;
      activityLevel: number;
      timelineAdherence: number;
      financingStrength: number;
      communicationQuality: number;
    }
  ): DealAlert[] {
    const alerts: DealAlert[] = [];

    // Document alerts using custom thresholds
    if (transaction.missingDocuments.length > 0) {
      const severity = transaction.daysUntilClosing < this.config.alertThresholds.criticalDocumentsMissing ? 'critical' : 
                      transaction.daysUntilClosing < this.config.alertThresholds.warningDocumentsMissing ? 'warning' : 'info';
      alerts.push({
        id: `${transaction.id}-docs`,
        severity,
        category: 'documents',
        message: `${transaction.missingDocuments.length} critical documents missing`,
        actionRequired: `Collect: ${transaction.missingDocuments.slice(0, 3).join(', ')}${transaction.missingDocuments.length > 3 ? '...' : ''}`,
        dueDate: transaction.daysUntilClosing < this.config.alertThresholds.criticalDocumentsMissing ? 'Urgent' : undefined
      });
    }

    // Activity alerts using custom thresholds
    const daysSinceActivity = this.calculateDaysSince(transaction.lastActivityDate);
    if (daysSinceActivity > this.config.alertThresholds.warningActivityGap) {
      alerts.push({
        id: `${transaction.id}-activity`,
        severity: daysSinceActivity > this.config.alertThresholds.criticalActivityGap ? 'critical' : 'warning',
        category: 'communication',
        message: `No activity in ${daysSinceActivity} days`,
        actionRequired: `Contact agent ${transaction.agent} immediately`
      });
    }

    // Timeline alerts
    if (factors.timelineAdherence < 60) {
      alerts.push({
        id: `${transaction.id}-timeline`,
        severity: 'warning',
        category: 'timeline',
        message: 'Deal is behind schedule',
        actionRequired: 'Review timeline with agent and identify bottlenecks'
      });
    }

    // Financing alerts using custom thresholds
    if (transaction.financingStatus !== 'approved' && 
        transaction.daysUntilClosing < this.config.alertThresholds.criticalFinancingDeadline) {
      alerts.push({
        id: `${transaction.id}-financing`,
        severity: 'critical',
        category: 'financing',
        message: 'Financing not yet approved with closing approaching',
        actionRequired: 'Escalate to lender and consider contingency plans'
      });
    }

    // Inspection alerts
    if (transaction.inspectionStatus === 'issues_found') {
      alerts.push({
        id: `${transaction.id}-inspection`,
        severity: 'warning',
        category: 'inspection',
        message: 'Inspection issues identified',
        actionRequired: 'Review repair negotiations and impact on closing timeline'
      });
    }

    return alerts;
  }

  private generateRecommendations(
    transaction: Transaction, 
    factors: {
      documentCompletion: number;
      activityLevel: number;
      timelineAdherence: number;
      financingStrength: number;
      communicationQuality: number;
    }, 
    alerts: DealAlert[]
  ): string[] {
    const recommendations: string[] = [];

    // Priority recommendations based on critical alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push(`🚨 ${criticalAlerts.length} critical issue(s) require immediate attention`);
    }

    // Document recommendations
    if (factors.documentCompletion < 80) {
      recommendations.push('Schedule document collection session with all parties');
      recommendations.push('Send automated reminders for missing documents');
    }

    // Activity recommendations
    if (factors.activityLevel < 70) {
      recommendations.push('Increase check-in frequency with agent and client');
      recommendations.push('Set up automated status update reminders');
    }

    // Timeline recommendations
    if (factors.timelineAdherence < 70) {
      recommendations.push('Conduct timeline review meeting with agent');
      recommendations.push('Identify and address any bottlenecks in the process');
    }

    // Financing recommendations
    if (factors.financingStrength < 70) {
      recommendations.push('Follow up with lender on approval status');
      if (transaction.daysUntilClosing < this.config.alertThresholds.warningFinancingDeadline) {
        recommendations.push('Consider backup financing options');
      }
    }

    // Communication recommendations
    if (factors.communicationQuality < 70) {
      recommendations.push('Establish regular communication schedule with all parties');
      recommendations.push('Use automated updates to keep everyone informed');
    }

    // Proactive recommendations for healthy deals
    if (factors.documentCompletion >= 80 && factors.timelineAdherence >= 80) {
      recommendations.push('✅ Deal is on track - maintain current momentum');
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  private calculateExpectedProgress(transaction: Transaction): number {
    // Calculate expected progress based on time elapsed
    const totalDays = 45; // Typical transaction timeline
    const daysElapsed = totalDays - transaction.daysUntilClosing;
    return Math.round((daysElapsed / totalDays) * 100);
  }

  private calculateDaysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate aggregate metrics for all deals
   */
  static calculateAggregateMetrics(healthScores: DealHealthScore[]): {
    totalDeals: number;
    healthyDeals: number;
    atRiskDeals: number;
    criticalDeals: number;
    averageHealthScore: number;
    predictedClosureRate: number;
  } {
    const total = healthScores.length;
    const healthy = healthScores.filter(s => s.riskLevel === 'low').length;
    const atRisk = healthScores.filter(s => s.riskLevel === 'medium' || s.riskLevel === 'high').length;
    const critical = healthScores.filter(s => s.riskLevel === 'critical').length;
    
    const avgScore = total > 0 
      ? Math.round(healthScores.reduce((sum, s) => sum + s.overallScore, 0) / total)
      : 0;

    // Predict closure rate based on health scores
    const predictedClosureRate = total > 0
      ? Math.round((healthy * 0.95 + atRisk * 0.75 + critical * 0.40) / total * 100)
      : 0;

    return {
      totalDeals: total,
      healthyDeals: healthy,
      atRiskDeals: atRisk,
      criticalDeals: critical,
      averageHealthScore: avgScore,
      predictedClosureRate
    };
  }
}