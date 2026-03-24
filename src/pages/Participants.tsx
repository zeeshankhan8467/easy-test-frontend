import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { participantService, Participant, ParticipantRow, PARTICIPANT_FIELDS } from '@/services/participants';
import { schoolService, School } from '@/services/schools';
import { examService, ExamOwner } from '@/services/exams';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Plus, Loader2, Trash2, Edit, Eye } from 'lucide-react';
import { authService } from '@/services/auth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL_SCHOOLS_VALUE = '__all_schools__';
const ALL_TEACHERS_VALUE = '__all_teachers__';

function buildEmptyRow(): ParticipantRow {
  const row: ParticipantRow = { name: '', clicker_id: '' };
  PARTICIPANT_FIELDS.forEach((f) => {
    if (f.key !== 'name' && f.key !== 'clicker_id') (row[f.key] = '');
  });
  return row;
}

export function Participants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewParticipant, setViewParticipant] = useState<Participant | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editParticipant, setEditParticipant] = useState<Participant | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const user = authService.getCurrentUser();
  const showOwner = user?.role === 'super_admin' || user?.role === 'school_admin';
  const showAdminFilters = user?.role === 'super_admin' || user?.role === 'school_admin';

  const [schools, setSchools] = useState<School[]>([]);
  const [examOwners, setExamOwners] = useState<ExamOwner[]>([]);
  const [filterSchoolId, setFilterSchoolId] = useState<string>(() =>
    user?.role === 'school_admin' && user.school_id != null ? String(user.school_id) : ''
  );
  const [filterTeacherId, setFilterTeacherId] = useState<string>('');

  const [createForm, setCreateForm] = useState<ParticipantRow>(() => buildEmptyRow());

  useEffect(() => {
    if (!showAdminFilters) return;
    let cancelled = false;
    (async () => {
      try {
        const [schoolList, owners] = await Promise.all([schoolService.getAll(), examService.getOwners()]);
        if (!cancelled) {
          setSchools(Array.isArray(schoolList) ? schoolList : []);
          setExamOwners(Array.isArray(owners) ? owners : []);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          toast({
            title: 'Error',
            description: 'Failed to load schools or teachers for filters',
            variant: 'destructive',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showAdminFilters]);

  const teacherOptions = useMemo(() => {
    const sid = filterSchoolId ? Number(filterSchoolId) : null;
    return examOwners
      .filter((o) => {
        if ((o.role || '').toLowerCase() !== 'teacher') return false;
        if (sid == null || Number.isNaN(sid)) return true;
        return o.school_id === sid;
      })
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [examOwners, filterSchoolId]);

  const loadParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const listParams =
        showAdminFilters && (filterSchoolId || filterTeacherId)
          ? {
              ...(filterSchoolId ? { school_id: Number(filterSchoolId) } : {}),
              ...(filterTeacherId ? { teacher_id: Number(filterTeacherId) } : {}),
            }
          : undefined;
      const data = await participantService.getAll(
        listParams && Object.keys(listParams).length ? listParams : undefined
      );
      setParticipants(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load participants:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load participants',
        variant: 'destructive',
      });
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }, [showAdminFilters, filterSchoolId, filterTeacherId, toast]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  const updateCreateForm = (field: string, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    const name = createForm.name.trim();
    const clicker_id = createForm.clicker_id.trim();
    if (!name || !clicker_id) {
      toast({ title: 'Validation', description: 'Name and Keypad ID are required.', variant: 'destructive' });
      return;
    }
    const rest: Record<string, string> = {};
    PARTICIPANT_FIELDS.forEach((f) => {
      if (f.key !== 'name' && f.key !== 'clicker_id') {
        const v = (createForm[f.key] ?? '').trim();
        if (v) rest[f.key] = v;
      }
    });
    const emailVal = rest.email_id;
    if (emailVal) delete rest.email_id;
    const payload: ParticipantRow = { name, clicker_id, ...rest };
    if (emailVal) payload.email = emailVal;
    setCreating(true);
    try {
      const result = await participantService.bulkCreate([payload]);
      toast({
        title: 'Success',
        description: result.errors.length ? `Created with warnings.` : `Participant created.`,
      });
      if (result.errors.length > 0) {
        toast({ title: 'Errors', description: result.errors.join(' '), variant: 'destructive' });
      }
      setCreateDialogOpen(false);
      setCreateForm(buildEmptyRow());
      loadParticipants();
    } catch (error: any) {
      const data = error.response?.data;
      const msg = data?.participants?.[0] || data?.clicker_id?.[0] || data?.detail || 'Failed to create participant';
      toast({ title: 'Error', description: typeof msg === 'string' ? msg : 'Failed to create participant', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    try {
      const result = await participantService.import({ file: selectedFile });
      toast({
        title: 'Success',
        description: `Imported ${result.imported} participants`,
      });
      if (result.errors.length > 0) {
        toast({
          title: 'Warning',
          description: `${result.errors.length} errors occurred`,
          variant: 'destructive',
        });
      }
      setImportDialogOpen(false);
      setSelectedFile(null);
      loadParticipants();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to import participants',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await participantService.delete(id);
      toast({ title: 'Success', description: 'Participant deleted successfully' });
      setViewDialogOpen(false);
      setEditDialogOpen(false);
      loadParticipants();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete participant', variant: 'destructive' });
    }
  };

  const openView = (p: Participant) => {
    setViewParticipant(p);
    setViewDialogOpen(true);
  };

  const dialogFieldOrder = [
    'clicker_id',
    'name',
    'roll_no',
    'admission_no',
    'parent_email_id',
    ...PARTICIPANT_FIELDS.map((f) => f.key).filter(
      (k) => !['clicker_id', 'name', 'roll_no', 'admission_no', 'parent_email_id'].includes(k)
    ),
  ];

  const openEdit = (p: Participant) => {
    setEditParticipant(p);
    const form: Record<string, string> = {};
    PARTICIPANT_FIELDS.forEach((f) => {
      if (f.key === 'name') form.name = p.name ?? '';
      else if (f.key === 'clicker_id') form.clicker_id = p.clicker_id ?? '';
      else if (f.key === 'email_id') form.email_id = p.extra?.email_id ?? p.email ?? '';
      else form[f.key] = p.extra?.[f.key] ?? '';
    });
    setEditForm(form);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editParticipant) return;
    const name = (editForm.name ?? '').trim();
    const clicker_id = (editForm.clicker_id ?? '').trim();
    if (!name || !clicker_id) {
      toast({ title: 'Validation', description: 'Name and Keypad ID are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const extra: Record<string, string> = {};
      PARTICIPANT_FIELDS.forEach((f) => {
        if (f.key !== 'name' && f.key !== 'clicker_id') {
          const v = (editForm[f.key] ?? '').trim();
          if (v) extra[f.key] = v;
        }
      });
      const emailVal = (editForm.email_id ?? '').trim() || undefined;
      await participantService.update(editParticipant.id, {
        name,
        clicker_id,
        email: emailVal,
        extra: Object.keys(extra).length ? extra : undefined,
      });
      toast({ title: 'Success', description: 'Participant updated successfully' });
      setEditDialogOpen(false);
      setEditParticipant(null);
      loadParticipants();
    } catch (error: any) {
      const msg = error.response?.data?.clicker_id?.[0] ?? error.response?.data?.detail ?? 'Failed to update participant';
      toast({ title: 'Error', description: typeof msg === 'string' ? msg : 'Failed to update participant', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Table: Keypad ID, Name, Roll No., Admission No., then Owner + Parent Email ID, then remaining fields
  const tableColumnOrder = [
    'clicker_id',
    'name',
    'roll_no',
    'admission_no',
    ...(showOwner ? (['__owner__'] as const) : []),
    'parent_email_id',
    ...PARTICIPANT_FIELDS.map((f) => f.key).filter(
      (k) =>
        !['clicker_id', 'name', 'roll_no', 'admission_no', 'parent_email_id'].includes(k)
    ),
  ] as string[];
  const getFieldByKey = (key: string) => PARTICIPANT_FIELDS.find((f) => f.key === key)!;

  // Ensure participants is always an array
  const safeParticipants = Array.isArray(participants) ? participants : [];

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
          <h1 className="text-3xl font-bold tracking-tight">Participants</h1>
          <p className="text-muted-foreground mt-2">
            Manage exam participants
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV/Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Participants</DialogTitle>
                <DialogDescription>
                  Upload CSV or Excel with columns: <strong>Name</strong>, <strong>Keypad ID</strong> (or &quot;keypad id&quot;) (required). Optional: Roll No., Admission No., Class, Subject, Section, Team, Group, House, Gender, City, UID, Employee Code, Teacher Name, Email ID, <strong>Parent Email ID</strong> (or &quot;parent email&quot; / &quot;guardian email&quot;), <strong>Parent WhatsApp Number</strong> (or &quot;parent phone&quot; / &quot;parent mobile&quot; / &quot;whatsapp&quot;).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] || null)
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setImportDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={!selectedFile}>
                  Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (open) setCreateForm(buildEmptyRow()); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Participant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl lg:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Add Participant</DialogTitle>
                <DialogDescription>
                  Name and Keypad ID are required. All other fields are optional.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                {PARTICIPANT_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-2">
                    <Label htmlFor={`create-${f.key}`}>
                      {f.label} {f.required ? '*' : ''}
                    </Label>
                    <Input
                      id={`create-${f.key}`}
                      placeholder={f.required ? '' : `Optional`}
                      value={createForm[f.key] ?? ''}
                      onChange={(e) => updateCreateForm(f.key, e.target.value)}
                      type={f.key === 'email_id' || f.key === 'parent_email_id' ? 'email' : 'text'}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* View participant popup */}
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Participant details</DialogTitle>
                <DialogDescription>View participant information</DialogDescription>
              </DialogHeader>
              {viewParticipant && (
                <div className="space-y-4 py-4">
                  <div className="grid gap-2 text-sm">
                    {dialogFieldOrder.map((key) => {
                      const f = getFieldByKey(key);
                      const val = key === 'name' ? viewParticipant.name
                        : key === 'clicker_id' ? viewParticipant.clicker_id
                        : key === 'email_id' ? (viewParticipant.extra?.email_id ?? viewParticipant.email)
                        : viewParticipant.extra?.[key];
                      return (
                        <div key={key} className="flex justify-between gap-4 border-b pb-2">
                          <span className="text-muted-foreground">{f.label}</span>
                          <span className="font-medium">{val ?? '—'}</span>
                        </div>
                      );
                    })}
                    {showOwner && (
                      <div className="flex justify-between gap-4 border-b pb-2">
                        <span className="text-muted-foreground">Owner</span>
                        <span className="font-medium">{viewParticipant.owner_name ?? '—'}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-4 border-b pb-2">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">{new Date(viewParticipant.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
                {viewParticipant && (
                  <Button variant="default" onClick={() => { setViewDialogOpen(false); openEdit(viewParticipant); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit participant dialog */}
          <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditParticipant(null); }}>
            <DialogContent className="sm:max-w-xl lg:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit participant</DialogTitle>
                <DialogDescription>Update name, keypad ID, and custom fields.</DialogDescription>
              </DialogHeader>
              {editParticipant && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dialogFieldOrder.map((key) => {
                      const f = getFieldByKey(key);
                      return (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={`edit-${key}`}>{f.label} {f.required ? '*' : ''}</Label>
                        <Input
                          id={`edit-${key}`}
                          type={key === 'email_id' || key === 'parent_email_id' ? 'email' : 'text'}
                          value={editForm[key] ?? ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showAdminFilters ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filter by school & teacher</CardTitle>
            <CardDescription>
              Choose a school, then a teacher to narrow the list. School admins see only their school.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>School</Label>
              <Select
                value={
                  user?.role === 'school_admin'
                    ? filterSchoolId || String(user.school_id ?? '')
                    : filterSchoolId || ALL_SCHOOLS_VALUE
                }
                onValueChange={(v) => {
                  if (user?.role === 'school_admin') return;
                  setFilterSchoolId(v === ALL_SCHOOLS_VALUE ? '' : v);
                  setFilterTeacherId('');
                }}
                disabled={user?.role === 'school_admin'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  {user?.role === 'super_admin' ? (
                    <SelectItem value={ALL_SCHOOLS_VALUE}>All schools</SelectItem>
                  ) : null}
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>Teacher</Label>
              <Select
                value={filterTeacherId || ALL_TEACHERS_VALUE}
                onValueChange={(v) => setFilterTeacherId(v === ALL_TEACHERS_VALUE ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TEACHERS_VALUE}>All teachers</SelectItem>
                  {teacherOptions.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {user?.role === 'super_admin' && !filterSchoolId
                        ? `${t.name} (${t.school_name || '—'})`
                        : t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>All Participants</CardTitle>
          <CardDescription>
            {safeParticipants.length} participant(s) registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {safeParticipants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No participants yet</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Participant
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {tableColumnOrder.map((key) => (
                    <TableHead key={key}>
                      {key === '__owner__' ? 'Owner' : getFieldByKey(key).label}
                    </TableHead>
                  ))}
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right sticky right-0 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.1)] min-w-[120px] z-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    {tableColumnOrder.map((key) => {
                      const val =
                        key === '__owner__'
                          ? participant.owner_name
                          : key === 'name'
                            ? participant.name
                            : key === 'clicker_id'
                              ? participant.clicker_id
                              : key === 'email_id'
                                ? (participant.extra?.email_id ?? participant.email)
                                : participant.extra?.[key];
                      return (
                        <TableCell
                          key={key}
                          className={
                            key === 'clicker_id' || key === 'name'
                              ? 'font-medium'
                              : key === '__owner__'
                                ? 'text-muted-foreground'
                                : ''
                          }
                        >
                          {val ? val : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      );
                    })}
                    <TableCell>{new Date(participant.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right sticky right-0 bg-background shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)] z-10">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openView(participant)} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(participant)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(participant.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

