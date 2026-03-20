import { useEffect, useMemo, useState } from 'react';
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
import { Loader2, FileSpreadsheet, FileText, Mail } from 'lucide-react';
import { examService, Exam } from '@/services/exams';
import { reportService, ExamAttendance } from '@/services/reports';
import { useToast } from '@/components/ui/use-toast';

export function Attendance() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [attendance, setAttendance] = useState<ExamAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const { toast } = useToast();

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailScope, setEmailScope] = useState<'present' | 'absent' | 'all'>('absent');
  const [emailSubject, setEmailSubject] = useState('Attendance update');
  const [emailBody, setEmailBody] = useState(
    'Dear Parent/Guardian,\n\nThis is an attendance update for the exam: {{exam_title}}.\n\nStudent: {{student_name}}\nKeypad ID: {{clicker_id}}\nStatus: {{status}}\n\nRegards,\nEasyTest'
  );
  const [sendingEmail, setSendingEmail] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadExams = async () => {
      try {
        const data = await examService.getAll();
        setExams(data || []);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to load exams',
          variant: 'destructive',
        });
        setExams([]);
      } finally {
        setLoading(false);
      }
    };
    loadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadAttendance = async () => {
      if (!selectedExamId) {
        setAttendance(null);
        return;
      }
      setAttendanceLoading(true);
      setAttendance(null);
      try {
        const data = await reportService.getAttendance(selectedExamId);
        setAttendance(data);
      } catch {
        toast({ title: 'Error', description: 'Failed to load attendance', variant: 'destructive' });
      } finally {
        setAttendanceLoading(false);
      }
    };
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamId]);

  const filteredParticipants = useMemo(() => {
    const ps = attendance?.participants ?? [];
    if (statusFilter === 'present') return ps.filter((p) => p.present);
    if (statusFilter === 'absent') return ps.filter((p) => !p.present);
    return ps;
  }, [attendance, statusFilter]);

  const emailCandidates = useMemo(() => {
    const ps = attendance?.participants ?? [];
    const scoped =
      emailScope === 'present' ? ps.filter((p) => p.present) : emailScope === 'absent' ? ps.filter((p) => !p.present) : ps;
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
  }, [attendance, emailScope, studentSearch]);

  const openEmailDialog = () => {
    // Default: pre-select everyone in the chosen scope who has a parent email
    const ps = attendance?.participants ?? [];
    const scoped =
      emailScope === 'present' ? ps.filter((p) => p.present) : emailScope === 'absent' ? ps.filter((p) => !p.present) : ps;
    const ids = new Set<number>(
      scoped.filter((p) => (p.parent_email_id || '').trim()).map((p) => Number(p.id))
    );
    setSelectedStudentIds(ids);
    setStudentSearch('');
    setEmailDialogOpen(true);
  };

  const handleDownload = async (format: 'excel' | 'pdf') => {
    if (!selectedExamId) return;
    try {
      const blob = await reportService.exportAttendanceReport(selectedExamId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      a.download = `attendance-${selectedExamId}.${ext}`;
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
    if (!selectedExamId) return;
    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) {
      toast({ title: 'Validation', description: 'Select at least one student.', variant: 'destructive' });
      return;
    }
    setSendingEmail(true);
    try {
      const result = await reportService.sendAttendanceParentEmails(selectedExamId, {
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
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground mt-2">View attendance by exam and email parents/guardians</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Exam</CardTitle>
          <CardDescription>Select an exam from the dropdown to view attendance</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Label>Exam</Label>
            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select an exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={openEmailDialog}
                disabled={!attendance || attendanceLoading}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send email to parents
              </Button>
            </div>

            <div className="flex items-end gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDownload('excel')}
                disabled={!selectedExamId}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDownload('pdf')}
                disabled={!selectedExamId}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
          <CardDescription>Present means the participant attempted or submitted answers</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : attendance ? (
            <>
              <div className="flex gap-4 mb-4 text-sm">
                <span className="font-medium text-green-600">{attendance.present_count} present</span>
                <span className="text-muted-foreground">/ {attendance.total_count} total</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No participants.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredParticipants.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.email}</TableCell>
                        <TableCell>
                          <span className={p.present ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {p.present ? 'Present' : 'Absent'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-muted-foreground py-4">Select an exam to view attendance.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send email to parents/guardians</DialogTitle>
            <DialogDescription>
              Emails are sent to each participant’s <strong>Parent Email ID</strong> (if available).
              Template variables: <code>{'{{exam_title}}'}</code>, <code>{'{{student_name}}'}</code>, <code>{'{{clicker_id}}'}</code>, <code>{'{{status}}'}</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={emailScope} onValueChange={(v: any) => setEmailScope(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudentIds(new Set())}
                  >
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
                              <span className={p.present ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                                {p.present ? 'Present' : 'Absent'}
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
              <p className="text-xs text-muted-foreground">
                Selected: {selectedStudentIds.size}
              </p>
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
    </div>
  );
}

