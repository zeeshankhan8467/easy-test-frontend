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
import { reportService, ExamReport } from '@/services/reports';
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
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      loadReport();
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

  const formatDurationSeconds = (totalSeconds: number) => {
    const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec.toString().padStart(2, '0')}s`;
  };

  const formatAverageSeconds = (sec: number) => {
    const n = Math.max(0, Number(sec) || 0);
    return `${n.toFixed(1)}s avg`;
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


  const handleExport = async (format: 'excel' | 'csv', layout?: 'individual' | 'questions' | 'personal_achievement') => {
    if (!selectedExamId) return;
    try {
      const blob = await reportService.exportReport(selectedExamId, format, layout);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      const suffix = layout === 'individual' ? '-individual' : layout === 'questions' ? '-questions' : layout === 'personal_achievement' ? '-personal-achievement' : '';
      a.download = `report-${selectedExamId}${suffix}.${ext}`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      const desc = layout === 'individual' ? 'Individual report exported' : layout === 'questions' ? 'By Questions report exported' : layout === 'personal_achievement' ? 'Personal Achievement and Detail report exported' : `Report exported as ${format.toUpperCase()}`;
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
      // Cap at 100% so top bucket is 80-100% (not 100-119%)
      const pct = Math.min(100, Math.max(0, Number(result.percentage) || 0));
      const range = Math.floor(pct / 20) * 20;
      // Top bucket: 80, 100 (from 80-100% scores) -> show as "80-100"
      const key = range >= 80 ? '80-100' : `${range}-${range + 19}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const distributionData = scoreDistribution
    ? Object.entries(scoreDistribution)
        .map(([range, count]) => ({ range, count }))
        .sort((a, b) => {
          const startA = parseInt(a.range, 10);
          const startB = parseInt(b.range, 10);
          return startA - startB;
        })
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
              <Button variant="outline" size="sm" onClick={() => handleExport('excel', 'personal_achievement')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel (Personal Achievement & Detail)
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
                  <CardDescription>
                    Per-question option breakdown. Correct option is highlighted in green.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {report.question_analysis.map((q, index) => {
                      const options = q.options ?? [];
                      const optionVotes = q.option_votes ?? [];
                      const correctIndices = new Set((q.correct_answer ?? []).map(Number));
                      const totalVoted = q.total_attempts;
                      const slideType = 'Choice';
                      return (
                        <div key={q.question_id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                            <span className="font-medium">Q{index + 1}:</span>
                            <span className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: q.question_text }} />
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                            <span>Slide Type: {slideType}</span>
                            <span>Correct Rate: {q.accuracy.toFixed(2)}%</span>
                            <span>Avg. time: {formatAverageSeconds(q.average_time)}</span>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Option</TableHead>
                                <TableHead>Voted</TableHead>
                                <TableHead>Percentage</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {options.map((opt, i) => {
                                const voted = optionVotes[i] ?? 0;
                                const pct = totalVoted > 0 ? (voted / totalVoted) * 100 : 0;
                                const isCorrect = correctIndices.has(i);
                                return (
                                  <TableRow
                                    key={i}
                                    className={isCorrect ? 'bg-green-100 dark:bg-green-900/30' : undefined}
                                  >
                                    <TableCell className={isCorrect ? 'font-medium' : ''}>
                                      {i + 1}/{String.fromCharCode(65 + i)}. {opt}
                                    </TableCell>
                                    <TableCell>{voted}</TableCell>
                                    <TableCell>{pct.toFixed(2)}%</TableCell>
                                  </TableRow>
                                );
                              })}
                              <TableRow className="bg-muted/50 font-medium">
                                <TableCell>Voted</TableCell>
                                <TableCell>{totalVoted}</TableCell>
                                <TableCell>100.00%</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}
                  </div>
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
                        <TableHead>Time</TableHead>
                        <TableHead>Percentage</TableHead>
                        {report.question_analysis.map((q, i) => (
                          <TableHead key={q.question_id} className="text-center whitespace-nowrap">
                            Q{i + 1} answer
                          </TableHead>
                        ))}
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
                          <TableCell className="text-muted-foreground tabular-nums">
                            {formatDurationSeconds(result.time_taken ?? 0)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {result.percentage.toFixed(1)}%
                          </TableCell>
                          {report.question_analysis.map((q) => {
                            const qa = result.question_answers?.find(
                              (x) => Number(x.question_id) === Number(q.question_id),
                            );
                            const label = qa?.response?.trim() ? qa.response : '—';
                            return (
                              <TableCell key={q.question_id} className="text-center tabular-nums">
                                {label}
                              </TableCell>
                            );
                          })}
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

