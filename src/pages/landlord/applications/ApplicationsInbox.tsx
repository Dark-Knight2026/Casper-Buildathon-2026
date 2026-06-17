import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ApplicationStatusBadge } from '@/components/application/ApplicationStatusBadge';
import { Search, Eye, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import {
  getLandlordApplications,
  type ApplicationStatus,
  type LandlordApplicationParams,
} from '@/services/applicationService';
import { getLandlordListings } from '@/services/listingService';

/** Status filter options (single-valued — the backend takes one status). */
const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under review' },
  { value: 'conditional', label: 'Conditional' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const PAGE_SIZE = 20;

/**
 * Landlord cross-listing applications inbox (PL-43). All applications across the
 * landlord's listings, paginated via `GET /applications/landlord`, filterable by
 * status / search / listing / submission-date range. Per-row review lives on the
 * detail page (PL-44).
 */
export default function ApplicationsInbox() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all');
  const [listingId, setListingId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const debouncedSearch = useDebounce(search, 400);

  // The landlord's listings, to label the listing filter (and resolve titles).
  const { data: listingsPage } = useQuery({
    queryKey: ['landlord-listings', 'for-filter'],
    queryFn: () => getLandlordListings({ pageSize: 100 }),
  });
  const listings = listingsPage?.data ?? [];

  const params: LandlordApplicationParams = useMemo(
    () => ({
      status: status === 'all' ? undefined : status,
      search: debouncedSearch.trim() || undefined,
      listingId: listingId === 'all' ? undefined : listingId,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      pageSize: PAGE_SIZE,
    }),
    [status, debouncedSearch, listingId, dateFrom, dateTo]
  );

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['landlord-applications', params],
    queryFn: ({ pageParam }) =>
      getLandlordApplications({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return nextPage <= lastPage.pageCount ? nextPage : undefined;
    },
  });

  const applications = data?.pages.flatMap((page) => page.data) ?? [];
  const itemCount = data?.pages[0]?.itemCount ?? 0;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Applications</h1>
        <p className="text-muted-foreground">
          {itemCount} application{itemCount === 1 ? '' : 's'} across your
          listings
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <Label htmlFor="application-search">Search</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="application-search"
                placeholder="Name or email…"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as ApplicationStatus | 'all')
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Listing</Label>
            <Select value={listingId} onValueChange={setListingId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All listings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All listings</SelectItem>
                {listings.map((listing) => (
                  <SelectItem key={listing.id} value={listing.id}>
                    {listing.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="application-date-from">Submitted from</Label>
            <Input
              id="application-date-from"
              type="date"
              className="mt-1"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="application-date-to">Submitted to</Label>
            <Input
              id="application-date-to"
              type="date"
              className="mt-1"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Couldn't load applications. Please try again.
              </p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No applications</h3>
              <p className="text-muted-foreground">
                Applications matching your filters will appear here.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Listing</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <p className="font-medium">{application.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {application.email}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {application.listing?.title ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {format(
                            new Date(application.createdAt),
                            'MMM d, yyyy'
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <ApplicationStatusBadge status={application.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/landlord/applications/${application.id}`)
                          }
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {hasNextPage && (
                <div className="flex justify-center pt-6">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
