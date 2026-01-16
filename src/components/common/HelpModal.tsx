import React, { useState } from 'react';
import { HelpCircle, Search, Book, Video, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: 'getting-started' | 'features' | 'troubleshooting' | 'faq';
  tags: string[];
  content: string;
}

const helpArticles: HelpArticle[] = [
  {
    id: '1',
    title: 'Getting Started with Dashboards',
    description: 'Learn how to navigate and use your dashboard effectively',
    category: 'getting-started',
    tags: ['dashboard', 'navigation', 'basics'],
    content: `
# Getting Started with Dashboards

Your dashboard is your central hub for managing real estate operations. Here's what you need to know:

## Navigation
- Use the sidebar to switch between different dashboard views
- Click on any card or chart to see more details
- Use the search bar to quickly find properties, clients, or documents

## Key Features
- **Overview**: See your key metrics at a glance
- **Properties**: Manage your property listings
- **Clients**: Track client interactions and communications
- **Analytics**: View performance metrics and trends

## Tips
- Customize your dashboard by rearranging widgets
- Set up notifications for important events
- Use filters to focus on specific data
    `,
  },
  {
    id: '2',
    title: 'Using Advanced Filters',
    description: 'Create complex filters to find exactly what you need',
    category: 'features',
    tags: ['filters', 'search', 'advanced'],
    content: `
# Using Advanced Filters

Advanced filters help you find specific data quickly and efficiently.

## Creating Filters
1. Click the "Filters" button
2. Click "Add Condition" to add filter rules
3. Select the field, operator, and value
4. Choose AND/OR logic for multiple conditions

## Operators
- **Text**: Equals, Contains, Starts With, Ends With
- **Number**: Equals, Greater Than, Less Than, Between
- **Date**: Before, After, Between

## Saving Presets
1. Create your filter conditions
2. Click "Save Preset"
3. Give it a name and description
4. Access it anytime from the presets list

## Tips
- Use "Contains" for flexible text searches
- Use "Between" for date and number ranges
- Save frequently used filters as presets
    `,
  },
  {
    id: '3',
    title: 'Managing Properties',
    description: 'Add, edit, and organize your property listings',
    category: 'features',
    tags: ['properties', 'listings', 'management'],
    content: `
# Managing Properties

Efficiently manage all your property listings in one place.

## Adding Properties
1. Click "Add Property" button
2. Fill in required information (address, price, etc.)
3. Upload photos and documents
4. Click "Save" to publish

## Editing Properties
1. Find the property in your list
2. Click the edit icon or property card
3. Update any information
4. Save your changes

## Property Status
- **Active**: Currently available for sale/rent
- **Pending**: Under contract or negotiation
- **Sold/Rented**: Transaction completed
- **Archived**: No longer active

## Tips
- Keep photos high quality and up-to-date
- Update status promptly to avoid confusion
- Use tags for easy categorization
    `,
  },
  {
    id: '4',
    title: 'Understanding Data Tables',
    description: 'Learn how to sort, filter, and export data from tables',
    category: 'features',
    tags: ['tables', 'data', 'export'],
    content: `
# Understanding Data Tables

Data tables provide powerful ways to view and manage your information.

## Sorting
- Click any column header to sort
- Click again to reverse sort order
- Hold Shift to sort by multiple columns

## Filtering
- Use the search box for quick filtering
- Click "Filters" for advanced filtering
- Active filters show as chips below the table

## Row Selection
- Click checkboxes to select rows
- Use "Select All" to select all visible rows
- Perform bulk actions on selected rows

## Pagination
- Choose rows per page (10, 20, 30, 40, 50)
- Navigate with First, Previous, Next, Last buttons
- See current page and total pages

## Column Visibility
- Click "Columns" dropdown
- Check/uncheck to show/hide columns
- Customize your view for your workflow

## Mobile View
- Tables automatically switch to card view on mobile
- Swipe to see more information
- Tap cards to view full details
    `,
  },
  {
    id: '5',
    title: 'Troubleshooting Common Issues',
    description: 'Solutions to frequently encountered problems',
    category: 'troubleshooting',
    tags: ['help', 'issues', 'problems'],
    content: `
# Troubleshooting Common Issues

## Data Not Loading
1. Check your internet connection
2. Refresh the page (Ctrl/Cmd + R)
3. Clear browser cache and cookies
4. Try a different browser

## Charts Not Displaying
1. Ensure you have data for the selected time period
2. Try changing the date range
3. Check if filters are too restrictive
4. Refresh the page

## Filters Not Working
1. Verify all filter conditions are complete
2. Check that field values match your data
3. Try clearing and recreating the filter
4. Ensure you clicked "Apply Filters"

## Can't Save Changes
1. Check all required fields are filled
2. Verify you have proper permissions
3. Check for validation errors (red highlights)
4. Try saving again after a few seconds

## Performance Issues
1. Close unused browser tabs
2. Clear browser cache
3. Reduce number of active filters
4. Try using a smaller date range

If problems persist, contact support.
    `,
  },
  {
    id: '6',
    title: 'Frequently Asked Questions',
    description: 'Quick answers to common questions',
    category: 'faq',
    tags: ['faq', 'questions', 'answers'],
    content: `
# Frequently Asked Questions

## General

**Q: How do I change my password?**
A: Go to Settings > Security > Change Password

**Q: Can I customize my dashboard?**
A: Yes, you can rearrange widgets and choose which ones to display

**Q: How do I export data?**
A: Click the Export button on any table or report

## Properties

**Q: How many properties can I list?**
A: There's no limit on the number of properties you can manage

**Q: Can I bulk upload properties?**
A: Yes, use the Import feature with a CSV file

**Q: How do I archive old listings?**
A: Change the property status to "Archived"

## Data & Reports

**Q: How often is data updated?**
A: Data is updated in real-time as changes occur

**Q: Can I schedule reports?**
A: Yes, go to Reports > Schedule to set up automated reports

**Q: How far back does historical data go?**
A: All historical data is retained indefinitely

## Support

**Q: How do I contact support?**
A: Click the help icon and select "Contact Support"

**Q: What are your support hours?**
A: 24/7 for critical issues, business hours for general inquiries

**Q: Is there a mobile app?**
A: The web app is fully responsive and works on mobile browsers
    `,
  },
];

const videoTutorials = [
  {
    id: '1',
    title: 'Platform Overview (5 min)',
    description: 'Quick tour of the main features and navigation',
    thumbnail: '/images/VideoTutorial.jpg',
    duration: '5:23',
    url: '#',
  },
  {
    id: '2',
    title: 'Creating Your First Property Listing (8 min)',
    description: 'Step-by-step guide to adding a new property',
    thumbnail: '/images/PropertyListing.jpg',
    duration: '8:15',
    url: '#',
  },
  {
    id: '3',
    title: 'Advanced Filtering Techniques (6 min)',
    description: 'Master complex filters and saved presets',
    thumbnail: '/images/Filtering.jpg',
    duration: '6:42',
    url: '#',
  },
];

export const HelpModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  const filteredArticles = helpArticles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const articlesByCategory = {
    'getting-started': filteredArticles.filter((a) => a.category === 'getting-started'),
    features: filteredArticles.filter((a) => a.category === 'features'),
    troubleshooting: filteredArticles.filter((a) => a.category === 'troubleshooting'),
    faq: filteredArticles.filter((a) => a.category === 'faq'),
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <HelpCircle className="h-4 w-4 mr-2" />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Help Center</DialogTitle>
          <DialogDescription>
            Find answers, watch tutorials, and get support
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {selectedArticle ? (
            // Article View
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedArticle(null)}
              >
                ← Back to Help Center
              </Button>
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedArticle.title}</h2>
                <div className="flex gap-2 mb-4">
                  {selectedArticle.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedArticle.content
                        .split('\n')
                        .map((line) => {
                          if (line.startsWith('# ')) {
                            return `<h1>${line.substring(2)}</h1>`;
                          }
                          if (line.startsWith('## ')) {
                            return `<h2>${line.substring(3)}</h2>`;
                          }
                          if (line.startsWith('- ')) {
                            return `<li>${line.substring(2)}</li>`;
                          }
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return `<p><strong>${line.slice(2, -2)}</strong></p>`;
                          }
                          return line ? `<p>${line}</p>` : '';
                        })
                        .join(''),
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Main Help View
            <Tabs defaultValue="articles" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="articles">
                  <Book className="h-4 w-4 mr-2" />
                  Articles
                </TabsTrigger>
                <TabsTrigger value="videos">
                  <Video className="h-4 w-4 mr-2" />
                  Videos
                </TabsTrigger>
                <TabsTrigger value="contact">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact
                </TabsTrigger>
              </TabsList>

              <TabsContent value="articles" className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search help articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="space-y-6">
                  {Object.entries(articlesByCategory).map(([category, articles]) => {
                    if (articles.length === 0) return null;

                    const categoryLabels = {
                      'getting-started': 'Getting Started',
                      features: 'Features',
                      troubleshooting: 'Troubleshooting',
                      faq: 'FAQ',
                    };

                    return (
                      <div key={category} className="space-y-3">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                          {categoryLabels[category as keyof typeof categoryLabels]}
                        </h3>
                        <div className="grid gap-3">
                          {articles.map((article) => (
                            <Card
                              key={article.id}
                              className="cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => setSelectedArticle(article)}
                            >
                              <CardHeader className="p-4">
                                <CardTitle className="text-base">
                                  {article.title}
                                </CardTitle>
                                <CardDescription>{article.description}</CardDescription>
                              </CardHeader>
                            </Card>
                          ))}
                        </div>
                        <Separator />
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="videos" className="space-y-4">
                <div className="grid gap-4">
                  {videoTutorials.map((video) => (
                    <Card key={video.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="w-32 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <Video className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{video.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {video.description}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{video.duration}</Badge>
                              <Button variant="link" size="sm" className="p-0 h-auto">
                                Watch Now
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Support</CardTitle>
                    <CardDescription>
                      Our support team is here to help you
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div className="flex items-start gap-3">
                        <MessageCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <h4 className="font-semibold mb-1">Live Chat</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Chat with our support team in real-time
                          </p>
                          <Button size="sm">Start Chat</Button>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-start gap-3">
                        <Book className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <h4 className="font-semibold mb-1">Email Support</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            support@realestate-platform.com
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Response time: Within 24 hours
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-start gap-3">
                        <ExternalLink className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <h4 className="font-semibold mb-1">Community Forum</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Connect with other users and share tips
                          </p>
                          <Button variant="outline" size="sm">
                            Visit Forum
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};