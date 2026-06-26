import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MediaRef, MediaModerationStatus } from '@/types/listingContract';

const MEDIA_STATUS_STYLE: Record<MediaModerationStatus, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-600',
  rejected: 'bg-red-500',
};

/**
 * Existing-photo grid for the listing edit form: per-image moderation chip,
 * remove, and reorder (move earlier/later). State + the save diff are owned by
 * `useListingMedia`; this is the presentation only. The first photo is the cover.
 */
export function ListingPhotosEditor({
  media,
  onRemove,
  onMove,
}: {
  media: MediaRef[];
  onRemove: (mediaId: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  if (media.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-medium mb-2">Current Photos</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {media.map((item, index) => (
          <div key={item.id} className="relative group">
            <img
              src={item.url}
              alt="Listing"
              className="w-full h-32 object-cover rounded-lg"
            />
            {item.moderationStatus !== 'approved' && (
              <Badge
                className={`absolute top-2 left-2 capitalize ${MEDIA_STATUS_STYLE[item.moderationStatus]}`}
              >
                {item.moderationStatus}
              </Badge>
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(item.id)}
              aria-label="Remove photo"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-2 left-2 right-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-7 w-7"
                disabled={index === 0}
                onClick={() => onMove(index, -1)}
                aria-label="Move photo earlier"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-7 w-7"
                disabled={index === media.length - 1}
                onClick={() => onMove(index, 1)}
                aria-label="Move photo later"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
