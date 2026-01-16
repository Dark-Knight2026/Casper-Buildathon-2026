import React from 'react';
import { MortgageCalculator } from '@/components/buyer/MortgageCalculator';
import { AffordabilityCalculator } from '@/components/buyer/AffordabilityCalculator';
import { ClosingCostEstimator } from '@/components/buyer/ClosingCostEstimator';
import { InvestmentAnalysis } from '@/components/buyer/InvestmentAnalysis';

export default function BuyerFinancials() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Financial Tools</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MortgageCalculator />
        <AffordabilityCalculator />
        <ClosingCostEstimator />
        <InvestmentAnalysis />
      </div>
    </div>
  );
}