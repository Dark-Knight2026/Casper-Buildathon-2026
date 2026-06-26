import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, User, Sparkles, Shield, Edit, MoreHorizontal, CheckCircle, AlertCircle } from 'lucide-react';
import { LeaseAgreement } from '@/types/lease';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface KanbanCardProps {
  lease: LeaseAgreement;
  onEdit?: (lease: LeaseAgreement) => void;
  onAIAssist?: (lease: LeaseAgreement) => void;
  onCheckCompliance?: (lease: LeaseAgreement) => void;
}

export function KanbanCard({ lease, onEdit, onAIAssist, onCheckCompliance }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lease.id,
    data: {
      type: 'Lease',
      lease,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 group">
      <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary">
        <CardHeader className="p-3 pb-2 space-y-0">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-2">
              <CardTitle className="text-sm font-medium leading-tight truncate">
                {lease.propertyId}
              </CardTitle>
              <div className="flex items-center gap-1 mt-1">
                {lease.type && (
                  <Badge variant="outline" className="text-[10px] px-1 h-5">
                    {lease.type === 'residential-long-term' ? 'Res' : 'Comm'}
                  </Badge>
                )}
                {lease.complianceScore !== undefined && (
                  <Badge variant="outline" className={`text-[10px] px-1 h-5 flex items-center gap-0.5 ${getComplianceColor(lease.complianceScore)}`}>
                    <Shield className="h-2.5 w-2.5" />
                    {lease.complianceScore}%
                  </Badge>
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(lease)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                {lease.status === 'draft' && (
                  <DropdownMenuItem onClick={() => onAIAssist?.(lease)}>
                    <Sparkles className="mr-2 h-4 w-4" /> AI Assist
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onCheckCompliance?.(lease)}>
                  <Shield className="mr-2 h-4 w-4" /> Check Compliance
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span className="truncate">
                {lease.tenantIds && lease.tenantIds.length > 0
                  ? lease.tenantIds.join(', ')
                  : 'No Tenant'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3" />
              <span>${lease.monthlyRent?.toLocaleString() ?? 0}/mo</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>
                {lease.endDate ? format(new Date(lease.endDate), 'MMM d, yyyy') : 'N/A'}
              </span>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="flex items-center gap-1 mt-3 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(lease);
              }}
            >
              Edit
            </Button>
            {lease.status === 'draft' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs flex-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onAIAssist?.(lease);
                }}
              >
                <Sparkles className="h-3 w-3 mr-1" /> AI
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}