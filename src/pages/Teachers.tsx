import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, GraduationCap, Pencil, Trash2 } from 'lucide-react';
import api from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { schoolService, type School } from '@/services/schools';
import { authService } from '@/services/auth';

interface TeacherUser {
  id: number;
  email: string;
  name?: string | null;
  school_id?: number | null;
  school_name?: string | null;
}

export function Teachers() {
  const [items, setItems] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [schoolId, setSchoolId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherUser | null>(null);
  const { toast } = useToast();
  const user = authService.getCurrentUser();
  const isSchoolAdmin = user?.role === 'school_admin';

  const loadTeachers = async () => {
    try {
      const resp = await api.get<any[]>('/users/exam-owners/');
      const all = Array.isArray(resp.data) ? resp.data : [];
      const teachers = all.filter((u: any) => (u.role || '').toLowerCase() === 'teacher');
      setItems(
        teachers.map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          school_id: u.school_id ?? null,
          school_name: u.school_name,
        })),
      );
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.response?.data?.detail || 'Failed to load teachers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadTeachers();
    schoolService.getAll().then(setSchools).catch(() => setSchools([]));
  }, [toast]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setSchoolId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || (!editingTeacher && !password.trim())) {
      toast({
        title: 'Validation',
        description: 'Email and password are required',
        variant: 'destructive',
      });
      return;
    }
    if (password && password.length < 8) {
      toast({
        title: 'Validation',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }
    if (!isSchoolAdmin && !editingTeacher && !schoolId) {
      toast({
        title: 'Validation',
        description: 'School is required',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      if (editingTeacher) {
        await api.patch(`/auth/teachers/${editingTeacher.id}/`, {
          email: email.trim(),
          name: name.trim() || undefined,
          // Super Admin may move teachers; School Admin cannot change school
          school_id:
            !isSchoolAdmin && schoolId
              ? parseInt(schoolId, 10)
              : undefined,
          password: password || undefined,
        });
        toast({ title: 'Success', description: 'Teacher updated.' });
      } else {
        await schoolService.createTeacher({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          school_id: isSchoolAdmin ? undefined : schoolId ? parseInt(schoolId, 10) : undefined,
        });
        toast({ title: 'Success', description: 'Teacher created.' });
      }
      setDialogOpen(false);
      resetForm();
      setEditingTeacher(null);
      setLoading(true);
      await loadTeachers();
    } catch (e: any) {
      const data = e.response?.data;
      const msg =
        data?.email?.[0] || data?.error || data?.detail || 'Failed to save Teacher';
      toast({ title: 'Error', description: String(msg), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasAny = items.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher</h1>
          <p className="text-muted-foreground mt-2">
            Manage teachers for your schools.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTeacher(null);
            resetForm();
            setDialogOpen(true);
          }}
        >
          <GraduationCap className="h-4 w-4 mr-2" />
          Create Teacher
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <CardDescription>List of created teachers.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasAny ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No teachers created yet.</p>
              <Button
                onClick={() => {
                  setEditingTeacher(null);
                  resetForm();
                  setDialogOpen(true);
                }}
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Create Teacher
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.name || '—'}</TableCell>
                    <TableCell>{u.school_name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTeacher(u);
                            setEmail(u.email);
                            setName(u.name || '');
                            setSchoolId(u.school_id ? String(u.school_id) : '');
                            setPassword('');
                            setDialogOpen(true);
                          }}
                          title="View / Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(u)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingTeacher(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeacher ? 'View / Edit Teacher' : 'Create Teacher'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="t-email">Email *</Label>
              <Input
                id="t-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-password">
                {editingTeacher ? 'New Password (optional)' : 'Password *'}
              </Label>
              <Input
                id="t-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                minLength={8}
                required={!editingTeacher}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-name">Name (optional)</Label>
              <Input
                id="t-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
              />
            </div>
            {!isSchoolAdmin && (
              <div className="space-y-2">
                <Label>School *</Label>
                <Select value={schoolId} onValueChange={setSchoolId} required={!editingTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isSchoolAdmin && (
              <p className="text-sm text-muted-foreground">
                Teacher will be assigned to your school.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingTeacher ? 'Save' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Teacher</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{deleteTarget?.email}</span>? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await api.delete(`/auth/teachers/${deleteTarget.id}/`);
                  toast({ title: 'Deleted', description: 'Teacher deleted.' });
                  setDeleteTarget(null);
                  setLoading(true);
                  await loadTeachers();
                } catch (e: any) {
                  toast({
                    title: 'Error',
                    description:
                      e.response?.data?.error ||
                      e.response?.data?.detail ||
                      'Failed to delete Teacher',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

