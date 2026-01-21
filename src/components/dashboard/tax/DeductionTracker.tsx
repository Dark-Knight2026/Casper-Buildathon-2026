import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaxDeduction } from '@/services/taxService';
import { Plus, Receipt, CheckCircle, XCircle, Clock, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface PropertyOption {
  id: string;
  name: string;
}

interface DeductionTrackerProps {
  deductions: TaxDeduction[];
  onAddDeduction?: (deduction: Omit<TaxDeduction, 'id'>) => void;
  isLoading?: boolean;
  properties?: PropertyOption[]; // Added to support linking deductions to properties
}

export const DeductionTracker: React.FC<DeductionTrackerProps> = ({ 
  deductions, 
  onAddDeduction,
  isLoading,
  properties = []
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    propertyId: 'none'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddDeduction) {
      onAddDeduction({
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        status: 'pending',
        propertyId: formData.propertyId === 'none' ? undefined : formData.propertyId
      });
      toast.success('Deduction added successfully');
      setFormData({ 
        category: '', 
        description: '', 
        amount: '', 
        date: new Date().toISOString().split('T')[0],
        propertyId: 'none'
      });
      setShowAddForm(false);
    }
  };

  const getStatusIcon = (status: TaxDeduction['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: TaxDeduction['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const approvedDeductions = deductions.filter(d => d.status === 'approved').reduce((sum, d) => sum + d.amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              Tax Deductions
            </CardTitle>
            <CardDescription>Track and manage your tax deductions</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Deduction
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Total Deductions</p>
            <p className="text-2xl font-bold">${totalDeductions.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-green-600">${approvedDeductions.toLocaleString()}</p>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-card">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mortgage Interest">Mortgage Interest</SelectItem>
                    <SelectItem value="Property Tax">Property Tax</SelectItem>
                    <SelectItem value="Home Office">Home Office</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Insurance">Insurance</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Property Selection for Landlords */}
            {properties.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="property">Property (Optional)</Label>
                <Select value={formData.propertyId} onValueChange={(value) => setFormData({ ...formData, propertyId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General Deduction (No specific property)</SelectItem>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">Save Deduction</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))
          ) : (
            deductions.map((deduction) => (
              <div key={deduction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {getStatusIcon(deduction.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{deduction.category}</p>
                      {deduction.propertyId && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          <Building2 className="h-3 w-3 mr-1" />
                          {properties.find(p => p.id === deduction.propertyId)?.name || 'Property'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{deduction.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(deduction.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${deduction.amount.toLocaleString()}</p>
                  <Badge className={getStatusColor(deduction.status)} variant="outline">
                    {deduction.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};