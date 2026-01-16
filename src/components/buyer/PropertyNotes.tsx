import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  FileText,
  Plus,
  Star,
  Tag,
  Edit,
  Trash2,
  Search,
  X,
} from 'lucide-react';

interface PropertyNote {
  id: string;
  propertyId: string;
  propertyTitle: string;
  note: string;
  rating: {
    overall: number;
    location: number;
    condition: number;
    value: number;
    neighborhood: number;
  };
  tags: string[];
  createdDate: string;
  updatedDate: string;
}

interface PropertyNotesProps {
  propertyId?: string;
  propertyTitle?: string;
}

export function PropertyNotes({ propertyId, propertyTitle }: PropertyNotesProps) {
  const [notes, setNotes] = useState<PropertyNote[]>([
    {
      id: '1',
      propertyId: '1',
      propertyTitle: 'Modern Family Home in Suburbs',
      note: 'Great location near schools. Kitchen needs updating but has good bones. Backyard is perfect for kids.',
      rating: {
        overall: 4,
        location: 5,
        condition: 3,
        value: 4,
        neighborhood: 5,
      },
      tags: ['family-friendly', 'needs-work', 'good-value'],
      createdDate: '2024-01-15',
      updatedDate: '2024-01-15',
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<PropertyNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newNote, setNewNote] = useState<Partial<PropertyNote>>({
    note: '',
    rating: {
      overall: 3,
      location: 3,
      condition: 3,
      value: 3,
      neighborhood: 3,
    },
    tags: [],
  });
  const [newTag, setNewTag] = useState('');

  const handleSaveNote = () => {
    if (!newNote.note) {
      alert('Please enter a note');
      return;
    }

    if (editingNote) {
      // Update existing note
      setNotes((prev) =>
        prev.map((note) =>
          note.id === editingNote.id
            ? {
                ...note,
                note: newNote.note || '',
                rating: newNote.rating || note.rating,
                tags: newNote.tags || note.tags,
                updatedDate: new Date().toISOString().split('T')[0],
              }
            : note
        )
      );
      setEditingNote(null);
    } else {
      // Create new note
      const note: PropertyNote = {
        id: Date.now().toString(),
        propertyId: propertyId || 'unknown',
        propertyTitle: propertyTitle || 'Unknown Property',
        note: newNote.note || '',
        rating: newNote.rating || {
          overall: 3,
          location: 3,
          condition: 3,
          value: 3,
          neighborhood: 3,
        },
        tags: newNote.tags || [],
        createdDate: new Date().toISOString().split('T')[0],
        updatedDate: new Date().toISOString().split('T')[0],
      };
      setNotes((prev) => [...prev, note]);
    }

    setNewNote({
      note: '',
      rating: {
        overall: 3,
        location: 3,
        condition: 3,
        value: 3,
        neighborhood: 3,
      },
      tags: [],
    });
    setShowAddForm(false);
  };

  const handleEditNote = (note: PropertyNote) => {
    setEditingNote(note);
    setNewNote({
      note: note.note,
      rating: note.rating,
      tags: note.tags,
    });
    setShowAddForm(true);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
  };

  const handleAddTag = () => {
    if (newTag && !newNote.tags?.includes(newTag)) {
      setNewNote({
        ...newNote,
        tags: [...(newNote.tags || []), newTag],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewNote({
      ...newNote,
      tags: newNote.tags?.filter((t) => t !== tag) || [],
    });
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (value: number) => void;
    label: string;
  }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`w-5 h-5 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Property Notes & Ratings
              </CardTitle>
              <CardDescription>
                Keep track of your thoughts and ratings for each property
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search notes, properties, or tags..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Add/Edit Note Form */}
          {showAddForm && (
            <Card className="mb-6 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingNote ? 'Edit Note' : 'Add New Note'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="note-text">Your Notes</Label>
                  <Textarea
                    id="note-text"
                    placeholder="Write your thoughts about this property..."
                    rows={4}
                    value={newNote.note}
                    onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Rate This Property</Label>
                  <div className="space-y-2 bg-white p-4 rounded-lg">
                    <StarRating
                      label="Overall"
                      value={newNote.rating?.overall || 3}
                      onChange={(value) =>
                        setNewNote({
                          ...newNote,
                          rating: { ...newNote.rating!, overall: value },
                        })
                      }
                    />
                    <StarRating
                      label="Location"
                      value={newNote.rating?.location || 3}
                      onChange={(value) =>
                        setNewNote({
                          ...newNote,
                          rating: { ...newNote.rating!, location: value },
                        })
                      }
                    />
                    <StarRating
                      label="Condition"
                      value={newNote.rating?.condition || 3}
                      onChange={(value) =>
                        setNewNote({
                          ...newNote,
                          rating: { ...newNote.rating!, condition: value },
                        })
                      }
                    />
                    <StarRating
                      label="Value"
                      value={newNote.rating?.value || 3}
                      onChange={(value) =>
                        setNewNote({
                          ...newNote,
                          rating: { ...newNote.rating!, value: value },
                        })
                      }
                    />
                    <StarRating
                      label="Neighborhood"
                      value={newNote.rating?.neighborhood || 3}
                      onChange={(value) =>
                        setNewNote({
                          ...newNote,
                          rating: { ...newNote.rating!, neighborhood: value },
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      id="tags"
                      placeholder="Add a tag (e.g., must-see, needs-work)"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddTag}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newNote.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveNote}>
                    {editingNote ? 'Update Note' : 'Save Note'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingNote(null);
                      setNewNote({
                        note: '',
                        rating: {
                          overall: 3,
                          location: 3,
                          condition: 3,
                          value: 3,
                          neighborhood: 3,
                        },
                        tags: [],
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes List */}
          <div className="space-y-4">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No notes yet</p>
                <p className="text-sm text-gray-500">
                  Start adding notes to keep track of your property evaluations
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{note.propertyTitle}</h3>
                        <p className="text-sm text-gray-600">
                          Last updated: {new Date(note.updatedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditNote(note)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4">{note.note}</p>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Overall</p>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < note.rating.overall
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Location</p>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < note.rating.location
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Condition</p>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < note.rating.condition
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Value</p>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < note.rating.value
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Neighborhood</p>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < note.rating.neighborhood
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {note.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}