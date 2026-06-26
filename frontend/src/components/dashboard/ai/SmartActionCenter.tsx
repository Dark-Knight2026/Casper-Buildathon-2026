import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActionItem {
  id: string;
  title: string;
  timeEstimate: string; // e.g., "2 min"
  priority: 'high' | 'medium' | 'low';
}

const MOCK_ACTIONS: ActionItem[] = [
  { id: '1', title: 'Confirm viewing for 123 Main St', timeEstimate: '1 min', priority: 'high' },
  { id: '2', title: 'Review lease renewal for Unit 4B', timeEstimate: '5 min', priority: 'medium' },
  { id: '3', title: 'Update listing photos for Sunset Blvd', timeEstimate: '10 min', priority: 'low' },
];

export const SmartActionCenter: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Card className={`border-indigo-100 dark:border-indigo-900 ${className}`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50/30 to-transparent">
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
          <CardTitle className="text-base font-semibold">Smart Actions</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {MOCK_ACTIONS.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-1.5 h-1.5 rounded-full ${
                action.priority === 'high' ? 'bg-red-500' : 
                action.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {action.title}
              </span>
            </div>
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-gray-400 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {action.timeEstimate}
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                Do it
              </Button>
            </div>
          </motion.div>
        ))}
        <Button variant="ghost" className="w-full text-xs text-gray-500 hover:text-indigo-600 mt-2">
          View all suggested actions
        </Button>
      </CardContent>
    </Card>
  );
};