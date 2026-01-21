import { MortgageCalculation } from '../types/buyer';

export interface MortgageInputs {
  homePrice: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTerm: number; // in years
  propertyTaxRate?: number; // annual rate as percentage
  homeInsuranceAnnual?: number;
  hoaMonthly?: number;
  pmiRate?: number; // annual rate as percentage (if down payment < 20%)
}

export function calculateMortgage(inputs: MortgageInputs): MortgageCalculation {
  const {
    homePrice,
    downPaymentPercent,
    interestRate,
    loanTerm,
    propertyTaxRate = 1.2,
    homeInsuranceAnnual = 1200,
    hoaMonthly = 0,
    pmiRate = 0.5,
  } = inputs;

  // Calculate down payment and loan amount
  const downPayment = (homePrice * downPaymentPercent) / 100;
  const loanAmount = homePrice - downPayment;

  // Calculate monthly interest rate
  const monthlyInterestRate = interestRate / 100 / 12;
  const numberOfPayments = loanTerm * 12;

  // Calculate monthly principal and interest payment using mortgage formula
  // M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1]
  let monthlyPayment = 0;
  if (monthlyInterestRate === 0) {
    monthlyPayment = loanAmount / numberOfPayments;
  } else {
    monthlyPayment =
      loanAmount *
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
  }

  // Calculate total payment and interest
  const totalPayment = monthlyPayment * numberOfPayments;
  const totalInterest = totalPayment - loanAmount;

  // Calculate additional monthly costs
  const propertyTaxMonthly = (homePrice * (propertyTaxRate / 100)) / 12;
  const homeInsuranceMonthly = homeInsuranceAnnual / 12;
  
  // PMI is required if down payment is less than 20%
  const pmiMonthly = downPaymentPercent < 20 ? (loanAmount * (pmiRate / 100)) / 12 : 0;

  // Calculate total monthly payment including all costs
  const totalMonthlyPayment =
    monthlyPayment + propertyTaxMonthly + homeInsuranceMonthly + hoaMonthly + pmiMonthly;

  return {
    loanAmount,
    downPayment,
    interestRate,
    loanTerm,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    propertyTax: Math.round(propertyTaxMonthly * 100) / 100,
    homeInsurance: Math.round(homeInsuranceMonthly * 100) / 100,
    hoa: hoaMonthly,
    pmi: Math.round(pmiMonthly * 100) / 100,
    totalMonthlyPayment: Math.round(totalMonthlyPayment * 100) / 100,
  };
}

export function calculateAffordability(
  monthlyIncome: number,
  monthlyDebts: number,
  downPaymentAmount: number,
  interestRate: number,
  loanTerm: number = 30
): {
  maxHomePrice: number;
  maxLoanAmount: number;
  maxMonthlyPayment: number;
  debtToIncomeRatio: number;
  recommendation: string;
} {
  // Standard lending guideline: housing costs should not exceed 28% of gross monthly income
  const maxHousingPayment = monthlyIncome * 0.28;
  
  // Total debt (including housing) should not exceed 36% of gross monthly income
  const maxTotalDebt = monthlyIncome * 0.36;
  const maxHousingWithDebt = maxTotalDebt - monthlyDebts;
  
  // Use the more conservative estimate
  const maxMonthlyPayment = Math.min(maxHousingPayment, maxHousingWithDebt);
  
  // Estimate property tax, insurance, and HOA (roughly 25% of total payment)
  const principalAndInterest = maxMonthlyPayment * 0.75;
  
  // Calculate max loan amount using mortgage formula
  const monthlyInterestRate = interestRate / 100 / 12;
  const numberOfPayments = loanTerm * 12;
  
  let maxLoanAmount = 0;
  if (monthlyInterestRate === 0) {
    maxLoanAmount = principalAndInterest * numberOfPayments;
  } else {
    maxLoanAmount =
      principalAndInterest *
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) /
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments));
  }
  
  const maxHomePrice = maxLoanAmount + downPaymentAmount;
  const debtToIncomeRatio = ((monthlyDebts + maxMonthlyPayment) / monthlyIncome) * 100;
  
  let recommendation = '';
  if (debtToIncomeRatio <= 36) {
    recommendation = 'You have a healthy debt-to-income ratio and good purchasing power.';
  } else if (debtToIncomeRatio <= 43) {
    recommendation = 'Your debt-to-income ratio is acceptable but consider reducing debts for better terms.';
  } else {
    recommendation = 'Your debt-to-income ratio is high. Consider paying down debts before purchasing.';
  }
  
  return {
    maxHomePrice: Math.round(maxHomePrice),
    maxLoanAmount: Math.round(maxLoanAmount),
    maxMonthlyPayment: Math.round(maxMonthlyPayment * 100) / 100,
    debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100,
    recommendation,
  };
}