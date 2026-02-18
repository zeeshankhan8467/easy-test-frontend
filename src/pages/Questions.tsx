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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuestionEditor } from '@/components/QuestionEditor';
import { questionService, Question, QuestionCreate, AIGenerateRequest } from '@/services/questions';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Sparkles, Loader2, Trash2, Eye, Edit, Upload } from 'lucide-react';

export function Questions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const { toast } = useToast();

  const [newQuestion, setNewQuestion] = useState<QuestionCreate>({
    text: '',
    type: 'mcq',
    options: ['', '', '', ''],
    correct_answer: 0,
    difficulty: 'medium',
    tags: [],
    marks: 1,
  });

  const [formErrors, setFormErrors] = useState<{
    text?: string;
    options?: string;
    correct_answer?: string;
    marks?: string;
  }>({});

  const [aiRequest, setAiRequest] = useState<AIGenerateRequest>({
    topic: '',
    count: 5,
    difficulty: 'medium',
    type: 'mcq',
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const data = await questionService.getAll();
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setQuestions(data);
      } else if (data && Array.isArray(data.results)) {
        setQuestions(data.results);
      } else {
        console.warn('Unexpected data format:', data);
        setQuestions([]);
      }
    } catch (error: any) {
      console.error('Failed to load questions:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load questions',
        variant: 'destructive',
      });
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to strip HTML tags for validation
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const validateQuestion = (): boolean => {
    const errors: typeof formErrors = {};

    // Validate question text (strip HTML for length check)
    const textContent = stripHtml(newQuestion.text);
    if (!textContent.trim()) {
      errors.text = 'Question text is required';
    } else if (textContent.trim().length < 10) {
      errors.text = 'Question text must be at least 10 characters';
    }

    // Validate options
    const validOptions = newQuestion.options.filter((opt) => opt.trim() !== '');
    if (validOptions.length < 2) {
      errors.options = 'At least 2 options are required';
    }

    // Validate correct answer
    if (newQuestion.type === 'mcq' || newQuestion.type === 'true_false') {
      if (typeof newQuestion.correct_answer !== 'number') {
        errors.correct_answer = 'Please select a correct answer';
      } else if (newQuestion.correct_answer < 0 || newQuestion.correct_answer >= validOptions.length) {
        errors.correct_answer = 'Invalid correct answer selection';
      }
    } else if (newQuestion.type === 'multiple_select') {
      if (!Array.isArray(newQuestion.correct_answer) || newQuestion.correct_answer.length === 0) {
        errors.correct_answer = 'Please select at least one correct answer';
      } else if (newQuestion.correct_answer.some((ans) => ans < 0 || ans >= validOptions.length)) {
        errors.correct_answer = 'Invalid correct answer selection';
      }
    }

    // Validate marks
    if (!newQuestion.marks || newQuestion.marks <= 0) {
      errors.marks = 'Marks must be greater than 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEdit = async (questionId: string) => {
    try {
      const question = await questionService.getById(questionId);
      setNewQuestion({
        text: question.text || '',
        type: question.type,
        options: question.options || [],
        correct_answer: question.correct_answer,
        difficulty: question.difficulty,
        tags: question.tags || [],
        marks: question.marks || 1,
      });
      setEditingQuestionId(questionId);
      setEditDialogOpen(true);
      setFormErrors({});
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load question',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingQuestionId) return;

    // Validate before submitting
    if (!validateQuestion()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Filter out empty options and create mapping
      const optionMapping: number[] = [];
      const filteredOptions: string[] = [];
      
      newQuestion.options.forEach((opt, idx) => {
        if (opt.trim() !== '') {
          optionMapping.push(idx);
          filteredOptions.push(opt.trim());
        }
      });

      // Map correct answer to new indices
      let mappedCorrectAnswer: number | number[];
      if (newQuestion.type === 'multiple_select') {
        if (Array.isArray(newQuestion.correct_answer)) {
          mappedCorrectAnswer = newQuestion.correct_answer
            .map((originalIdx) => optionMapping.indexOf(originalIdx))
            .filter((newIdx) => newIdx !== -1);
        } else {
          mappedCorrectAnswer = [];
        }
      } else {
        const mappedIdx = optionMapping.indexOf(newQuestion.correct_answer as number);
        mappedCorrectAnswer = mappedIdx !== -1 ? mappedIdx : 0;
      }

      const questionToUpdate = {
        ...newQuestion,
        options: filteredOptions,
        correct_answer: mappedCorrectAnswer,
      };

      await questionService.update(editingQuestionId, questionToUpdate);
      toast({
        title: 'Success',
        description: 'Question updated successfully',
      });
      setEditDialogOpen(false);
      setEditingQuestionId(null);
      setFormErrors({});
      setNewQuestion({
        text: '',
        type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: 0,
        difficulty: 'medium',
        tags: [],
        marks: 1,
      });
      loadQuestions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update question',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = async () => {
    // Validate before submitting
    if (!validateQuestion()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Filter out empty options and create mapping
      const optionMapping: number[] = [];
      const filteredOptions: string[] = [];
      
      newQuestion.options.forEach((opt, idx) => {
        if (opt.trim() !== '') {
          optionMapping.push(idx);
          filteredOptions.push(opt.trim());
        }
      });

      // Map correct answer to new indices
      let mappedCorrectAnswer: number | number[];
      if (newQuestion.type === 'multiple_select') {
        if (Array.isArray(newQuestion.correct_answer)) {
          mappedCorrectAnswer = newQuestion.correct_answer
            .map((originalIdx) => optionMapping.indexOf(originalIdx))
            .filter((newIdx) => newIdx !== -1);
        } else {
          mappedCorrectAnswer = [];
        }
      } else {
        const mappedIdx = optionMapping.indexOf(newQuestion.correct_answer as number);
        mappedCorrectAnswer = mappedIdx !== -1 ? mappedIdx : 0;
      }

      const questionToCreate = {
        ...newQuestion,
        options: filteredOptions,
        correct_answer: mappedCorrectAnswer,
      };

      await questionService.create(questionToCreate);
      toast({
        title: 'Success',
        description: 'Question created successfully',
      });
      setCreateDialogOpen(false);
      setFormErrors({});
      setNewQuestion({
        text: '',
        type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: 0,
        difficulty: 'medium',
        tags: [],
        marks: 1,
      });
      loadQuestions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create question',
        variant: 'destructive',
      });
    }
  };

  const handleAIGenerate = async () => {
    if (!aiRequest.topic.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a topic',
        variant: 'destructive',
      });
      return;
    }

    setAiGenerating(true);
    try {
      const response = await questionService.generateAI(aiRequest);
      const questions = Array.isArray(response) ? response : (response.questions || response.results || []);
      
      // Check for warning message
      if (response.warning) {
        toast({
          title: 'Sample Questions Generated',
          description: response.warning,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Success',
          description: `Generated ${questions.length} question(s) successfully`,
        });
      }
      
      setAiDialogOpen(false);
      setAiRequest({ topic: '', count: 5, difficulty: 'medium', type: 'mcq' });
      loadQuestions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.message || 'Failed to generate questions',
        variant: 'destructive',
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await questionService.delete(id);
      toast({ title: 'Success', description: 'Question deleted successfully' });
      loadQuestions();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete question', variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    try {
      const result = await questionService.import({ file: selectedFile });
      toast({ title: 'Success', description: `Imported ${result.imported} question(s)` });
      if (result.errors.length > 0) {
        toast({
          title: 'Some rows had errors',
          description: result.errors.slice(0, 3).join('; ') + (result.errors.length > 3 ? ` (+${result.errors.length - 3} more)` : ''),
          variant: 'destructive',
        });
      }
      setImportDialogOpen(false);
      setSelectedFile(null);
      loadQuestions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to import questions',
        variant: 'destructive',
      });
    }
  };

  // Ensure questions is always an array
  const safeQuestions = Array.isArray(questions) ? questions : [];
  
  const filteredQuestions =
    filterDifficulty === 'all'
      ? safeQuestions
      : safeQuestions.filter((q) => q.difficulty === filterDifficulty);

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
          <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-muted-foreground mt-2">
            Manage your question library
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV/Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Questions</DialogTitle>
                <DialogDescription>
                  Upload a CSV or Excel file with columns: <strong>text</strong> (or question), <strong>options</strong> (pipe | or semicolon ; separated), <strong>correct_answer</strong> (0-based index, or comma-separated for multiple select). Optional: type, difficulty, marks, tags.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="qfile">File</Label>
                  <Input
                    id="qfile"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={!selectedFile}>Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Generate Questions with AI</DialogTitle>
                <DialogDescription>
                  Enter a topic and let AI generate questions for you
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    value={aiRequest.topic}
                    onChange={(e) =>
                      setAiRequest({ ...aiRequest, topic: e.target.value })
                    }
                    placeholder="e.g., Python Programming, World History"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="count">Count</Label>
                    <Input
                      id="count"
                      type="number"
                      min="1"
                      max="20"
                      value={aiRequest.count}
                      onChange={(e) =>
                        setAiRequest({
                          ...aiRequest,
                          count: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={aiRequest.difficulty}
                      onValueChange={(value: any) =>
                        setAiRequest({ ...aiRequest, difficulty: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={aiRequest.type}
                      onValueChange={(value: any) =>
                        setAiRequest({ ...aiRequest, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">MCQ</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                        <SelectItem value="multiple_select">Multiple Select</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setAiDialogOpen(false)}
                  disabled={aiGenerating}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAIGenerate}
                  disabled={aiGenerating || !aiRequest.topic.trim()}
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Question</DialogTitle>
                <DialogDescription>
                  Add a new question to your bank. Fill in all required fields.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <QuestionEditor
                  question={newQuestion}
                  onChange={setNewQuestion}
                  errors={formErrors}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setFormErrors({});
                    setNewQuestion({
                      text: '',
                      type: 'mcq',
                      options: ['', '', '', ''],
                      correct_answer: 0,
                      difficulty: 'medium',
                      tags: [],
                      marks: 1,
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Question</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Edit Question Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Question</DialogTitle>
                <DialogDescription>
                  Update the question details. Fill in all required fields.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <QuestionEditor
                  question={newQuestion}
                  onChange={setNewQuestion}
                  errors={formErrors}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingQuestionId(null);
                    setFormErrors({});
                    setNewQuestion({
                      text: '',
                      type: 'mcq',
                      options: ['', '', '', ''],
                      correct_answer: 0,
                      difficulty: 'medium',
                      tags: [],
                      marks: 1,
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdate}>Update Question</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Questions</CardTitle>
              <CardDescription>
                {filteredQuestions.length} question(s) found
              </CardDescription>
            </div>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!Array.isArray(filteredQuestions) || filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No questions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(filteredQuestions) && filteredQuestions.map((question) => (
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
                    <TableCell>
                      {question.tags?.join(', ') || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewQuestion(question)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(question.id)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(question.id)}
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

      {previewQuestion && (
        <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
          <DialogContent className="max-w-2xl">
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
                <ul className="mt-1 space-y-2">
                  {previewQuestion.options.map((option, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                      <span>{option}</span>
                      {Array.isArray(previewQuestion.correct_answer)
                        ? previewQuestion.correct_answer.includes(index) && (
                            <span className="text-green-600 font-medium">✓ Correct</span>
                          )
                        : previewQuestion.correct_answer === index && (
                            <span className="text-green-600 font-medium">✓ Correct</span>
                          )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-4">
                <div>
                  <Label>Difficulty</Label>
                  <p className="capitalize">{previewQuestion.difficulty}</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <p className="capitalize">{previewQuestion.type}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

