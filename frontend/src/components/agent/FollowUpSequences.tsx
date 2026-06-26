import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Play, Pause, Square, Clock, CheckCircle2, TrendingUp, Users } from 'lucide-react';
import type { FollowUpSequence, SequenceEnrollment } from '@/types/communication';
import { format } from 'date-fns';

interface FollowUpSequencesProps {
  sequences: FollowUpSequence[];
  enrollments: SequenceEnrollment[];
}

export default function FollowUpSequences({ sequences, enrollments }: FollowUpSequencesProps) {
  const getTriggerColor = (trigger: string) => {
    const colors: Record<string, string> = {
      new_lead: 'bg-blue-100 text-blue-800',
      showing_completed: 'bg-green-100 text-green-800',
      offer_submitted: 'bg-purple-100 text-purple-800',
      listing_viewed: 'bg-orange-100 text-orange-800',
      inquiry_received: 'bg-cyan-100 text-cyan-800',
      manual: 'bg-gray-100 text-gray-800'
    };
    return colors[trigger] || 'bg-gray-100 text-gray-800';
  };

  const getEnrollmentStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'stopped':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Sequences */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Follow-Up Sequences</h3>
          <Button>
            <Zap className="h-4 w-4 mr-2" />
            Create Sequence
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sequences.map((sequence) => (
            <Card key={sequence.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{sequence.name}</CardTitle>
                    <p className="text-sm text-gray-600">{sequence.description}</p>
                  </div>
                  <Badge className={sequence.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {sequence.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={getTriggerColor(sequence.trigger_event)}>
                    Trigger: {sequence.trigger_event.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-gray-600">{sequence.steps.length} steps</span>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  {sequence.steps.map((step) => (
                    <div key={step.step_number} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {step.step_number}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{step.template_name}</p>
                        <p className="text-xs text-gray-600">
                          After {step.delay_days}d {step.delay_hours}h • {step.type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Users className="h-4 w-4 mr-1" />
                      {sequence.total_enrolled} enrolled
                    </div>
                    {sequence.avg_completion_rate && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {sequence.avg_completion_rate}% complete
                      </div>
                    )}
                    {sequence.avg_response_rate && (
                      <div className="flex items-center text-purple-600">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        {sequence.avg_response_rate}% response
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Active Enrollments */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Active Enrollments</h3>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {enrollments.map((enrollment) => (
                <div key={enrollment.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{enrollment.client_name}</h4>
                      <p className="text-sm text-gray-600">{enrollment.sequence_name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getEnrollmentStatusColor(enrollment.status)}>
                        {enrollment.status}
                      </Badge>
                      {enrollment.status === 'active' && (
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Pause className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Square className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                      {enrollment.status === 'paused' && (
                        <Button variant="ghost" size="sm">
                          <Play className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">
                      Step {enrollment.current_step} of {enrollment.total_steps}
                    </span>
                    {enrollment.response_received && (
                      <span className="flex items-center text-green-600">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Response received
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-600 h-2 rounded-full" 
                      style={{ width: `${(enrollment.current_step / enrollment.total_steps) * 100}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Enrolled: {format(new Date(enrollment.enrolled_at), 'MMM d, yyyy')}
                    </span>
                    {enrollment.next_action_at && enrollment.status === 'active' && (
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Next: {format(new Date(enrollment.next_action_at), 'MMM d, h:mm a')}
                      </span>
                    )}
                    {enrollment.completed_at && (
                      <span className="flex items-center text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed: {format(new Date(enrollment.completed_at), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}