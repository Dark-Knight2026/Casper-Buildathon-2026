import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Client } from '@/types/client';
import { useClients } from '@/contexts/ClientContext';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building,
  Users,
  Briefcase,
  Heart,
  DollarSign,
  FileText,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Star,
  Clock,
  Target,
  TrendingUp,
  MessageSquare,
  Camera,
  Globe,
  Shield,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

interface ClientInformationPanelProps {
  client: Client;
  onClientUpdate?: (updatedClient: Client) => void;
}

export default function ClientInformationPanel({ client, onClientUpdate }: ClientInformationPanelProps) {
  const { updateClient } = useClients();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Client>(client);
  const [activeTab, setActiveTab] = useState('basic');

  const handleSave = async () => {
    try {
      const updated = await updateClient(client.id, editedClient);
      setIsEditing(false);
      onClientUpdate?.(updated);
      toast({
        title: "Success!",
        description: "Client information updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update client information.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setEditedClient(client);
    setIsEditing(false);
  };

  const updateField = (field: keyof Client, value: string | number | Date) => {
    setEditedClient(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedField = (parent: keyof Client, field: string, value: string | number | Date) => {
    setEditedClient(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'closed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: Client['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLeadScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {client.firstName[0]}{client.lastName[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {client.firstName} {client.lastName}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className={getStatusColor(client.status)}>
                {client.status}
              </Badge>
              <Badge className={getPriorityColor(client.priority)}>
                {client.priority} priority
              </Badge>
              <Badge variant="outline">
                {client.type}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Information
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6 mt-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={editedClient.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                    />
                  ) : (
                    <p className="font-medium mt-1">{client.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={editedClient.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                    />
                  ) : (
                    <p className="font-medium mt-1">{client.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Client Type</Label>
                  {isEditing ? (
                    <Select value={editedClient.type} onValueChange={(value: Client['type']) => updateField('type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="seller">Seller</SelectItem>
                        <SelectItem value="renter">Renter</SelectItem>
                        <SelectItem value="investor">Investor</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium mt-1 capitalize">{client.type}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="source">Lead Source</Label>
                  {isEditing ? (
                    <Select value={editedClient.source} onValueChange={(value: Client['source']) => updateField('source', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="cold_call">Cold Call</SelectItem>
                        <SelectItem value="walk_in">Walk-in</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium mt-1 capitalize">{client.source.replace('_', ' ')}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Assigned Date</Label>
                  <p className="font-medium mt-1">{new Date(client.assignedDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Last Contact</Label>
                  <p className="font-medium mt-1">{new Date(client.lastContact).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-2xl font-bold ${getLeadScoreColor(client.leadScore)}`}>
                    {client.leadScore || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Lead Score</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-2xl font-bold ${getLeadScoreColor(client.conversionProbability)}`}>
                    {client.conversionProbability ? `${client.conversionProbability}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Conversion Probability</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.floor((new Date().getTime() - new Date(client.assignedDate).getTime()) / (1000 * 60 * 60 * 24))}
                  </div>
                  <div className="text-sm text-gray-600">Days as Client</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6 mt-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editedClient.email}
                      onChange={(e) => updateField('email', e.target.value)}
                    />
                  ) : (
                    <div className="flex items-center mt-1">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="font-medium">{client.email}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">Primary Phone *</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={editedClient.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                    />
                  ) : (
                    <div className="flex items-center mt-1">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="font-medium">{client.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="space-y-6 mt-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <p className="font-medium mt-1">{client.personalInfo?.occupation || 'Not provided'}</p>
                </div>
                <div>
                  <Label htmlFor="employer">Employer</Label>
                  <p className="font-medium mt-1">{client.personalInfo?.employer || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6 mt-6">
          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Property Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.preferences?.budget ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      ${client.preferences.budget.min.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600">Minimum Budget</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">
                      ${client.preferences.budget.max.toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-600">Maximum Budget</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No budget information specified</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6 mt-6">
          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="income">Annual Income</Label>
                  <p className="font-medium mt-1">
                    {client.personalInfo?.income ? `$${client.personalInfo.income.toLocaleString()}` : 'Not provided'}
                  </p>
                </div>
                <div>
                  <Label htmlFor="creditScore">Credit Score</Label>
                  <p className="font-medium mt-1">{client.personalInfo?.creditScore || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-6">
          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Client History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No history available</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editedClient.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={4}
              placeholder="Add notes about this client..."
            />
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{client.notes || 'No notes available'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}