import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, ShieldCheck, Upload, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadAuthorityDocument } from '@/services/listingProvenanceService';
import { ApiClient } from '@/lib/api-client';
import type { Listing, AuthorityDocumentType } from '@/types/listingContract';

const DOC_TYPES: { value: AuthorityDocumentType; label: string }[] = [
  { value: 'deed', label: 'Property deed' },
  { value: 'title', label: 'Title document' },
  { value: 'management_agreement', label: 'Management agreement' },
];

function GateRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        {detail && (
          <span className="text-sm text-muted-foreground">{detail}</span>
        )}
        {ok ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <X className="h-4 w-4 text-red-600" />
        )}
      </div>
    </div>
  );
}

/**
 * Authority-to-list gate panel. Shows the three gate results (identity,
 * authority tier, fair-housing) and lets the landlord upload a proof-of-
 * authority document to move from T0 to T1. The fair-housing screen preview
 * lives in its own component.
 */
export function AuthorityGate({ listing }: { listing: Listing }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const provenance = listing.provenance;

  // The header chip reflects identity status: a full verified-lister badge, a
  // plain identity-verified tick, or a note that it resolves at publish.
  const headerBadge = provenance.verifiedListerBadge
    ? {
        icon: <ShieldCheck className="h-3 w-3 text-emerald-600" />,
        label: 'Verified lister',
      }
    : provenance.identityVerified
      ? {
          icon: <Check className="h-3 w-3 text-green-600" />,
          label: 'Identity verified',
        }
      : {
          icon: <Clock className="h-3 w-3 text-muted-foreground" />,
          label: 'Identity verified at publish',
        };

  const [docType, setDocType] = useState<AuthorityDocumentType>('deed');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadAuthorityDocument(listing.id, file, docType);
      await queryClient.invalidateQueries({
        queryKey: ['listing', listing.id],
      });
      setFile(null);
      toast({
        title: 'Document uploaded',
        description: 'Your authority tier has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: ApiClient.handleError(error),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Authority to list
          <Badge
            variant="secondary"
            className="flex items-center gap-1 text-xs font-normal"
          >
            {headerBadge.icon}
            {headerBadge.label}
          </Badge>
        </CardTitle>
        <CardDescription>
          A listing can go live once the authority and fair-housing checks pass.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <GateRow
            label="Authority"
            ok={provenance.authorityTier !== 'T0'}
            detail={provenance.authorityLabel}
          />
          <GateRow
            label="Fair-housing cleared"
            ok={provenance.fairHousingCleared}
          />
        </div>

        {/* Document upload raises the authority tier (T0 → T1). */}
        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-medium">Upload proof of authority</p>
          <p className="text-xs text-muted-foreground">
            A deed, title, or management agreement moves you to “Documents on
            file”. PDF, PNG or JPEG.
          </p>
          <Select
            value={docType}
            onValueChange={(v) => setDocType(v as AuthorityDocumentType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="file"
              accept=".pdf,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="h-10"
            />
            <Button
              type="button"
              onClick={upload}
              disabled={!file || uploading}
              className="shrink-0"
            >
              <Upload className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">
                {uploading ? 'Uploading…' : 'Upload'}
              </span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
