/** Escape one CSV cell (RFC-style). */
function csvCell(value: string): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const body = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sample sheet for POST /questions/import/ — columns match api.views.QuestionViewSet.import_questions.
 * Required: text, options (| or ;), correct_answer (0-based, or comma-separated for multiple_select).
 */
export function downloadQuestionImportSample(): void {
  const rows: string[][] = [
    [
      'text',
      'options',
      'correct_answer',
      'type',
      'difficulty',
      'marks',
      'tags',
      'option_display',
    ],
    [
      'What is 2 + 2?',
      '3|4|5|6',
      '1',
      'mcq',
      'easy',
      '1',
      'math',
      'alpha',
    ],
    [
      'Select all prime numbers.',
      '2|4|7|9',
      '0,2',
      'multiple_select',
      'medium',
      '2',
      'math',
      'alpha',
    ],
    [
      'The sky is blue.',
      'True|False',
      '0',
      'true_false',
      'easy',
      '1',
      'general',
      'alpha',
    ],
  ];
  downloadCsv('easytest-questions-import-sample.csv', rows);
}

/**
 * Sample sheet for POST /participants/import/ — Name + Keypad ID (or clicker id) required; optional extras.
 */
export function downloadParticipantImportSample(): void {
  const rows: string[][] = [
    [
      'Name',
      'Keypad ID',
      'Email',
      'Roll No.',
      'Admission No.',
      'Class',
      'Section',
      'Parent Email ID',
      'Parent WhatsApp Number',
    ],
    [
      'Sample Student A',
      '101',
      'student.a@example.com',
      '12',
      'ADM-001',
      '6',
      'A',
      'parent.a@example.com',
      '919876543210',
    ],
    [
      'Sample Student B',
      '102',
      '',
      '13',
      'ADM-002',
      '6',
      'A',
      '',
      '919876543211',
    ],
    [
      '',
      '103',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
  ];
  downloadCsv('easytest-participants-import-sample.csv', rows);
}
