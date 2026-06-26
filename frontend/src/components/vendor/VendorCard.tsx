import { Star, Phone, Mail, MapPin, Wrench, AlertCircle, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Vendor } from '@/types/vendor';
import { VENDOR_CATEGORIES } from '@/types/vendor';

interface VendorCardProps {
  vendor: Vendor;
  onEdit?: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
  onViewDetails?: () => void;
}

export default function VendorCard({
  vendor,
  onEdit,
  onDelete,
  onAssign,
  onViewDetails,
}: VendorCardProps) {
  const categoryLabel = VENDOR_CATEGORIES.find(c => c.value === vendor.category)?.label || vendor.category;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onViewDetails}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{vendor.company_name}</h3>
              {vendor.preferred && (
                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
              )}
            </div>
            <p className="text-sm text-gray-600">{vendor.contact_name}</p>
          </div>
          <Badge className={getStatusColor(vendor.status)}>
            {vendor.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Category */}
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">{categoryLabel}</span>
        </div>

        {/* Contact Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{vendor.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <span className="truncate">{vendor.email}</span>
          </div>
          {vendor.city && vendor.state && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{vendor.city}, {vendor.state}</span>
            </div>
          )}
        </div>

        {/* Rating */}
        {vendor.average_rating !== undefined && vendor.average_rating > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold">{vendor.average_rating.toFixed(1)}</span>
            </div>
            {vendor.total_jobs !== undefined && (
              <span className="text-sm text-gray-600">
                ({vendor.total_jobs} {vendor.total_jobs === 1 ? 'job' : 'jobs'})
              </span>
            )}
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {vendor.emergency_available && (
            <Badge variant="outline" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Emergency Available
            </Badge>
          )}
          {vendor.hourly_rate && (
            <Badge variant="outline" className="text-xs">
              ${vendor.hourly_rate}/hr
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onAssign && (
            <Button
              size="sm"
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                onAssign();
              }}
              className="flex-1"
            >
              Assign
            </Button>
          )}
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}