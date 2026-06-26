import { useState } from 'react';
import { Plus, Edit2, Trash2, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/use-toast';

const COLORS = [
  { name: 'Blue', value: 'bg-blue-100 text-blue-800 border-blue-200' },
  { name: 'Green', value: 'bg-green-100 text-green-800 border-green-200' },
  { name: 'Purple', value: 'bg-purple-100 text-purple-800 border-purple-200' },
  { name: 'Orange', value: 'bg-orange-100 text-orange-800 border-orange-200' },
  { name: 'Pink', value: 'bg-pink-100 text-pink-800 border-pink-200' },
  { name: 'Yellow', value: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
];

export default function ShortlistManager() {
  const { shortlists, createShortlist, deleteShortlist, updateShortlist } = useFavorites();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0].value);

  const handleCreate = () => {
    if (!name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for your shortlist.',
        variant: 'destructive',
      });
      return;
    }

    createShortlist(name, description, color);
    toast({
      title: 'Shortlist Created',
      description: `"${name}" has been created successfully.`,
    });

    // Reset form
    setName('');
    setDescription('');
    setColor(COLORS[0].value);
    setIsCreateOpen(false);
  };

  const handleUpdate = () => {
    if (!editingId || !name.trim()) return;

    updateShortlist(editingId, { name, description, color });
    toast({
      title: 'Shortlist Updated',
      description: `"${name}" has been updated successfully.`,
    });

    // Reset form
    setEditingId(null);
    setName('');
    setDescription('');
    setColor(COLORS[0].value);
  };

  const handleDelete = (id: string, listName: string) => {
    deleteShortlist(id);
    toast({
      title: 'Shortlist Deleted',
      description: `"${listName}" has been deleted.`,
    });
  };

  const startEdit = (id: string, listName: string, listDescription: string, listColor: string) => {
    setEditingId(id);
    setName(listName);
    setDescription(listDescription);
    setColor(listColor);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setColor(COLORS[0].value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Shortlists</CardTitle>
            <CardDescription>Organize agents into custom lists</CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Shortlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Shortlist</DialogTitle>
                <DialogDescription>
                  Create a custom list to organize your favorite agents
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Shortlist Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Top Luxury Agents"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description for this shortlist"
                    rows={3}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Color Theme</Label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${c.value}`} />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Create Shortlist
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {shortlists.length === 0 ? (
          <div className="text-center py-12">
            <FolderPlus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Shortlists Yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first shortlist to organize agents
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {shortlists.map((list) => (
              <Card key={list.id} className={`border-2 ${list.color}`}>
                <CardContent className="p-4">
                  {editingId === list.id ? (
                    <div className="space-y-4">
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Shortlist name"
                      />
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description"
                        rows={2}
                      />
                      <Select value={color} onValueChange={setColor}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLORS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded ${c.value}`} />
                                {c.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button onClick={handleUpdate} size="sm">
                          Save
                        </Button>
                        <Button onClick={cancelEdit} variant="outline" size="sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-lg">{list.name}</h4>
                          <Badge variant="secondary">
                            {list.agentIds.length} {list.agentIds.length === 1 ? 'agent' : 'agents'}
                          </Badge>
                        </div>
                        {list.description && (
                          <p className="text-sm text-gray-600 mb-2">{list.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Created {new Date(list.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(list.id, list.name, list.description, list.color)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(list.id, list.name)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}