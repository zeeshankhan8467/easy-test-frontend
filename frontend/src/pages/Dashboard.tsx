import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardService, DashboardData } from '@/services/dashboard';
import { useToast } from '@/components/ui/use-toast';
import {
  FileText,
  Users,
  TrendingUp,
  Calendar,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const dashboardData = await dashboardService.getDashboard();
      setData(dashboardData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return <div>No data available</div>;
  }

  const stats = [
    {
      title: 'Total Exams',
      value: data.stats.total_exams,
      icon: FileText,
      description: 'All created exams',
    },
    {
      title: 'Total Participants',
      value: data.stats.total_participants,
      icon: Users,
      description: 'Registered users',
    },
    {
      title: 'Average Score',
      value: `${data.stats.average_score.toFixed(1)}%`,
      icon: TrendingUp,
      description: 'Across all exams',
    },
    {
      title: 'Attendance Rate',
      value: `${data.stats.attendance_rate.toFixed(1)}%`,
      icon: Calendar,
      description: 'Overall participation',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your exam platform
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>Average scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.performance_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Average Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participation</CardTitle>
            <CardDescription>Number of participants per exam</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.performance_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="participants"
                  fill="hsl(var(--primary))"
                  name="Participants"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Exams */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Exams</CardTitle>
          <CardDescription>Latest exam activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recent_exams.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No exams yet. Create your first exam to get started.
              </p>
            ) : (
              data.recent_exams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <h3 className="font-semibold">{exam.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(exam.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {exam.participant_count} participants
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Avg: {exam.average_score.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

