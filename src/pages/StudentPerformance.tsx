import { useState } from 'react';
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
import { reportService, StudentPerformanceRow } from '@/services/reports';
import { useToast } from '@/components/ui/use-toast';
import { Download, Loader2 } from 'lucide-react';

export function StudentPerformance() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [rows, setRows] = useState<StudentPerformanceRow[]>([]);

  const [filters, setFilters] = useState({
    admission_no: '',
    roll_no: '',
    student_name: '',
    class_name: '',
    section: '',
    teacher_name: '',
    subject: '',
    from_date: '',
    to_date: '',
  });

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => (v || '').trim() !== '')
      );
      const data = await reportService.getStudentPerformanceReport(payload as any);
      setRows(data.results || []);
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

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => (v || '').trim() !== '')
      );
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
          <CardDescription>Apply filters to view student performance data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <CardDescription>{rows.length} student(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission No</TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Teacher Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Total Percentage %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No data found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.participant_id}>
                    <TableCell>{r.admission_no || '-'}</TableCell>
                    <TableCell>{r.roll_no || '-'}</TableCell>
                    <TableCell className="font-medium">{r.student_name || '-'}</TableCell>
                    <TableCell>{r.class_name || '-'}</TableCell>
                    <TableCell>{r.section || '-'}</TableCell>
                    <TableCell>{r.teacher_name || '-'}</TableCell>
                    <TableCell>{r.subject || '-'}</TableCell>
                    <TableCell>{Number(r.total_percentage || 0).toFixed(2)}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

