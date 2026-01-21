import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Receipt, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import PaymentReceipt from '@/components/payment/PaymentReceipt';
import { receiptService } from '@/services/receiptService';
import type { ReceiptData } from '@/types/receipt';

// Mock payment data - replace with actual API call
const mockPayments = [
  {
    id: '1',
    amount: 1500,
    date: '2024-01-15',
    method: 'Credit Card',
    status: 'completed',
    tenant: 'John Doe',
    property: '123 Main St, Apt 4B',
  },
  {
    id: '2',
    amount: 1500,
    date: '2023-12-15',
    method: 'Bank Transfer',
    status: 'completed',
    tenant: 'John Doe',
    property: '123 Main St, Apt 4B',
  },
  {
    id: '3',
    amount: 1500,
    date: '2023-11-15',
    method: 'Credit Card',
    status: 'completed',
    tenant: 'John Doe',
    property: '123 Main St, Apt 4B',
  },
];

export default function PaymentHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  // Mock query - replace with actual API call
  const { data: payments = mockPayments, isLoading } = useQuery({
    queryKey: ['payment-history', searchQuery, statusFilter],
    queryFn: async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockPayments;
    },
  });

  const handleDownloadReceipt = async (paymentId: string) => {
    // Mock receipt data - replace with actual data from API
    const receiptData: ReceiptData = {
      receiptNumber: receiptService.generateReceiptNumber(paymentId),
      paymentDate: '2024-01-15',
      paymentMethod: 'Credit Card',
      amount: 1500,
      tenant: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567',
      },
      landlord: {
        name: 'Jane Smith',
        company: 'Smith Property Management',
        email: 'jane@smithpm.com',
        phone: '(555) 987-6543',
      },
      property: {
        address: '123 Main Street',
        unit: 'Apt 4B',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
      },
      breakdown: [
        { description: 'Monthly Rent', amount: 1400 },
        { description: 'Parking Fee', amount: 100 },
      ],
      notes: 'Payment received on time. Thank you!',
    };

    await receiptService.downloadReceipt(receiptData, {
      includeBreakdown: true,
      includeNotes: true,
    });
  };

  const handleViewReceipt = (paymentId: string) => {
    setSelectedPayment(paymentId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Mock receipt data for dialog
  const mockReceiptData: ReceiptData = {
    receiptNumber: receiptService.generateReceiptNumber(selectedPayment || ''),
    paymentDate: '2024-01-15',
    paymentMethod: 'Credit Card',
    amount: 1500,
    tenant: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567',
    },
    landlord: {
      name: 'Jane Smith',
      company: 'Smith Property Management',
      email: 'jane@smithpm.com',
      phone: '(555) 987-6543',
    },
    property: {
      address: '123 Main Street',
      unit: 'Apt 4B',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
    },
    breakdown: [
      { description: 'Monthly Rent', amount: 1400 },
      { description: 'Parking Fee', amount: 100 },
    ],
    notes: 'Payment received on time. Thank you!',
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Payment History</h1>
          <p className="text-gray-600 mt-2">
            View and download receipts for all your payments
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by property, tenant, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Table */}
        {isLoading ? (
          <div className="text-center py-12">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No payments found</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.date}</TableCell>
                    <TableCell>{payment.tenant}</TableCell>
                    <TableCell>{payment.property}</TableCell>
                    <TableCell className="font-medium">
                      ${payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReceipt(payment.id)}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadReceipt(payment.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Receipt Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          {selectedPayment && <PaymentReceipt receiptData={mockReceiptData} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}