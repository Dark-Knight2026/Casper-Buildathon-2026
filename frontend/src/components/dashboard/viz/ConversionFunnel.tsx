import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip, Cell } from 'recharts';
import { Filter } from 'lucide-react';

const DATA = [
  {
    "value": 1200,
    "name": "Leads",
    "fill": "#6366f1"
  },
  {
    "value": 850,
    "name": "Viewings",
    "fill": "#8b5cf6"
  },
  {
    "value": 420,
    "name": "Applications",
    "fill": "#a855f7"
  },
  {
    "value": 180,
    "name": "Leases Signed",
    "fill": "#d946ef"
  }
];

export const ConversionFunnel = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-purple-600" />
          Lead Conversion Pipeline
        </CardTitle>
        <CardDescription>Conversion rates from lead to lease</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip 
                formatter={(value: number) => [value, 'Count']}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  color: '#1e293b'
                }}
              />
              <Funnel
                dataKey="value"
                data={DATA}
                isAnimationActive
              >
                <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" />
                {DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md">
            <div className="text-xs text-muted-foreground">Lead to View</div>
            <div className="font-bold text-purple-700 dark:text-purple-300">
              {Math.round((DATA[1].value / DATA[0].value) * 100)}%
            </div>
          </div>
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md">
            <div className="text-xs text-muted-foreground">View to App</div>
            <div className="font-bold text-purple-700 dark:text-purple-300">
              {Math.round((DATA[2].value / DATA[1].value) * 100)}%
            </div>
          </div>
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md">
            <div className="text-xs text-muted-foreground">App to Lease</div>
            <div className="font-bold text-purple-700 dark:text-purple-300">
              {Math.round((DATA[3].value / DATA[2].value) * 100)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};