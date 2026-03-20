import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { schoolService, type School } from '@/services/schools';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

export function Schools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const data = await schoolService.getAll();
      setSchools(data);
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.response?.data?.error || 'Failed to load schools',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: 'Validation', description: 'School name is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingSchool) {
        await schoolService.update(editingSchool.id, { name: trimmed });
        toast({ title: 'Success', description: 'School updated.' });
      } else {
        await schoolService.create({ name: trimmed });
        toast({ title: 'Success', description: 'School created.' });
      }
      setDialogOpen(false);
      setName('');
      setEditingSchool(null);
      loadSchools();
    } catch (e: any) {
      const msg =
        e.response?.data?.name?.[0] ||
        e.response?.data?.detail ||
        e.response?.data?.error ||
        'Failed to save school';
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schools</h1>
          <p className="text-muted-foreground mt-2">Manage schools (Super Admin)</p>
        </div>
        <Button
          onClick={() => {
            setEditingSchool(null);
            setName('');
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add School
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Schools</CardTitle>
          <CardDescription>{schools.length} school(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {schools.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No schools yet. Create one to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {schools.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-sm text-muted-foreground">(ID: {s.id})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingSchool(s);
                        setName(s.name);
                        setDialogOpen(true);
                      }}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(s)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingSchool(null);
            setName('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSchool ? 'Edit School' : 'Add School'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">School name</Label>
              <Input
                id="school-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ABC High School"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingSchool ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete School</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{deleteTarget?.name}</span>? This action cannot be
            undone and may affect related users or exams.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await schoolService.delete(deleteTarget.id);
                  toast({ title: 'Deleted', description: 'School deleted.' });
                  setDeleteTarget(null);
                  loadSchools();
                } catch (e: any) {
                  toast({
                    title: 'Error',
                    description:
                      e.response?.data?.detail ||
                      e.response?.data?.error ||
                      'Failed to delete school',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
