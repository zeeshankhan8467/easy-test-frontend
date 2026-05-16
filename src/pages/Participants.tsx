import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
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
import { participantService, Participant, ParticipantRow, PARTICIPANT_FIELDS, ParticipantListParams } from '@/services/participants';
import { downloadParticipantImportSample } from '@/lib/sampleImportSheets';
import { schoolService, School } from '@/services/schools';
import { examService, ExamOwner } from '@/services/exams';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Plus, Loader2, Trash2, Edit, Eye, Download } from 'lucide-react';
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
const ALL_CLASSES_VALUE = '__all_classes__';
const ALL_SECTIONS_VALUE = '__all_sections__';
const ALL_TEAMS_VALUE = '__all_teams__';
const NONE_VALUE = '__none__';
const CLASS_CHOICES = Array.from({ length: 12 }, (_, i) => String(i + 1));
const SECTION_CHOICES = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

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
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteAllBusy, setDeleteAllBusy] = useState(false);
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
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterSection, setFilterSection] = useState<string>('');
  const [filterTeam, setFilterTeam] = useState<string>('');
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [teamOptions, setTeamOptions] = useState<string[]>([]);

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

  const rosterListParams = useMemo((): ParticipantListParams => {
    const p: ParticipantListParams = {};
    if (showAdminFilters && filterSchoolId) p.school_id = Number(filterSchoolId);
    if (showAdminFilters && filterTeacherId) p.teacher_id = Number(filterTeacherId);
    if (filterClass) p.class = filterClass;
    if (filterSection) p.section = filterSection;
    if (filterTeam) p.team = filterTeam;
    return p;
  }, [showAdminFilters, filterSchoolId, filterTeacherId, filterClass, filterSection, filterTeam]);

  const loadRosterFilterOptions = useCallback(async () => {
    try {
      const base: ParticipantListParams = {};
      if (showAdminFilters && filterSchoolId) base.school_id = Number(filterSchoolId);
      if (showAdminFilters && filterTeacherId) base.teacher_id = Number(filterTeacherId);
      const classParams = Object.keys(base).length ? base : undefined;
      const sectionParams: ParticipantListParams = { ...base };
      if (filterClass) sectionParams.class = filterClass;
      const teamParams: ParticipantListParams = { ...base };
      if (filterClass) teamParams.class = filterClass;
      if (filterSection) teamParams.section = filterSection;

      const [classes, sections, teams] = await Promise.all([
        participantService.getDistinctClasses(classParams),
        participantService.getDistinctSections(Object.keys(sectionParams).length ? sectionParams : undefined),
        participantService.getDistinctTeams(Object.keys(teamParams).length ? teamParams : undefined),
      ]);
      setClassOptions(classes);
      setSectionOptions(sections);
      setTeamOptions(teams);
      setFilterClass((prev) => (prev && !classes.includes(prev) ? '' : prev));
      setFilterSection((prev) => (prev && !sections.includes(prev) ? '' : prev));
      setFilterTeam((prev) => (prev && !teams.includes(prev) ? '' : prev));
    } catch (e) {
      console.error(e);
      setClassOptions([]);
      setSectionOptions([]);
      setTeamOptions([]);
    }
  }, [showAdminFilters, filterSchoolId, filterTeacherId, filterClass, filterSection]);

  const loadParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const hasParams = Object.keys(rosterListParams).length > 0;
      const data = await participantService.getAll(hasParams ? rosterListParams : undefined);
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
  }, [rosterListParams, toast]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  useEffect(() => {
    loadRosterFilterOptions();
  }, [loadRosterFilterOptions]);

  const updateCreateForm = (field: string, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    const name = createForm.name.trim();
    const clicker_id = createForm.clicker_id.trim();
    if (!clicker_id) {
      toast({ title: 'Validation', description: 'Keypad ID is required.', variant: 'destructive' });
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
    const payload: ParticipantRow = { clicker_id, ...(name ? { name } : {}), ...rest };
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
      loadRosterFilterOptions();
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
      const result = await participantService.import({
        file: selectedFile,
      });
      const skipped = result.skipped_duplicates ?? 0;
      toast({
        title: 'Success',
        description:
          skipped > 0
            ? `Imported ${result.imported} participants. ${skipped} row(s) skipped because their keypad ID already appeared in another row with the same class & section.`
            : `Imported ${result.imported} participants`,
      });
      if (result.errors.length > 0) {
        const preview = result.errors.slice(0, 5).join(' ');
        const more = result.errors.length > 5 ? ` (+${result.errors.length - 5} more)` : '';
        toast({
          title: skipped > 0 ? 'Some rows were skipped' : 'Warning',
          description: `${result.errors.length} issue(s): ${preview}${more}`,
          variant: 'destructive',
        });
      }
      setImportDialogOpen(false);
      setSelectedFile(null);
      loadParticipants();
      loadRosterFilterOptions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to import participants',
        variant: 'destructive',
      });
    }
  };

  const getParticipantListParams = (): ParticipantListParams | undefined => {
    const hasParams = Object.keys(rosterListParams).length > 0;
    return hasParams ? rosterListParams : undefined;
  };

  const handleDeleteAllParticipants = async () => {
    setDeleteAllBusy(true);
    try {
      const { deleted } = await participantService.deleteAll(getParticipantListParams());
      toast({
        title: 'Participants deleted',
        description: `Removed ${deleted} participant(s). Related exam assignments, attempts, and daily attendance rows are removed.`,
      });
      setDeleteAllDialogOpen(false);
      await loadParticipants();
      loadRosterFilterOptions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || error?.response?.data?.detail || 'Failed to delete participants',
        variant: 'destructive',
      });
    } finally {
      setDeleteAllBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await participantService.delete(id);
      toast({ title: 'Success', description: 'Participant deleted successfully' });
      setViewDialogOpen(false);
      setEditDialogOpen(false);
      loadParticipants();
      loadRosterFilterOptions();
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
    'class',
    'parent_email_id',
    ...PARTICIPANT_FIELDS.map((f) => f.key).filter(
      (k) =>
        !['clicker_id', 'name', 'roll_no', 'admission_no', 'class', 'parent_email_id'].includes(k)
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
    if (!clicker_id) {
      toast({ title: 'Validation', description: 'Keypad ID is required.', variant: 'destructive' });
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
      loadRosterFilterOptions();
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
    'class',
    ...(showOwner ? (['__owner__'] as const) : []),
    'parent_email_id',
    ...PARTICIPANT_FIELDS.map((f) => f.key).filter(
      (k) =>
        !['clicker_id', 'name', 'roll_no', 'admission_no', 'class', 'parent_email_id'].includes(k)
    ),
  ] as string[];
  const getFieldByKey = (key: string) => PARTICIPANT_FIELDS.find((f) => f.key === key)!;

  // Ensure participants is always an array
  const safeParticipants = Array.isArray(participants) ? participants : [];

  const participantsGroupedByClass = useMemo(() => {
    const map = new Map<string, Participant[]>();
    for (const p of safeParticipants) {
      const raw = (p.extra?.class ?? '').toString().trim();
      const gkey = raw;
      if (!map.has(gkey)) map.set(gkey, []);
      map.get(gkey)!.push(p);
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === '') return 1;
      if (b === '') return -1;
      return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
    });
    return keys.map((k) => ({
      sectionLabel: k === '' ? 'No class' : k,
      items: map.get(k)!,
    }));
  }, [safeParticipants]);

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
          <Dialog open={importDialogOpen} onOpenChange={(open) => {
            setImportDialogOpen(open);
            if (!open) {
              setSelectedFile(null);
            }
          }}>
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
                  Upload CSV or Excel with a <strong>Keypad ID</strong> column (or &quot;clicker id&quot;) — required. <strong>Name</strong> is optional; if missing or blank, the keypad ID is stored as the display name. Optional columns: Roll No., Admission No., Class, Subject, Section, Team, Group, House, Gender, City, UID, Employee Code, Teacher Name, Email ID, <strong>Parent Email ID</strong> (or &quot;parent email&quot; / &quot;guardian email&quot;), <strong>Parent WhatsApp Number</strong> (or &quot;parent phone&quot; / &quot;parent mobile&quot; / &quot;whatsapp&quot;).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={downloadParticipantImportSample}>
                    <Download className="h-4 w-4 mr-2" />
                    Download sample CSV
                  </Button>
                </div>
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
          <Button
            type="button"
            variant="destructive"
            disabled={safeParticipants.length === 0}
            onClick={() => setDeleteAllDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete all
          </Button>
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
                  Keypad ID is required. Name is optional (if empty, it defaults to the keypad ID). Set <strong>Class</strong>, <strong>Section</strong>, and <strong>Team</strong> to organize the roster and match the filters above; other fields are optional.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                {PARTICIPANT_FIELDS.map((f) => {
                  if (f.key === 'class' || f.key === 'section') {
                    const choices = f.key === 'class' ? CLASS_CHOICES : SECTION_CHOICES;
                    const current = (createForm[f.key] ?? '').trim();
                    const extra = current && !choices.includes(current) ? [current] : [];
                    return (
                      <div key={f.key} className="space-y-2">
                        <Label htmlFor={`create-${f.key}`}>{f.label}</Label>
                        <Select
                          value={current || NONE_VALUE}
                          onValueChange={(v) => updateCreateForm(f.key, v === NONE_VALUE ? '' : v)}
                        >
                          <SelectTrigger id={`create-${f.key}`}>
                            <SelectValue placeholder={f.key === 'class' ? 'Select class' : 'Select section'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>None</SelectItem>
                            {[...extra, ...choices].map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }
                  return (
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
                  );
                })}
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
                      if (key === 'class' || key === 'section') {
                        const choices = key === 'class' ? CLASS_CHOICES : SECTION_CHOICES;
                        const current = (editForm[key] ?? '').trim();
                        const extra = current && !choices.includes(current) ? [current] : [];
                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`edit-${key}`}>{f.label}</Label>
                            <Select
                              value={current || NONE_VALUE}
                              onValueChange={(v) =>
                                setEditForm((prev) => ({ ...prev, [key]: v === NONE_VALUE ? '' : v }))
                              }
                            >
                              <SelectTrigger id={`edit-${key}`}>
                                <SelectValue placeholder={key === 'class' ? 'Select class' : 'Select section'} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE_VALUE}>None</SelectItem>
                                {[...extra, ...choices].map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter roster</CardTitle>
          <CardDescription>
            {showAdminFilters
              ? 'Choose school and teacher (if applicable), then narrow by class, section, and team. Values come from each participant\'s extra fields.'
              : 'Filter your roster by class, section, and team. Set those fields when adding or editing a participant, when importing, or use default section/team on import.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row gap-4 flex-wrap">
          {showAdminFilters ? (
            <>
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
                    setFilterClass('');
                    setFilterSection('');
                    setFilterTeam('');
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
                  onValueChange={(v) => {
                    setFilterTeacherId(v === ALL_TEACHERS_VALUE ? '' : v);
                    setFilterClass('');
                    setFilterSection('');
                    setFilterTeam('');
                  }}
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
            </>
          ) : null}
          <div className="space-y-2 flex-1 min-w-[180px]">
            <Label>Class</Label>
            <Select
              value={filterClass || ALL_CLASSES_VALUE}
              onValueChange={(v) => {
                setFilterClass(v === ALL_CLASSES_VALUE ? '' : v);
                setFilterSection('');
                setFilterTeam('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CLASSES_VALUE}>All classes</SelectItem>
                {classOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex-1 min-w-[180px]">
            <Label>Section</Label>
            <Select
              value={filterSection || ALL_SECTIONS_VALUE}
              onValueChange={(v) => {
                setFilterSection(v === ALL_SECTIONS_VALUE ? '' : v);
                setFilterTeam('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SECTIONS_VALUE}>All sections</SelectItem>
                {sectionOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex-1 min-w-[180px]">
            <Label>Team</Label>
            <Select
              value={filterTeam || ALL_TEAMS_VALUE}
              onValueChange={(v) => setFilterTeam(v === ALL_TEAMS_VALUE ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TEAMS_VALUE}>All teams</SelectItem>
                {teamOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Participants</CardTitle>
          <CardDescription>
            {safeParticipants.length} participant(s)
            {filterClass ? ` in class "${filterClass}"` : ''}
            {filterSection ? `, section "${filterSection}"` : ''}
            {filterTeam ? `, team "${filterTeam}"` : ''}
            {' '}
            — grouped by class when no class filter is applied
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
                {participantsGroupedByClass.map(({ sectionLabel, items }) => (
                  <Fragment key={sectionLabel}>
                    {!filterClass ? (
                      <TableRow className="bg-muted/60 hover:bg-muted/60">
                        <TableCell
                          colSpan={tableColumnOrder.length + 2}
                          className="font-semibold text-sm py-2"
                        >
                          Class: {sectionLabel} ({items.length})
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {items.map((participant) => (
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
                  </Fragment>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all participants?</DialogTitle>
            <DialogDescription>
              This permanently deletes every participant in your current list ({safeParticipants.length} shown). Filters
              for school, teacher, class, section, and team match the list you see. This also removes exam assignments,
              attempts, answers, and daily attendance for those participants.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteAllDialogOpen(false)} disabled={deleteAllBusy}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteAllParticipants} disabled={deleteAllBusy}>
              {deleteAllBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

