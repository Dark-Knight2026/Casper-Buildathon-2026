import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { leaseRenewalService, RenewalNegotiation } from '@/services/leaseRenewalService';
import { Send, Loader2 } from 'lucide-react';

interface RenewalNegotiationThreadProps {
  renewalId: string;
  userType: 'tenant' | 'landlord';
}

interface NegotiationMessage extends RenewalNegotiation {
  id: string;
  created_at: string;
}

export default function RenewalNegotiationThread({ renewalId, userType }: RenewalNegotiationThreadProps) {
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [counterOfferRent, setCounterOfferRent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await leaseRenewalService.getNegotiationHistory(renewalId);
      setMessages(data as NegotiationMessage[]);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [renewalId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await leaseRenewalService.addNegotiationMessage({
        renewal_id: renewalId,
        sender_type: userType,
        message: newMessage,
        counter_offer_rent: counterOfferRent ? parseFloat(counterOfferRent) : undefined,
      });

      setNewMessage('');
      setCounterOfferRent('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading negotiation history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Negotiation Thread</CardTitle>
        <CardDescription>
          Discuss renewal terms with {userType === 'tenant' ? 'your landlord' : 'the tenant'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-96 overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-lg">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start the negotiation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_type === userType ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.sender_type === userType
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border'
                  }`}
                >
                  <p className="text-xs font-medium mb-1">
                    {message.sender_type === userType ? 'You' : message.sender_type === 'tenant' ? 'Tenant' : 'Landlord'}
                  </p>
                  <p className="text-sm">{message.message}</p>
                  {message.counter_offer_rent && (
                    <div className="mt-2 pt-2 border-t border-current/20">
                      <p className="text-xs font-medium">Counter-offer Rent:</p>
                      <p className="text-sm font-bold">${message.counter_offer_rent.toLocaleString()}</p>
                    </div>
                  )}
                  {message.counter_offer_terms && (
                    <div className="mt-2 pt-2 border-t border-current/20">
                      <p className="text-xs font-medium">Additional Terms:</p>
                      <p className="text-xs">{message.counter_offer_terms}</p>
                    </div>
                  )}
                  <p className="text-xs mt-2 opacity-70">
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="counterRent">Counter-Offer Rent (Optional)</Label>
            <Input
              id="counterRent"
              type="number"
              placeholder="Enter proposed rent amount"
              value={counterOfferRent}
              onChange={(e) => setCounterOfferRent(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
              rows={3}
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            className="w-full"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}