import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, FileSpreadsheet, FileText, Mail, MessageCircle } from 'lucide-react';
import {
  reportService,
  DailyAttendanceDay,
  DailyAttendanceParticipant,
  DailyAttendanceSummaryRow,
} from '@/services/reports';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

function localISODate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDaySidebar(iso: string): string {
  const [y, mo, day] = iso.split('-').map(Number);
  const dt = new Date(y, mo - 1, day);
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

type StatusFilter = 'all' | 'present' | 'absent' | 'unmarked';
type EmailScope = 'present' | 'absent' | 'all' | 'unmarked';

const ALL_CLASSES_VALUE = '__all_classes__';
const ALL_SECTIONS_VALUE = '__all_sections__';
const ALL_TEAMS_VALUE = '__all_teams__';

function statusLabel(p: DailyAttendanceParticipant): string {
  if (!p.marked) return 'Not recorded';
  return p.present ? 'Present' : 'Absent';
}

export function Attendance() {
  const [summary, setSummary] = useState<DailyAttendanceSummaryRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => localISODate());
  const [attendance, setAttendance] = useState<DailyAttendanceDay | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  // Default to "present" so the page opens with only present participants visible,
  // matching the school's request to surface attendance for present students first.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('present');
  const [classFilter, setClassFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const { toast } = useToast();

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailScope, setEmailScope] = useState<EmailScope>('absent');
  const [emailSubject, setEmailSubject] = useState('Attendance update');
  const [emailBody, setEmailBody] = useState(
    'Dear Parent/Guardian,\n\nThis is an attendance update for {{attendance_date}}.\n\nStudent: {{student_name}}\nKeypad ID: {{clicker_id}}\nStatus: {{status}}\n\nRegards,\nEasyTest'
  );
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);
  const [whatsAppScope, setWhatsAppScope] = useState<EmailScope>('absent');
  const [whatsAppSearch, setWhatsAppSearch] = useState('');
  const [selectedWhatsAppStudentIds, setSelectedWhatsAppStudentIds] = useState<Set<number>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());

  const loadSummary = useCallback(async () => {
    try {
      const data = await reportService.getDailyAttendanceSummary(60);
      setSummary(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.response?.data?.detail || 'Failed to load attendance summary',
        variant: 'destructive',
      });
      setSummary([]);
    } finally {
      setSummaryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    const loadDay = async () => {
      setAttendanceLoading(true);
      setAttendance(null);
      try {
        const data = await reportService.getDailyAttendanceDay(selectedDate);
        if (cancelled) return;
        setAttendance(data);
      } catch {
        if (!cancelled) {
          toast({ title: 'Error', description: 'Failed to load attendance for this day', variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    };
    loadDay();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, toast]);

  // The roster after class/section/team filters are applied. The status filter
  // and the email/WhatsApp dialogs all derive from this so they share the same
  // class/section/team scope.
  const participantsView = useMemo(() => {
    const ps = attendance?.participants ?? [];
    return ps.filter((p) => {
      if (classFilter && (p.class_name || '') !== classFilter) return false;
      if (sectionFilter && (p.section || '') !== sectionFilter) return false;
      if (teamFilter && (p.team || '') !== teamFilter) return false;
      return true;
    });
  }, [attendance, classFilter, sectionFilter, teamFilter]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    (attendance?.participants ?? []).forEach((p) => {
      const v = (p.class_name || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }),
    );
  }, [attendance]);

  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    (attendance?.participants ?? []).forEach((p) => {
      if (classFilter && (p.class_name || '') !== classFilter) return;
      const v = (p.section || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }),
    );
  }, [attendance, classFilter]);

  const teamOptions = useMemo(() => {
    const set = new Set<string>();
    (attendance?.participants ?? []).forEach((p) => {
      if (classFilter && (p.class_name || '') !== classFilter) return;
      if (sectionFilter && (p.section || '') !== sectionFilter) return;
      const v = (p.team || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }),
    );
  }, [attendance, classFilter, sectionFilter]);

  // If a filter no longer matches available options (e.g. class changed),
  // reset the dependent filters so the Select values stay valid.
  useEffect(() => {
    if (sectionFilter && !sectionOptions.includes(sectionFilter)) {
      setSectionFilter('');
    }
  }, [sectionOptions, sectionFilter]);
  useEffect(() => {
    if (teamFilter && !teamOptions.includes(teamFilter)) {
      setTeamFilter('');
    }
  }, [teamOptions, teamFilter]);

  const dayStats = useMemo(() => {
    if (!attendance) {
      return { present: 0, absent: 0, unmarked: 0, total: 0 };
    }
    let present = 0;
    let absent = 0;
    let unmarked = 0;
    for (const p of participantsView) {
      if (!p.marked) unmarked += 1;
      else if (p.present) present += 1;
      else absent += 1;
    }
    return { present, absent, unmarked, total: participantsView.length };
  }, [attendance, participantsView]);

  const filteredParticipants = useMemo(() => {
    return participantsView.filter((p) => {
      if (statusFilter === 'present') return p.marked && p.present;
      if (statusFilter === 'absent') return p.marked && !p.present;
      if (statusFilter === 'unmarked') return !p.marked;
      return true;
    });
  }, [participantsView, statusFilter]);

  const emailCandidates = useMemo(() => {
    const ps = participantsView;
    const scoped =
      emailScope === 'present'
        ? ps.filter((p) => p.marked && p.present)
        : emailScope === 'absent'
          ? ps.filter((p) => p.marked && !p.present)
          : emailScope === 'unmarked'
            ? ps.filter((p) => !p.marked)
            : ps;
    const q = studentSearch.trim().toLowerCase();
    const searched = !q
      ? scoped
      : scoped.filter((p) => {
          const name = (p.name || '').toLowerCase();
          const clicker = (p.clicker_id || '').toLowerCase();
          const parent = (p.parent_email_id || '').toLowerCase();
          return name.includes(q) || clicker.includes(q) || parent.includes(q);
        });
    return searched;
  }, [participantsView, emailScope, studentSearch]);

  const openEmailDialog = () => {
    const ps = participantsView;
    const scoped =
      emailScope === 'present'
        ? ps.filter((p) => p.marked && p.present)
        : emailScope === 'absent'
          ? ps.filter((p) => p.marked && !p.present)
          : emailScope === 'unmarked'
            ? ps.filter((p) => !p.marked)
            : ps;
    const ids = new Set<number>(
      scoped.filter((p) => (p.parent_email_id || '').trim()).map((p) => Number(p.id))
    );
    setSelectedStudentIds(ids);
    setStudentSearch('');
    setEmailDialogOpen(true);
  };

  const whatsAppCandidates = useMemo(() => {
    const ps = participantsView;
    const scoped =
      whatsAppScope === 'present'
        ? ps.filter((p) => p.marked && p.present)
        : whatsAppScope === 'absent'
          ? ps.filter((p) => p.marked && !p.present)
          : whatsAppScope === 'unmarked'
            ? ps.filter((p) => !p.marked)
            : ps;
    const q = whatsAppSearch.trim().toLowerCase();
    const searched = !q
      ? scoped
      : scoped.filter((p) => {
          const name = (p.name || '').toLowerCase();
          const clicker = (p.clicker_id || '').toLowerCase();
          const mobile = (p.parent_whatsapp || '').toLowerCase();
          return name.includes(q) || clicker.includes(q) || mobile.includes(q);
        });
    return searched;
  }, [participantsView, whatsAppScope, whatsAppSearch]);

  const whatsAppPreview = useMemo(() => {
    const fallbackDate = selectedDate || localISODate();
    const selected = whatsAppCandidates.find((p) => selectedWhatsAppStudentIds.has(Number(p.id)));
    const p = selected ?? whatsAppCandidates[0];
    const studentName = p?.name || 'Student Name';
    const keypad = p?.clicker_id || 'N/A';
    const status = p ? statusLabel(p) : 'Absent';
    return (
      `Dear Parent/Guardian,\n\n` +
      `Attendance update for ${fallbackDate}\n` +
      `Student: ${studentName}\n` +
      `Keypad ID: ${keypad}\n` +
      `Status: ${status}\n` +
      `THANKYOU`
    );
  }, [selectedDate, whatsAppCandidates, selectedWhatsAppStudentIds, statusLabel]);

  const openWhatsAppDialog = () => {
    const ps = participantsView;
    const scoped =
      whatsAppScope === 'present'
        ? ps.filter((p) => p.marked && p.present)
        : whatsAppScope === 'absent'
          ? ps.filter((p) => p.marked && !p.present)
          : whatsAppScope === 'unmarked'
            ? ps.filter((p) => !p.marked)
            : ps;
    const ids = new Set<number>(
      scoped.filter((p) => (p.parent_whatsapp || '').trim()).map((p) => Number(p.id))
    );
    setSelectedWhatsAppStudentIds(ids);
    setWhatsAppSearch('');
    setWhatsAppDialogOpen(true);
  };

  const whatsAppSelectableInViewCount = useMemo(
    () => whatsAppCandidates.filter((p) => (p.parent_whatsapp || '').trim()).length,
    [whatsAppCandidates],
  );

  const handleWhatsAppSelectAllVisible = () => {
    setSelectedWhatsAppStudentIds((prev) => {
      const next = new Set(prev);
      whatsAppCandidates.forEach((p) => {
        if ((p.parent_whatsapp || '').trim()) next.add(Number(p.id));
      });
      return next;
    });
  };

  const handleWhatsAppClearSelection = () => {
    setSelectedWhatsAppStudentIds(new Set());
  };

  const handleDownload = async (format: 'excel' | 'pdf') => {
    if (!selectedDate) return;
    try {
      const blob = await reportService.exportDailyAttendanceReport(selectedDate, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      a.download = `attendance-${selectedDate}.${ext}`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.detail || 'Failed to download attendance report',
        variant: 'destructive',
      });
    }
  };

  const handleSendEmails = async () => {
    if (!selectedDate) return;
    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) {
      toast({ title: 'Validation', description: 'Select at least one student.', variant: 'destructive' });
      return;
    }
    setSendingEmail(true);
    try {
      const result = await reportService.sendDailyAttendanceParentEmails(selectedDate, {
        scope: emailScope,
        subject: emailSubject,
        body: emailBody,
        participant_ids: ids,
      });
      toast({
        title: 'Success',
        description: `Sent ${result.sent} email(s). Skipped ${result.skipped}.`,
      });
      if (result.errors?.length) {
        toast({
          title: 'Warnings',
          description: result.errors.slice(0, 3).join(' '),
          variant: 'destructive',
        });
      }
      setEmailDialogOpen(false);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.error || 'Failed to send emails';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!selectedDate) return;
    const ids = Array.from(selectedWhatsAppStudentIds);
    if (ids.length === 0) {
      toast({ title: 'Validation', description: 'Select at least one student.', variant: 'destructive' });
      return;
    }
    setSendingWhatsApp(true);
    try {
      const result = await reportService.sendDailyAttendanceParentWhatsApp(selectedDate, {
        scope: whatsAppScope,
        message: '{{attendance_date}}',
        participant_ids: ids,
      });
      toast({
        title: 'Success',
        description: `Sent ${result.sent} WhatsApp message(s). Skipped ${result.skipped}.`,
      });
      if (result.errors?.length) {
        toast({
          title: 'Warnings',
          description: result.errors.slice(0, 3).join(' '),
          variant: 'destructive',
        });
      }
      setWhatsAppDialogOpen(false);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.error || 'Failed to send WhatsApp messages';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  if (summaryLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground mt-2">
            View attendance by day. Marks are submitted from the EasyTest app; this page is read-only.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <aside className="w-full lg:w-56 shrink-0 border rounded-lg bg-card max-h-[min(70vh,520px)] overflow-y-auto p-2">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">Days (newest first)</p>
          <div className="flex flex-col gap-0.5">
            {summary.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-4">No data yet.</p>
            ) : (
              summary.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={cn(
                    'text-left rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                    selectedDate === day.date && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                  )}
                >
                  <div className="font-medium leading-tight">{formatDaySidebar(day.date)}</div>
                  <div
                    className={cn(
                      'text-xs mt-0.5 opacity-90',
                      selectedDate === day.date ? 'text-primary-foreground/90' : 'text-muted-foreground'
                    )}
                  >
                    {day.present_count}/{day.total_count} present
                    {day.unmarked_count > 0 ? ` · ${day.unmarked_count} not recorded` : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0 space-y-6 w-full">
          <Card>
            <CardHeader>
              <CardTitle>{formatDaySidebar(selectedDate)}</CardTitle>
              <CardDescription>
                Roster and status for this date (as recorded in the app). Use filters and export if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-2">
                  <Label>Status filter</Label>
                  <Select value={statusFilter} onValueChange={(v: StatusFilter) => setStatusFilter(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent (recorded)</SelectItem>
                      <SelectItem value="unmarked">Not recorded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select
                    value={classFilter || ALL_CLASSES_VALUE}
                    onValueChange={(v) => {
                      const next = v === ALL_CLASSES_VALUE ? '' : v;
                      setClassFilter(next);
                      setSectionFilter('');
                      setTeamFilter('');
                    }}
                  >
                    <SelectTrigger className="w-[160px]">
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

                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select
                    value={sectionFilter || ALL_SECTIONS_VALUE}
                    onValueChange={(v) => {
                      const next = v === ALL_SECTIONS_VALUE ? '' : v;
                      setSectionFilter(next);
                      setTeamFilter('');
                    }}
                  >
                    <SelectTrigger className="w-[160px]">
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

                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select
                    value={teamFilter || ALL_TEAMS_VALUE}
                    onValueChange={(v) => setTeamFilter(v === ALL_TEAMS_VALUE ? '' : v)}
                  >
                    <SelectTrigger className="w-[160px]">
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={openEmailDialog}
                  disabled={!attendance || attendanceLoading}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send email to parents
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={openWhatsAppDialog}
                  disabled={!attendance || attendanceLoading}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send on WhatsApp
                </Button>

                <Button type="button" variant="outline" onClick={() => handleDownload('excel')} disabled={!selectedDate}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button type="button" variant="outline" onClick={() => handleDownload('pdf')} disabled={!selectedDate}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roster</CardTitle>
              <CardDescription>
                <span className="text-green-600 font-medium">{dayStats.present} present</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-amber-700 font-medium">{dayStats.absent} absent</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-muted-foreground">{dayStats.unmarked} not recorded</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span>{dayStats.total} total</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : attendance && attendance.participants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Keypad ID</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="min-w-[160px]">Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParticipants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No rows for this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredParticipants.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-muted-foreground">{p.clicker_id ?? '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{p.class_name || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{p.section || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{p.team || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{p.email || '—'}</TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  !p.marked && 'text-muted-foreground',
                                  p.marked && p.present && 'text-green-600 font-medium',
                                  p.marked && !p.present && 'text-amber-700 font-medium'
                                )}
                              >
                                {statusLabel(p)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground py-4">No participants in your roster for this account.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send email to parents/guardians</DialogTitle>
            <DialogDescription>
              Uses attendance recorded in the app for this day. Template variables:{' '}
              <code>{'{{attendance_date}}'}</code>, <code>{'{{student_name}}'}</code>, <code>{'{{clicker_id}}'}</code>,{' '}
              <code>{'{{status}}'}</code>, <code>{'{{exam_title}}'}</code> (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={emailScope} onValueChange={(v: EmailScope) => setEmailScope(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent (recorded)</SelectItem>
                    <SelectItem value="unmarked">Not recorded</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Select students</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const ids = new Set(selectedStudentIds);
                      emailCandidates.forEach((p) => {
                        if ((p.parent_email_id || '').trim()) ids.add(Number(p.id));
                      });
                      setSelectedStudentIds(ids);
                    }}
                  >
                    Select all (filtered)
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedStudentIds(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>
              <Input
                placeholder="Search by name / keypad / parent email"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <div className="max-h-56 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Send</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Keypad</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Parent Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailCandidates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          No students match.
                        </TableCell>
                      </TableRow>
                    ) : (
                      emailCandidates.map((p) => {
                        const hasParentEmail = !!(p.parent_email_id || '').trim();
                        const checked = selectedStudentIds.has(Number(p.id));
                        const label = statusLabel(p);
                        return (
                          <TableRow key={p.id} className={!hasParentEmail ? 'opacity-60' : undefined}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!hasParentEmail}
                                onChange={(e) => {
                                  const next = new Set(selectedStudentIds);
                                  if (e.target.checked) next.add(Number(p.id));
                                  else next.delete(Number(p.id));
                                  setSelectedStudentIds(next);
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-muted-foreground">{p.clicker_id ?? '—'}</TableCell>
                            <TableCell>
                              <span
                                className={
                                  p.present ? 'text-green-600 font-medium' : p.marked ? 'text-amber-700' : 'text-muted-foreground'
                                }
                              >
                                {label}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {hasParentEmail ? p.parent_email_id : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">Selected: {selectedStudentIds.size}</p>
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea rows={10} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={sendingEmail}>
              Cancel
            </Button>
            <Button onClick={handleSendEmails} disabled={sendingEmail}>
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={whatsAppDialogOpen} onOpenChange={setWhatsAppDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send attendance on WhatsApp</DialogTitle>
            <DialogDescription>
              Uses attendance from the app for this day. If MSG91 template mode is enabled, the backend fills:
              <code className="ml-1">{'body_1'}</code>=message/date, <code className="ml-1">{'body_2'}</code>=student,
              <code className="ml-1">{'body_3'}</code>=keypad, <code className="ml-1">{'body_4'}</code>=status.
              Recommended message: <code className="ml-1">{'{{attendance_date}}'}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={whatsAppScope} onValueChange={(v: EmailScope) => setWhatsAppScope(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent (recorded)</SelectItem>
                  <SelectItem value="unmarked">Not recorded</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Message parents will receive</Label>
              <pre className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                {whatsAppPreview}
              </pre>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="mb-0">Select students</Label>
                <span className="text-xs text-muted-foreground">Selected: {selectedWhatsAppStudentIds.size}</span>
              </div>
              <Input
                placeholder="Search by name, keypad ID, or parent WhatsApp number"
                value={whatsAppSearch}
                onChange={(e) => setWhatsAppSearch(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleWhatsAppSelectAllVisible}
                  disabled={whatsAppSelectableInViewCount === 0 || sendingWhatsApp}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleWhatsAppClearSelection}
                  disabled={selectedWhatsAppStudentIds.size === 0 || sendingWhatsApp}
                >
                  Clear selection
                </Button>
              </div>
              <div className="max-h-56 overflow-auto border rounded-md p-2 space-y-2">
                {whatsAppCandidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-1 py-2">No students found.</p>
                ) : (
                  whatsAppCandidates.map((p) => {
                    const id = Number(p.id);
                    const disabled = !(p.parent_whatsapp || '').trim();
                    const checked = selectedWhatsAppStudentIds.has(id);
                    const label = statusLabel(p);
                    return (
                      <label
                        key={id}
                        className={`flex items-center justify-between gap-3 rounded px-2 py-2 border ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.clicker_id ? `Keypad: ${p.clicker_id}` : 'No keypad'} • {label}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            WhatsApp: {(p.parent_whatsapp || '').trim() || 'Not available'}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          disabled={disabled}
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(selectedWhatsAppStudentIds);
                            if (e.target.checked) next.add(id);
                            else next.delete(id);
                            setSelectedWhatsAppStudentIds(next);
                          }}
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsAppDialogOpen(false)} disabled={sendingWhatsApp}>
              Cancel
            </Button>
            <Button onClick={handleSendWhatsApp} disabled={sendingWhatsApp}>
              {sendingWhatsApp ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4 mr-2" />
              )}
              Send WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
