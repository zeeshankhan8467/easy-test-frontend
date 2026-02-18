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
import { participantService, Participant, ParticipantRow, CustomFieldDef } from '@/services/participants';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Plus, Loader2, Trash2, Edit, Settings2, Eye } from 'lucide-react';

const CUSTOM_FIELDS_STORAGE_KEY = 'easytest_participant_custom_fields';

function loadCustomFields(): CustomFieldDef[] {
  try {
    const s = localStorage.getItem(CUSTOM_FIELDS_STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (_) {}
  return [];
}

function saveCustomFields(fields: CustomFieldDef[]) {
  localStorage.setItem(CUSTOM_FIELDS_STORAGE_KEY, JSON.stringify(fields));
}

function buildEmptyRow(customFields: CustomFieldDef[]): ParticipantRow {
  const row: ParticipantRow = { name: '', clicker_id: '' };
  customFields.forEach((f) => (row[f.key] = ''));
  return row;
}

export function Participants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewParticipant, setViewParticipant] = useState<Participant | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editParticipant, setEditParticipant] = useState<Participant | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const [customFields, setCustomFields] = useState<CustomFieldDef[]>(() => loadCustomFields());
  const [rows, setRows] = useState<ParticipantRow[]>(() => [buildEmptyRow(loadCustomFields())]);

  const emptyRow = buildEmptyRow(customFields);

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    try {
      const data = await participantService.getAll();
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setParticipants(data);
      } else if (data && Array.isArray(data.results)) {
        setParticipants(data.results);
      } else {
        console.warn('Unexpected data format:', data);
        setParticipants([]);
      }
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
  };

  const addRow = () => setRows((r) => [...r, { ...emptyRow }]);
  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((r) => r.filter((_, i) => i !== index));
  };
  const updateRow = (index: number, field: string, value: string) => {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addCustomField = (key: string, label: string) => {
    const k = key.trim().toLowerCase().replace(/\s+/g, '_');
    if (!k) return;
    if (customFields.some((f) => f.key === k)) {
      toast({ title: 'Field exists', description: `"${k}" is already added.`, variant: 'destructive' });
      return;
    }
    const next = [...customFields, { key: k, label: label.trim() || k }];
    setCustomFields(next);
    saveCustomFields(next);
    setRows((prev) => prev.map((row) => ({ ...row, [k]: '' })));
    toast({ title: 'Field added', description: `"${label || k}" added.` });
  };
  const removeCustomField = (key: string) => {
    const next = customFields.filter((f) => f.key !== key);
    setCustomFields(next);
    saveCustomFields(next);
    setRows((prev) => prev.map(({ [key]: _, ...rest }) => rest as ParticipantRow));
  };

  const handleBulkCreate = async () => {
    const toCreate = rows
      .map((r) => {
        const name = r.name.trim();
        const clicker_id = r.clicker_id.trim();
        if (!name || !clicker_id) return null;
        const rest: Record<string, string> = {};
        customFields.forEach((f) => {
          const v = (r[f.key] ?? '').trim();
          if (v) rest[f.key] = v;
        });
        return { name, clicker_id, ...rest };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (toCreate.length === 0) {
      toast({ title: 'Validation', description: 'Each row needs Name and Clicker ID.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const result = await participantService.bulkCreate(toCreate);
      toast({
        title: 'Success',
        description: result.errors.length
          ? `Created ${result.created} participant(s). ${result.errors.length} error(s).`
          : `Created ${result.created} participant(s).`,
      });
      if (result.errors.length > 0) {
        toast({ title: 'Errors', description: result.errors.join(' '), variant: 'destructive' });
      }
      setCreateDialogOpen(false);
      setRows([buildEmptyRow(customFields)]);
      loadParticipants();
    } catch (error: any) {
      const data = error.response?.data;
      const msg = data?.participants?.[0] || data?.clicker_id?.[0] || data?.detail || 'Failed to create participants';
      toast({ title: 'Error', description: typeof msg === 'string' ? msg : 'Failed to create participants', variant: 'destructive' });
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

  const openEdit = (p: Participant) => {
    setEditParticipant(p);
    const form: Record<string, string> = {
      name: p.name ?? '',
      clicker_id: p.clicker_id ?? '',
      email: p.email ?? '',
    };
    const extraKeys = new Set<string>([...Object.keys(p.extra ?? {}), ...customFields.map((f) => f.key)]);
    extraKeys.forEach((key) => (form[key] = p.extra?.[key] ?? (key === 'email' ? p.email ?? '' : '')));
    setEditForm(form);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editParticipant) return;
    const name = (editForm.name ?? '').trim();
    const clicker_id = (editForm.clicker_id ?? '').trim();
    if (!name || !clicker_id) {
      toast({ title: 'Validation', description: 'Name and Clicker ID are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const extra: Record<string, string> = {};
      customFields.forEach((f) => {
        const v = (editForm[f.key] ?? '').trim();
        if (v) extra[f.key] = v;
      });
      await participantService.update(editParticipant.id, {
        name,
        clicker_id,
        email: (editForm.email ?? '').trim() || undefined,
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
          <Button variant="outline" onClick={() => setFieldsDialogOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Manage fields
          </Button>
          <Dialog open={fieldsDialogOpen} onOpenChange={setFieldsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Participant custom fields</DialogTitle>
                <DialogDescription>
                  Add fields like email, rollno, class, gender. They appear when adding participants and in the table. Name and Clicker ID are always required.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-wrap gap-2">
                  {customFields.map((f) => (
                    <div key={f.key} className="flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-sm">
                      <span className="font-medium">{f.label || f.key}</span>
                      <span className="text-muted-foreground">({f.key})</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCustomField(f.key)} title="Remove field">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="newKey">Field key (e.g. email, rollno, class)</Label>
                    <Input id="newKey" placeholder="e.g. rollno" value={newFieldKey} onChange={(e) => setNewFieldKey(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="newLabel">Label (optional)</Label>
                    <Input id="newLabel" placeholder="e.g. Roll No" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} />
                  </div>
                  <Button type="button" onClick={() => { addCustomField(newFieldKey, newFieldLabel); setNewFieldKey(''); setNewFieldLabel(''); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add field
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                  Upload CSV or Excel with at least &quot;name&quot; and &quot;clicker_id&quot;. Any other columns (email, rollno, class, gender, etc.) are imported as custom fields.
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
          <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (open) setRows([buildEmptyRow(customFields)]); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Participants
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Participants</DialogTitle>
                <DialogDescription>
                  Name and Clicker ID are required. Other columns depend on your custom fields (use &quot;Manage fields&quot; to add email, rollno, class, gender, etc.).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-col gap-3 overflow-x-auto">
                  <div className="grid gap-2 items-center text-sm font-medium text-muted-foreground" style={{ gridTemplateColumns: `minmax(100px,1fr) minmax(80px,1fr) ${customFields.map(() => 'minmax(80px,1fr)').join(' ')} 32px` }}>
                    <span>Name *</span>
                    <span>Clicker ID *</span>
                    {customFields.map((f) => (
                      <span key={f.key}>{f.label || f.key}</span>
                    ))}
                    <span />
                  </div>
                  {rows.map((row, index) => (
                    <div key={index} className="grid gap-2 items-center" style={{ gridTemplateColumns: `minmax(100px,1fr) minmax(80px,1fr) ${customFields.map(() => 'minmax(80px,1fr)').join(' ')} 32px` }}>
                      <Input placeholder="Name" value={row.name} onChange={(e) => updateRow(index, 'name', e.target.value)} />
                      <Input placeholder="Clicker ID" value={row.clicker_id} onChange={(e) => updateRow(index, 'clicker_id', e.target.value)} />
                      {customFields.map((f) => (
                        <Input
                          key={f.key}
                          placeholder={f.label || f.key}
                          value={row[f.key] ?? ''}
                          onChange={(e) => updateRow(index, f.key, e.target.value)}
                        />
                      ))}
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(index)} disabled={rows.length <= 1} title="Remove row">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add another row
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkCreate} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create all
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
                    <div className="flex justify-between gap-4 border-b pb-2">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{viewParticipant.name}</span>
                    </div>
                    <div className="flex justify-between gap-4 border-b pb-2">
                      <span className="text-muted-foreground">Clicker ID</span>
                      <span className="font-medium">{viewParticipant.clicker_id ?? '—'}</span>
                    </div>
                    <div className="flex justify-between gap-4 border-b pb-2">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{viewParticipant.email ?? '—'}</span>
                    </div>
                    {customFields.map((f) => {
                      const val = viewParticipant.extra?.[f.key] ?? (f.key === 'email' ? viewParticipant.email : undefined);
                      return (
                        <div key={f.key} className="flex justify-between gap-4 border-b pb-2">
                          <span className="text-muted-foreground">{f.label || f.key}</span>
                          <span className="font-medium">{val ?? '—'}</span>
                        </div>
                      );
                    })}
                    {Object.entries(viewParticipant.extra ?? {}).map(
                      ([key]) =>
                        !customFields.some((f) => f.key === key) && (
                          <div key={key} className="flex justify-between gap-4 border-b pb-2">
                            <span className="text-muted-foreground">{key}</span>
                            <span className="font-medium">{viewParticipant.extra![key] ?? '—'}</span>
                          </div>
                        )
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit participant</DialogTitle>
                <DialogDescription>Update name, clicker ID, and custom fields.</DialogDescription>
              </DialogHeader>
              {editParticipant && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name *</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-clicker_id">Clicker ID *</Label>
                    <Input
                      id="edit-clicker_id"
                      value={editForm.clicker_id ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, clicker_id: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email (optional)</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editForm.email ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  {customFields.map((f) => (
                    <div key={f.key} className="space-y-2">
                      <Label htmlFor={`edit-${f.key}`}>{f.label || f.key}</Label>
                      <Input
                        id={`edit-${f.key}`}
                        value={editForm[f.key] ?? ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Clicker ID</TableHead>
                  {customFields.map((f) => (
                    <TableHead key={f.key}>{f.label || f.key}</TableHead>
                  ))}
                  {customFields.length === 0 && <TableHead>Email</TableHead>}
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">{participant.name}</TableCell>
                    <TableCell>{participant.clicker_id || <span className="text-muted-foreground">—</span>}</TableCell>
                    {customFields.map((f) => {
                      const val = participant.extra?.[f.key] ?? (f.key === 'email' ? participant.email : undefined);
                      return <TableCell key={f.key}>{val ?? <span className="text-muted-foreground">—</span>}</TableCell>;
                    })}
                    {customFields.length === 0 && <TableCell>{participant.email ?? <span className="text-muted-foreground">—</span>}</TableCell>}
                    <TableCell>{new Date(participant.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

