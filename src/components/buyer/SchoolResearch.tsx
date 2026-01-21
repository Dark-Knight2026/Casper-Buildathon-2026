import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  GraduationCap,
  Search,
  MapPin,
  Users,
  TrendingUp,
  Award,
  BookOpen,
  Star,
  Navigation,
  Phone,
  Globe,
  Calendar,
  DollarSign,
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  type: 'elementary' | 'middle' | 'high';
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  website: string;
  rating: number;
  enrollment: number;
  studentTeacherRatio: number;
  testScores: {
    math: number;
    reading: number;
    science: number;
  };
  demographics: {
    white: number;
    black: number;
    hispanic: number;
    asian: number;
    other: number;
  };
  programs: string[];
  sports: string[];
  clubs: string[];
  distanceFromProperty?: string;
  tuition?: number;
  publicPrivate: 'public' | 'private';
  reviews: {
    overall: number;
    academics: number;
    teachers: number;
    facilities: number;
    activities: number;
    totalReviews: number;
  };
}

const mockSchools: School[] = [
  {
    id: 'school-1',
    name: 'Downtown Elementary School',
    type: 'elementary',
    address: '123 School St',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90001',
    phone: '(555) 123-4567',
    website: 'www.downtownelem.edu',
    rating: 9,
    enrollment: 450,
    studentTeacherRatio: 18,
    testScores: {
      math: 85,
      reading: 88,
      science: 82,
    },
    demographics: {
      white: 35,
      black: 15,
      hispanic: 30,
      asian: 15,
      other: 5,
    },
    programs: ['STEM', 'Arts', 'Gifted & Talented', 'ESL', 'Special Education'],
    sports: ['Soccer', 'Basketball', 'Track & Field'],
    clubs: ['Science Club', 'Art Club', 'Chess Club', 'Drama Club'],
    distanceFromProperty: '0.5 mi',
    publicPrivate: 'public',
    reviews: {
      overall: 4.5,
      academics: 4.7,
      teachers: 4.6,
      facilities: 4.3,
      activities: 4.4,
      totalReviews: 128,
    },
  },
  {
    id: 'school-2',
    name: 'Central Middle School',
    type: 'middle',
    address: '456 Education Ave',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90002',
    phone: '(555) 234-5678',
    website: 'www.centralmiddle.edu',
    rating: 8,
    enrollment: 680,
    studentTeacherRatio: 22,
    testScores: {
      math: 78,
      reading: 82,
      science: 80,
    },
    demographics: {
      white: 30,
      black: 20,
      hispanic: 35,
      asian: 10,
      other: 5,
    },
    programs: ['Advanced Math', 'Band', 'Orchestra', 'Robotics', 'Foreign Languages'],
    sports: ['Football', 'Basketball', 'Volleyball', 'Swimming', 'Tennis'],
    clubs: ['Debate Club', 'Student Government', 'Environmental Club', 'Coding Club'],
    distanceFromProperty: '0.8 mi',
    publicPrivate: 'public',
    reviews: {
      overall: 4.2,
      academics: 4.3,
      teachers: 4.1,
      facilities: 4.0,
      activities: 4.4,
      totalReviews: 95,
    },
  },
  {
    id: 'school-3',
    name: 'City High School',
    type: 'high',
    address: '789 Academy Rd',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90003',
    phone: '(555) 345-6789',
    website: 'www.cityhigh.edu',
    rating: 9,
    enrollment: 1200,
    studentTeacherRatio: 25,
    testScores: {
      math: 82,
      reading: 85,
      science: 83,
    },
    demographics: {
      white: 32,
      black: 18,
      hispanic: 32,
      asian: 13,
      other: 5,
    },
    programs: ['AP Courses', 'IB Program', 'Career Technical Education', 'Dual Enrollment'],
    sports: [
      'Football',
      'Basketball',
      'Baseball',
      'Soccer',
      'Track',
      'Swimming',
      'Wrestling',
    ],
    clubs: [
      'National Honor Society',
      'Drama Club',
      'Yearbook',
      'Robotics',
      'Model UN',
      'Key Club',
    ],
    distanceFromProperty: '1.2 mi',
    publicPrivate: 'public',
    reviews: {
      overall: 4.6,
      academics: 4.8,
      teachers: 4.5,
      facilities: 4.4,
      activities: 4.7,
      totalReviews: 215,
    },
  },
  {
    id: 'school-4',
    name: 'Westside Preparatory Academy',
    type: 'high',
    address: '321 Private School Ln',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90004',
    phone: '(555) 456-7890',
    website: 'www.westsideprep.edu',
    rating: 10,
    enrollment: 450,
    studentTeacherRatio: 12,
    testScores: {
      math: 95,
      reading: 96,
      science: 94,
    },
    demographics: {
      white: 40,
      black: 10,
      hispanic: 20,
      asian: 25,
      other: 5,
    },
    programs: ['All AP Courses', 'College Counseling', 'Study Abroad', 'Research Programs'],
    sports: ['Soccer', 'Tennis', 'Swimming', 'Lacrosse', 'Golf'],
    clubs: [
      'Debate Team',
      'Science Olympiad',
      'Mock Trial',
      'Investment Club',
      'Community Service',
    ],
    distanceFromProperty: '2.5 mi',
    tuition: 35000,
    publicPrivate: 'private',
    reviews: {
      overall: 4.9,
      academics: 5.0,
      teachers: 4.9,
      facilities: 4.8,
      activities: 4.8,
      totalReviews: 87,
    },
  },
];

export function SchoolResearch() {
  const [schools] = useState<School[]>(mockSchools);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'elementary' | 'middle' | 'high'>('all');
  const [filterPublicPrivate, setFilterPublicPrivate] = useState<'all' | 'public' | 'private'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'enrollment'>('rating');

  const filteredSchools = schools
    .filter((school) => {
      if (filterType !== 'all' && school.type !== filterType) return false;
      if (filterPublicPrivate !== 'all' && school.publicPrivate !== filterPublicPrivate)
        return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          school.name.toLowerCase().includes(query) ||
          school.address.toLowerCase().includes(query) ||
          school.city.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'enrollment') return a.enrollment - b.enrollment;
      if (sortBy === 'distance') {
        const distA = parseFloat(a.distanceFromProperty || '999');
        const distB = parseFloat(b.distanceFromProperty || '999');
        return distA - distB;
      }
      return 0;
    });

  const getRatingColor = (rating: number) => {
    if (rating >= 9) return 'bg-green-600';
    if (rating >= 7) return 'bg-blue-600';
    if (rating >= 5) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            School District Research
          </CardTitle>
          <CardDescription>
            Explore schools near your properties with detailed ratings and information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schools..."
                className="pl-10"
              />
            </div>
            <Select
              value={filterType}
              onValueChange={(value: "all" | "elementary" | "middle" | "high") => setFilterType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All School Types</SelectItem>
                <SelectItem value="elementary">Elementary</SelectItem>
                <SelectItem value="middle">Middle School</SelectItem>
                <SelectItem value="high">High School</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterPublicPrivate}
              onValueChange={(value: "all" | "elementary" | "middle" | "high") => setFilterPublicPrivate(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Public & Private</SelectItem>
                <SelectItem value="public">Public Only</SelectItem>
                <SelectItem value="private">Private Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: "all" | "elementary" | "middle" | "high") => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Sort by Rating</SelectItem>
                <SelectItem value="distance">Sort by Distance</SelectItem>
                <SelectItem value="enrollment">Sort by Size</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schools List */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">
                Schools ({filteredSchools.length})
              </h3>
              {filteredSchools.map((school) => (
                <Card
                  key={school.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedSchool?.id === school.id ? 'border-2 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedSchool(school)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-1">{school.name}</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getRatingColor(school.rating)}>
                            {school.rating}/10
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {school.type}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {school.publicPrivate}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-semibold">{school.reviews.overall}</span>
                          <span className="text-xs">({school.reviews.totalReviews})</span>
                        </div>
                        {school.distanceFromProperty && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Navigation className="w-4 h-4" />
                            <span>{school.distanceFromProperty}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {school.address}, {school.city}, {school.state}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span>{school.enrollment} students</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4 text-gray-600" />
                        <span>{school.studentTeacherRatio}:1 ratio</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* School Details */}
            <div className="lg:sticky lg:top-6 h-fit">
              {selectedSchool ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{selectedSchool.name}</CardTitle>
                        <CardDescription className="capitalize">
                          {selectedSchool.type} School • {selectedSchool.publicPrivate}
                        </CardDescription>
                      </div>
                      <Badge className={getRatingColor(selectedSchool.rating)}>
                        {selectedSchool.rating}/10
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Contact Info */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Contact Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-600" />
                          {selectedSchool.address}, {selectedSchool.city}, {selectedSchool.state}{' '}
                          {selectedSchool.zipCode}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-600" />
                          {selectedSchool.phone}
                        </p>
                        <p className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-600" />
                          <a
                            href={`https://${selectedSchool.website}`}
                            className="text-blue-600 hover:underline"
                          >
                            {selectedSchool.website}
                          </a>
                        </p>
                        {selectedSchool.distanceFromProperty && (
                          <p className="flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-gray-600" />
                            {selectedSchool.distanceFromProperty} from property
                          </p>
                        )}
                        {selectedSchool.tuition && (
                          <p className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-600" />
                            ${selectedSchool.tuition.toLocaleString()}/year tuition
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Reviews */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Parent Reviews
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Overall</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(selectedSchool.reviews.overall / 5) * 100}%` }}
                              ></div>
                            </div>
                            <span className="font-semibold w-8">{selectedSchool.reviews.overall}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Academics</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${(selectedSchool.reviews.academics / 5) * 100}%` }}
                              ></div>
                            </div>
                            <span className="font-semibold w-8">{selectedSchool.reviews.academics}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Teachers</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full"
                                style={{ width: `${(selectedSchool.reviews.teachers / 5) * 100}%` }}
                              ></div>
                            </div>
                            <span className="font-semibold w-8">{selectedSchool.reviews.teachers}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Facilities</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-orange-600 h-2 rounded-full"
                                style={{ width: `${(selectedSchool.reviews.facilities / 5) * 100}%` }}
                              ></div>
                            </div>
                            <span className="font-semibold w-8">{selectedSchool.reviews.facilities}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Based on {selectedSchool.reviews.totalReviews} parent reviews
                        </p>
                      </div>
                    </div>

                    {/* Test Scores */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Test Scores
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Math</span>
                          <span className={`font-semibold ${getScoreColor(selectedSchool.testScores.math)}`}>
                            {selectedSchool.testScores.math}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Reading</span>
                          <span className={`font-semibold ${getScoreColor(selectedSchool.testScores.reading)}`}>
                            {selectedSchool.testScores.reading}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Science</span>
                          <span className={`font-semibold ${getScoreColor(selectedSchool.testScores.science)}`}>
                            {selectedSchool.testScores.science}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Enrollment */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Enrollment & Demographics
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Students:</span>
                          <span className="font-semibold">{selectedSchool.enrollment}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Student-Teacher Ratio:</span>
                          <span className="font-semibold">{selectedSchool.studentTeacherRatio}:1</span>
                        </div>
                      </div>
                    </div>

                    {/* Programs */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Academic Programs
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedSchool.programs.map((program) => (
                          <Badge key={program} variant="outline">
                            {program}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Sports */}
                    <div>
                      <h4 className="font-semibold mb-3">Sports & Athletics</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedSchool.sports.map((sport) => (
                          <Badge key={sport} variant="outline" className="bg-green-50">
                            {sport}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Clubs */}
                    <div>
                      <h4 className="font-semibold mb-3">Clubs & Activities</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedSchool.clubs.map((club) => (
                          <Badge key={club} variant="outline" className="bg-purple-50">
                            {club}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule a Tour
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Select a school to view details</p>
                    <p className="text-sm text-gray-500">
                      Click on any school from the list to see detailed information
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}