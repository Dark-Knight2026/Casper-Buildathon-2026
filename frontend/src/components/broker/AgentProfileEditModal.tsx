import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Agent } from '@/types/agent';
import { useAgent } from '@/contexts/AgentContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Edit, 
  Save, 
  X, 
  Plus, 
  MapPin, 
  Award, 
  DollarSign,
  User,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Languages,
  Globe
} from 'lucide-react';

interface AgentProfileEditModalProps {
  agent: Agent;
  trigger?: React.ReactNode;
  onSave?: () => void;
}

export default function AgentProfileEditModal({ agent, trigger, onSave }: AgentProfileEditModalProps) {
  const { updateAgent } = useAgent();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: agent.name || '',
    email: agent.email || '',
    phone: agent.phone || '',
    licenseNumber: agent.licenseNumber || '',
    status: agent.status,
    role: agent.role,
    specialties: [...(agent.specialties || [])],
    territory: [...(agent.territory || [])],
    address: {
      street: agent.address?.street || '',
      city: agent.address?.city || '',
      state: agent.address?.state || 'VA',
      zipCode: agent.address?.zipCode || ''
    },
    experience: agent.experience || 0,
    education: [...(agent.education || [])],
    certifications: [...(agent.certifications || [])],
    languages: [...(agent.languages || ['English'])],
    commissionStructure: {
      splitPercentage: agent.commissionStructure?.splitPercentage || 50,
      capAmount: agent.commissionStructure?.capAmount || 0,
      bonusStructure: agent.commissionStructure?.bonusStructure || ''
    },
    performance: {
      monthlyGoal: agent.performance?.monthlyGoal || 500000,
      yearlyGoal: agent.performance?.yearlyGoal || 3000000
    },
    socialMedia: {
      website: agent.socialMedia?.website || '',
      linkedin: agent.socialMedia?.linkedin || '',
      facebook: agent.socialMedia?.facebook || '',
      instagram: agent.socialMedia?.instagram || '',
      twitter: agent.socialMedia?.twitter || ''
    }
  });

  const [newSpecialty, setNewSpecialty] = useState('');
  const [newTerritory, setNewTerritory] = useState('');
  const [newEducation, setNewEducation] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  const specialtyOptions = [
    'Luxury Homes', 'First-Time Buyers', 'Investment Properties', 'Commercial Real Estate',
    'Waterfront Properties', 'New Construction', 'Foreclosures', 'Senior Housing',
    'Military Relocation', 'International Clients', 'Green Homes', 'Historic Properties'
  ];

  const territoryOptions = [
    'Norfolk', 'Virginia Beach', 'Chesapeake', 'Portsmouth', 'Suffolk',
    'Hampton', 'Newport News', 'Williamsburg', 'Yorktown', 'Poquoson'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.licenseNumber) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const updatedAgent: Partial<Agent> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        licenseNumber: formData.licenseNumber,
        status: formData.status,
        role: formData.role,
        specialties: formData.specialties,
        territory: formData.territory,
        address: formData.address,
        experience: formData.experience,
        education: formData.education,
        certifications: formData.certifications,
        languages: formData.languages,
        commissionStructure: formData.commissionStructure,
        performance: {
          ...agent.performance,
          monthlyGoal: formData.performance.monthlyGoal,
          yearlyGoal: formData.performance.yearlyGoal
        },
        socialMedia: formData.socialMedia
      };

      await updateAgent(agent.id, updatedAgent);
      
      toast({
        title: "Profile Updated",
        description: `${formData.name}'s profile has been updated successfully.`,
      });

      setOpen(false);
      onSave?.();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "There was an error updating the agent profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addSpecialty = () => {
    if (newSpecialty && !formData.specialties.includes(newSpecialty)) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, newSpecialty]
      });
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter(s => s !== specialty)
    });
  };

  const addTerritory = () => {
    if (newTerritory && !formData.territory.includes(newTerritory)) {
      setFormData({
        ...formData,
        territory: [...formData.territory, newTerritory]
      });
      setNewTerritory('');
    }
  };

  const removeTerritory = (territory: string) => {
    setFormData({
      ...formData,
      territory: formData.territory.filter(t => t !== territory)
    });
  };

  const addEducation = () => {
    if (newEducation && !formData.education.includes(newEducation)) {
      setFormData({
        ...formData,
        education: [...formData.education, newEducation]
      });
      setNewEducation('');
    }
  };

  const removeEducation = (education: string) => {
    setFormData({
      ...formData,
      education: formData.education.filter(e => e !== education)
    });
  };

  const addCertification = () => {
    if (newCertification && !formData.certifications.includes(newCertification)) {
      setFormData({
        ...formData,
        certifications: [...formData.certifications, newCertification]
      });
      setNewCertification('');
    }
  };

  const removeCertification = (certification: string) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter(c => c !== certification)
    });
  };

  const addLanguage = () => {
    if (newLanguage && !formData.languages.includes(newLanguage)) {
      setFormData({
        ...formData,
        languages: [...formData.languages, newLanguage]
      });
      setNewLanguage('');
    }
  };

  const removeLanguage = (language: string) => {
    if (formData.languages.length > 1) {
      setFormData({
        ...formData,
        languages: formData.languages.filter(l => l !== language)
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            Edit Agent Profile - {agent.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <User className="h-4 w-4 mr-2" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter agent's full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="agent@keychain.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(757) 555-0123"
                />
              </div>
              <div>
                <Label htmlFor="licenseNumber">License Number *</Label>
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  placeholder="VA-12345678"
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: Agent['status']) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value: Agent['role']) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="senior-agent">Senior Agent</SelectItem>
                    <SelectItem value="team-lead">Team Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    address: { ...formData.address, street: e.target.value }
                  })}
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    address: { ...formData.address, city: e.target.value }
                  })}
                  placeholder="Norfolk"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={formData.address.zipCode}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    address: { ...formData.address, zipCode: e.target.value }
                  })}
                  placeholder="23510"
                />
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Professional Details</h3>
            <div>
              <Label htmlFor="experience">Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                min="0"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Specialties */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Specialties
            </h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.specialties.map((specialty) => (
                <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                  {specialty}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeSpecialty(specialty)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={newSpecialty} onValueChange={setNewSpecialty}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  {specialtyOptions.filter(option => !formData.specialties.includes(option)).map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={addSpecialty} disabled={!newSpecialty}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Territory */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Territory
            </h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.territory.map((territory) => (
                <Badge key={territory} variant="secondary" className="flex items-center gap-1">
                  {territory}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeTerritory(territory)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={newTerritory} onValueChange={setNewTerritory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select territory" />
                </SelectTrigger>
                <SelectContent>
                  {territoryOptions.filter(option => !formData.territory.includes(option)).map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={addTerritory} disabled={!newTerritory}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Commission Structure */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Commission Structure
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="splitPercentage">Commission Split (%)</Label>
                <Input
                  id="splitPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.commissionStructure.splitPercentage}
                  onChange={(e) => setFormData({
                    ...formData,
                    commissionStructure: {
                      ...formData.commissionStructure,
                      splitPercentage: Number(e.target.value)
                    }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="capAmount">Cap Amount ($)</Label>
                <Input
                  id="capAmount"
                  type="number"
                  min="0"
                  value={formData.commissionStructure.capAmount}
                  onChange={(e) => setFormData({
                    ...formData,
                    commissionStructure: {
                      ...formData.commissionStructure,
                      capAmount: Number(e.target.value)
                    }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="bonusStructure">Bonus Structure</Label>
                <Input
                  id="bonusStructure"
                  value={formData.commissionStructure.bonusStructure}
                  onChange={(e) => setFormData({
                    ...formData,
                    commissionStructure: {
                      ...formData.commissionStructure,
                      bonusStructure: e.target.value
                    }
                  })}
                  placeholder="e.g., Quarterly Performance Bonus"
                />
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Performance Goals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthlyGoal">Monthly Goal ($)</Label>
                <Input
                  id="monthlyGoal"
                  type="number"
                  min="0"
                  value={formData.performance.monthlyGoal}
                  onChange={(e) => setFormData({
                    ...formData,
                    performance: {
                      ...formData.performance,
                      monthlyGoal: Number(e.target.value)
                    }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="yearlyGoal">Yearly Goal ($)</Label>
                <Input
                  id="yearlyGoal"
                  type="number"
                  min="0"
                  value={formData.performance.yearlyGoal}
                  onChange={(e) => setFormData({
                    ...formData,
                    performance: {
                      ...formData.performance,
                      yearlyGoal: Number(e.target.value)
                    }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <GraduationCap className="h-4 w-4 mr-2" />
              Education
            </h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.education.map((education) => (
                <Badge key={education} variant="outline" className="flex items-center gap-1">
                  {education}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeEducation(education)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newEducation}
                onChange={(e) => setNewEducation(e.target.value)}
                placeholder="Add education (e.g., Business Administration - ODU)"
                className="flex-1"
              />
              <Button type="button" onClick={addEducation} disabled={!newEducation}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Certifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Certifications</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.certifications.map((certification) => (
                <Badge key={certification} variant="outline" className="flex items-center gap-1">
                  {certification}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeCertification(certification)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                placeholder="Add certification (e.g., CRS, GRI, ABR)"
                className="flex-1"
              />
              <Button type="button" onClick={addCertification} disabled={!newCertification}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Languages */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Languages className="h-4 w-4 mr-2" />
              Languages
            </h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.languages.map((language) => (
                <Badge key={language} variant="outline" className="flex items-center gap-1">
                  {language}
                  {formData.languages.length > 1 && (
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeLanguage(language)}
                    />
                  )}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                placeholder="Add language (e.g., Spanish, Mandarin)"
                className="flex-1"
              />
              <Button type="button" onClick={addLanguage} disabled={!newLanguage}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              Social Media & Marketing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.socialMedia.website}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialMedia: { ...formData.socialMedia, website: e.target.value }
                  })}
                  placeholder="https://agent-website.com"
                />
              </div>
              <div>
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={formData.socialMedia.linkedin}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialMedia: { ...formData.socialMedia, linkedin: e.target.value }
                  })}
                  placeholder="https://linkedin.com/in/agent"
                />
              </div>
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={formData.socialMedia.facebook}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialMedia: { ...formData.socialMedia, facebook: e.target.value }
                  })}
                  placeholder="https://facebook.com/agent"
                />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.socialMedia.instagram}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialMedia: { ...formData.socialMedia, instagram: e.target.value }
                  })}
                  placeholder="https://instagram.com/agent"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}