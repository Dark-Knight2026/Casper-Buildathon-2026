/**
 * Review Step
 * Final review before lease generation
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeaseFormData } from '@/types/lease';
import {
  Home,
  Users,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface ReviewStepProps {
  formData: Partial<LeaseFormData>;
  updateFormData: (data: Partial<LeaseFormData>) => void;
  errors: Record<string, string>;
}

export default function ReviewStep({ formData }: ReviewStepProps) {
  const calculateTotalCost = () => {
    const rent = formData.monthlyRent || 0;
    const deposit = formData.securityDeposit || 0;
    const petDeposit = formData.petDeposit || 0;
    return rent + deposit + petDeposit;
  };

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-6">
        {/* Summary Header */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900">
                  Lease Agreement Ready for Generation
                </h3>
                <p className="text-sm text-blue-700">
                  Please review all details before generating the final document
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-blue-600" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Property ID</p>
                <p className="font-medium">{formData.propertyId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Lease Type</p>
                <Badge variant="outline" className="capitalize">
                  {formData.type?.replace('-', ' ') || 'N/A'}
                </Badge>
              </div>
            </div>
            {formData.propertyAddress && (
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-medium">{formData.propertyAddress}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">State</p>
              <p className="font-medium">{formData.state || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Parties Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Parties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Landlord</p>
              <p className="text-gray-700">{formData.landlordId || 'N/A'}</p>
              {formData.landlordName && (
                <p className="text-sm text-gray-600">{formData.landlordName}</p>
              )}
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">
                Tenant(s) ({formData.tenantIds?.length || 0})
              </p>
              {formData.tenantIds?.map((tenantId, index) => (
                <p key={tenantId} className="text-gray-700">
                  {index + 1}. {tenantId}
                </p>
              ))}
            </div>
            {formData.agentId && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Agent</p>
                  <p className="text-gray-700">{formData.agentId}</p>
                  {formData.agentCommission && (
                    <p className="text-sm text-gray-600">
                      Commission: ${formData.agentCommission.toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Lease Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Lease Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="font-medium">
                  {formData.startDate ? format(new Date(formData.startDate), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">End Date</p>
                <p className="font-medium">
                  {formData.endDate ? format(new Date(formData.endDate), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
            </div>
            {formData.autoRenewal && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-700">Auto-renewal enabled</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Financial Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Monthly Rent</p>
                <p className="font-medium text-green-600 text-lg">
                  ${formData.monthlyRent?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Security Deposit</p>
                <p className="font-medium text-lg">
                  ${formData.securityDeposit?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
            {formData.petDeposit && formData.petDeposit > 0 && (
              <div>
                <p className="text-sm text-gray-600">Pet Deposit</p>
                <p className="font-medium">
                  ${formData.petDeposit?.toLocaleString()}
                </p>
              </div>
            )}
            <Separator />
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-2">
                Total Move-in Cost
              </p>
              <p className="text-2xl font-bold text-green-600">
                ${calculateTotalCost().toLocaleString()}
              </p>
            </div>
            {formData.paymentMethods && formData.paymentMethods.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Accepted Payment Methods</p>
                <div className="flex flex-wrap gap-2">
                  {formData.paymentMethods.map((method) => (
                    <Badge key={method} variant="secondary" className="capitalize">
                      {method.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clauses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Clauses & Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formData.clauses && formData.clauses.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  {formData.clauses.length} clause(s) included
                </p>
                <div className="space-y-2">
                  {formData.clauses.map((clause, index) => (
                    <div
                      key={clause.id}
                      className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-600 mt-0.5">
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{clause.title}</p>
                          {clause.isMandatory && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {clause.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">No clauses added</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Terms */}
        {formData.customTerms && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {formData.customTerms}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}