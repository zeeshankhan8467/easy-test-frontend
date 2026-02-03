import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { examService, ExamCreate, ExamQuestionInput } from '@/services/exams';
import { questionService, Question } from '@/services/questions';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Plus, X, Eye, ArrowUp, ArrowDown, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Step = 'details' | 'questions' | 'review';

export function ExamForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // Exam basic info
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    duration: 60,
    revisable: true,
    status: 'draft' as 'draft' | 'frozen' | 'completed',
  });

  // Question selection
  const [selectedQuestions, setSelectedQuestions] = useState<Array<{
    question: Question;
    order: number;
    positive_marks: number;
    negative_marks: number;
    is_optional: boolean;
  }>>([]);

  // Available questions for selection
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (id) {
      loadExam();
    }
    loadAvailableQuestions();
  }, [id]);

  useEffect(() => {
    loadAvailableQuestions();
  }, [searchQuery, filterDifficulty, filterType, id]);

  const loadExam = async () => {
    try {
      const exam = await examService.getById(id!);
      setExamData({
        title: exam.title,
        description: exam.description || '',
        duration: exam.duration,
        revisable: exam.revisable,
        status: exam.status,
      });

      // Load exam questions
      if (exam.questions && exam.questions.length > 0) {
        const questions = exam.questions.map((eq: any) => ({
          question: eq.question,
          order: eq.order || 0,
          positive_marks: typeof eq.positive_marks === 'number' ? eq.positive_marks : parseFloat(eq.positive_marks) || 1.0,
          negative_marks: typeof eq.negative_marks === 'number' ? eq.negative_marks : parseFloat(eq.negative_marks) || 0.0,
          is_optional: eq.is_optional || false,
        }));
        setSelectedQuestions(questions);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load exam',
        variant: 'destructive',
      });
    }
  };

  const loadAvailableQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const questions = await examService.getAvailableQuestions({
        exam_id: id,
        difficulty: filterDifficulty !== 'all' ? filterDifficulty : undefined,
        type: filterType !== 'all' ? filterType : undefined,
        search: searchQuery,
      });
      setAvailableQuestions(questions);
    } catch (error: any) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const addQuestion = (question: Question) => {
    // Check if already added
    if (selectedQuestions.some((sq) => sq.question.id === question.id)) {
      toast({
        title: 'Already Added',
        description: 'This question is already in the exam',
        variant: 'default',
      });
      return;
    }

    const newQuestion = {
      question,
      order: selectedQuestions.length,
      positive_marks: typeof question.marks === 'number' ? question.marks : parseFloat(question.marks) || 1.0,
      negative_marks: 0.0,
      is_optional: false,
    };

    setSelectedQuestions([...selectedQuestions, newQuestion]);
    toast({
      title: 'Question Added',
      description: 'Question added to exam',
    });
  };

  const removeQuestion = (questionId: string) => {
    const updated = selectedQuestions
      .filter((sq) => sq.question.id !== questionId)
      .map((sq, idx) => ({ ...sq, order: idx }));
    setSelectedQuestions(updated);
  };

  const updateQuestionMarks = (questionId: string, field: 'positive_marks' | 'negative_marks' | 'is_optional', value: number | boolean) => {
    setSelectedQuestions(
      selectedQuestions.map((sq) => {
        if (sq.question.id === questionId) {
          // Ensure numeric fields are numbers
          if (field === 'positive_marks' || field === 'negative_marks') {
            const numValue = typeof value === 'number' ? value : parseFloat(value as any) || 0;
            return { ...sq, [field]: numValue };
          }
          return { ...sq, [field]: value };
        }
        return sq;
      })
    );
  };

  const moveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const index = selectedQuestions.findIndex((sq) => sq.question.id === questionId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedQuestions.length) return;

    const updated = [...selectedQuestions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((sq, idx) => {
      sq.order = idx;
    });
    setSelectedQuestions(updated);
  };

  const calculateTotalMarks = () => {
    return selectedQuestions.reduce((sum, sq) => {
      const marks = typeof sq.positive_marks === 'number' ? sq.positive_marks : parseFloat(sq.positive_marks) || 0;
      return sum + marks;
    }, 0);
  };

  const validateForm = (): string | null => {
    if (!examData.title.trim()) {
      return 'Exam title is required';
    }
    if (examData.duration < 1) {
      return 'Duration must be at least 1 minute';
    }
    if (selectedQuestions.length === 0) {
      return 'At least one question is required';
    }
    for (const sq of selectedQuestions) {
      if (sq.positive_marks < 0) {
        return `Question ${sq.order + 1}: Positive marks cannot be negative`;
      }
      if (sq.negative_marks < 0) {
        return `Question ${sq.order + 1}: Negative marks cannot be negative`;
      }
    }
    return null;
  };

  const handleSaveDraft = async () => {
    const error = validateForm();
    if (error) {
      toast({
        title: 'Validation Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const questions: ExamQuestionInput[] = selectedQuestions.map((sq) => ({
        question_id: parseInt(sq.question.id),
        order: sq.order,
        positive_marks: sq.positive_marks,
        negative_marks: sq.negative_marks,
        is_optional: sq.is_optional,
      }));

      if (id) {
        await examService.update(id, {
          ...examData,
          questions,
        });
        toast({
          title: 'Success',
          description: 'Exam draft saved successfully',
        });
      } else {
        const exam = await examService.create({
          ...examData,
          questions,
        });
        toast({
          title: 'Success',
          description: 'Exam draft created successfully',
        });
        navigate(`/exams/${exam.id}/edit`);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.response?.data?.message || 'Failed to save exam',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFreeze = async () => {
    const error = validateForm();
    if (error) {
      toast({
        title: 'Validation Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    if (!id) {
      toast({
        title: 'Error',
        description: 'Please save the exam first before freezing',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Save first
      const questions: ExamQuestionInput[] = selectedQuestions.map((sq) => ({
        question_id: parseInt(sq.question.id),
        order: sq.order,
        positive_marks: sq.positive_marks,
        negative_marks: sq.negative_marks,
        is_optional: sq.is_optional,
      }));

      await examService.update(id, {
        ...examData,
        questions,
      });

      // Then freeze
      await examService.freeze(id);
      toast({
        title: 'Success',
        description: 'Exam frozen successfully. It can no longer be edited.',
      });
      navigate('/exams');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.response?.data?.message || 'Failed to freeze exam',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const canEdit = !id || examData.status === 'draft';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/exams">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {id ? 'Edit Exam' : 'Create New Exam'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {id && examData.status === 'frozen' 
              ? 'This exam is frozen and cannot be edited'
              : 'Configure your exam step by step'}
          </p>
        </div>
        {id && examData.status === 'frozen' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 rounded-md">
            <Lock className="h-4 w-4 text-yellow-800 dark:text-yellow-200" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Frozen</span>
          </div>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`flex items-center gap-2 ${currentStep === 'details' ? 'text-primary' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'details' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1
          </div>
          <span className="font-medium">Details</span>
        </div>
        <div className="w-12 h-0.5 bg-border" />
        <div className={`flex items-center gap-2 ${currentStep === 'questions' ? 'text-primary' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'questions' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            2
          </div>
          <span className="font-medium">Questions</span>
        </div>
        <div className="w-12 h-0.5 bg-border" />
        <div className={`flex items-center gap-2 ${currentStep === 'review' ? 'text-primary' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            3
          </div>
          <span className="font-medium">Review</span>
        </div>
      </div>

      {!canEdit ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Exam is Frozen</h3>
            <p className="text-muted-foreground">
              This exam has been frozen and cannot be edited. View the exam details or generate a snapshot.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Step 1: Exam Details */}
          {currentStep === 'details' && (
            <Card>
              <CardHeader>
                <CardTitle>Exam Details</CardTitle>
                <CardDescription>
                  Configure basic exam information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Exam Title *</Label>
                    <Input
                      id="title"
                      value={examData.title}
                      onChange={(e) =>
                        setExamData({ ...examData, title: e.target.value })
                      }
                      required
                      placeholder="Enter exam title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={examData.description}
                      onChange={(e) =>
                        setExamData({ ...examData, description: e.target.value })
                      }
                      placeholder="Enter exam description (optional)"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={examData.duration}
                        onChange={(e) =>
                          setExamData({
                            ...examData,
                            duration: parseInt(e.target.value) || 1,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="revisable">Exam Mode</Label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="revisable"
                          checked={examData.revisable}
                          onCheckedChange={(checked) =>
                            setExamData({ ...examData, revisable: checked as boolean })
                          }
                        />
                        <Label htmlFor="revisable" className="cursor-pointer">
                          Allow participants to revise answers
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={() => setCurrentStep('questions')}
                      disabled={!examData.title.trim()}
                    >
                      Next: Select Questions
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/exams')}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Question Selection */}
          {currentStep === 'questions' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select Questions</CardTitle>
                  <CardDescription>
                    Choose questions from your question bank and set marks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Search and Filters */}
                  <div className="space-y-4 mb-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Input
                        placeholder="Search questions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Difficulties</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="mcq">MCQ</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="multiple_select">Multiple Select</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Available Questions */}
                  <div className="space-y-2">
                    <Label>Available Questions ({availableQuestions.length})</Label>
                    {loadingQuestions ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : availableQuestions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No questions available
                      </div>
                    ) : (
                      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Question</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Difficulty</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {availableQuestions.map((question) => (
                              <TableRow key={question.id}>
                                <TableCell className="max-w-md">
                                  <div
                                    className="prose prose-sm max-w-none line-clamp-2"
                                    dangerouslySetInnerHTML={{ __html: question.text }}
                                  />
                                </TableCell>
                                <TableCell className="capitalize">{question.type}</TableCell>
                                <TableCell>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      question.difficulty === 'easy'
                                        ? 'bg-green-100 text-green-800'
                                        : question.difficulty === 'medium'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {question.difficulty}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setPreviewQuestion(question)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addQuestion(question)}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Selected Questions */}
              <Card>
                <CardHeader>
                  <CardTitle>Selected Questions ({selectedQuestions.length})</CardTitle>
                  <CardDescription>
                    Configure marks for each question. Total Marks: {calculateTotalMarks().toFixed(2)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedQuestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No questions selected. Add questions from above.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Order</TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead className="w-32">Positive Marks</TableHead>
                            <TableHead className="w-32">Negative Marks</TableHead>
                            <TableHead className="w-24">Optional</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedQuestions
                            .sort((a, b) => a.order - b.order)
                            .map((sq, idx) => (
                              <TableRow key={sq.question.id}>
                                <TableCell>{sq.order + 1}</TableCell>
                                <TableCell className="max-w-md">
                                  <div
                                    className="prose prose-sm max-w-none line-clamp-2"
                                    dangerouslySetInnerHTML={{ __html: sq.question.text }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={sq.positive_marks}
                                    onChange={(e) =>
                                      updateQuestionMarks(
                                        sq.question.id,
                                        'positive_marks',
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-full"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={sq.negative_marks}
                                    onChange={(e) =>
                                      updateQuestionMarks(
                                        sq.question.id,
                                        'negative_marks',
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-full"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Checkbox
                                    checked={sq.is_optional}
                                    onCheckedChange={(checked) =>
                                      updateQuestionMarks(
                                        sq.question.id,
                                        'is_optional',
                                        checked as boolean
                                      )
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => moveQuestion(sq.question.id, 'up')}
                                      disabled={idx === 0}
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => moveQuestion(sq.question.id, 'down')}
                                      disabled={idx === selectedQuestions.length - 1}
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeQuestion(sq.question.id)}
                                    >
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="flex gap-4 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep('details')}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCurrentStep('review')}
                      disabled={selectedQuestions.length === 0}
                    >
                      Next: Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Review & Finalize</CardTitle>
                  <CardDescription>
                    Review your exam configuration before saving or freezing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Exam Details Summary */}
                    <div>
                      <h3 className="font-semibold mb-3">Exam Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Title:</span>
                          <span className="font-medium">{examData.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Description:</span>
                          <span className="font-medium">{examData.description || 'None'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium">{examData.duration} minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mode:</span>
                          <span className="font-medium">
                            {examData.revisable ? 'Revisable' : 'Non-Revisable'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Questions Summary */}
                    <div>
                      <h3 className="font-semibold mb-3">
                        Questions ({selectedQuestions.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedQuestions
                          .sort((a, b) => a.order - b.order)
                          .map((sq, idx) => (
                            <div
                              key={sq.question.id}
                              className="flex items-start justify-between p-3 border rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">Q{idx + 1}:</span>
                                  <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                                    {sq.question.type}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                                    {sq.question.difficulty}
                                  </span>
                                  {sq.is_optional && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">
                                      Optional
                                    </span>
                                  )}
                                </div>
                                <div
                                  className="prose prose-sm max-w-none text-sm"
                                  dangerouslySetInnerHTML={{ __html: sq.question.text }}
                                />
                              </div>
                              <div className="ml-4 text-right text-sm">
                                <div>+{sq.positive_marks} marks</div>
                                {sq.negative_marks > 0 && (
                                  <div className="text-destructive">
                                    -{sq.negative_marks} marks
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Total Marks */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total Marks:</span>
                        <span className="text-2xl font-bold">{calculateTotalMarks().toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep('questions')}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={loading}
                      >
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Draft
                      </Button>
                      {id && (
                        <Button
                          type="button"
                          onClick={handleFreeze}
                          disabled={loading}
                          variant="default"
                        >
                          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          <Lock className="h-4 w-4 mr-2" />
                          Freeze Exam
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Question Preview Dialog */}
      {previewQuestion && (
        <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Question Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Question</Label>
                <div
                  className="mt-1 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewQuestion.text }}
                />
              </div>
              <div>
                <Label>Options</Label>
                <div className="mt-1 space-y-2">
                  {previewQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={`p-2 border rounded ${
                        (previewQuestion.type === 'mcq' ||
                          previewQuestion.type === 'true_false')
                          ? previewQuestion.correct_answer === index
                            ? 'border-green-500 bg-green-50 dark:bg-green-950'
                            : ''
                          : Array.isArray(previewQuestion.correct_answer) &&
                            previewQuestion.correct_answer.includes(index)
                          ? 'border-green-500 bg-green-50 dark:bg-green-950'
                          : ''
                      }`}
                    >
                      {String.fromCharCode(65 + index)}. {option}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <p className="capitalize">{previewQuestion.type}</p>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <p className="capitalize">{previewQuestion.difficulty}</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewQuestion(null)}>
                Close
              </Button>
              <Button onClick={() => {
                addQuestion(previewQuestion);
                setPreviewQuestion(null);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add to Exam
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
