import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUsernameSearch } from '@/contexts/UsernameSearchContext';
import { AssignmentRecord, CSPRUser, TaskGroup } from '@/types/username';
import UsernameSearchBar from '@/components/search/UsernameSearchBar';
import {
  Calendar,
  Clock,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  Plus,
  Filter,
  Users,
  Home,
  Briefcase
} from 'lucide-react';

export default function AssignmentManager() {
  const {
    assignments,
    taskGroups,
    createAssignment,
    updateAssignment,
    createTaskGroup,
    addAssignmentToGroup,
    currentUser,
    getUserAssignments
  } = useUsernameSearch();

  const [activeTab, setActiveTab] = useState('my-assignments');
  const [selectedUser, setSelectedUser] = useState<CSPRUser | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    assignment_type: 'property' as AssignmentRecord['assignment_type'],
    target_id: '',
    target_type: '',
    priority: 'medium' as AssignmentRecord['priority'],
    due_date: '',
    start_date: '',
    notes: ''
  });
  const [newGroupName, setNewGroupName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Get assignments for current user
  const myAssignments = currentUser ? getUserAssignments(currentUser.id) : [];
  const assignedToMe = myAssignments.filter(a => a.assigned_to === currentUser?.id);
  const assignedByMe = myAssignments.filter(a => a.assigned_by === currentUser?.id);

  const handleUserSelect = (user: CSPRUser) => {
    setSelectedUser(user);
  };

  const handleCreateAssignment = async () => {
    if (!selectedUser) return;

    try {
      await createAssignment({
        assigned_to_username: selectedUser.username_alias,
        assignment_type: assignmentForm.assignment_type,
        target_id: assignmentForm.target_id,
        target_type: assignmentForm.target_type,
        priority: assignmentForm.priority,
        due_date: assignmentForm.due_date ? new Date(assignmentForm.due_date) : undefined,
        start_date: assignmentForm.start_date ? new Date(assignmentForm.start_date) : undefined,
        notes: assignmentForm.notes
      });

      // Reset form
      setSelectedUser(null);
      setAssignmentForm({
        assignment_type: 'property',
        target_id: '',
        target_type: '',
        priority: 'medium',
        due_date: '',
        start_date: '',
        notes: ''
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create assignment:', error);
    }
  };

  const handleUpdateAssignmentStatus = async (assignmentId: string, status: AssignmentRecord['status']) => {
    try {
      await updateAssignment(assignmentId, { status });
    } catch (error) {
      console.error('Failed to update assignment:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      await createTaskGroup(newGroupName);
      setNewGroupName('');
    } catch (error) {
      console.error('Failed to create task group:', error);
    }
  };

  const getStatusIcon = (status: AssignmentRecord['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'declined':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: AssignmentRecord['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssignmentTypeIcon = (type: AssignmentRecord['assignment_type']) => {
    switch (type) {
      case 'property':
        return <Home className="h-4 w-4" />;
      case 'transaction_task':
        return <Briefcase className="h-4 w-4" />;
      case 'client_management':
        return <Users className="h-4 w-4" />;
      case 'document_review':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Assignment Manager</h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          New Assignment
        </Button>
      </div>

      {/* Create Assignment Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Assign To</Label>
              <UsernameSearchBar
                onUserSelect={handleUserSelect}
                placeholder="Search for user to assign (@username or CSPR.name)"
              />
              {selectedUser && (
                <div className="mt-2 p-2 bg-blue-50 rounded flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{selectedUser.display_name}</span>
                  <Badge variant="outline">{selectedUser.username_alias}</Badge>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Assignment Type</Label>
                <Select
                  value={assignmentForm.assignment_type}
                  onValueChange={(value) => setAssignmentForm(prev => ({ 
                    ...prev, 
                    assignment_type: value as AssignmentRecord['assignment_type']
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="property">Property Management</SelectItem>
                    <SelectItem value="transaction_task">Transaction Task</SelectItem>
                    <SelectItem value="client_management">Client Management</SelectItem>
                    <SelectItem value="document_review">Document Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={assignmentForm.priority}
                  onValueChange={(value) => setAssignmentForm(prev => ({ 
                    ...prev, 
                    priority: value as AssignmentRecord['priority']
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Start Date</Label>
                <input
                  type="date"
                  value={assignmentForm.start_date}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <Label>Due Date</Label>
                <input
                  type="date"
                  value={assignmentForm.due_date}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={assignmentForm.notes}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes or instructions..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateAssignment} disabled={!selectedUser}>
                Create Assignment
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="my-assignments">My Assignments</TabsTrigger>
          <TabsTrigger value="assigned-by-me">Assigned by Me</TabsTrigger>
          <TabsTrigger value="task-groups">Task Groups</TabsTrigger>
          <TabsTrigger value="all-assignments">All Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="my-assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Assignments for Me ({assignedToMe.length})</h2>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          <div className="grid gap-4">
            {assignedToMe.map((assignment) => (
              <Card key={assignment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getAssignmentTypeIcon(assignment.assignment_type)}
                      <div className="flex-1">
                        <h3 className="font-semibold capitalize">
                          {assignment.assignment_type.replace('_', ' ')}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{assignment.notes}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          {assignment.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Due: {assignment.due_date.toLocaleDateString()}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>Assigned by: {assignment.assigned_by}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(assignment.priority)}>
                        {assignment.priority}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(assignment.status)}
                        <span className="text-sm capitalize">{assignment.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    {assignment.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateAssignmentStatus(assignment.id, 'in_progress')}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateAssignmentStatus(assignment.id, 'declined')}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                    {assignment.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateAssignmentStatus(assignment.id, 'completed')}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assigned-by-me" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Assignments I Created ({assignedByMe.length})</h2>
          </div>

          <div className="grid gap-4">
            {assignedByMe.map((assignment) => (
              <Card key={assignment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getAssignmentTypeIcon(assignment.assignment_type)}
                      <div className="flex-1">
                        <h3 className="font-semibold capitalize">
                          {assignment.assignment_type.replace('_', ' ')}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{assignment.notes}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>Assigned to: {assignment.assigned_to}</span>
                          </div>
                          {assignment.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Due: {assignment.due_date.toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(assignment.priority)}>
                        {assignment.priority}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(assignment.status)}
                        <span className="text-sm capitalize">{assignment.status}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="task-groups" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Task Groups ({taskGroups.length})</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
              <Button onClick={handleCreateGroup}>Create Group</Button>
            </div>
          </div>

          <div className="grid gap-4">
            {taskGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{group.name}</span>
                    <Badge variant="outline">{group.assignments.length} assignments</Badge>
                  </CardTitle>
                  {group.description && (
                    <p className="text-sm text-gray-600">{group.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.assignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {getAssignmentTypeIcon(assignment.assignment_type)}
                          <span className="font-medium capitalize">
                            {assignment.assignment_type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(assignment.status)}
                          <span className="text-sm">{assignment.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="all-assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">All Assignments ({assignments.length})</h2>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          <div className="grid gap-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getAssignmentTypeIcon(assignment.assignment_type)}
                      <div className="flex-1">
                        <h3 className="font-semibold capitalize">
                          {assignment.assignment_type.replace('_', ' ')}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{assignment.notes}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>From: {assignment.assigned_by} → To: {assignment.assigned_to}</span>
                          </div>
                          {assignment.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Due: {assignment.due_date.toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(assignment.priority)}>
                        {assignment.priority}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(assignment.status)}
                        <span className="text-sm capitalize">{assignment.status}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}