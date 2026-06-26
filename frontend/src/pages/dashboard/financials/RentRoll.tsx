import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export const RentRoll = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rent Roll</h1>
          <p className="text-muted-foreground">View current tenant rent status and lease terms.</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Rent Roll</CardTitle>
          <CardDescription>Overview of all active leases and rent collection status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center border rounded-md bg-muted/10">
            <p className="text-muted-foreground">Rent roll data table will be displayed here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentRoll;