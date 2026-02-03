import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { examService, Exam } from '@/services/exams';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Lock, Download, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ExamList() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const data = await examService.getAll();
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setExams(data);
      } else if (data && Array.isArray(data.results)) {
        setExams(data.results);
      } else {
        console.warn('Unexpected data format:', data);
        setExams([]);
      }
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

  const handleDelete = async () => {
    if (!selectedExam) return;
    try {
      await examService.delete(selectedExam.id);
      toast({
        title: 'Success',
        description: 'Exam deleted successfully',
      });
      loadExams();
      setDeleteDialogOpen(false);
      setSelectedExam(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete exam',
        variant: 'destructive',
      });
    }
  };

  const handleFreeze = async (examId: string) => {
    try {
      await examService.freeze(examId);
      toast({
        title: 'Success',
        description: 'Exam frozen successfully',
      });
      loadExams();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to freeze exam',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateSnapshot = async (examId: string) => {
    try {
      const blob = await examService.generateSnapshot(examId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam-${examId}-snapshot.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: 'Success',
        description: 'Snapshot generated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to generate snapshot',
        variant: 'destructive',
      });
    }
  };

  // Ensure exams is always an array
  const safeExams = Array.isArray(exams) ? exams : [];

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
          <h1 className="text-3xl font-bold tracking-tight">Exams</h1>
          <p className="text-muted-foreground mt-2">
            Manage your exams and assessments
          </p>
        </div>
        <Link to="/exams/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Exam
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Exams</CardTitle>
          <CardDescription>List of all created exams</CardDescription>
        </CardHeader>
        <CardContent>
          {safeExams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No exams created yet</p>
              <Link to="/exams/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Exam
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Marking</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeExams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.title}</TableCell>
                    <TableCell>{exam.duration} min</TableCell>
                    <TableCell>
                      +{exam.positive_marking} / -{exam.negative_marking}
                    </TableCell>
                    <TableCell>
                      {exam.revisable ? (
                        <span className="text-green-600">Revisable</span>
                      ) : (
                        <span className="text-orange-600">Non-revisable</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {exam.frozen ? (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Lock className="h-3 w-3" />
                          Frozen
                        </span>
                      ) : (
                        <span className="text-green-600">Active</span>
                      )}
                    </TableCell>
                    <TableCell>{exam.question_count || 0}</TableCell>
                    <TableCell>{exam.participant_count || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleGenerateSnapshot(exam.id)}
                          title="Generate Snapshot"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {!exam.frozen && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleFreeze(exam.id)}
                            title="Freeze Exam"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        <Link to={`/exams/${exam.id}/edit`}>
                          <Button variant="ghost" size="icon" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedExam(exam);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete"
                        >
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedExam?.title}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedExam(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

