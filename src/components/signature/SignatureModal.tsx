import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import SignaturePad from './SignaturePad';
import { PenTool, Type } from 'lucide-react';

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
  signerName: string;
  documentTitle: string;
}

export default function SignatureModal({
  open,
  onClose,
  onSave,
  signerName,
  documentTitle,
}: SignatureModalProps) {
  const [signatureData, setSignatureData] = useState<string>('');
  const [typedSignature, setTypedSignature] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>('draw');

  const handleDrawSave = (data: string) => {
    setSignatureData(data);
  };

  const handleTypedSignatureChange = (value: string) => {
    setTypedSignature(value);
    // Generate signature image from typed text
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'black';
      ctx.font = '48px "Brush Script MT", cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value, canvas.width / 2, canvas.height / 2);
      setSignatureData(canvas.toDataURL('image/png'));
    }
  };

  const handleApply = () => {
    if (signatureData && agreedToTerms) {
      onSave(signatureData);
      onClose();
    }
  };

  const canApply = signatureData && agreedToTerms;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sign Document</DialogTitle>
          <DialogDescription>
            Please sign the document: <span className="font-semibold">{documentTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'draw' | 'type')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw">
              <PenTool className="h-4 w-4 mr-2" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type">
              <Type className="h-4 w-4 mr-2" />
              Type
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-4">
            <SignaturePad
              onSave={handleDrawSave}
              width={600}
              height={200}
            />
          </TabsContent>

          <TabsContent value="type" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="typed-signature">Type your full name</Label>
              <Input
                id="typed-signature"
                value={typedSignature}
                onChange={(e) => handleTypedSignatureChange(e.target.value)}
                placeholder={signerName}
                className="text-2xl font-serif mt-2"
              />
            </div>
            {signatureData && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-2">Preview:</p>
                <img
                  src={signatureData}
                  alt="Typed signature preview"
                  className="max-h-32 mx-auto"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="space-y-4 mt-4">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            />
            <label
              htmlFor="terms"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree that this electronic signature is the legal equivalent of my manual signature
              and I consent to be legally bound by this signature.
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!canApply}>
              Apply Signature
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}