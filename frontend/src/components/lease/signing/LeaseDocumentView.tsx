import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaseAgreement } from '@/types/lease';
import { format } from 'date-fns';

interface LeaseDocumentViewProps {
  lease: LeaseAgreement;
}

export const LeaseDocumentView: React.FC<LeaseDocumentViewProps> = ({ lease }) => {
  return (
    <Card className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none">
      <CardHeader className="text-center border-b pb-8">
        <CardTitle className="text-3xl font-serif">Residential Lease Agreement</CardTitle>
        <p className="text-gray-500 mt-2">This is a legally binding contract. Please read carefully.</p>
      </CardHeader>
      <CardContent className="space-y-8 pt-8 font-serif leading-relaxed text-gray-800">
        
        {/* 1. Parties */}
        <section>
          <h3 className="text-lg font-bold uppercase mb-4 text-gray-900 border-b pb-2">1. Parties</h3>
          <p>
            This Agreement is made this <span className="font-bold">{format(new Date(), 'MMMM do, yyyy')}</span>, between:
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded">
              <span className="block text-xs uppercase text-gray-500 font-sans mb-1">Landlord</span>
              <span className="font-bold text-lg">{lease.landlordId || 'Landlord Name'}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <span className="block text-xs uppercase text-gray-500 font-sans mb-1">Tenant</span>
              <span className="font-bold text-lg">{lease.tenantId || 'Tenant Name'}</span>
            </div>
          </div>
        </section>

        {/* 2. Property */}
        <section>
          <h3 className="text-lg font-bold uppercase mb-4 text-gray-900 border-b pb-2">2. Property</h3>
          <p>
            The Landlord agrees to rent to the Tenant the property located at:
          </p>
          <div className="mt-2 p-4 bg-gray-50 rounded border border-gray-100">
            <p className="font-bold text-lg">{lease.propertyId}</p>
            {/* Add more address details if available in the lease object */}
          </div>
        </section>

        {/* 3. Term */}
        <section>
          <h3 className="text-lg font-bold uppercase mb-4 text-gray-900 border-b pb-2">3. Term</h3>
          <p>
            The lease term begins on <span className="font-bold">{format(new Date(lease.startDate), 'MMMM do, yyyy')}</span> and ends on <span className="font-bold">{format(new Date(lease.endDate), 'MMMM do, yyyy')}</span>.
          </p>
        </section>

        {/* 4. Rent and Payments */}
        <section>
          <h3 className="text-lg font-bold uppercase mb-4 text-gray-900 border-b pb-2">4. Rent and Payments</h3>
          <div className="space-y-4">
            <p>
              The Tenant agrees to pay monthly rent in the amount of <span className="font-bold">${lease.rentAmount.toLocaleString()}</span>.
            </p>
            <p>
              Rent is due on the <span className="font-bold">{lease.rentDueDay}{getOrdinal(lease.rentDueDay)}</span> day of each month.
            </p>
            <p>
              A security deposit of <span className="font-bold">${lease.securityDeposit.toLocaleString()}</span> is required upon signing.
            </p>
            {lease.lateFeeAmount > 0 && (
              <p>
                A late fee of <span className="font-bold">${lease.lateFeeAmount}</span> will be charged if rent is not received within the grace period.
              </p>
            )}
          </div>
        </section>

        {/* 5. Additional Terms */}
        {lease.additionalTerms && (
          <section>
            <h3 className="text-lg font-bold uppercase mb-4 text-gray-900 border-b pb-2">5. Additional Terms</h3>
            <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded text-sm">
              {lease.additionalTerms}
            </div>
          </section>
        )}

        {/* Signatures Section Placeholder */}
        <section className="mt-12 pt-8 border-t-2 border-gray-100">
          <p className="text-sm text-gray-500 italic text-center">
            By signing below, the Tenant acknowledges having read and understood the terms of this Agreement.
          </p>
        </section>

      </CardContent>
    </Card>
  );
};

// Helper for ordinal numbers (1st, 2nd, 3rd, etc.)
function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}