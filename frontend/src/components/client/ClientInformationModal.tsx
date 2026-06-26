import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Client } from '@/types/client';
import ClientInformationPanel from './ClientInformationPanel';

interface ClientInformationModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onClientUpdate?: (updatedClient: Client) => void;
}

export default function ClientInformationModal({ 
  client, 
  isOpen, 
  onClose, 
  onClientUpdate 
}: ClientInformationModalProps) {
  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client Information</DialogTitle>
        </DialogHeader>
        <ClientInformationPanel 
          client={client} 
          onClientUpdate={onClientUpdate}
        />
      </DialogContent>
    </Dialog>
  );
}