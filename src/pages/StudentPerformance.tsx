import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { examService, Exam } from '@/services/exams';
import { reportService, StudentPerformanceRow } from '@/services/reports';
import { useToast } from '@/components/ui/use-toast';
import { Download, Loader2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const ALL_EXAMS_VALUE = '__all_exams__';

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' });
  } catch {
    return '—';
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function buildQueryPayload(filters: Record<string, string>) {
  const out: Record<string, string> = {};
  Object.entries(filters).forEach(([k, v]) => {
    const t = (v || '').trim();
    if (t !== '') out[k] = t;
  });
  return out;
}

export function StudentPerformance() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [rows, setRows] = useState<StudentPerformanceRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [chartStudentId, setChartStudentId] = useState<string>('');

  const [filters, setFilters] = useState({
    admission_no: '',
    roll_no: '',
    student_name: '',
    class_name: '',
    section: '',
    teacher_name: '',
    subject: '',
    exam_name: '',
    exam_id: '',
    from_date: '',
    to_date: '',
  });

  useEffect(() => {
    let cancelled = false;
    examService
      .getAll()
      .then((list) => {
        if (!cancelled) setExams(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setExams([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const payload = buildQueryPayload(filters as unknown as Record<string, string>);
      const data = await reportService.getStudentPerformanceReport(payload as any);
      setRows(data.results || []);
      setChartStudentId('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.detail || 'Failed to load student performance report',
        variant: 'destructive',
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const studentOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    rows.forEach((r) => {
      const id = String(r.participant_id);
      if (map.has(id)) return;
      const name = (r.student_name || '').trim() || 'Unknown student';
      const meta = [r.admission_no, r.roll_no, r.class_name && r.section ? `${r.class_name}-${r.section}` : (r.class_name || r.section)]
        .filter((v) => v && String(v).trim() !== '')
        .join(' • ');
      map.set(id, { id, label: meta ? `${name} (${meta})` : name });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    );
  }, [rows]);

  useEffect(() => {
    if (studentOptions.length === 0) {
      if (chartStudentId !== '') setChartStudentId('');
      return;
    }
    if (!chartStudentId || !studentOptions.some((o) => o.id === chartStudentId)) {
      setChartStudentId(studentOptions[0].id);
    }
  }, [studentOptions, chartStudentId]);

  const chartData = useMemo(() => {
    if (!chartStudentId) return [] as Array<{
      key: string;
      dateLabel: string;
      examName: string;
      percentage: number;
      submittedAt: string | null | undefined;
      sortKey: number;
    }>;
    return rows
      .filter((r) => String(r.participant_id) === chartStudentId)
      .map((r, idx) => {
        const submitted = r.submitted_at ? new Date(r.submitted_at) : null;
        const valid = submitted && !Number.isNaN(submitted.getTime());
        return {
          key: `${r.exam_id}-${idx}`,
          dateLabel: valid ? formatShortDate(r.submitted_at) : 'Not submitted',
          examName: r.exam_name || `Exam #${r.exam_id}`,
          percentage: Number(r.total_percentage ?? 0),
          submittedAt: r.submitted_at ?? null,
          sortKey: valid ? submitted!.getTime() : Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [rows, chartStudentId]);

  const chartStudentMeta = useMemo(() => {
    if (!chartStudentId) return null;
    const row = rows.find((r) => String(r.participant_id) === chartStudentId);
    if (!row) return null;
    return {
      name: row.student_name || 'Unknown student',
      admission_no: row.admission_no,
      roll_no: row.roll_no,
      class_section: [row.class_name, row.section].filter((v) => v && String(v).trim() !== '').join(' / '),
    };
  }, [rows, chartStudentId]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const payload = buildQueryPayload(filters as unknown as Record<string, string>);
      const blob = await reportService.exportStudentPerformanceReport({ ...(payload as any), format: 'excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = 'student-performance-report.xlsx';
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: 'Success', description: 'Student performance report downloaded.' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.detail || 'Failed to download student performance report',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Report</CardTitle>
          <CardDescription>
            One row per student per exam (submitted attempt). Filter by exam name or pick an exam; other fields narrow
            the list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Exam</Label>
              <Select
                value={filters.exam_id ? filters.exam_id : ALL_EXAMS_VALUE}
                onValueChange={(v) => {
                  if (v === ALL_EXAMS_VALUE) {
                    updateFilter('exam_id', '');
                  } else {
                    updateFilter('exam_id', v);
                    updateFilter('exam_name', '');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_EXAMS_VALUE}>All exams</SelectItem>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Exam name contains</Label>
              <Input
                placeholder="Filter by title (optional)"
                value={filters.exam_name}
                onChange={(e) => {
                  updateFilter('exam_name', e.target.value);
                  if (e.target.value.trim()) updateFilter('exam_id', '');
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Admission No</Label>
              <Input value={filters.admission_no} onChange={(e) => updateFilter('admission_no', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Roll No.</Label>
              <Input value={filters.roll_no} onChange={(e) => updateFilter('roll_no', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Student Name</Label>
              <Input value={filters.student_name} onChange={(e) => updateFilter('student_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Input value={filters.class_name} onChange={(e) => updateFilter('class_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Input value={filters.section} onChange={(e) => updateFilter('section', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={filters.subject} onChange={(e) => updateFilter('subject', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Teacher Name</Label>
              <Input value={filters.teacher_name} onChange={(e) => updateFilter('teacher_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={filters.from_date} onChange={(e) => updateFilter('from_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={filters.to_date} onChange={(e) => updateFilter('to_date', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApply} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Apply Filters
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student Performance Report</CardTitle>
          <CardDescription>{rows.length} row(s) — exam-wise results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead className="whitespace-nowrap">Exam ID</TableHead>
                  <TableHead className="whitespace-nowrap">Exam created</TableHead>
                  <TableHead className="whitespace-nowrap">Exam last updated</TableHead>
                  <TableHead className="whitespace-nowrap">Submitted</TableHead>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Teacher Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Exam %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                      No data found. Apply filters to load exam-wise performance.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={`${r.participant_id}-${r.exam_id}`}>
                      <TableCell className="font-medium max-w-[220px] truncate" title={r.exam_name}>
                        {r.exam_name || '—'}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{r.exam_id ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatDateTime(r.exam_created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatDateTime(r.exam_updated_at)}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap tabular-nums">
                        {formatDateTime(r.submitted_at)}
                      </TableCell>
                      <TableCell>{r.admission_no || '-'}</TableCell>
                      <TableCell>{r.roll_no || '-'}</TableCell>
                      <TableCell className="font-medium">{r.student_name || '-'}</TableCell>
                      <TableCell>{r.class_name || '-'}</TableCell>
                      <TableCell>{r.section || '-'}</TableCell>
                      <TableCell>{r.teacher_name || '-'}</TableCell>
                      <TableCell>{r.subject || '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(r.total_percentage ?? 0).toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student exam timeline</CardTitle>
          <CardDescription>
            Pick a student to see each exam they attempted plotted by submitted date. Bar height is the exam percentage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select
                value={chartStudentId || ''}
                onValueChange={(v) => setChartStudentId(v)}
                disabled={studentOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={studentOptions.length === 0 ? 'Apply filters to load students' : 'Select student'} />
                </SelectTrigger>
                <SelectContent>
                  {studentOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {chartStudentMeta ? (
              <div className="text-sm text-muted-foreground self-end">
                <div className="font-medium text-foreground">{chartStudentMeta.name}</div>
                <div>
                  {[
                    chartStudentMeta.admission_no ? `Admission ${chartStudentMeta.admission_no}` : '',
                    chartStudentMeta.roll_no ? `Roll ${chartStudentMeta.roll_no}` : '',
                    chartStudentMeta.class_section ? `Class ${chartStudentMeta.class_section}` : '',
                  ]
                    .filter(Boolean)
                    .join(' • ') || '—'}
                </div>
                <div>{chartData.length} exam(s) for this student</div>
              </div>
            ) : null}
          </div>
          {chartData.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              {studentOptions.length === 0
                ? 'No data yet. Apply filters above to load students.'
                : 'No exams for the selected student.'}
            </div>
          ) : (
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 16, right: 16, left: 0, bottom: 16 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dateLabel"
                    interval={0}
                    height={36}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                    formatter={(value: number) => [`${Number(value).toFixed(2)}%`, 'Score']}
                    labelFormatter={(_label, payload) => {
                      const item = payload?.[0]?.payload as
                        | { examName: string; dateLabel: string; submittedAt?: string | null }
                        | undefined;
                      if (!item) return '';
                      return `${item.examName} — ${item.dateLabel}`;
                    }}
                  />
                  <Bar dataKey="percentage" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
