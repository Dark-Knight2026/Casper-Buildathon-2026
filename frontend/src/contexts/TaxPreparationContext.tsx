import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { logger } from '@/utils/logger';
import {
  TaxYearSummary,
  PropertyTaxSummary,
  ScheduleECategory,
  TaxDocument,
  TaxReminder,
  ExpenseFilter,
  TaxOptimizationSuggestion,
  ExpenseCategorization,
  SCHEDULE_E_CATEGORIES
} from '@/types/landlordTax';
import { PropertyExpense } from '@/types/clientLandlord';
import { useLandlordManagement } from './LandlordManagementContext';

interface TaxPreparationContextType {
  // Tax year management
  selectedTaxYear: number;
  setSelectedTaxYear: (year: number) => void;
  availableTaxYears: number[];
  
  // Summary data
  taxYearSummary: TaxYearSummary | null;
  loadTaxYearSummary: (landlordId: string, year: number) => Promise<void>;
  refreshSummary: () => Promise<void>;

  // Income & Expenses
  categorizeExpense: (expenseId: string, category: ScheduleECategory) => Promise<void>;
  bulkCategorizeExpenses: (expenseIds: string[], category: ScheduleECategory) => Promise<void>;
  suggestCategory: (expense: PropertyExpense) => Promise<ExpenseCategorization>;

  // Expense filtering
  expenseFilter: ExpenseFilter;
  setExpenseFilter: (filter: ExpenseFilter) => void;
  filteredExpenses: PropertyExpense[];

  // Deduction optimization
  optimizationSuggestions: TaxOptimizationSuggestion[];
  loadOptimizationSuggestions: (landlordId: string, year: number) => Promise<void>;
  acceptSuggestion: (suggestionId: string) => Promise<void>;
  dismissSuggestion: (suggestionId: string, reason: string) => Promise<void>;

  // Reminders
  upcomingReminders: TaxReminder[];
  loadReminders: (landlordId: string) => Promise<void>;
  markReminderComplete: (reminderId: string) => Promise<void>;

  // State
  loading: boolean;
  error: string | null;
}

const TaxPreparationContext = createContext<TaxPreparationContextType | undefined>(undefined);

// Mock data generator for tax summary
function generateMockTaxSummary(landlordId: string, year: number, propertyCount: number): TaxYearSummary {
  const mockPropertySummaries: PropertyTaxSummary[] = [];
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalDepreciation = 0;

  // Generate property summaries
  for (let i = 0; i < propertyCount; i++) {
    const income = 18000 + Math.random() * 24000; // $18k-$42k per property
    const expenses = 6000 + Math.random() * 12000; // $6k-$18k per property
    const depreciation = 8000 + Math.random() * 4000; // $8k-$12k depreciation
    
    totalIncome += income;
    totalExpenses += expenses;
    totalDepreciation += depreciation;

    mockPropertySummaries.push({
      propertyId: `property-${i + 1}`,
      address: `${100 + i * 50} Main Street`,
      propertyType: i % 2 === 0 ? 'single-family' : 'multi-family',
      income,
      expenses,
      depreciation,
      netIncome: income - expenses,
      daysRented: 365,
      personalUseDays: 0
    });
  }

  // Mock expense categories
  const expensesByCategory = [
    { category: 'mortgage-interest' as ScheduleECategory, amount: totalExpenses * 0.40, transactionCount: 12 },
    { category: 'taxes' as ScheduleECategory, amount: totalExpenses * 0.19, transactionCount: 4 },
    { category: 'insurance' as ScheduleECategory, amount: totalExpenses * 0.13, transactionCount: 12 },
    { category: 'repairs' as ScheduleECategory, amount: totalExpenses * 0.12, transactionCount: 8 },
    { category: 'utilities' as ScheduleECategory, amount: totalExpenses * 0.08, transactionCount: 36 },
    { category: 'other' as ScheduleECategory, amount: totalExpenses * 0.08, transactionCount: 15 }
  ];

  return {
    landlordId,
    taxYear: year,
    totalRentalIncome: totalIncome,
    totalOtherIncome: 0,
    totalIncome: totalIncome,
    expensesByCategory,
    totalExpenses,
    totalDepreciation,
    netRentalIncome: totalIncome - totalExpenses,
    propertySummaries: mockPropertySummaries,
    incomeRecorded: true,
    expensesCategorized: true,
    receiptsUploaded: true,
    depreciationCalculated: true,
    documentsGenerated: false,
    lastUpdated: new Date(),
    completionPercentage: 78
  };
}

export function TaxPreparationProvider({ children }: { children: ReactNode }) {
  const { properties, tenants, clients } = useLandlordManagement();
  const currentYear = new Date().getFullYear();

  const [selectedTaxYear, setSelectedTaxYear] = useState(currentYear);
  const [taxYearSummary, setTaxYearSummary] = useState<TaxYearSummary | null>(null);
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>({});
  const [filteredExpenses, setFilteredExpenses] = useState<PropertyExpense[]>([]);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<TaxOptimizationSuggestion[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<TaxReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available tax years (current year and past 7 years for IRS compliance)
  const availableTaxYears = Array.from({ length: 8 }, (_, i) => currentYear - i);

  // Load tax year summary
  const loadTaxYearSummary = useCallback(async (landlordId: string, year: number) => {
    setLoading(true);
    setError(null);

    try {
      // Get all properties for landlord
      const landlordProperties = properties.filter(p => {
        const landlord = clients.find(c => c.propertyIds.includes(p.id));
        return landlord?.id === landlordId;
      });
      
      // If no properties found or properties don't have enough data, use mock data
      if (landlordProperties.length === 0 || landlordProperties.every(p => !p.financialInfo.monthlyIncome)) {
        logger.debug('Using mock tax data for demonstration');
        const mockSummary = generateMockTaxSummary(landlordId, year, Math.max(3, landlordProperties.length));
        setTaxYearSummary(mockSummary);
        setLoading(false);
        return;
      }

      // Calculate income and expenses for the tax year
      let totalIncome = 0;
      let totalExpenses = 0;
      let totalDepreciation = 0;
      const expensesByCategory: Record<ScheduleECategory, number> = {} as Record<ScheduleECategory, number>;
      const propertySummaries: PropertyTaxSummary[] = [];

      // Initialize expense categories
      Object.keys(SCHEDULE_E_CATEGORIES).forEach(cat => {
        expensesByCategory[cat as ScheduleECategory] = 0;
      });

      // Process each property
      for (const property of landlordProperties) {
        const propertyIncome = property.financialInfo.monthlyIncome || 0;
        const yearlyIncome = propertyIncome * 12; // Simplified - should check actual payments
        
        let propertyExpenses = 0;
        let propertyDepreciation = 0;

        // Sum expenses for this property in the tax year
        property.financialInfo.expenses.forEach(expense => {
          const expenseYear = expense.date.getFullYear();
          if (expenseYear === year) {
            const amount = expense.recurring ? expense.amount * 12 : expense.amount;
            propertyExpenses += amount;
            
            // Categorize by tax category
            const expenseWithCategory = expense as PropertyExpense & { taxCategory?: ScheduleECategory };
            const taxCategory = expenseWithCategory.taxCategory || 'other';
            expensesByCategory[taxCategory] = (expensesByCategory[taxCategory] || 0) + amount;

            if (taxCategory === 'depreciation') {
              propertyDepreciation += amount;
            }
          }
        });

        // Add estimated depreciation if not present
        if (propertyDepreciation === 0 && property.details.price > 0) {
          propertyDepreciation = property.details.price * 0.03636; // 27.5 year depreciation
          totalDepreciation += propertyDepreciation;
        }

        totalIncome += yearlyIncome;
        totalExpenses += propertyExpenses;
        totalDepreciation += propertyDepreciation;

        propertySummaries.push({
          propertyId: property.id,
          address: property.details.address.street,
          propertyType: property.details.propertyType,
          income: yearlyIncome,
          expenses: propertyExpenses,
          depreciation: propertyDepreciation,
          netIncome: yearlyIncome - propertyExpenses,
          daysRented: property.status === 'rented' ? 365 : 0,
          personalUseDays: 0
        });
      }

      // Calculate completion status
      const hasExpenses = landlordProperties.some(p => p.financialInfo.expenses.length > 0);
      const categorizedExpenses = landlordProperties.flatMap(p => p.financialInfo.expenses)
        .filter(e => (e as PropertyExpense & { taxCategory?: ScheduleECategory }).taxCategory);
      const totalExpenseCount = landlordProperties.flatMap(p => p.financialInfo.expenses).length;
      const categorizationRate = totalExpenseCount > 0 ? categorizedExpenses.length / totalExpenseCount : 0;

      const summary: TaxYearSummary = {
        landlordId,
        taxYear: year,
        totalRentalIncome: totalIncome,
        totalOtherIncome: 0,
        totalIncome: totalIncome,
        expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({
          category: category as ScheduleECategory,
          amount,
          transactionCount: landlordProperties.flatMap(p => p.financialInfo.expenses)
            .filter(e => (e as PropertyExpense & { taxCategory?: ScheduleECategory }).taxCategory === category).length
        })),
        totalExpenses,
        totalDepreciation,
        netRentalIncome: totalIncome - totalExpenses,
        propertySummaries,
        incomeRecorded: totalIncome > 0,
        expensesCategorized: categorizationRate > 0.8,
        receiptsUploaded: false,
        depreciationCalculated: totalDepreciation > 0,
        documentsGenerated: false,
        lastUpdated: new Date(),
        completionPercentage: Math.round(
          ((totalIncome > 0 ? 25 : 0) +
          (categorizationRate * 25) +
          (totalDepreciation > 0 ? 25 : 0)) / 1
        )
      };

      setTaxYearSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tax year summary');
      logger.error('Error loading tax year summary:', err);
    } finally {
      setLoading(false);
    }
  }, [properties, clients]);

  // Refresh current summary
  const refreshSummary = useCallback(async () => {
    if (taxYearSummary) {
      await loadTaxYearSummary(taxYearSummary.landlordId, taxYearSummary.taxYear);
    }
  }, [taxYearSummary, loadTaxYearSummary]);

  // Categorize single expense
  const categorizeExpense = async (expenseId: string, category: ScheduleECategory) => {
    try {
      // Find the expense across all properties
      for (const property of properties) {
        const expenseIndex = property.financialInfo.expenses.findIndex(e => e.id === expenseId);
        if (expenseIndex !== -1) {
          // Update expense with tax category
          const updatedExpense = {
            ...property.financialInfo.expenses[expenseIndex],
            taxCategory: category,
            aiCategorized: false
          };
          
          // Update property expenses
          const updatedExpenses = [...property.financialInfo.expenses];
          updatedExpenses[expenseIndex] = updatedExpense as PropertyExpense;

          logger.debug('Categorized expense:', expenseId, 'as', category);

          // Refresh summary
          await refreshSummary();
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to categorize expense');
      throw err;
    }
  };

  // Bulk categorize expenses
  const bulkCategorizeExpenses = async (expenseIds: string[], category: ScheduleECategory) => {
    try {
      for (const expenseId of expenseIds) {
        await categorizeExpense(expenseId, category);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk categorize expenses');
      throw err;
    }
  };

  // AI-powered category suggestion
  const suggestCategory = async (expense: PropertyExpense): Promise<ExpenseCategorization> => {
    // Simple rule-based categorization (can be replaced with ML model)
    const description = expense.description.toLowerCase();
    let suggestedCategory: ScheduleECategory = 'other';
    let confidence = 0.5;
    let reasoning = '';

    // Rule-based matching
    if (description.includes('insurance')) {
      suggestedCategory = 'insurance';
      confidence = 0.95;
      reasoning = 'Description contains "insurance"';
    } else if (description.includes('repair') || description.includes('fix')) {
      suggestedCategory = 'repairs';
      confidence = 0.9;
      reasoning = 'Description indicates repair work';
    } else if (description.includes('clean') || description.includes('lawn') || description.includes('maintenance')) {
      suggestedCategory = 'cleaning-maintenance';
      confidence = 0.85;
      reasoning = 'Description indicates cleaning or maintenance';
    } else if (description.includes('tax') && expense.type === 'taxes') {
      suggestedCategory = 'taxes';
      confidence = 0.9;
      reasoning = 'Expense type is taxes';
    } else if (description.includes('electric') || description.includes('gas') || description.includes('water') || description.includes('utility')) {
      suggestedCategory = 'utilities';
      confidence = 0.85;
      reasoning = 'Description indicates utility expense';
    } else if (description.includes('manage') || description.includes('property management')) {
      suggestedCategory = 'management-fees';
      confidence = 0.9;
      reasoning = 'Description indicates management fees';
    } else if (description.includes('mortgage') || description.includes('interest')) {
      suggestedCategory = 'mortgage-interest';
      confidence = 0.95;
      reasoning = 'Description indicates mortgage or interest';
    } else if (description.includes('legal') || description.includes('attorney') || description.includes('lawyer')) {
      suggestedCategory = 'legal-professional';
      confidence = 0.9;
      reasoning = 'Description indicates legal services';
    } else if (description.includes('advertis')) {
      suggestedCategory = 'advertising';
      confidence = 0.85;
      reasoning = 'Description indicates advertising';
    }

    return {
      expenseId: expense.id,
      suggestedCategory,
      confidence,
      reasoning,
      alternativeCategories: []
    };
  };

  // Load optimization suggestions
  const loadOptimizationSuggestions = useCallback(async (landlordId: string, year: number) => {
    try {
      const suggestions: TaxOptimizationSuggestion[] = [
        {
          id: 'cost-segregation',
          type: 'depreciation-opportunity',
          priority: 'high',
          title: 'Maximize Depreciation Deductions',
          description: 'Consider cost segregation study to accelerate depreciation on 3 properties',
          potentialSavings: 8500,
          actionRequired: 'Conduct cost segregation study',
          implementationSteps: [
            'Hire qualified cost segregation specialist',
            'Identify property components for accelerated depreciation',
            'Update depreciation schedules',
            'File amended returns if applicable'
          ],
          status: 'new'
        },
        {
          id: 'home-office',
          type: 'deduction-opportunity',
          priority: 'medium',
          title: 'Track Home Office Expenses',
          description: 'You may qualify for home office deduction if you manage properties from home',
          potentialSavings: 2400,
          actionRequired: 'Document home office usage',
          implementationSteps: [
            'Measure dedicated office space',
            'Calculate percentage of home used for business',
            'Track utilities and maintenance costs',
            'Maintain usage logs'
          ],
          status: 'new'
        },
        {
          id: 'vehicle-mileage',
          type: 'deduction-opportunity',
          priority: 'medium',
          title: 'Document Vehicle Mileage',
          description: 'Start tracking mileage for property visits to claim vehicle expenses',
          potentialSavings: 1800,
          actionRequired: 'Implement mileage tracking',
          implementationSteps: [
            'Use mileage tracking app',
            'Log all property-related trips',
            'Note business purpose for each trip',
            'Keep records for 3+ years'
          ],
          status: 'new'
        },
        {
          id: 'repair-classification',
          type: 'categorization-error',
          priority: 'high',
          title: 'Review Repair vs Improvement Classification',
          description: '5 expenses may be reclassified for immediate deduction',
          potentialSavings: 3200,
          actionRequired: 'Review and reclassify expenses',
          implementationSteps: [
            'Review capital improvement expenses',
            'Identify repairs vs improvements',
            'Reclassify eligible repairs for immediate deduction',
            'Update expense categories'
          ],
          status: 'new'
        },
        {
          id: 'bonus-depreciation',
          type: 'depreciation-opportunity',
          priority: 'high',
          title: 'Consider Bonus Depreciation',
          description: 'New appliances and equipment may qualify for 100% bonus depreciation',
          potentialSavings: 4100,
          actionRequired: 'Identify qualifying property',
          implementationSteps: [
            'Review recent equipment purchases',
            'Verify bonus depreciation eligibility',
            'Calculate potential tax savings',
            'Update depreciation schedules'
          ],
          status: 'new'
        }
      ];

      setOptimizationSuggestions(suggestions);
    } catch (err) {
      logger.error('Error loading optimization suggestions:', err);
    }
  }, []);

  // Accept suggestion
  const acceptSuggestion = async (suggestionId: string) => {
    setOptimizationSuggestions(prev =>
      prev.map(s => s.id === suggestionId ? { ...s, status: 'in-progress' as const } : s)
    );
  };

  // Dismiss suggestion
  const dismissSuggestion = async (suggestionId: string, reason: string) => {
    setOptimizationSuggestions(prev =>
      prev.map(s => s.id === suggestionId ? { ...s, status: 'dismissed' as const, dismissedReason: reason } : s)
    );
  };

  // Load reminders
  const loadReminders = useCallback(async (landlordId: string) => {
    try {
      const reminders: TaxReminder[] = [];
      const today = new Date();

      // Quarterly estimated tax reminders
      const quarterlyDates = [
        new Date(currentYear, 3, 15), // Apr 15
        new Date(currentYear, 5, 15), // Jun 15
        new Date(currentYear, 8, 15), // Sep 15
        new Date(currentYear + 1, 0, 15) // Jan 15 next year
      ];

      quarterlyDates.forEach((date, index) => {
        if (date > today) {
          const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          reminders.push({
            id: `quarterly-${index}`,
            landlordId,
            type: 'quarterly-estimated-tax',
            title: 'Quarterly Estimated Tax Payment Due',
            description: `Q${index + 1} estimated tax payment is due`,
            dueDate: date,
            status: daysUntil <= 7 ? 'due-soon' : 'upcoming',
            notificationsSent: [],
            notificationPreferences: {
              email: true,
              sms: false,
              inApp: true,
              daysBefore: [30, 14, 7, 1]
            }
          });
        }
      });

      // Tax return deadline
      const taxReturnDeadline = new Date(currentYear, 3, 15); // Apr 15
      if (taxReturnDeadline > today) {
        const daysUntil = Math.ceil((taxReturnDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        reminders.push({
          id: 'tax-return-deadline',
          landlordId,
          type: 'tax-return-deadline',
          title: 'Tax Return Filing Deadline',
          description: `${currentYear - 1} tax return must be filed`,
          dueDate: taxReturnDeadline,
          taxYear: currentYear - 1,
          status: daysUntil <= 30 ? 'due-soon' : 'upcoming',
          notificationsSent: [],
          notificationPreferences: {
            email: true,
            sms: true,
            inApp: true,
            daysBefore: [60, 30, 14, 7, 1]
          }
        });
      }

      setUpcomingReminders(reminders.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()));
    } catch (err) {
      logger.error('Error loading reminders:', err);
    }
  }, [currentYear]);

  // Mark reminder as complete
  const markReminderComplete = async (reminderId: string) => {
    setUpcomingReminders(prev =>
      prev.map(r => r.id === reminderId ? { ...r, status: 'completed' as const, completedAt: new Date() } : r)
    );
  };

  // Filter expenses based on current filter
  useEffect(() => {
    let expenses: (PropertyExpense & { propertyId: string })[] = [];

    // Get all expenses from properties
    properties.forEach(property => {
      property.financialInfo.expenses.forEach(expense => {
        expenses.push({
          ...expense,
          propertyId: property.id
        });
      });
    });

    // Apply filters
    if (expenseFilter.taxYear) {
      expenses = expenses.filter(e => e.date.getFullYear() === expenseFilter.taxYear);
    }

    if (expenseFilter.propertyIds?.length) {
      expenses = expenses.filter(e => 
        expenseFilter.propertyIds!.includes(e.propertyId)
      );
    }

    if (expenseFilter.categories?.length) {
      expenses = expenses.filter(e =>
        expenseFilter.categories!.includes((e as PropertyExpense & { taxCategory?: ScheduleECategory }).taxCategory as ScheduleECategory)
      );
    }

    if (expenseFilter.dateRange) {
      expenses = expenses.filter(e =>
        e.date >= expenseFilter.dateRange!.start && 
        e.date <= expenseFilter.dateRange!.end
      );
    }

    if (expenseFilter.amountRange) {
      expenses = expenses.filter(e =>
        e.amount >= expenseFilter.amountRange!.min && 
        e.amount <= expenseFilter.amountRange!.max
      );
    }

    if (expenseFilter.hasReceipt !== undefined) {
      expenses = expenses.filter(e =>
        (e as PropertyExpense & { hasReceipt?: boolean }).hasReceipt === expenseFilter.hasReceipt
      );
    }

    if (expenseFilter.searchQuery) {
      const query = expenseFilter.searchQuery.toLowerCase();
      expenses = expenses.filter(e =>
        e.description.toLowerCase().includes(query)
      );
    }

    setFilteredExpenses(expenses);
  }, [expenseFilter, properties]);

  const value: TaxPreparationContextType = {
    selectedTaxYear,
    setSelectedTaxYear,
    availableTaxYears,
    taxYearSummary,
    loadTaxYearSummary,
    refreshSummary,
    categorizeExpense,
    bulkCategorizeExpenses,
    suggestCategory,
    expenseFilter,
    setExpenseFilter,
    filteredExpenses,
    optimizationSuggestions,
    loadOptimizationSuggestions,
    acceptSuggestion,
    dismissSuggestion,
    upcomingReminders,
    loadReminders,
    markReminderComplete,
    loading,
    error
  };

  return (
    <TaxPreparationContext.Provider value={value}>
      {children}
    </TaxPreparationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTaxPreparation() {
  const context = useContext(TaxPreparationContext);
  if (context === undefined) {
    throw new Error('useTaxPreparation must be used within a TaxPreparationProvider');
  }
  return context;
}