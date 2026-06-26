import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip } from 'recharts';
import { Crosshair } from 'lucide-react';

const DATA = [
  {
    subject: 'Price Accuracy',
    A: 120,
    B: 110,
    fullMark: 150,
  },
  {
    subject: 'Days on Market',
    A: 98,
    B: 130,
    fullMark: 150,
  },
  {
    subject: 'Tenant Satisfaction',
    A: 86,
    B: 130,
    fullMark: 150,
  },
  {
    subject: 'Maintenance Speed',
    A: 99,
    B: 100,
    fullMark: 150,
  },
  {
    subject: 'Lead Response',
    A: 85,
    B: 90,
    fullMark: 150,
  },
  {
    subject: 'Marketing Reach',
    A: 65,
    B: 85,
    fullMark: 150,
  },
];

export const ComparisonChart = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-pink-600" />
          Performance Benchmark
        </CardTitle>
        <CardDescription>Your Listings (A) vs. Market Average (B)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={DATA}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
              <Radar
                name="Your Performance"
                dataKey="A"
                stroke="#ec4899"
                fill="#ec4899"
                fillOpacity={0.6}
              />
              <Radar
                name="Market Average"
                dataKey="B"
                stroke="#64748b"
                fill="#64748b"
                fillOpacity={0.3}
              />
              <Legend />
              <Tooltip 
                 contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  color: '#1e293b'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-center text-muted-foreground">
          You are outperforming the market in <span className="font-semibold text-pink-600">Price Accuracy</span> but lagging in <span className="font-semibold text-slate-600">Marketing Reach</span>.
        </div>
      </CardContent>
    </Card>
  );
};