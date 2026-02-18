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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { examService, Exam } from '@/services/exams';
import { reportService, ExamReport, ExamAttendance } from '@/services/reports';
import { useToast } from '@/components/ui/use-toast';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function Reports() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [report, setReport] = useState<ExamReport | null>(null);
  const [attendance, setAttendance] = useState<ExamAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      loadReport();
      loadAttendance();
    } else {
      setAttendance(null);
    }
  }, [selectedExamId]);

  const loadExams = async () => {
    try {
      const data = await examService.getAll();
      setExams(data || []);
    } catch (error: any) {
      console.error('Failed to load exams:', error);
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

  const loadReport = async () => {
    if (!selectedExamId) return;
    setReportLoading(true);
    try {
      const data = await reportService.getExamReport(selectedExamId);
      setReport(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load report',
        variant: 'destructive',
      });
    } finally {
      setReportLoading(false);
    }
  };

  const loadAttendance = async () => {
    if (!selectedExamId) return;
    setAttendanceLoading(true);
    setAttendance(null);
    try {
      const data = await reportService.getAttendance(selectedExamId);
      setAttendance(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load attendance',
        variant: 'destructive',
      });
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'csv', layout?: 'individual' | 'questions') => {
    if (!selectedExamId) return;
    try {
      const blob = await reportService.exportReport(selectedExamId, format, layout);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      const suffix = layout === 'individual' ? '-individual' : layout === 'questions' ? '-questions' : '';
      a.download = `report-${selectedExamId}${suffix}.${ext}`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      const desc = layout === 'individual' ? 'Individual report exported' : layout === 'questions' ? 'By Questions report exported' : `Report exported as ${format.toUpperCase()}`;
      toast({ title: 'Success', description: desc });
    } catch (error: any) {
      const msg = error?.data?.error ?? error?.data?.detail ?? error?.message ?? 'Failed to export report';
      toast({
        title: 'Error',
        description: typeof msg === 'string' ? msg : 'Failed to export report',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const accuracyData = report?.question_analysis.map((q) => ({
    question: `Q${report.question_analysis.indexOf(q) + 1}`,
    accuracy: q.accuracy,
  }));

  const scoreDistribution = report?.participant_results.reduce(
    (acc, result) => {
      const range = Math.floor(result.percentage / 20) * 20;
      const key = `${range}-${range + 19}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const distributionData = scoreDistribution
    ? Object.entries(scoreDistribution).map(([range, count]) => ({
        range,
        count,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Detailed analysis and insights
          </p>
        </div>
        {selectedExamId && (
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium text-muted-foreground">Export reports</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                CSV (summary)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel (full)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('excel', 'individual')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel (by participant)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('excel', 'questions')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel (by questions)
              </Button>
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Exam</CardTitle>
          <CardDescription>Choose an exam to view reports</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {reportLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Participants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.total_participants}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average Score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.average_score.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Highest Score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.highest_score.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Lowest Score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.lowest_score.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="questions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="questions">Question Analysis</TabsTrigger>
              <TabsTrigger value="participants">Participant Results</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Question-wise Accuracy</CardTitle>
                  <CardDescription>
                    Performance analysis for each question
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={accuracyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="question" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="accuracy" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Question Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Total Attempts</TableHead>
                        <TableHead>Correct</TableHead>
                        <TableHead>Accuracy</TableHead>
                        <TableHead>Avg Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.question_analysis.map((q, index) => (
                        <TableRow key={q.question_id}>
                          <TableCell className="max-w-md">
                            <div className="prose prose-sm max-w-none">
                              <span className="font-medium">Q{index + 1}: </span>
                              <span dangerouslySetInnerHTML={{ __html: q.question_text }} />
                            </div>
                          </TableCell>
                          <TableCell>{q.total_attempts}</TableCell>
                          <TableCell>{q.correct_attempts}</TableCell>
                          <TableCell>{q.accuracy.toFixed(1)}%</TableCell>
                          <TableCell>{q.average_time.toFixed(1)}s</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance</CardTitle>
                  <CardDescription>
                    Who was marked present for this exam (via EasyTest Live clicker or submitted answers).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {attendanceLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : attendance ? (
                    <>
                      <div className="flex gap-4 mb-4 text-sm">
                        <span className="font-medium text-green-600">
                          {attendance.present_count} present
                        </span>
                        <span className="text-muted-foreground">
                          / {attendance.total_count} total
                        </span>
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
                          {attendance.participants.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                No participants assigned to this exam.
                              </TableCell>
                            </TableRow>
                          ) : (
                            attendance.participants.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell className="text-muted-foreground">{p.email}</TableCell>
                                <TableCell>
                                  <span
                                    className={
                                      p.present
                                        ? 'text-green-600 font-medium'
                                        : 'text-muted-foreground'
                                    }
                                  >
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
            </TabsContent>

            <TabsContent value="participants" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={distributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(props: any) => `${props.range}%: ${props.count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {distributionData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Participant Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Correct</TableHead>
                        <TableHead>Wrong</TableHead>
                        <TableHead>Unattempted</TableHead>
                        <TableHead>Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.participant_results.map((result) => (
                        <TableRow key={result.participant_id}>
                          <TableCell className="font-bold">
                            #{result.rank}
                          </TableCell>
                          <TableCell>{result.participant_name}</TableCell>
                          <TableCell>{result.score}</TableCell>
                          <TableCell className="text-green-600">
                            {result.correct_answers}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {result.wrong_answers}
                          </TableCell>
                          <TableCell>{result.unattempted}</TableCell>
                          <TableCell className="font-medium">
                            {result.percentage.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : selectedExamId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No report data available</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

