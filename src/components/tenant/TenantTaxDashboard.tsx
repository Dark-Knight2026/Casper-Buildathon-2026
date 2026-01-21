import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Download, FileText, CheckCircle, Calendar, DollarSign } from "lucide-react";
import { format } from 'date-fns';

interface RentPayment {
  id: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  period: string;
}

interface TaxYearSummary {
  year: number;
  totalRentPaid: number;
  paymentsCount: number;
  eligibleForCredit: boolean;
}

// Mock Data
const generateMockPayments = (year: number): RentPayment[] => {
  const payments: RentPayment[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  months.forEach((month, index) => {
    // Skip future months if current year
    if (year === new Date().getFullYear() && index > new Date().getMonth()) return;
    
    payments.push({
      id: `pay_${year}_${index}`,
      date: `${year}-${String(index + 1).padStart(2, '0')}-01`,
      amount: 2500,
      status: 'completed',
      period: `${month} ${year}`
    });
  });
  
  return payments;
};

export const TenantTaxDashboard: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [summary, setSummary] = useState<TaxYearSummary | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 600));
        const data = generateMockPayments(parseInt(selectedYear));
        setPayments(data);
        setSummary({
          year: parseInt(selectedYear),
          totalRentPaid: data.reduce((sum, p) => sum + p.amount, 0),
          paymentsCount: data.length,
          eligibleForCredit: true // Mock logic
        });
      } catch (error) {
        console.error('Error fetching tenant tax data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  const handleDownloadCertificate = () => {
    toast({
      title: "Downloading Certificate",
      description: `Rent Certificate for ${selectedYear} is downloading...`,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tax Center</h2>
          <p className="text-muted-foreground">View your rent payment history for tax credits and deductions.</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Rent Payment Summary {selectedYear}</CardTitle>
            <CardDescription>Total rent payments made during the tax year.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rent Paid</p>
                <h3 className="text-3xl font-bold">${summary?.totalRentPaid.toLocaleString()}</h3>
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Renter's Credit Eligibility
              </h4>
              <p className="text-sm text-muted-foreground">
                Based on your payments, you may be eligible for a state renter's tax credit. 
                Please consult with a tax professional to confirm your eligibility.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleDownloadCertificate} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Download Rent Certificate
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => {}}>
              <FileText className="mr-2 h-4 w-4" />
              View Lease Agreement
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => {}}>
              <Calendar className="mr-2 h-4 w-4" />
              Payment History
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History {selectedYear}</CardTitle>
          <CardDescription>Detailed record of rent payments for tax verification.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{format(new Date(payment.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{payment.period}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${payment.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No payments found for this year.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};