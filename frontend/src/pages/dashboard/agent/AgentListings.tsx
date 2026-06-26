/**
 * Agent Listings Page
 * Property listings management with status tracking
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ListingList from '@/components/listing/ListingList';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function AgentListings() {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Property Listings</h1>
          <p className="text-gray-500 mt-1">
            Manage your active listings and track their performance
          </p>
        </div>
        <ListingList />
      </div>
    </ErrorBoundary>
  );
}