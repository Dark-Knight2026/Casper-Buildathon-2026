import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Agent, AgentTimelineEntry } from '@/types/agent';
import { useAgent } from '@/contexts/AgentContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, 
  Plus, 
  DollarSign, 
  Home, 
  Users, 
  GraduationCap, 
  Award, 
  MessageSquare,
  Calendar,
  TrendingUp,
  Target,
  Clock,
  Filter,
  Search
} from 'lucide-react';

interface AgentActivityFeedProps {
  agent: Agent;
}

export default function AgentActivityFeed({ agent }: AgentActivityFeedProps) {
  const { addAgentTimelineEntry } = useAgent();
  const { toast } = useToast();
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [newActivity, setNewActivity] = useState({
    type: 'note' as AgentTimelineEntry['type'],
    title: '',
    description: '',
    amount: 0,
    clientId: '',
    propertyId: ''
  });

  const activityTypes = [
    { value: 'sale', label: 'Sale', icon: DollarSign, color: 'text-green-500' },
    { value: 'listing', label: 'Listing', icon: Home, color: 'text-blue-500' },
    { value: 'client_meeting', label: 'Client Meeting', icon: Users, color: 'text-purple-500' },
    { value: 'training', label: 'Training', icon: GraduationCap, color: 'text-orange-500' },
    { value: 'achievement', label: 'Achievement', icon: Award, color: 'text-yellow-500' },
    { value: 'note', label: 'Note', icon: MessageSquare, color: 'text-gray-500' }
  ];

  const filteredTimeline = (agent.timeline || []).filter(entry => {
    const matchesType = filterType === 'all' || entry.type === filterType;
    const matchesSearch = searchTerm === '' || 
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleAddActivity = async () => {
    if (!newActivity.title || !newActivity.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in title and description.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const activityData: Omit<AgentTimelineEntry, 'id'> = {
        type: newActivity.type,
        title: newActivity.title,
        description: newActivity.description,
        date: new Date().toISOString().split('T')[0],
        ...(newActivity.amount > 0 && { amount: newActivity.amount }),
        ...(newActivity.clientId && { clientId: newActivity.clientId }),
        ...(newActivity.propertyId && { propertyId: newActivity.propertyId })
      };

      await addAgentTimelineEntry(agent.id, activityData);
      
      toast({
        title: "Activity Added",
        description: "New activity has been added to the agent's timeline.",
      });

      setNewActivity({
        type: 'note',
        title: '',
        description: '',
        amount: 0,
        clientId: '',
        propertyId: ''
      });
      setShowAddActivity(false);
    } catch (error) {
      toast({
        title: "Error Adding Activity",
        description: "There was an error adding the activity. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: AgentTimelineEntry['type']) => {
    const activityType = activityTypes.find(at => at.value === type);
    if (!activityType) return MessageSquare;
    return activityType.icon;
  };

  const getActivityColor = (type: AgentTimelineEntry['type']) => {
    const activityType = activityTypes.find(at => at.value === type);
    return activityType?.color || 'text-gray-500';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Activity Timeline
          </CardTitle>
          <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Activity</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="activityType">Activity Type</Label>
                  <Select 
                    value={newActivity.type} 
                    onValueChange={(value: AgentTimelineEntry['type']) => 
                      setNewActivity({ ...newActivity, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activityTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center">
                            <type.icon className={`h-4 w-4 mr-2 ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newActivity.title}
                    onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                    placeholder="Enter activity title"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    placeholder="Enter activity description"
                    rows={3}
                  />
                </div>

                {(newActivity.type === 'sale' || newActivity.type === 'listing') && (
                  <div>
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      value={newActivity.amount}
                      onChange={(e) => setNewActivity({ ...newActivity, amount: Number(e.target.value) })}
                      placeholder="Enter amount"
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddActivity(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddActivity} disabled={isLoading}>
                    {isLoading ? 'Adding...' : 'Add Activity'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              {activityTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-4">
          {filteredTimeline.length > 0 ? (
            filteredTimeline.map((entry) => {
              const ActivityIcon = getActivityIcon(entry.type);
              return (
                <div key={entry.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm`}>
                      <ActivityIcon className={`h-5 w-5 ${getActivityColor(entry.type)}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900">{entry.title}</h3>
                      <div className="flex items-center space-x-2">
                        {entry.amount && (
                          <Badge variant="secondary" className="text-green-700 bg-green-100">
                            {formatCurrency(entry.amount)}
                          </Badge>
                        )}
                        <span className="text-sm text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(entry.date)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{entry.description}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {activityTypes.find(at => at.value === entry.type)?.label || entry.type}
                      </Badge>
                      {entry.clientId && (
                        <Badge variant="outline" className="text-xs">
                          Client: {entry.clientId}
                        </Badge>
                      )}
                      {entry.propertyId && (
                        <Badge variant="outline" className="text-xs">
                          Property: {entry.propertyId}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || filterType !== 'all' 
                  ? 'No activities match your filters'
                  : 'No activities yet'
                }
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterType !== 'all'
                  ? 'Try adjusting your search criteria or filters'
                  : 'Start tracking agent activities by adding the first entry'
                }
              </p>
              <Button onClick={() => setShowAddActivity(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Activity
              </Button>
            </div>
          )}
        </div>

        {/* Activity Summary */}
        {filteredTimeline.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium text-gray-900 mb-3">Activity Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {activityTypes.map((type) => {
                const count = filteredTimeline.filter(entry => entry.type === type.value).length;
                if (count === 0) return null;
                
                return (
                  <div key={type.value} className="text-center p-3 bg-white rounded-lg border">
                    <type.icon className={`h-6 w-6 mx-auto mb-1 ${type.color}`} />
                    <div className="text-lg font-semibold">{count}</div>
                    <div className="text-xs text-gray-600">{type.label}s</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}