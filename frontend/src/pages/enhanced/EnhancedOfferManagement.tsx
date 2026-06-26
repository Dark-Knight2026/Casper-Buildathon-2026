import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DigitalSignature from '@/components/phase2/enhanced/DigitalSignature';
import OfferManagement from '@/components/phase2/OfferManagement';

export default function EnhancedOfferManagement() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Offer Management</h1>
          <p className="text-gray-600">Advanced offer management with digital signatures and automation</p>
        </div>

        <Tabs defaultValue="offers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="offers">Offer Management</TabsTrigger>
            <TabsTrigger value="signatures">Digital Signatures</TabsTrigger>
          </TabsList>

          <TabsContent value="offers" className="space-y-6">
            <OfferManagement />
          </TabsContent>

          <TabsContent value="signatures" className="space-y-6">
            <DigitalSignature />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}