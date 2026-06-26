import React, { useState } from 'react';
import { TaxCard } from '@/components/tax/shared/TaxCard';
import { TaxMetric } from '@/components/tax/shared/TaxMetric';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TaxDeduction } from '@/services/taxService';
import { Receipt, Plus, Search, Filter, DollarSign, CheckCircle, Clock, XCircle, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaxDeductionTrackerProps {
  deductions: TaxDeduction[];
  onAddDeduction?: (deduction: Omit<TaxDeduction, 'id'>) => void;
  isLoading?: boolean;
  role?: string;
}

export const TaxDeductionTracker: React.FC<TaxDeductionTrackerProps> = ({ 
  deductions, 
  onAddDeduction, 
  isLoading,
  role = 'User'
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  const filteredDeductions = deductions.filter(d => {
    const matchesSearch = d.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredDeductions.reduce((sum, d) => sum + d.amount, 0);
  const approvedAmount = filteredDeductions
    .filter(d => d.status === 'approved')
    .reduce((sum, d) => sum + d.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddDeduction) {
      onAddDeduction({
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        status: 'pending',
      });
      toast.success('Deduction added successfully');
      setFormData({ 
        category: '', 
        description: '', 
        amount: '', 
        date: new Date().toISOString().split('T')[0] 
      });
      setShowAddForm(false);
    }
  };

  const getStatusIcon = (status: TaxDeduction['status']) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: TaxDeduction['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  if (isLoading) {
    return (
      <TaxCard title="Deductions & Expenses">
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}
        </div>
      </TaxCard>
    );
  }

  return (
    <TaxCard
      title="Deductions & Expenses"
      description={`Track ${role.toLowerCase()} related tax deductions`}
      icon={<Receipt className="h-5 w-5 text-purple-600" />}
      headerAction={
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <TaxMetric 
            label="Total Tracked" 
            value={`$${totalAmount.toLocaleString()}`} 
          />
          <TaxMetric 
            label="Approved Deductions" 
            value={`$${approvedAmount.toLocaleString()}`}
            valueClassName="text-green-700"
          />
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mortgage Interest">Mortgage Interest</SelectItem>
                    <SelectItem value="Property Tax">Property Tax</SelectItem>
                    <SelectItem value="Home Office">Home Office</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Insurance">Insurance</SelectItem>
                    <SelectItem value="Professional Services">Professional Services</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="number" 
                    className="pl-9" 
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    required 
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Expense description" 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button type="submit">Save Expense</Button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search expenses..." 
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filteredDeductions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deductions found matching your criteria
            </div>
          ) : (
            filteredDeductions.map((deduction) => (
              <div key={deduction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {getStatusIcon(deduction.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{deduction.category}</p>
                      {deduction.propertyId && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          <Building2 className="h-3 w-3 mr-1" />
                          Property
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{deduction.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(deduction.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${deduction.amount.toLocaleString()}</p>
                  <Badge className={`text-[10px] ${getStatusColor(deduction.status)}`} variant="outline">
                    {deduction.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </TaxCard>
  );
};