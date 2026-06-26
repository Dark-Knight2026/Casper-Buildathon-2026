import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Map, MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RegionData {
  id: string;
  name: string;
  revenue: number;
  occupancy: number;
  status: 'excellent' | 'good' | 'average' | 'poor';
  coordinates: { x: number; y: number; w: number; h: number }; // Percentage based positioning
}

const MOCK_REGIONS: RegionData[] = [
  { id: 'dt', name: 'Downtown', revenue: 125000, occupancy: 98, status: 'excellent', coordinates: { x: 40, y: 40, w: 20, h: 20 } },
  { id: 'no', name: 'North District', revenue: 85000, occupancy: 92, status: 'good', coordinates: { x: 40, y: 10, w: 20, h: 25 } },
  { id: 'so', name: 'South District', revenue: 65000, occupancy: 85, status: 'average', coordinates: { x: 40, y: 65, w: 20, h: 25 } },
  { id: 'we', name: 'West End', revenue: 95000, occupancy: 95, status: 'good', coordinates: { x: 10, y: 40, w: 25, h: 20 } },
  { id: 'ea', name: 'East Side', revenue: 45000, occupancy: 78, status: 'poor', coordinates: { x: 65, y: 40, w: 25, h: 20 } },
];

export const GeospatialWidget = () => {
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null);

  const getStatusColor = (status: RegionData['status']) => {
    switch (status) {
      case 'excellent': return 'bg-emerald-500 hover:bg-emerald-600';
      case 'good': return 'bg-blue-500 hover:bg-blue-600';
      case 'average': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'poor': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-400';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5 text-indigo-600" />
          Portfolio Geography
        </CardTitle>
        <CardDescription>Regional performance heatmap</CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="relative w-full aspect-video bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
          {/* Grid lines for map effect */}
          <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 pointer-events-none opacity-10">
            {Array.from({ length: 72 }).map((_, i) => (
              <div key={i} className="border border-slate-500" />
            ))}
          </div>

          <TooltipProvider>
            {MOCK_REGIONS.map((region) => (
              <Tooltip key={region.id}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "absolute transition-all duration-300 rounded-md shadow-sm border-2 border-white/20 flex items-center justify-center group",
                      getStatusColor(region.status),
                      selectedRegion?.id === region.id ? "ring-2 ring-offset-2 ring-indigo-500 z-10 scale-105" : "opacity-80 hover:opacity-100 hover:scale-105"
                    )}
                    style={{
                      left: `${region.coordinates.x}%`,
                      top: `${region.coordinates.y}%`,
                      width: `${region.coordinates.w}%`,
                      height: `${region.coordinates.h}%`,
                    }}
                    onClick={() => setSelectedRegion(region)}
                  >
                    <span className="text-white font-bold text-xs sm:text-sm drop-shadow-md truncate px-1">
                      {region.name}
                    </span>
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-white absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3">
                  <div className="space-y-1">
                    <p className="font-bold text-sm">{region.name}</p>
                    <div className="text-xs space-y-0.5">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Revenue:</span>
                        <span className="font-mono">${region.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Occupancy:</span>
                        <span className={cn("font-mono font-bold", region.occupancy < 90 ? "text-red-500" : "text-green-500")}>
                          {region.occupancy}%
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="capitalize">{region.status}</span>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>

          {/* Legend */}
          <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-black/80 p-2 rounded-md text-xs border shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Excellent
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div> Good
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div> Average
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div> Poor
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};