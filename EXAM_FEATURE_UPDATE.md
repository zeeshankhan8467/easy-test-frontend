# Exam Feature Update - Complete Implementation

## Overview
The Exam feature has been completely updated to support full configuration, question selection with question-wise marks, and exam freeze functionality.

## Backend Changes

### 1. Models (`api/models.py`)
- ✅ **Exam Model**: Already had all required fields:
  - `status` (draft, frozen, completed)
  - `snapshot_data` (JSON field for immutable snapshot)
  - `snapshot_version` (checksum/version)
  - `total_marks` property (calculated from ExamQuestion)

- ✅ **ExamQuestion Model**: Already had all required fields:
  - `positive_marks` (marks for correct answer)
  - `negative_marks` (marks deducted for wrong answer)
  - `order` (display order in exam)
  - `is_optional` (optional/mandatory flag)
  - Unique constraint on (exam, question)

### 2. Serializers (`api/serializers.py`)
- ✅ **ExamCreateUpdateSerializer**: Enhanced validation:
  - Validates question IDs exist
  - Validates marks are non-negative
  - Validates order is non-negative
  - Prevents duplicate questions
  - Prevents editing frozen exams
  - Properly handles question ordering

### 3. Views (`api/views.py`)
- ✅ **ExamViewSet.create()**: Allows creating exam without questions (draft mode)
- ✅ **ExamViewSet.update()**: Allows removing all questions (draft mode)
- ✅ **ExamViewSet.freeze()**: 
  - Validates exam has questions before freezing
  - Generates immutable snapshot JSON
  - Creates MD5 checksum/version
  - Sets status to 'frozen'
- ✅ **ExamViewSet.available_questions()**: NEW endpoint
  - Returns questions available for selection
  - Filters by difficulty, type, search query
  - Excludes questions already in exam (when editing)
  - Limited to 100 results

## Frontend Changes

### 1. Exam Form (`frontend/src/pages/exams/ExamForm.tsx`)
Complete rebuild with multi-step flow:

#### Step 1: Exam Details
- Exam title (required)
- Description (optional)
- Duration in minutes (required)
- Exam mode (Revisable / Non-revisable)

#### Step 2: Question Selection
- **Search & Filters**:
  - Search by question text
  - Filter by difficulty (easy, medium, hard, all)
  - Filter by type (MCQ, True/False, Multiple Select, all)
  
- **Available Questions Table**:
  - Shows question preview (HTML rendered)
  - Shows type and difficulty badges
  - Preview button to see full question
  - Add button to add to exam
  
- **Selected Questions Table**:
  - Shows all selected questions in order
  - Inline editing of:
    - Positive marks (number input)
    - Negative marks (number input)
    - Optional checkbox
  - Reorder buttons (up/down arrows)
  - Remove button
  - Displays total marks dynamically

#### Step 3: Review & Finalize
- Summary of exam details
- List of all questions with marks
- Total marks calculation
- Actions:
  - Save Draft (saves as draft, can edit later)
  - Freeze Exam (freezes exam, cannot edit after)

### 2. Features
- ✅ **Multi-step wizard**: Clear step indicator and navigation
- ✅ **Question preview**: Dialog to preview question before adding
- ✅ **Question search**: Real-time search in question bank
- ✅ **Question filters**: Filter by difficulty and type
- ✅ **Inline marks editing**: Edit positive/negative marks for each question
- ✅ **Question reordering**: Move questions up/down
- ✅ **Duplicate prevention**: Cannot add same question twice
- ✅ **Validation**: 
  - Title required
  - Duration must be >= 1
  - At least one question required
  - Marks must be non-negative
- ✅ **Frozen exam protection**: Shows lock icon, prevents editing
- ✅ **Total marks calculation**: Auto-calculated from question marks
- ✅ **HTML rendering**: Questions with rich text are properly rendered

### 3. Services (`frontend/src/services/exams.ts`)
- ✅ **getAvailableQuestions()**: NEW method to fetch available questions with filters
- ✅ **ExamCreate interface**: Updated to make questions optional (for draft)

## Data Flow

### Creating an Exam
1. User fills exam details (Step 1)
2. User searches and selects questions (Step 2)
3. User configures marks for each question (Step 2)
4. User reviews and saves draft or freezes (Step 3)

### Editing an Exam
1. Load existing exam data
2. Load existing questions with marks
3. User can modify details, add/remove questions, change marks
4. Save draft or freeze

### Freezing an Exam
1. Validates exam has at least one question
2. Generates snapshot JSON with all exam data
3. Creates MD5 checksum
4. Sets status to 'frozen'
5. Exam becomes read-only

## API Endpoints

### Existing Endpoints (Enhanced)
- `POST /api/exams/` - Create exam (now allows no questions for draft)
- `PATCH /api/exams/{id}/` - Update exam (validates frozen status)
- `POST /api/exams/{id}/freeze/` - Freeze exam (generates snapshot)
- `GET /api/exams/{id}/snapshot/` - Get exam snapshot

### New Endpoints
- `GET /api/exams/available_questions/` - Get available questions
  - Query params: `exam_id`, `difficulty`, `type`, `search`

## Database Schema

### ExamQuestion Table
```sql
- exam (FK to Exam)
- question (FK to Question)
- order (Integer)
- positive_marks (Decimal)
- negative_marks (Decimal)
- is_optional (Boolean)
- UNIQUE(exam, question)
- INDEX(exam, order)
```

## Validation Rules

### Backend Validation
- ✅ Exam cannot be frozen without questions
- ✅ Frozen exam cannot be edited
- ✅ No duplicate questions in exam
- ✅ Marks must be non-negative
- ✅ Question IDs must exist
- ✅ Order must be non-negative

### Frontend Validation
- ✅ Title required
- ✅ Duration >= 1 minute
- ✅ At least one question required
- ✅ Marks must be non-negative
- ✅ Cannot edit frozen exams

## Snapshot Structure

When an exam is frozen, a snapshot JSON is generated:

```json
{
  "exam_id": 1,
  "title": "Sample Exam",
  "description": "Description",
  "duration": 60,
  "revisable": true,
  "frozen_at": "2026-02-02T12:00:00Z",
  "questions": [
    {
      "question_id": 1,
      "order": 0,
      "text": "<p>Question text</p>",
      "type": "mcq",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "difficulty": "medium",
      "positive_marks": 1.0,
      "negative_marks": 0.0,
      "is_optional": false
    }
  ]
}
```

## UI/UX Improvements

1. **Step Indicator**: Visual progress indicator showing current step
2. **Question Preview**: Modal dialog to preview question before adding
3. **Inline Editing**: Edit marks directly in the table
4. **Visual Feedback**: 
   - Difficulty badges (color-coded)
   - Type badges
   - Optional question indicator
   - Frozen exam lock icon
5. **Responsive Design**: Works on mobile and desktop
6. **Loading States**: Shows loading indicators during API calls
7. **Error Handling**: Clear error messages for validation failures

## Testing Checklist

- [ ] Create new exam with questions
- [ ] Create exam draft without questions
- [ ] Add questions to exam
- [ ] Remove questions from exam
- [ ] Edit question marks
- [ ] Reorder questions
- [ ] Search and filter questions
- [ ] Preview question before adding
- [ ] Save exam as draft
- [ ] Freeze exam
- [ ] Try to edit frozen exam (should fail)
- [ ] View frozen exam (read-only)
- [ ] Calculate total marks correctly

## Notes

- Questions can be added/removed only in draft mode
- Exam must have at least one question before freezing
- Frozen exams are immutable (cannot be edited)
- Snapshot is generated only when freezing
- Total marks are calculated from positive_marks of all questions
- Negative marks are deducted for wrong answers during scoring

