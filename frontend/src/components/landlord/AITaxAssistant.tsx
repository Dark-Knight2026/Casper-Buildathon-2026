import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const TAX_TOPICS = [
  { id: 'deductions', label: 'Common Deductions', icon: '💰' },
  { id: 'depreciation', label: 'Depreciation Rules', icon: '📉' },
  { id: '1031-exchange', label: '1031 Exchanges', icon: '🔄' },
  { id: 'schedule-e', label: 'Schedule E Filing', icon: '📋' },
  { id: 'repairs-improvements', label: 'Repairs vs Improvements', icon: '🔧' },
  { id: 'home-office', label: 'Home Office Deduction', icon: '🏠' },
];

const AI_RESPONSES: Record<string, string> = {
  'deductions': 'As a landlord, you can deduct various expenses including:\n\n• Mortgage interest\n• Property taxes\n• Insurance premiums\n• Repairs and maintenance\n• Property management fees\n• Utilities (if you pay them)\n• Advertising costs\n• Legal and professional fees\n• Travel expenses for property management\n\nRemember to keep detailed records and receipts for all deductions!',
  'depreciation': 'Depreciation allows you to deduct the cost of your rental property over time:\n\n• Residential rental property: 27.5 years\n• Commercial property: 39 years\n• Land cannot be depreciated\n• You can depreciate improvements and appliances\n• Use MACRS (Modified Accelerated Cost Recovery System)\n• Depreciation starts when property is ready for rent\n\nConsult a tax professional for specific calculations.',
  '1031-exchange': 'A 1031 Exchange allows you to defer capital gains taxes when selling investment property:\n\n• Must be like-kind property (real estate for real estate)\n• 45-day identification period for replacement property\n• 180-day closing period\n• Must use a qualified intermediary\n• Can\'t touch the proceeds during exchange\n• Both properties must be held for investment\n\nThis is a complex strategy - work with a qualified intermediary and tax advisor.',
  'schedule-e': 'Schedule E (Form 1040) is used to report rental income and expenses:\n\n• Report gross rental income\n• List all deductible expenses by category\n• Calculate depreciation\n• Report net profit or loss\n• Attach to your Form 1040\n• Keep supporting documentation for 3-7 years\n\nOur Tax Dashboard can help you prepare this form!',
  'repairs-improvements': 'Understanding the difference is crucial for tax purposes:\n\n**Repairs (Deductible immediately):**\n• Fixing broken windows\n• Repainting\n• Fixing leaks\n• Replacing broken appliances\n\n**Improvements (Must be depreciated):**\n• Adding a room\n• New roof\n• HVAC system replacement\n• Kitchen remodel\n\nWhen in doubt, consult a tax professional.',
  'home-office': 'If you manage rentals from a home office, you may qualify for deductions:\n\n• Must be used regularly and exclusively for business\n• Can use simplified method ($5/sq ft, max 300 sq ft)\n• Or actual expense method (utilities, insurance, repairs)\n• Keep detailed records\n• Applies to self-employed landlords\n\nThis deduction has specific requirements - review IRS Publication 587.',
};

export default function AITaxAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI Tax Assistant. I can help answer common tax questions for landlords. Select a topic below or ask me anything!',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // Check for topic keywords
    for (const [key, response] of Object.entries(AI_RESPONSES)) {
      if (lowerMessage.includes(key.replace('-', ' ')) || lowerMessage.includes(key)) {
        return response;
      }
    }

    // Check for specific keywords
    if (lowerMessage.includes('deduct') || lowerMessage.includes('expense')) {
      return AI_RESPONSES['deductions'];
    }
    if (lowerMessage.includes('depreciat')) {
      return AI_RESPONSES['depreciation'];
    }
    if (lowerMessage.includes('1031') || lowerMessage.includes('exchange')) {
      return AI_RESPONSES['1031-exchange'];
    }
    if (lowerMessage.includes('schedule e') || lowerMessage.includes('form')) {
      return AI_RESPONSES['schedule-e'];
    }
    if (lowerMessage.includes('repair') || lowerMessage.includes('improvement')) {
      return AI_RESPONSES['repairs-improvements'];
    }
    if (lowerMessage.includes('home office')) {
      return AI_RESPONSES['home-office'];
    }

    // Default response
    return 'I can help with common landlord tax questions including deductions, depreciation, 1031 exchanges, Schedule E filing, repairs vs improvements, and home office deductions. Please select a topic above or ask a more specific question!\n\n**Disclaimer:** This is general information only. Always consult with a qualified tax professional for advice specific to your situation.';
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleTopicClick = (topicId: string) => {
    const topic = TAX_TOPICS.find(t => t.id === topicId);
    if (!topic) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Tell me about ${topic.label}`,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: AI_RESPONSES[topicId] || 'I don\'t have information on that topic yet.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-600" />
            <CardTitle>AI Tax Assistant</CardTitle>
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="h-3 w-3 mr-1" />
              Beta
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Get instant answers to common landlord tax questions. For personalized advice, consult a tax professional.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Topic Buttons */}
          <div className="flex flex-wrap gap-2">
            {TAX_TOPICS.map(topic => (
              <Button
                key={topic.id}
                variant="outline"
                size="sm"
                onClick={() => handleTopicClick(topic.id)}
                className="text-xs"
              >
                <span className="mr-1">{topic.icon}</span>
                {topic.label}
              </Button>
            ))}
          </div>

          {/* Chat Messages */}
          <Card className="border-2">
            <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <User className="h-5 w-5 text-green-600 dark:text-green-300" />
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              placeholder="Ask a tax question..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isTyping}
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            ⚠️ This AI provides general information only. Always consult a qualified tax professional for personalized advice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}