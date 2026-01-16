import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ScheduleEProperty, ScheduleECategory, TaxDocument, TaxDocumentType, TaxDocumentStatus } from '@/types/landlordTax';
import { calculateNetIncome } from '@/lib/utils/taxCalculations';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const useTaxData = (year: number, propertyId: string) => {
  const [loading, setLoading] = useState(true);
  const [taxData, setTaxData] = useState<ScheduleEProperty | null>(null);
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Tax Categories
        const { data: categories, error: catError } = await supabase
          .from('tax_categories')
          .select('*');
        
        if (catError) throw catError;

        // 2. Fetch Property Details (Mocking getting a specific property or all)
        // In a real scenario, we would join with the properties table
        const propertyQuery = supabase.from('properties').select('*');
        if (propertyId !== 'all') {
            propertyQuery.eq('id', propertyId);
        }
        
        // 3. Fetch Expenses (Transactions)
        // SIMULATION START
        const mockExpenses = {
            advertising: 1200,
            auto: 850,
            cleaning: 3500,
            commissions: 0,
            insurance: 4200,
            legal: 1500,
            management: 12000,
            mortgageInterest: 24000,
            otherInterest: 0,
            repairs: 8500,
            supplies: 1200,
            taxes: 18000,
            utilities: 3600,
            depreciation: 15000,
            other: [
                { description: 'HOA Fees', amount: 4800 },
                { description: 'Landscaping', amount: 2400 }
            ]
        };
        
        const mockIncome = {
            rentsReceived: 145000,
            royaltiesReceived: 0
        };
        // SIMULATION END

        const netIncome = calculateNetIncome(mockIncome, mockExpenses);

        const calculatedData: ScheduleEProperty = {
          propertyId: propertyId === 'all' ? 'prop_combined' : propertyId,
          address: propertyId === 'all' ? 'All Properties Combined' : '123 Sunset Blvd, Los Angeles, CA', // Placeholder
          propertyType: 'multi-family',
          income: mockIncome,
          expenses: mockExpenses,
          totalIncome: mockIncome.rentsReceived + mockIncome.royaltiesReceived,
          totalExpenses: Object.values(mockExpenses).reduce((acc, val) => {
              if (typeof val === 'number') return acc + val;
              if (Array.isArray(val)) {
                  return acc + val.reduce((s: number, i: { amount: number }) => s + i.amount, 0);
              }
              return acc;
          }, 0),
          netIncome: netIncome,
          daysRented: 365,
          personalUseDays: 0,
          fairRentalDays: 365
        };

        setTaxData(calculatedData);

        // 4. Fetch Documents
        const { data: docs, error: docError } = await supabase
          .from('tax_documents')
          .select('*')
          .eq('tax_year', year);
        
        if (docError) {
            console.warn('Error fetching documents, using empty list', docError);
            setDocuments([]);
        } else {
            // Map DB result to TaxDocument type
            const mappedDocs: TaxDocument[] = (docs || []).map(doc => ({
                id: doc.id,
                landlordId: doc.landlord_id,
                taxYear: doc.tax_year,
                documentType: doc.document_type as TaxDocumentType,
                status: doc.status as TaxDocumentStatus,
                data: doc.metadata || {},
                generatedAt: new Date(doc.generated_at),
                generatedBy: 'system',
                lastModified: new Date(doc.updated_at),
                version: 1
            }));
            setDocuments(mappedDocs);
        }

      } catch (err: unknown) {
        console.error('Error in useTaxData:', err);
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, propertyId]);

  return { taxData, documents, loading, error };
};