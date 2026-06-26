import React from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardLayout } from './DashboardLayout';

// For now, LeaseLayout can just be a wrapper around DashboardLayout
// or it can be a specific layout if the design diverges.
// Given the PRD, it seems to share the global sidebar.
// So we can just use DashboardLayout for the /leases route, 
// or if we want nested layout behavior (like specific top bar), we can add it here.

export const LeaseLayout: React.FC = () => {
  return (
    <DashboardLayout />
    // If we needed specific lease context global to all lease pages (like a lease-specific sidebar),
    // we would add it here. For now, DashboardLayout provides the main shell.
  );
};