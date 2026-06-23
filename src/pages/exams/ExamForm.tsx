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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getOptionLabel } from '@/lib/optionDisplay';
import { examService, ExamQuestionInput, ExamOwner } from '@/services/exams';
import { Question } from '@/services/questions';
import { authService } from '@/services/auth';
import { schoolService, School } from '@/services/schools';
import { participantService, Participant, ParticipantListParams } from '@/services/participants';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Plus, X, Eye, ArrowUp, ArrowDown, Lock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
type Step = 'details' | 'questions' | 'participants' | 'review';

const ALL_CLASSES_VALUE = '__all_classes__';
const ALL_SECTIONS_VALUE = '__all_sections__';
const ALL_TEAMS_VALUE = '__all_teams__';

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
    show_live_response: false,
    show_response_after_completion: true,
    question_change_automatic: false,
    status: 'draft' as 'draft' | 'frozen' | 'completed',
  });
  const [ownerUserId, setOwnerUserId] = useState<number | null>(null);
  const [owners, setOwners] = useState<ExamOwner[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);

  // Question selection
  const [selectedQuestions, setSelectedQuestions] = useState<Array<{
    question: Question;
    order: number;
    positive_marks: number;
    negative_marks: number;
    allow_revise: boolean;
    show_leaderboard: boolean;
  }>>([]);

  // Bulk mark controls (apply to all selected questions at once)
  const [bulkPositiveMarks, setBulkPositiveMarks] = useState<number>(1.0);
  const [bulkNegativeMarks, setBulkNegativeMarks] = useState<number>(0.0);

  // Available questions for selection
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  // Participants step
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<number>>(new Set());
  const [participantFilterClass, setParticipantFilterClass] = useState<string>('');
  const [participantFilterSection, setParticipantFilterSection] = useState<string>('');
  const [participantFilterTeam, setParticipantFilterTeam] = useState<string>('');
  const [participantClassOptions, setParticipantClassOptions] = useState<string[]>([]);
  const [participantSectionOptions, setParticipantSectionOptions] = useState<string[]>([]);
  const [participantTeamOptions, setParticipantTeamOptions] = useState<string[]>([]);

  const user = authService.getCurrentUser();
  const canSelectOwner = user?.role === 'super_admin' || user?.role === 'school_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (id) {
      loadExam();
    }
    loadAvailableQuestions();
  }, [id]);

  useEffect(() => {
    if (canSelectOwner) {
      examService.getOwners().then(setOwners).catch(() => setOwners([]));
    }
  }, [canSelectOwner]);

  useEffect(() => {
    if (isSuperAdmin) {
      schoolService.getAll().then(setSchools).catch(() => setSchools([]));
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadAvailableQuestions();
  }, [searchQuery, filterDifficulty, filterType, filterTag, id]);

  // Build the scope used for both listing and the distinct-option endpoints so
  // class/section/team always reflect the same roster the user can pick from.
  const buildParticipantListParams = (
    overrides: Partial<ParticipantListParams> = {},
  ): ParticipantListParams => {
    const p: ParticipantListParams = {};
    if (ownerUserId != null) p.teacher_id = ownerUserId;
    if (participantFilterClass) p.class = participantFilterClass;
    if (participantFilterSection) p.section = participantFilterSection;
    if (participantFilterTeam) p.team = participantFilterTeam;
    return { ...p, ...overrides };
  };

  const loadParticipants = async () => {
    setLoadingParticipants(true);
    try {
      const params = buildParticipantListParams();
      const data = await participantService.getAll(Object.keys(params).length ? params : undefined);
      setParticipants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load participants for exam', error);
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const loadParticipantFilterOptions = async () => {
    try {
      const baseParams: ParticipantListParams = {};
      if (ownerUserId != null) baseParams.teacher_id = ownerUserId;
      const classParams = Object.keys(baseParams).length ? baseParams : undefined;
      const sectionParams: ParticipantListParams = { ...baseParams };
      if (participantFilterClass) sectionParams.class = participantFilterClass;
      const teamParams: ParticipantListParams = { ...baseParams };
      if (participantFilterClass) teamParams.class = participantFilterClass;
      if (participantFilterSection) teamParams.section = participantFilterSection;

      const [classes, sections, teams] = await Promise.all([
        participantService.getDistinctClasses(classParams),
        participantService.getDistinctSections(
          Object.keys(sectionParams).length ? sectionParams : undefined,
        ),
        participantService.getDistinctTeams(
          Object.keys(teamParams).length ? teamParams : undefined,
        ),
      ]);
      setParticipantClassOptions(classes);
      setParticipantSectionOptions(sections);
      setParticipantTeamOptions(teams);
      setParticipantFilterClass((prev) => (prev && !classes.includes(prev) ? '' : prev));
      setParticipantFilterSection((prev) => (prev && !sections.includes(prev) ? '' : prev));
      setParticipantFilterTeam((prev) => (prev && !teams.includes(prev) ? '' : prev));
    } catch (error) {
      console.error('Failed to load participant filter options', error);
      setParticipantClassOptions([]);
      setParticipantSectionOptions([]);
      setParticipantTeamOptions([]);
    }
  };

  // Load participants whenever the user enters the step or changes filters / owner.
  useEffect(() => {
    if (currentStep !== 'participants') return;
    loadParticipants();
    loadParticipantFilterOptions();
  }, [currentStep, ownerUserId, participantFilterClass, participantFilterSection, participantFilterTeam]);

  const loadExam = async () => {
    try {
      const exam = await examService.getById(id!);
      setExamData({
        title: exam.title,
        description: exam.description || '',
        duration: exam.duration,
        revisable: exam.revisable,
        show_live_response: exam.show_live_response ?? false,
        show_response_after_completion: exam.show_response_after_completion ?? true,
        question_change_automatic: exam.question_change_automatic ?? false,
        status: exam.status,
      });
      setOwnerUserId(exam.owner_id != null ? exam.owner_id : null);

      // Load exam questions
      if (exam.questions && exam.questions.length > 0) {
        const questions = exam.questions.map((eq: any) => ({
          question: eq.question,
          order: eq.order || 0,
          positive_marks: typeof eq.positive_marks === 'number' ? eq.positive_marks : parseFloat(eq.positive_marks) || 1.0,
          negative_marks: typeof eq.negative_marks === 'number' ? eq.negative_marks : parseFloat(eq.negative_marks) || 0.0,
          allow_revise: typeof eq.allow_revise === 'boolean' ? eq.allow_revise : true,
          show_leaderboard: typeof eq.show_leaderboard === 'boolean' ? eq.show_leaderboard : false,
        }));
        setSelectedQuestions(questions);
        setBulkPositiveMarks(questions[0]?.positive_marks ?? 1.0);
        setBulkNegativeMarks(questions[0]?.negative_marks ?? 0.0);
      }

      // Preload existing participant assignments so editing keeps the current selection.
      if (Array.isArray(exam.participant_ids)) {
        setSelectedParticipantIds(new Set(exam.participant_ids));
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
      const { questions, tags } = await examService.getAvailableQuestions({
        exam_id: id,
        difficulty: filterDifficulty !== 'all' ? filterDifficulty : undefined,
        type: filterType !== 'all' ? filterType : undefined,
        search: searchQuery || undefined,
        tag: filterTag !== 'all' ? filterTag : undefined,
      });
      setAvailableQuestions(questions);
      setTagOptions(tags);
      setFilterTag((prev) => (prev !== 'all' && !tags.includes(prev) ? 'all' : prev));
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
      positive_marks: typeof question.marks === 'number' ? question.marks : (question.marks != null ? parseFloat(String(question.marks)) : 0) || 1.0,
      negative_marks: 0.0,
      allow_revise: true,
      show_leaderboard: false,
    };

    setSelectedQuestions([...selectedQuestions, newQuestion]);
    toast({
      title: 'Question Added',
      description: 'Question added to exam',
    });
  };

  const addAllAvailableQuestions = () => {
    if (!availableQuestions.length) return;
    const existingIds = new Set(selectedQuestions.map((sq) => sq.question.id));
    const toAdd = availableQuestions.filter((q) => !existingIds.has(q.id));
    if (!toAdd.length) {
      toast({ title: 'Nothing to add', description: 'All available questions are already selected.' });
      return;
    }

    const startOrder = selectedQuestions.length;
    const newQuestions = toAdd.map((q, idx) => ({
      question: q,
      order: startOrder + idx,
      positive_marks:
        typeof q.marks === 'number'
          ? q.marks
          : q.marks != null
            ? parseFloat(String(q.marks)) || 1.0
            : 1.0,
      negative_marks: 0.0,
      allow_revise: true,
      show_leaderboard: false,
    }));

    setSelectedQuestions([...selectedQuestions, ...newQuestions]);
    toast({
      title: 'Added all',
      description: `${newQuestions.length} question(s) added to the exam.`,
    });
  };

  const removeQuestion = (questionId: string) => {
    const updated = selectedQuestions
      .filter((sq) => sq.question.id !== questionId)
      .map((sq, idx) => ({ ...sq, order: idx }));
    setSelectedQuestions(updated);
  };

  const updateQuestionMarks = (questionId: string, field: 'positive_marks' | 'negative_marks', value: number) => {
    setSelectedQuestions(
      selectedQuestions.map((sq) => {
        if (sq.question.id === questionId) {
          const numValue = typeof value === 'number' ? value : parseFloat(value as any) || 0;
          return { ...sq, [field]: numValue };
        }
        return sq;
      })
    );
  };

  const applyBulkMarksToSelected = () => {
    if (!selectedQuestions.length) return;
    setSelectedQuestions((prev) =>
      prev.map((sq) => ({
        ...sq,
        positive_marks: bulkPositiveMarks,
        negative_marks: bulkNegativeMarks,
      }))
    );
    toast({
      title: 'Marks applied',
      description: 'Positive/negative marks applied to all selected questions.',
    });
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
      return 'Duration per question must be at least 1 second';
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
        is_optional: false,
        allow_revise: sq.allow_revise,
        show_leaderboard: sq.show_leaderboard,
      }));

      const participantIdsArray = Array.from(selectedParticipantIds);
      if (id) {
        await examService.update(id, {
          ...examData,
          questions,
          participant_ids: participantIdsArray,
          ...(canSelectOwner ? { owner_user_id: ownerUserId } : {}),
        });
        toast({
          title: 'Success',
          description: 'Exam draft saved successfully',
        });
      } else {
        const exam = await examService.create({
          ...examData,
          questions,
          participant_ids: participantIdsArray,
          ...(canSelectOwner ? { owner_user_id: ownerUserId } : {}),
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
        is_optional: false,
        allow_revise: sq.allow_revise,
        show_leaderboard: sq.show_leaderboard,
      }));

      await examService.update(id, {
        ...examData,
        questions,
        participant_ids: Array.from(selectedParticipantIds),
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
        <div className={`flex items-center gap-2 ${currentStep === 'participants' ? 'text-primary' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'participants' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            3
          </div>
          <span className="font-medium">Participants</span>
        </div>
        <div className="w-12 h-0.5 bg-border" />
        <div className={`flex items-center gap-2 ${currentStep === 'review' ? 'text-primary' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            4
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
                      <Label htmlFor="duration">Duration (seconds on each question) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        placeholder="e.g. 30, 60"
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
                      <p className="text-xs text-muted-foreground pl-8 max-w-xl">
                        When enabled, students can change their answer before you move on. Use the{' '}
                        <span className="font-medium">Revise</span> column in the question list to disallow
                        changes on individual questions (one-and-done).
                      </p>

                      <div className="flex items-center space-x-2 pt-3">
                        <Checkbox
                          id="show_live_response"
                          checked={examData.show_live_response}
                          onCheckedChange={(checked) =>
                            setExamData({
                              ...examData,
                              show_live_response: checked as boolean,
                            })
                          }
                        />
                        <Label htmlFor="show_live_response" className="cursor-pointer">
                          Show live response in options (during answering)
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 pt-3">
                        <Checkbox
                          id="show_response_after_completion"
                          checked={examData.show_response_after_completion}
                          onCheckedChange={(checked) =>
                            setExamData({
                              ...examData,
                              show_response_after_completion: checked as boolean,
                            })
                          }
                        />
                        <Label htmlFor="show_response_after_completion" className="cursor-pointer">
                          Show all responses after exam completion
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 pt-3">
                        <Checkbox
                          id="question_change_automatic"
                          checked={examData.question_change_automatic}
                          onCheckedChange={(checked) =>
                            setExamData({
                              ...examData,
                              question_change_automatic: checked as boolean,
                            })
                          }
                        />
                        <Label htmlFor="question_change_automatic" className="cursor-pointer">
                          Automatic question change (auto-advance) during live exam
                        </Label>
                      </div>
                    </div>
                  </div>

                  {canSelectOwner && owners.length > 0 && (
                    <div className="space-y-4">
                      {isSuperAdmin && schools.length > 0 && (
                        <div className="space-y-2">
                          <Label>School</Label>
                          <Select
                            value={selectedSchoolId != null ? String(selectedSchoolId) : 'all'}
                            onValueChange={(v) =>
                              setSelectedSchoolId(v === 'all' ? null : parseInt(v, 10))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All schools" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All schools</SelectItem>
                              {schools.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Owner (Teacher)</Label>
                        <Select
                          value={ownerUserId != null ? String(ownerUserId) : 'none'}
                          onValueChange={(v) =>
                            setOwnerUserId(v === 'none' ? null : parseInt(v, 10))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select teacher (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No specific teacher</SelectItem>
                            {owners
                              .filter((o) => (o.role || '').toLowerCase() === 'teacher')
                              .filter((o) =>
                                selectedSchoolId != null
                                  ? Number(o.school_id) === Number(selectedSchoolId)
                                  : true,
                              )
                              .map((o) => (
                                <SelectItem key={o.id} value={String(o.id)}>
                                  {o.name || o.email}
                                  {o.school_name ? ` · ${o.school_name}` : ''}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

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
                    Choose questions from your question bank and set marks. Use the same tags you add when creating
                    questions to narrow the list.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Search and Filters */}
                  <div className="space-y-4 mb-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Input
                        placeholder="Search questions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="sm:col-span-2 lg:col-span-1"
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
                      <Select value={filterTag} onValueChange={setFilterTag}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by tag" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All tags</SelectItem>
                          {tagOptions.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Available Questions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Available Questions ({availableQuestions.length})</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addAllAvailableQuestions}
                        disabled={!availableQuestions.length || availableQuestions.length === selectedQuestions.length}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add All
                      </Button>
                    </div>
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
                              <TableHead>Tags</TableHead>
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
                                <TableCell className="max-w-[140px] text-muted-foreground text-sm">
                                  {question.tags?.length ? (
                                    <span className="line-clamp-2" title={question.tags.join(', ')}>
                                      {question.tags.join(', ')}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
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
                      <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Positive marks (all)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={bulkPositiveMarks}
                            onChange={(e) =>
                              setBulkPositiveMarks(parseFloat(e.target.value) || 0)
                            }
                            className="w-36"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Negative marks (all)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={bulkNegativeMarks}
                            onChange={(e) =>
                              setBulkNegativeMarks(parseFloat(e.target.value) || 0)
                            }
                            className="w-36"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={applyBulkMarksToSelected}
                          disabled={selectedQuestions.length === 0}
                        >
                          Apply marks to all
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This overwrites marks for every selected question.
                      </p>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Order</TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead className="w-28 text-center">
                              <span title="Requires exam revisable enabled">Revise</span>
                            </TableHead>
                            <TableHead className="w-28 text-center">
                              <span title="Show leaderboard after this question in live exam">Leaderboard</span>
                            </TableHead>
                            <TableHead className="w-32">Positive Marks</TableHead>
                            <TableHead className="w-32">Negative Marks</TableHead>
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
                                <TableCell className="text-center align-middle">
                                  <Checkbox
                                    checked={sq.allow_revise}
                                    disabled={!examData.revisable}
                                    title={
                                      examData.revisable
                                        ? 'Allow changing answer before next question'
                                        : 'Turn on exam revisable above to edit per question'
                                    }
                                    onCheckedChange={(checked) =>
                                      setSelectedQuestions(
                                        selectedQuestions.map((row) =>
                                          row.question.id === sq.question.id
                                            ? { ...row, allow_revise: checked === true }
                                            : row
                                        )
                                      )
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  <Checkbox
                                    checked={sq.show_leaderboard}
                                    title="Show leaderboard after this question in live exam"
                                    onCheckedChange={(checked) =>
                                      setSelectedQuestions(
                                        selectedQuestions.map((row) =>
                                          row.question.id === sq.question.id
                                            ? { ...row, show_leaderboard: checked === true }
                                            : row
                                        )
                                      )
                                    }
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
                      onClick={() => setCurrentStep('participants')}
                      disabled={selectedQuestions.length === 0}
                    >
                      Next: Participants
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Participants */}
          {currentStep === 'participants' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Assign Participants
                  </CardTitle>
                  <CardDescription>
                    Pick students for this exam. Narrow the roster by class, section, or team — then
                    use <strong>Select all</strong> to add everyone shown, or check individual rows.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select
                        value={participantFilterClass || ALL_CLASSES_VALUE}
                        onValueChange={(v) => {
                          const next = v === ALL_CLASSES_VALUE ? '' : v;
                          setParticipantFilterClass(next);
                          setParticipantFilterSection('');
                          setParticipantFilterTeam('');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All classes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_CLASSES_VALUE}>All classes</SelectItem>
                          {participantClassOptions.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Section</Label>
                      <Select
                        value={participantFilterSection || ALL_SECTIONS_VALUE}
                        onValueChange={(v) => {
                          const next = v === ALL_SECTIONS_VALUE ? '' : v;
                          setParticipantFilterSection(next);
                          setParticipantFilterTeam('');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All sections" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_SECTIONS_VALUE}>All sections</SelectItem>
                          {participantSectionOptions.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Team</Label>
                      <Select
                        value={participantFilterTeam || ALL_TEAMS_VALUE}
                        onValueChange={(v) => setParticipantFilterTeam(v === ALL_TEAMS_VALUE ? '' : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All teams" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_TEAMS_VALUE}>All teams</SelectItem>
                          {participantTeamOptions.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      {selectedParticipantIds.size} selected
                      {participants.length > 0 ? ` • ${participants.length} shown after filters` : ''}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const visibleIds = participants.map((p) => Number(p.id));
                        const allShownSelected =
                          visibleIds.length > 0 && visibleIds.every((pid) => selectedParticipantIds.has(pid));
                        return (
                          <>
                            <Button
                              type="button"
                              variant={allShownSelected ? 'secondary' : 'default'}
                              size="sm"
                              disabled={!canEdit || participants.length === 0}
                              onClick={() => {
                                setSelectedParticipantIds((prev) => {
                                  const next = new Set(prev);
                                  if (allShownSelected) {
                                    visibleIds.forEach((pid) => next.delete(pid));
                                  } else {
                                    visibleIds.forEach((pid) => next.add(pid));
                                  }
                                  return next;
                                });
                              }}
                            >
                              {allShownSelected ? 'Unselect all shown' : 'Select all shown'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!canEdit || selectedParticipantIds.size === 0}
                              onClick={() => setSelectedParticipantIds(new Set())}
                            >
                              Clear selection
                            </Button>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="border rounded-lg max-h-[480px] overflow-y-auto">
                    {loadingParticipants ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : participants.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        No participants match the current filters.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Keypad ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead>Team</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {participants.map((p) => {
                            const pid = Number(p.id);
                            const checked = selectedParticipantIds.has(pid);
                            return (
                              <TableRow key={p.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={checked}
                                    disabled={!canEdit}
                                    onCheckedChange={(state) => {
                                      const isOn = state === true;
                                      setSelectedParticipantIds((prev) => {
                                        const next = new Set(prev);
                                        if (isOn) {
                                          next.add(pid);
                                        } else {
                                          next.delete(pid);
                                        }
                                        return next;
                                      });
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="font-medium tabular-nums">
                                  {p.clicker_id || '—'}
                                </TableCell>
                                <TableCell>{p.name || '—'}</TableCell>
                                <TableCell>{p.extra?.class || '—'}</TableCell>
                                <TableCell>{p.extra?.section || '—'}</TableCell>
                                <TableCell>{p.extra?.team || '—'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <div className="flex gap-4 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep('questions')}
                    >
                      Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentStep('review')}>
                      Next: Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Review */}
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
                          <span className="font-medium">{examData.duration} sec per question</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mode:</span>
                          <span className="font-medium">
                            {examData.revisable ? 'Revisable' : 'Non-Revisable'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Live Response:</span>
                          <span className="font-medium">
                            {examData.show_live_response ? 'Show' : 'Hide'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            After Completion Options:
                          </span>
                          <span className="font-medium">
                            {examData.show_response_after_completion ? 'Show all' : 'Hide'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Question Change:
                          </span>
                          <span className="font-medium">
                            {examData.question_change_automatic ? 'Automatic' : 'Manual'}
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
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-medium">Q{idx + 1}:</span>
                                  <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                                    {sq.question.type}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                                    {sq.question.difficulty}
                                  </span>
                                  {examData.revisable && (
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded ${
                                        sq.allow_revise
                                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
                                          : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                                      }`}
                                    >
                                      {sq.allow_revise ? 'Answer revisable' : 'No revise (locked after first submit)'}
                                    </span>
                                  )}
                                  {sq.show_leaderboard && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                                      Show leaderboard
                                    </span>
                                  )}
                                </div>
                                <div
                                  className="prose prose-sm max-w-none text-sm [&_.video-embed-wrapper]:my-2 [&_img]:max-h-40 [&_img]:rounded"
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

                    {/* Participants Summary */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Participants ({selectedParticipantIds.size})
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedParticipantIds.size === 0
                          ? 'No participants assigned yet. Go back to the Participants step to add students.'
                          : `${selectedParticipantIds.size} student(s) will be assigned to this exam.`}
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep('participants')}
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
                  className="mt-1 prose prose-sm max-w-none [&_.video-embed-wrapper]:my-2 [&_img]:max-h-64 [&_img]:rounded"
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
                      {getOptionLabel(index, previewQuestion.option_display ?? 'alpha')}. {option}
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
