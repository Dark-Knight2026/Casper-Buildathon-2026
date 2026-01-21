import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SCHEDULE_E_CATEGORIES, ScheduleEProperty } from '@/types/landlordTax';

interface ScheduleEReportProps {
  data: ScheduleEProperty;
  year: number;
}

export const ScheduleEReport: React.FC<ScheduleEReportProps> = ({ data, year }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const expenses = [
    { line: 5, label: 'Advertising', amount: data.expenses.advertising },
    { line: 6, label: 'Auto and Travel', amount: data.expenses.auto },
    { line: 7, label: 'Cleaning and Maintenance', amount: data.expenses.cleaning },
    { line: 8, label: 'Commissions', amount: data.expenses.commissions },
    { line: 9, label: 'Insurance', amount: data.expenses.insurance },
    { line: 10, label: 'Legal and Professional Fees', amount: data.expenses.legal },
    { line: 11, label: 'Management Fees', amount: data.expenses.management },
    { line: 12, label: 'Mortgage Interest', amount: data.expenses.mortgageInterest },
    { line: 13, label: 'Other Interest', amount: data.expenses.otherInterest },
    { line: 14, label: 'Repairs', amount: data.expenses.repairs },
    { line: 15, label: 'Supplies', amount: data.expenses.supplies },
    { line: 16, label: 'Taxes', amount: data.expenses.taxes },
    { line: 17, label: 'Utilities', amount: data.expenses.utilities },
    { line: 18, label: 'Depreciation', amount: data.expenses.depreciation },
  ];

  // Add "Other" expenses
  data.expenses.other.forEach((item, index) => {
    expenses.push({
      line: 19,
      label: `Other: ${item.description}`,
      amount: item.amount
    });
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Schedule E (Form 1040) Preview</CardTitle>
            <CardDescription>Supplemental Income and Loss - {year}</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            Draft Preview
          </Badge>
        </div>
        <div className="mt-4 p-4 bg-muted rounded-md text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-semibold">Property Address:</span> {data.address}
            </div>
            <div>
              <span className="font-semibold">Property Type:</span> {data.propertyType}
            </div>
            <div>
              <span className="font-semibold">Fair Rental Days:</span> {data.fairRentalDays}
            </div>
            <div>
              <span className="font-semibold">Personal Use Days:</span> {data.personalUseDays}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Line</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-muted/50 font-medium">
              <TableCell>3</TableCell>
              <TableCell>Rents Received</TableCell>
              <TableCell className="text-right">{formatCurrency(data.income.rentsReceived)}</TableCell>
            </TableRow>
            <TableRow className="bg-muted/50 font-medium">
              <TableCell>4</TableCell>
              <TableCell>Royalties Received</TableCell>
              <TableCell className="text-right">{formatCurrency(data.income.royaltiesReceived)}</TableCell>
            </TableRow>
            
            {expenses.map((expense, index) => (
              <TableRow key={`${expense.line}-${index}`}>
                <TableCell>{expense.line}</TableCell>
                <TableCell>{expense.label}</TableCell>
                <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
              </TableRow>
            ))}

            <TableRow className="bg-muted/50 font-bold border-t-2">
              <TableCell>20</TableCell>
              <TableCell>Total Expenses</TableCell>
              <TableCell className="text-right">{formatCurrency(data.totalExpenses)}</TableCell>
            </TableRow>

            <TableRow className="bg-primary/10 font-bold text-lg">
              <TableCell>21</TableCell>
              <TableCell>Net Income (Loss)</TableCell>
              <TableCell className={`text-right ${data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.netIncome)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};