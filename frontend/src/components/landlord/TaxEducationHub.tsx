import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { BookOpen, Download, ExternalLink, Search, CheckSquare, FileText, Video, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EducationArticle {
  id: string;
  title: string;
  category: 'deductions' | 'depreciation' | 'compliance' | '1031-exchanges';
  description: string;
  readTime: number;
  type: 'article' | 'guide' | 'video' | 'checklist';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

const EDUCATION_CONTENT: EducationArticle[] = [
  {
    id: '1',
    title: 'Complete Guide to Rental Property Deductions',
    category: 'deductions',
    description: 'Learn about all the deductions available to landlords, from mortgage interest to travel expenses.',
    readTime: 15,
    type: 'guide',
    difficulty: 'beginner',
    tags: ['deductions', 'expenses', 'tax savings'],
  },
  {
    id: '2',
    title: 'Understanding Depreciation for Rental Properties',
    category: 'depreciation',
    description: 'Master the concept of depreciation and how to calculate it for your rental properties.',
    readTime: 12,
    type: 'article',
    difficulty: 'intermediate',
    tags: ['depreciation', 'MACRS', 'cost recovery'],
  },
  {
    id: '3',
    title: 'Repairs vs. Improvements: Tax Treatment',
    category: 'deductions',
    description: 'Understand the critical difference between repairs and improvements for tax purposes.',
    readTime: 8,
    type: 'article',
    difficulty: 'beginner',
    tags: ['repairs', 'improvements', 'capitalization'],
  },
  {
    id: '4',
    title: 'Schedule E Filing Walkthrough',
    category: 'compliance',
    description: 'Step-by-step guide to completing Schedule E for your rental income and expenses.',
    readTime: 20,
    type: 'guide',
    difficulty: 'intermediate',
    tags: ['Schedule E', 'filing', 'IRS forms'],
  },
  {
    id: '5',
    title: '1031 Exchange Strategy Guide',
    category: '1031-exchanges',
    description: 'Learn how to defer capital gains taxes using a 1031 exchange when selling investment property.',
    readTime: 25,
    type: 'guide',
    difficulty: 'advanced',
    tags: ['1031 exchange', 'capital gains', 'like-kind'],
  },
  {
    id: '6',
    title: 'Tax Compliance Checklist for Landlords',
    category: 'compliance',
    description: 'Essential checklist to ensure you\'re meeting all tax obligations as a landlord.',
    readTime: 5,
    type: 'checklist',
    difficulty: 'beginner',
    tags: ['compliance', 'deadlines', 'requirements'],
  },
  {
    id: '7',
    title: 'Passive Activity Loss Rules Explained',
    category: 'compliance',
    description: 'Understanding passive activity loss limitations and how they affect rental property owners.',
    readTime: 18,
    type: 'article',
    difficulty: 'advanced',
    tags: ['passive losses', 'limitations', 'AGI'],
  },
  {
    id: '8',
    title: 'Home Office Deduction for Landlords',
    category: 'deductions',
    description: 'How to claim home office deductions when managing your rental properties.',
    readTime: 10,
    type: 'article',
    difficulty: 'intermediate',
    tags: ['home office', 'deductions', 'business use'],
  },
  {
    id: '9',
    title: 'Depreciation Recapture: What You Need to Know',
    category: 'depreciation',
    description: 'Learn about depreciation recapture and its tax implications when selling rental property.',
    readTime: 15,
    type: 'article',
    difficulty: 'advanced',
    tags: ['recapture', 'sale', 'capital gains'],
  },
  {
    id: '10',
    title: 'Video: Tax Planning Strategies for Landlords',
    category: 'compliance',
    description: 'Watch this comprehensive video on year-round tax planning strategies.',
    readTime: 30,
    type: 'video',
    difficulty: 'intermediate',
    tags: ['planning', 'strategies', 'year-round'],
  },
];

const CHECKLISTS = [
  {
    id: 'year-end',
    title: 'Year-End Tax Checklist',
    description: 'Essential tasks to complete before December 31st',
    items: [
      'Review all income and expense records',
      'Gather receipts and documentation',
      'Calculate depreciation for the year',
      'Review estimated tax payments',
      'Plan for next year\'s estimated taxes',
      'Consider year-end property improvements',
      'Review passive activity loss carryovers',
    ],
  },
  {
    id: 'deduction-maximizer',
    title: 'Deduction Maximizer Checklist',
    description: 'Ensure you\'re claiming all eligible deductions',
    items: [
      'Mortgage interest payments',
      'Property tax payments',
      'Insurance premiums',
      'Repairs and maintenance',
      'Property management fees',
      'Utilities (if landlord-paid)',
      'Advertising and marketing',
      'Legal and professional fees',
      'Travel expenses for property management',
      'Home office expenses',
      'Depreciation',
    ],
  },
  {
    id: 'quarterly',
    title: 'Quarterly Tax Review Checklist',
    description: 'Stay on track with quarterly reviews',
    items: [
      'Review income received',
      'Categorize all expenses',
      'Update depreciation schedules',
      'Calculate estimated tax payment',
      'Submit estimated tax payment',
      'Review cash flow projections',
      'Update financial records',
    ],
  },
];

export default function TaxEducationHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();

  const filteredArticles = EDUCATION_CONTENT.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDownloadChecklist = (checklistId: string) => {
    toast({
      title: "Downloading Checklist",
      description: "Your checklist is being prepared for download...",
    });
  };

  const handleReadArticle = (articleId: string) => {
    toast({
      title: "Opening Article",
      description: "Article content would open here in a full implementation.",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'checklist':
        return <CheckSquare className="h-4 w-4" />;
      case 'guide':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-green-600" />
            <CardTitle>Tax Education Hub</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Expand your tax knowledge with articles, guides, videos, and downloadable checklists.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="articles" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="articles">Articles & Guides</TabsTrigger>
              <TabsTrigger value="checklists">Checklists</TabsTrigger>
            </TabsList>

            <TabsContent value="articles" className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search articles, guides, and videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={selectedCategory === 'deductions' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('deductions')}
                  >
                    Deductions
                  </Button>
                  <Button
                    variant={selectedCategory === 'depreciation' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('depreciation')}
                  >
                    Depreciation
                  </Button>
                  <Button
                    variant={selectedCategory === 'compliance' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('compliance')}
                  >
                    Compliance
                  </Button>
                  <Button
                    variant={selectedCategory === '1031-exchanges' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('1031-exchanges')}
                  >
                    1031
                  </Button>
                </div>
              </div>

              {/* Articles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArticles.map(article => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(article.type)}
                          <Badge variant="outline" className="text-xs">
                            {article.type}
                          </Badge>
                        </div>
                        <Badge className={getDifficultyColor(article.difficulty)}>
                          {article.difficulty}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mt-2">{article.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{article.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{article.readTime} min read</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {article.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => handleReadArticle(article.id)}
                      >
                        {article.type === 'video' ? 'Watch' : 'Read'} {article.type === 'checklist' ? 'Checklist' : article.type === 'guide' ? 'Guide' : 'Article'}
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredArticles.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No articles found matching your search.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="checklists" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CHECKLISTS.map(checklist => (
                  <Card key={checklist.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">{checklist.title}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">{checklist.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        {checklist.items.slice(0, 5).map((item, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <CheckSquare className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                        {checklist.items.length > 5 && (
                          <p className="text-xs text-muted-foreground ml-6">
                            +{checklist.items.length - 5} more items
                          </p>
                        )}
                      </div>
                      <Button
                        className="w-full"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadChecklist(checklist.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Checklist
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}