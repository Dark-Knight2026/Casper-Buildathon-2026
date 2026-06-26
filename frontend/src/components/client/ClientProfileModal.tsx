import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useClients } from '@/contexts/ClientContext';
import { Client } from '@/types/client';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  DollarSign,
  Home,
  Tag,
  FileText,
  Clock,
  TrendingUp,
  Star,
  MessageSquare,
  Edit,
  Save,
  X,
  Plus,
  Activity,
  Target,
  Briefcase,
  Users
} from 'lucide-react';

interface ClientProfileModalProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClientProfileModal({ clientId, open, onOpenChange }: ClientProfileModalProps) {
  const { getClient, updateClient, addClientNote } = useClients();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Partial<Client>>({});
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    if (clientId && open) {
      const foundClient = getClient(clientId);
      if (foundClient) {
        setClient(foundClient);
        setEditedClient(foundClient);
      }
    }
  }, [clientId, open, getClient]);

  const handleSave = async () => {
    if (!client) return;
    
    try {
      await updateClient(client.id, editedClient);
      setClient({ ...client, ...editedClient });
      setIsEditing(false);
      toast({
        title: "Success!",
        description: "Client profile updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update client profile.",
        variant: "destructive"
      });
    }
  };

  const handleAddNote = async () => {
    if (!client || !newNote.trim()) return;
    
    try {
      await addClientNote(client.id, newNote.trim());
      const updatedClient = getClient(client.id);
      if (updatedClient) {
        setClient(updatedClient);
      }
      setNewNote('');
      setIsAddingNote(false);
      toast({
        title: "Success!",
        description: "Note added successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add note.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'closed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Client['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: Client['type']) => {
    switch (type) {
      case 'buyer': return '🏠';
      case 'seller': return '💰';
      case 'renter': return '🔑';
      case 'investor': return '📊';
      default: return '👤';
    }
  };

  const formatBudget = (budget?: { min: number; max: number }) => {
    if (!budget) return 'Not specified';
    const min = budget.min ? `$${budget.min.toLocaleString()}` : 'No min';
    const max = budget.max ? `$${budget.max.toLocaleString()}` : 'No max';
    return `${min} - ${max}`;
  };

  const getLeadScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConversionColor = (probability?: number) => {
    if (!probability) return 'text-gray-500';
    if (probability >= 70) return 'text-green-600';
    if (probability >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!client) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Client not found</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center">
              <div className="text-3xl mr-3">{getTypeIcon(client.type)}</div>
              <div>
                <div className="text-xl font-bold">
                  {client.firstName} {client.lastName}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getStatusColor(client.status)}>
                    {client.status}
                  </Badge>
                  <Badge className={getPriorityColor(client.priority)}>
                    {client.priority}
                  </Badge>
                  <Badge variant="outline">
                    {client.type}
                  </Badge>
                </div>
              </div>
            </DialogTitle>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditedClient(client);
                    }} 
                    variant="outline" 
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        {isEditing ? (
                          <Input
                            value={editedClient.email || ''}
                            onChange={(e) => setEditedClient({ ...editedClient, email: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{client.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        {isEditing ? (
                          <Input
                            value={editedClient.phone || ''}
                            onChange={(e) => setEditedClient({ ...editedClient, phone: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{client.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Assigned Date</p>
                        <p className="font-medium">{new Date(client.assignedDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Last Contact</p>
                        <p className="font-medium">{new Date(client.lastContact).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="h-5 w-5 mr-2" />
                    Client Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Lead Source</p>
                    <p className="font-medium capitalize">{client.source.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Communication Preference</p>
                    <p className="font-medium capitalize">{client.communicationPreference.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assigned Agent</p>
                    <p className="font-medium">{client.assignedAgent || 'Unassigned'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Lead Score</p>
                    <div className="flex items-center space-x-2">
                      <p className={`font-bold text-lg ${getLeadScoreColor(client.leadScore)}`}>
                        {client.leadScore || 'N/A'}
                      </p>
                      {client.leadScore && (
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${client.leadScore}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Conversion Probability</p>
                    <div className="flex items-center space-x-2">
                      <p className={`font-bold text-lg ${getConversionColor(client.conversionProbability)}`}>
                        {client.conversionProbability ? `${client.conversionProbability}%` : 'N/A'}
                      </p>
                      {client.conversionProbability && (
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${client.conversionProbability}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tags */}
            {client.tags && client.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Tag className="h-5 w-5 mr-2" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {client.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Notes
                  </CardTitle>
                  <Button 
                    onClick={() => setIsAddingNote(true)} 
                    size="sm" 
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isAddingNote && (
                  <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                    <Label htmlFor="newNote">New Note</Label>
                    <Textarea
                      id="newNote"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note about this client..."
                      className="mt-2"
                      rows={3}
                    />
                    <div className="flex space-x-2 mt-3">
                      <Button onClick={handleAddNote} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save Note
                      </Button>
                      <Button 
                        onClick={() => {
                          setIsAddingNote(false);
                          setNewNote('');
                        }} 
                        variant="outline" 
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {client.notes || 'No notes available'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6 mt-6">
            {/* Budget Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Budget Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Budget Range</p>
                    <p className="font-medium text-lg">
                      {formatBudget(client.preferences?.budget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Property Type</p>
                    <p className="font-medium capitalize">
                      {client.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="h-5 w-5 mr-2" />
                  Property Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Bedrooms</p>
                    <p className="font-medium">
                      {client.preferences?.bedrooms || 'Any'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bathrooms</p>
                    <p className="font-medium">
                      {client.preferences?.bathrooms || 'Any'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Property Types</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {client.preferences?.propertyType?.map((type, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      )) || <span className="text-gray-500">Any</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Features</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {client.preferences?.features?.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      )) || <span className="text-gray-500">None specified</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Preferences */}
            {client.preferences?.location && client.preferences.location.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Location Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {client.preferences.location.map((location, index) => (
                      <Badge key={index} variant="secondary">
                        {location}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client.timeline && client.timeline.length > 0 ? (
                  <div className="space-y-4">
                    {client.timeline.map((item) => (
                      <div key={item.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{item.action}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(item.date).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          <p className="text-xs text-gray-500 mt-1">By: {item.performedBy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No activity recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Documents
                  </CardTitle>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {client.documents && client.documents.length > 0 ? (
                  <div className="space-y-3">
                    {client.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-gray-500">
                              {doc.type} • Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No documents uploaded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Lead Score</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {client.leadScore || 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Target className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Conversion Probability</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {client.conversionProbability ? `${client.conversionProbability}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Days as Client</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.floor((new Date().getTime() - new Date(client.assignedDate).getTime()) / (1000 * 60 * 60 * 24))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Client Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900">Engagement Level</h4>
                    <p className="text-blue-700 text-sm mt-1">
                      {client.leadScore && client.leadScore > 80 
                        ? 'High - Very engaged and likely to convert'
                        : client.leadScore && client.leadScore > 60
                        ? 'Medium - Moderately engaged, needs nurturing'
                        : 'Low - Requires more attention and follow-up'
                      }
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900">Recommended Actions</h4>
                    <ul className="text-green-700 text-sm mt-1 space-y-1">
                      <li>• Schedule regular follow-up calls</li>
                      <li>• Send personalized property recommendations</li>
                      <li>• Provide market insights and updates</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}