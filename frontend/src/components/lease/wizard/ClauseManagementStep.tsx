import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import type { LeaseClause, LeaseType } from '@/types/lease';

interface ClauseManagementStepProps {
  clauses: LeaseClause[];
  onUpdate: (clauses: LeaseClause[]) => void;
  leaseType?: LeaseType;
}

export default function ClauseManagementStep({ clauses, onUpdate, leaseType }: ClauseManagementStepProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    'rent-payment',
    'security-deposit',
    'maintenance',
    'utilities',
    'pets',
    'occupancy',
    'termination',
    'insurance',
  ];

  const filteredClauses = selectedCategory === 'all'
    ? clauses
    : clauses.filter((c) => c.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Manage Lease Clauses</h3>
        <p className="text-sm text-gray-600">
          Customize, add, or remove clauses from your lease agreement
        </p>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="rent-payment">Rent</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="pets">Pets</TabsTrigger>
          <TabsTrigger value="termination">Termination</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-4 mt-4">
          {filteredClauses.length > 0 ? (
            filteredClauses.map((clause) => (
              <Card key={clause.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <GripVertical className="h-5 w-5 text-gray-400 mt-1 cursor-move" />
                      <div className="flex-1">
                        <CardTitle className="text-base">{clause.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{clause.content}</p>
                        <div className="flex gap-2 mt-2">
                          {clause.isMandatory && (
                            <Badge variant="secondary">Mandatory</Badge>
                          )}
                          {clause.isStateSpecific && (
                            <Badge variant="outline">State-Specific</Badge>
                          )}
                          <Badge variant="outline">{clause.category}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!clause.isMandatory && (
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              No clauses in this category
            </div>
          )}

          <Button variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Custom Clause
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
