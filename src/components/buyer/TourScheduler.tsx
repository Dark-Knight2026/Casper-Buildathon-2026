import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar, Clock, Video, MapPin, User, CheckCircle2, X } from 'lucide-react';

interface TourSlot {
  id: string;
  date: string;
  time: string;
  type: 'in-person' | 'virtual' | 'self-guided';
  available: boolean;
  agentName?: string;
}

interface TourSchedulerProps {
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  onClose: () => void;
  onSchedule: (tourDetails: {
    date: string;
    time: string;
    type: string;
    notes?: string;
  }) => void;
}

export function TourScheduler({
  propertyId,
  propertyTitle,
  propertyAddress,
  onClose,
  onSchedule,
}: TourSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'in-person' | 'virtual' | 'self-guided'>(
    'in-person'
  );
  const [notes, setNotes] = useState<string>('');
  const [step, setStep] = useState<'type' | 'datetime' | 'confirm'>('type');

  // Generate available dates (next 14 days)
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return date.toISOString().split('T')[0];
  });

  // Available time slots
  const timeSlots = [
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
    '5:00 PM',
    '6:00 PM',
  ];

  const handleScheduleTour = () => {
    onSchedule({
      date: selectedDate,
      time: selectedTime,
      type: selectedType,
      notes,
    });
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Schedule a Tour</CardTitle>
              <CardDescription className="mt-2">
                <p className="font-semibold">{propertyTitle}</p>
                <p className="text-sm">{propertyAddress}</p>
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
                  step === 'type'
                    ? 'bg-blue-600 text-white'
                    : 'bg-green-600 text-white'
                }`}
              >
                {step !== 'type' ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <span className="text-sm font-medium">Tour Type</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'datetime'
                    ? 'bg-blue-600 text-white'
                    : step === 'confirm'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {step === 'confirm' ? <CheckCircle2 className="w-5 h-5" /> : '2'}
              </div>
              <span className="text-sm font-medium">Date & Time</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'confirm'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                3
              </div>
              <span className="text-sm font-medium">Confirm</span>
            </div>
          </div>

          {/* Step 1: Tour Type Selection */}
          {step === 'type' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">Choose Tour Type</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Card
                  className={`cursor-pointer transition-all ${
                    selectedType === 'in-person'
                      ? 'border-2 border-blue-600 bg-blue-50'
                      : 'hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedType('in-person')}
                >
                  <CardContent className="p-6 text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                    <h4 className="font-semibold mb-2">In-Person Tour</h4>
                    <p className="text-sm text-gray-600">
                      Visit the property with an agent
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    selectedType === 'virtual'
                      ? 'border-2 border-blue-600 bg-blue-50'
                      : 'hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedType('virtual')}
                >
                  <CardContent className="p-6 text-center">
                    <Video className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                    <h4 className="font-semibold mb-2">Virtual Tour</h4>
                    <p className="text-sm text-gray-600">
                      Video call with an agent
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    selectedType === 'self-guided'
                      ? 'border-2 border-blue-600 bg-blue-50'
                      : 'hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedType('self-guided')}
                >
                  <CardContent className="p-6 text-center">
                    <User className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                    <h4 className="font-semibold mb-2">Self-Guided</h4>
                    <p className="text-sm text-gray-600">
                      Tour at your own pace
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={() => setStep('datetime')}>
                  Next: Choose Date & Time
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {step === 'datetime' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4">Select Date</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableDates.slice(0, 9).map((date) => (
                    <Button
                      key={date}
                      variant={selectedDate === date ? 'default' : 'outline'}
                      className="h-auto py-3"
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className="text-center">
                        <div className="text-xs">
                          {new Date(date).toLocaleDateString('en-US', {
                            weekday: 'short',
                          })}
                        </div>
                        <div className="font-bold">
                          {new Date(date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {selectedDate && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">Select Time</h3>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {timeSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep('type')}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep('confirm')}
                  disabled={!selectedDate || !selectedTime}
                >
                  Next: Confirm
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4">Tour Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-semibold">{formatDate(selectedDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-semibold">{selectedTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedType === 'in-person' ? (
                      <MapPin className="w-5 h-5 text-blue-600" />
                    ) : selectedType === 'virtual' ? (
                      <Video className="w-5 h-5 text-blue-600" />
                    ) : (
                      <User className="w-5 h-5 text-blue-600" />
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Tour Type</p>
                      <p className="font-semibold capitalize">
                        {selectedType.replace('-', ' ')} Tour
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Any special requests or questions for the agent..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> You'll receive a confirmation email with tour details
                  and a calendar invite. The agent will contact you 24 hours before the
                  scheduled tour.
                </p>
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep('datetime')}>
                  Back
                </Button>
                <Button onClick={handleScheduleTour} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Tour
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}