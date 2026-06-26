import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Property } from '../../types/buyer';
import {
  X,
  DollarSign,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Calculator,
} from 'lucide-react';

interface OfferCreatorProps {
  property: Property;
  onClose: () => void;
  onSubmit: (offerData: OfferData) => void;
}

interface OfferData {
  offerAmount: number;
  earnestMoney: number;
  downPayment: number;
  closingDate: string;
  contingencies: string[];
  additionalTerms: string;
  financingType: 'cash' | 'conventional' | 'fha' | 'va';
}

export function OfferCreator({ property, onClose, onSubmit }: OfferCreatorProps) {
  const [step, setStep] = useState<'amount' | 'terms' | 'review'>('amount');
  const [offerData, setOfferData] = useState<OfferData>({
    offerAmount: property.price,
    earnestMoney: Math.round(property.price * 0.01),
    downPayment: Math.round(property.price * 0.2),
    closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    contingencies: ['inspection', 'financing', 'appraisal'],
    additionalTerms: '',
    financingType: 'conventional',
  });

  const [selectedContingencies, setSelectedContingencies] = useState<string[]>([
    'inspection',
    'financing',
    'appraisal',
  ]);

  const contingencyOptions = [
    { id: 'inspection', label: 'Home Inspection', description: 'Contingent on satisfactory home inspection' },
    { id: 'financing', label: 'Financing', description: 'Contingent on obtaining mortgage approval' },
    { id: 'appraisal', label: 'Appraisal', description: 'Contingent on property appraisal meeting offer price' },
    { id: 'sale', label: 'Sale of Current Home', description: 'Contingent on selling your current property' },
    { id: 'title', label: 'Clear Title', description: 'Contingent on clear title search' },
  ];

  const toggleContingency = (id: string) => {
    setSelectedContingencies((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const calculateClosingCosts = () => {
    const lenderFees = offerData.offerAmount * 0.01;
    const titleInsurance = offerData.offerAmount * 0.005;
    const appraisal = 500;
    const inspection = 400;
    const recording = 150;
    return lenderFees + titleInsurance + appraisal + inspection + recording;
  };

  const calculateTotalCash = () => {
    return offerData.earnestMoney + offerData.downPayment + calculateClosingCosts();
  };

  const handleSubmit = () => {
    onSubmit({
      ...offerData,
      contingencies: selectedContingencies,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Make an Offer</CardTitle>
              <CardDescription className="mt-2">
                <p className="font-semibold">{property.title}</p>
                <p className="text-sm">
                  {property.address}, {property.city}
                </p>
                <p className="text-sm">List Price: ${property.price.toLocaleString()}</p>
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'amount'
                    ? 'bg-blue-600 text-white'
                    : 'bg-green-600 text-white'
                }`}
              >
                {step !== 'amount' ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <span className="text-sm font-medium">Offer Amount</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'terms'
                    ? 'bg-blue-600 text-white'
                    : step === 'review'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {step === 'review' ? <CheckCircle2 className="w-5 h-5" /> : '2'}
              </div>
              <span className="text-sm font-medium">Terms & Contingencies</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'review'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                3
              </div>
              <span className="text-sm font-medium">Review & Submit</span>
            </div>
          </div>

          {/* Step 1: Offer Amount */}
          {step === 'amount' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="offer-amount">Offer Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="offer-amount"
                      type="number"
                      className="pl-7"
                      value={offerData.offerAmount}
                      onChange={(e) =>
                        setOfferData({
                          ...offerData,
                          offerAmount: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setOfferData({
                          ...offerData,
                          offerAmount: property.price,
                        })
                      }
                    >
                      List Price
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setOfferData({
                          ...offerData,
                          offerAmount: Math.round(property.price * 0.95),
                        })
                      }
                    >
                      -5%
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setOfferData({
                          ...offerData,
                          offerAmount: Math.round(property.price * 1.05),
                        })
                      }
                    >
                      +5%
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="earnest-money">Earnest Money Deposit *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="earnest-money"
                      type="number"
                      className="pl-7"
                      value={offerData.earnestMoney}
                      onChange={(e) =>
                        setOfferData({
                          ...offerData,
                          earnestMoney: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Typically 1-3% of offer amount
                  </p>
                </div>

                <div>
                  <Label htmlFor="down-payment">Down Payment *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="down-payment"
                      type="number"
                      className="pl-7"
                      value={offerData.downPayment}
                      onChange={(e) =>
                        setOfferData({
                          ...offerData,
                          downPayment: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {((offerData.downPayment / offerData.offerAmount) * 100).toFixed(1)}% of
                    offer amount
                  </p>
                </div>

                <div>
                  <Label htmlFor="financing-type">Financing Type *</Label>
                  <select
                    id="financing-type"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={offerData.financingType}
                    onChange={(e) =>
                      setOfferData({
                        ...offerData,
                        financingType: e.target.value as OfferData['financingType'],
                      })
                    }
                  >
                    <option value="conventional">Conventional Loan</option>
                    <option value="fha">FHA Loan</option>
                    <option value="va">VA Loan</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Calculator className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-2">Estimated Cash Needed</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Earnest Money:</span>
                          <span className="font-semibold">
                            ${offerData.earnestMoney.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Down Payment:</span>
                          <span className="font-semibold">
                            ${offerData.downPayment.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. Closing Costs:</span>
                          <span className="font-semibold">
                            ${Math.round(calculateClosingCosts()).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-blue-300">
                          <span className="font-bold">Total:</span>
                          <span className="font-bold text-lg">
                            ${Math.round(calculateTotalCash()).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => setStep('terms')}>
                  Next: Terms & Contingencies
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Terms & Contingencies */}
          {step === 'terms' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="closing-date">Proposed Closing Date *</Label>
                <Input
                  id="closing-date"
                  type="date"
                  value={offerData.closingDate}
                  onChange={(e) =>
                    setOfferData({
                      ...offerData,
                      closingDate: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-gray-600 mt-1">
                  Typically 30-45 days from offer acceptance
                </p>
              </div>

              <div>
                <Label className="mb-3 block">Contingencies</Label>
                <div className="space-y-3">
                  {contingencyOptions.map((option) => (
                    <Card
                      key={option.id}
                      className={`cursor-pointer transition-all ${
                        selectedContingencies.includes(option.id)
                          ? 'border-2 border-blue-600 bg-blue-50'
                          : 'hover:border-blue-300'
                      }`}
                      onClick={() => toggleContingency(option.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                              selectedContingencies.includes(option.id)
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {selectedContingencies.includes(option.id) && (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{option.label}</p>
                            <p className="text-sm text-gray-600">{option.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="additional-terms">Additional Terms (Optional)</Label>
                <Textarea
                  id="additional-terms"
                  rows={4}
                  placeholder="Any additional terms or conditions you'd like to include..."
                  value={offerData.additionalTerms}
                  onChange={(e) =>
                    setOfferData({
                      ...offerData,
                      additionalTerms: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('amount')}>
                  Back
                </Button>
                <Button onClick={() => setStep('review')}>Next: Review Offer</Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 'review' && (
            <div className="space-y-6">
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-900">Review Your Offer</p>
                      <p className="text-sm text-yellow-800 mt-1">
                        Please review all details carefully before submitting. Once submitted,
                        your offer will be sent to the seller's agent.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Offer Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Offer Amount:</span>
                      <span className="font-bold text-lg">
                        ${offerData.offerAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Earnest Money:</span>
                      <span className="font-semibold">
                        ${offerData.earnestMoney.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Down Payment:</span>
                      <span className="font-semibold">
                        ${offerData.downPayment.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Financing:</span>
                      <span className="font-semibold capitalize">
                        {offerData.financingType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Closing Date:</span>
                      <span className="font-semibold">
                        {new Date(offerData.closingDate).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contingencies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedContingencies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedContingencies.map((id) => {
                          const option = contingencyOptions.find((o) => o.id === id);
                          return (
                            <Badge key={id} variant="outline">
                              {option?.label}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">No contingencies selected</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {offerData.additionalTerms && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Additional Terms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{offerData.additionalTerms}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 mb-2">
                        Total Cash Needed at Closing
                      </p>
                      <p className="text-3xl font-bold text-green-900">
                        ${Math.round(calculateTotalCash()).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('terms')}>
                  Back
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSubmit}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Submit Offer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}