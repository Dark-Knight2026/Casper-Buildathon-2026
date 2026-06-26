import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Agent } from '@/types/listing';
import { Phone, Mail, MessageSquare, Star, Award } from 'lucide-react';

interface AgentContactProps {
  agent: Agent;
}

export default function AgentContact({ agent }: AgentContactProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Listing Agent</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start space-x-4 mb-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={agent.photo} alt={agent.name} />
            <AvatarFallback>
              {agent.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-600">{agent.company}</p>
            
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">{agent.rating}</span>
              </div>
              <span className="text-sm text-gray-500">
                ({agent.reviewCount} reviews)
              </span>
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Specialties</h4>
          <div className="flex flex-wrap gap-2">
            {agent.specialties.map((specialty, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {specialty}
              </Badge>
            ))}
          </div>
        </div>

        {/* Contact Buttons */}
        <div className="space-y-2">
          <Button className="w-full flex items-center space-x-2">
            <Phone className="h-4 w-4" />
            <span>Call {agent.phone}</span>
          </Button>
          
          <Button variant="outline" className="w-full flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Email Agent</span>
          </Button>
          
          <Button variant="outline" className="w-full flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Send Message</span>
          </Button>
        </div>

        {/* Agent Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{agent.rating}</div>
              <div className="text-xs text-gray-600">Rating</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{agent.reviewCount}</div>
              <div className="text-xs text-gray-600">Reviews</div>
            </div>
          </div>
        </div>

        {/* Professional Badge */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Award className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Verified Professional</span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Licensed real estate professional with verified credentials
          </p>
        </div>
      </CardContent>
    </Card>
  );
}