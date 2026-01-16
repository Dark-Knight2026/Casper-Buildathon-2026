import { calculateStraightLineDepreciation, calculateNetIncome, estimateTaxLiability, aggregateExpensesByCategory } from './taxCalculations';
import { ScheduleEProperty } from '@/types/landlordTax';

describe('Tax Calculations', () => {
  describe('calculateStraightLineDepreciation', () => {
    it('should calculate depreciation correctly for standard residential property', () => {
      const costBasis = 275000;
      const landValue = 0;
      const recoveryPeriod = 27.5;
      const expected = 10000; // 275000 / 27.5
      expect(calculateStraightLineDepreciation(costBasis, landValue, recoveryPeriod)).toBeCloseTo(expected);
    });

    it('should subtract land value before calculating', () => {
      const costBasis = 375000;
      const landValue = 100000;
      const recoveryPeriod = 27.5;
      const expected = 10000; // (375000 - 100000) / 27.5
      expect(calculateStraightLineDepreciation(costBasis, landValue, recoveryPeriod)).toBeCloseTo(expected);
    });

    it('should return 0 if basis is less than land value', () => {
      expect(calculateStraightLineDepreciation(50000, 100000)).toBe(0);
    });
  });

  describe('calculateNetIncome', () => {
    const mockIncome = { rentsReceived: 12000, royaltiesReceived: 0 };
    const mockExpenses: ScheduleEProperty['expenses'] = {
      advertising: 100,
      auto: 200,
      cleaning: 300,
      commissions: 0,
      insurance: 500,
      legal: 0,
      management: 1000,
      mortgageInterest: 5000,
      otherInterest: 0,
      repairs: 400,
      supplies: 100,
      taxes: 2000,
      utilities: 1000,
      depreciation: 1000,
      other: [{ description: 'HOA', amount: 400 }]
    };

    it('should sum all expenses and subtract from total income', () => {
      // Total Expenses = 100+200+300+500+1000+5000+400+100+2000+1000+1000+400 = 12000
      // Net Income = 12000 - 12000 = 0
      expect(calculateNetIncome(mockIncome, mockExpenses)).toBe(0);
    });

    it('should handle profit correctly', () => {
      const highIncome = { rentsReceived: 20000, royaltiesReceived: 0 };
      // Net = 20000 - 12000 = 8000
      expect(calculateNetIncome(highIncome, mockExpenses)).toBe(8000);
    });

    it('should handle loss correctly', () => {
      const lowIncome = { rentsReceived: 10000, royaltiesReceived: 0 };
      // Net = 10000 - 12000 = -2000
      expect(calculateNetIncome(lowIncome, mockExpenses)).toBe(-2000);
    });
  });

  describe('estimateTaxLiability', () => {
    it('should calculate tax based on rate', () => {
      expect(estimateTaxLiability(10000, 0.25)).toBe(2500);
    });

    it('should return 0 for negative income', () => {
      expect(estimateTaxLiability(-5000, 0.25)).toBe(0);
    });
  });
});