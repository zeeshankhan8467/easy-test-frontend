import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/RichTextEditor';
import { X, Plus, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionEditorProps {
  question: {
    text: string;
    type: 'mcq' | 'true_false' | 'multiple_select';
    options: string[];
    correct_answer: number | number[];
    difficulty: 'easy' | 'medium' | 'hard';
    tags?: string[];
    marks?: number;
  };
  onChange: (question: any) => void;
  errors?: {
    text?: string;
    options?: string;
    correct_answer?: string;
    marks?: string;
  };
}

export function QuestionEditor({ question, onChange, errors }: QuestionEditorProps) {
  const [tagInput, setTagInput] = useState('');

  // Initialize options based on question type (only on mount or type change)
  useEffect(() => {
    if (question.type === 'true_false' && question.options.length !== 2) {
      onChange({
        ...question,
        options: ['True', 'False'],
        correct_answer: typeof question.correct_answer === 'number' ? question.correct_answer : 0,
      });
    } else if (question.type === 'mcq' && question.options.length < 2) {
      onChange({
        ...question,
        options: question.options.length === 0 ? ['', '', '', ''] : [...question.options, '', ''],
        correct_answer: typeof question.correct_answer === 'number' ? question.correct_answer : 0,
      });
    } else if (question.type === 'multiple_select' && question.options.length < 2) {
      onChange({
        ...question,
        options: question.options.length === 0 ? ['', ''] : [...question.options, ''],
        correct_answer: Array.isArray(question.correct_answer) ? question.correct_answer : [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.type]);

  const handleTypeChange = (newType: string) => {
    let newOptions: string[] = [];
    let newCorrectAnswer: number | number[] = 0;

    if (newType === 'true_false') {
      newOptions = ['True', 'False'];
      newCorrectAnswer = 0;
    } else if (newType === 'mcq') {
      newOptions = question.options.length >= 2 ? question.options : ['', '', '', ''];
      newCorrectAnswer = typeof question.correct_answer === 'number' ? question.correct_answer : 0;
    } else if (newType === 'multiple_select') {
      newOptions = question.options.length >= 2 ? question.options : ['', ''];
      newCorrectAnswer = Array.isArray(question.correct_answer) ? question.correct_answer : [];
    }

    onChange({
      ...question,
      type: newType as any,
      options: newOptions,
      correct_answer: newCorrectAnswer,
    });
  };

  const addOption = () => {
    onChange({
      ...question,
      options: [...question.options, ''],
    });
  };

  const removeOption = (index: number) => {
    if (question.options.length <= 2) return;
    
    const newOptions = question.options.filter((_, i) => i !== index);
    let newCorrectAnswer = question.correct_answer;

    if (question.type === 'mcq') {
      if (typeof newCorrectAnswer === 'number' && newCorrectAnswer === index) {
        newCorrectAnswer = 0;
      } else if (typeof newCorrectAnswer === 'number' && newCorrectAnswer > index) {
        newCorrectAnswer = newCorrectAnswer - 1;
      }
    } else if (question.type === 'multiple_select') {
      if (Array.isArray(newCorrectAnswer)) {
        newCorrectAnswer = newCorrectAnswer
          .filter((ans) => ans !== index)
          .map((ans) => (ans > index ? ans - 1 : ans));
      }
    }

    onChange({
      ...question,
      options: newOptions,
      correct_answer: newCorrectAnswer,
    });
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[index] = value;
    onChange({
      ...question,
      options: newOptions,
    });
  };

  const handleCorrectAnswerChange = (index: number) => {
    if (question.type === 'mcq' || question.type === 'true_false') {
      onChange({
        ...question,
        correct_answer: index,
      });
    } else if (question.type === 'multiple_select') {
      const currentAnswers = Array.isArray(question.correct_answer)
        ? question.correct_answer
        : [];
      const newAnswers = currentAnswers.includes(index)
        ? currentAnswers.filter((ans) => ans !== index)
        : [...currentAnswers, index];
      onChange({
        ...question,
        correct_answer: newAnswers,
      });
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !question.tags?.includes(tagInput.trim())) {
      onChange({
        ...question,
        tags: [...(question.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange({
      ...question,
      tags: question.tags?.filter((tag) => tag !== tagToRemove) || [],
    });
  };

  return (
    <div className="space-y-4">
      {/* Question Text with Rich Text Editor */}
      <div className="space-y-2">
        <Label htmlFor="text">Question Text *</Label>
        <RichTextEditor
          content={question.text || ''}
          onChange={(html) => onChange({ ...question, text: html })}
          placeholder="Enter your question here. Use the toolbar to format text, add headings, lists, etc."
          error={!!errors?.text}
        />
        {errors?.text && (
          <p className="text-sm text-destructive">{errors.text}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Use the toolbar above to format your question with bold, italic, headings, lists, and more.
        </p>
      </div>

      {/* Question Type and Difficulty */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Question Type *</Label>
          <Select
            value={question.type}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
              <SelectItem value="true_false">True/False</SelectItem>
              <SelectItem value="multiple_select">Multiple Select</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty *</Label>
          <Select
            value={question.difficulty}
            onValueChange={(value: any) =>
              onChange({ ...question, difficulty: value })
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
      </div>

      {/* Marks Field */}
      <div className="space-y-2">
        <Label htmlFor="marks">Marks/Points *</Label>
        <Input
          id="marks"
          type="number"
          min="0.1"
          step="0.1"
          value={question.marks || 1}
          onChange={(e) =>
            onChange({
              ...question,
              marks: parseFloat(e.target.value) || 1,
            })
          }
          className={cn('w-32', errors?.marks && 'border-destructive')}
          required
        />
        {errors?.marks && (
          <p className="text-sm text-destructive">{errors.marks}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Points awarded for correct answer (default: 1)
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Answer Options *</Label>
          {question.type !== 'true_false' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Option
            </Button>
          )}
        </div>
        {errors?.options && (
          <p className="text-sm text-destructive">{errors.options}</p>
        )}
        {errors?.correct_answer && (
          <p className="text-sm text-destructive">{errors.correct_answer}</p>
        )}

        <div className="space-y-2">
          {question.options.map((option, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg border transition-colors',
                (question.type === 'mcq' || question.type === 'true_false')
                  ? question.correct_answer === index
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : 'border-input hover:border-primary/50'
                  : Array.isArray(question.correct_answer) &&
                    question.correct_answer.includes(index)
                  ? 'border-green-500 bg-green-50 dark:bg-green-950'
                  : 'border-input hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-2 flex-1">
                {/* Radio button for MCQ/True-False */}
                {(question.type === 'mcq' || question.type === 'true_false') && (
                  <button
                    type="button"
                    onClick={() => handleCorrectAnswerChange(index)}
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                      question.correct_answer === index
                        ? 'border-green-600 bg-green-600'
                        : 'border-gray-300 hover:border-primary'
                    )}
                  >
                    {question.correct_answer === index && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </button>
                )}

                {/* Checkbox for Multiple Select */}
                {question.type === 'multiple_select' && (
                  <Checkbox
                    checked={
                      Array.isArray(question.correct_answer) &&
                      question.correct_answer.includes(index)
                    }
                    onCheckedChange={() => handleCorrectAnswerChange(index)}
                  />
                )}

                <div className="flex-1 relative">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={
                      question.type === 'true_false'
                        ? index === 0
                          ? 'True'
                          : 'False'
                        : `Option ${String.fromCharCode(65 + index)}`
                    }
                    className="pr-8"
                    required
                  />
                  {((question.type === 'mcq' || question.type === 'true_false')
                    ? question.correct_answer === index
                    : Array.isArray(question.correct_answer) &&
                      question.correct_answer.includes(index)) && (
                    <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>

              {question.type !== 'true_false' && question.options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {question.type === 'mcq' && question.options.length < 4 && (
          <p className="text-xs text-muted-foreground">
            Minimum 2 options required. Recommended: 4 options for better quality.
          </p>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags (Optional)</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Enter tag and press Enter"
          />
          <Button type="button" variant="outline" onClick={addTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {question.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

