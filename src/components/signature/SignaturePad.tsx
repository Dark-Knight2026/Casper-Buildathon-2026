import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Undo, Trash2, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  width?: number;
  height?: number;
}

export default function SignaturePad({
  onSave,
  onClear,
  disabled = false,
  width = 600,
  height = 200,
}: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setIsEmpty(true);
    onClear?.();
  };

  const handleUndo = () => {
    const data = sigPadRef.current?.toData();
    if (data && data.length > 0) {
      data.pop();
      sigPadRef.current?.fromData(data);
      setIsEmpty(data.length === 0);
    }
  };

  const handleSave = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const signatureData = sigPadRef.current.toDataURL('image/png');
      onSave(signatureData);
    }
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
            <SignatureCanvas
              ref={sigPadRef}
              canvasProps={{
                width,
                height,
                className: 'signature-canvas',
                style: { width: '100%', height: 'auto' },
              }}
              backgroundColor="white"
              penColor="black"
              minWidth={1}
              maxWidth={3}
              onBegin={handleBegin}
              disabled={disabled}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">
            Sign above using your mouse or touchscreen
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={isEmpty || disabled}
          >
            <Undo className="h-4 w-4 mr-2" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isEmpty || disabled}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
        <Button
          onClick={handleSave}
          disabled={isEmpty || disabled}
        >
          <Check className="h-4 w-4 mr-2" />
          Save Signature
        </Button>
      </div>
    </div>
  );
}