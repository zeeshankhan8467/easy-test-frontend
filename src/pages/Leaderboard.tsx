import { useEffect, useState } from 'react';
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
import { leaderboardService, type Leaderboard as LeaderboardType } from '@/services/leaderboard';
import { useToast } from '@/components/ui/use-toast';
import { Trophy, Medal, Award, Loader2 } from 'lucide-react';

export function Leaderboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      loadLeaderboard();
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

  const loadLeaderboard = async () => {
    if (!selectedExamId) return;
    setLeaderboardLoading(true);
    try {
      const data = await leaderboardService.getExamLeaderboard(selectedExamId);
      setLeaderboard(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load leaderboard',
        variant: 'destructive',
      });
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold">#{rank}</span>;
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground mt-2">
          Rankings and top performers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Exam</CardTitle>
          <CardDescription>Choose an exam to view leaderboard</CardDescription>
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

      {leaderboardLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : leaderboard ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{leaderboard.exam_title}</CardTitle>
              <CardDescription>
                Generated on {new Date(leaderboard.generated_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Top 3 Podium */}
              {leaderboard.entries.length >= 3 && (
                <div className="flex items-end justify-center gap-4 mb-8">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-t-lg p-4 w-24 h-20 flex items-center justify-center">
                      <Medal className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 w-24 text-center rounded-b-lg">
                      <p className="font-bold text-sm">
                        {leaderboard.entries[1].participant_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {leaderboard.entries[1].percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center">
                    <div className="bg-yellow-200 dark:bg-yellow-900 rounded-t-lg p-4 w-28 h-28 flex items-center justify-center">
                      <Trophy className="h-10 w-10 text-yellow-500" />
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-800 p-3 w-28 text-center rounded-b-lg">
                      <p className="font-bold">
                        {leaderboard.entries[0].participant_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {leaderboard.entries[0].percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center">
                    <div className="bg-amber-200 dark:bg-amber-900 rounded-t-lg p-4 w-24 h-16 flex items-center justify-center">
                      <Award className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="bg-amber-100 dark:bg-amber-800 p-3 w-24 text-center rounded-b-lg">
                      <p className="font-bold text-sm">
                        {leaderboard.entries[2].participant_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {leaderboard.entries[2].percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Leaderboard Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Rank</TableHead>
                    <TableHead>Participant</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Correct</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Time Taken</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.entries.map((entry) => (
                    <TableRow key={entry.participant_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRankIcon(entry.rank)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.participant_name}
                      </TableCell>
                      <TableCell>{entry.score}</TableCell>
                      <TableCell className="text-green-600">
                        {entry.correct_answers}/{entry.total_questions}
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.percentage.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        {Math.floor(entry.time_taken / 60)}m {entry.time_taken % 60}s
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : selectedExamId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No leaderboard data available</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

