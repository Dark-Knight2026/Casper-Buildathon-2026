import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types/user';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Building, 
  Award, 
  Calendar,
  Edit3,
  Save,
  X,
  Star,
  TrendingUp,
  Home,
  ShoppingCart,
  Briefcase
} from 'lucide-react';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<User>>({});

  if (!user) return null;

  const handleEdit = () => {
    setEditData({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      company: user.company || '',
      bio: user.bio || '',
      licenseNumber: user.licenseNumber || '',
      yearsExperience: user.yearsExperience || 0,
      specializations: user.specializations || []
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfile(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({});
    setIsEditing(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'seller': return Home;
      case 'buyer': return ShoppingCart;
      case 'agent': return Briefcase;
      case 'broker': return TrendingUp;
      default: return UserIcon;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'seller': return 'bg-green-100 text-green-800 border-green-200';
      case 'buyer': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'agent': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'broker': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'seller': return 'Property Seller';
      case 'buyer': return 'Buyer/Renter';
      case 'agent': return 'Real Estate Agent';
      case 'broker': return 'Real Estate Broker';
      default: return 'User';
    }
  };

  const RoleIcon = getRoleIcon(user.role);

  // Mock stats for demonstration
  const mockStats = {
    propertiesListed: user.role === 'seller' ? 3 : user.role === 'agent' ? 15 : user.role === 'broker' ? 45 : 0,
    propertiesSold: user.role === 'seller' ? 1 : user.role === 'agent' ? 8 : user.role === 'broker' ? 23 : 0,
    totalTransactions: user.role === 'buyer' ? 2 : user.role === 'agent' ? 12 : user.role === 'broker' ? 35 : 1,
    averageRating: 4.7,
    reviewCount: user.role === 'buyer' ? 3 : user.role === 'agent' ? 24 : user.role === 'broker' ? 67 : 5
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">User Profile</DialogTitle>
            {!isEditing ? (
              <Button variant="outline" onClick={handleEdit} className="flex items-center space-x-2">
                <Edit3 className="h-4 w-4" />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button onClick={handleSave} className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </Button>
                <Button variant="outline" onClick={handleCancel} className="flex items-center space-x-2">
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <RoleIcon className="h-10 w-10 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {user.firstName} {user.lastName}
                    </h2>
                    <Badge className={`${getRoleColor(user.role)} border`}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Mail className="h-4 w-4" />
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-4 w-4" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.company && (
                      <div className="flex items-center space-x-1">
                        <Building className="h-4 w-4" />
                        <span>{user.company}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{mockStats.averageRating}</span>
                    <span className="text-gray-600">({mockStats.reviewCount} reviews)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {user.role === 'seller' && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Properties Listed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{mockStats.propertiesListed}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Properties Sold</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{mockStats.propertiesSold}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round((mockStats.propertiesSold / mockStats.propertiesListed) * 100)}%
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {user.role === 'buyer' && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Properties Viewed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">47</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Saved Properties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">12</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{mockStats.totalTransactions}</div>
                  </CardContent>
                </Card>
              </>
            )}

            {(user.role === 'agent' || user.role === 'broker') && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Active Listings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{mockStats.propertiesListed}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{mockStats.propertiesSold}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">{mockStats.totalTransactions}</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-firstName">First Name</Label>
                      <Input
                        id="edit-firstName"
                        value={editData.firstName || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-lastName">Last Name</Label>
                      <Input
                        id="edit-lastName"
                        value={editData.lastName || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Phone</Label>
                      <Input
                        id="edit-phone"
                        value={editData.phone || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    {(user.role === 'agent' || user.role === 'broker') && (
                      <div className="space-y-2">
                        <Label htmlFor="edit-company">Company</Label>
                        <Input
                          id="edit-company"
                          value={editData.company || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, company: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>

                  {(user.role === 'agent' || user.role === 'broker') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-license">License Number</Label>
                        <Input
                          id="edit-license"
                          value={editData.licenseNumber || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-experience">Years of Experience</Label>
                        <Input
                          id="edit-experience"
                          type="number"
                          value={editData.yearsExperience || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, yearsExperience: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit-bio">Bio</Label>
                    <Textarea
                      id="edit-bio"
                      value={editData.bio || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                        <p className="text-gray-900">{user.firstName} {user.lastName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Email</Label>
                        <p className="text-gray-900">{user.email}</p>
                      </div>
                      {user.phone && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Phone</Label>
                          <p className="text-gray-900">{user.phone}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Role</Label>
                        <p className="text-gray-900">{getRoleLabel(user.role)}</p>
                      </div>
                      {user.company && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Company</Label>
                          <p className="text-gray-900">{user.company}</p>
                        </div>
                      )}
                      {user.licenseNumber && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">License Number</Label>
                          <p className="text-gray-900">{user.licenseNumber}</p>
                        </div>
                      )}
                      {user.yearsExperience && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Years of Experience</Label>
                          <p className="text-gray-900">{user.yearsExperience} years</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {user.specializations && user.specializations.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm font-medium text-gray-600 mb-2 block">Specializations</Label>
                        <div className="flex flex-wrap gap-2">
                          {user.specializations.map((spec, index) => (
                            <Badge key={index} variant="outline">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {user.bio && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm font-medium text-gray-600 mb-2 block">Bio</Label>
                        <p className="text-gray-900 leading-relaxed">{user.bio}</p>
                      </div>
                    </>
                  )}

                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Member Since</Label>
                      <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                    {user.lastLogin && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Last Login</Label>
                        <p>{new Date(user.lastLogin).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}