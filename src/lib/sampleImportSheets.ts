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
 * Sample sheet for POST /participants/import/ — Keypad ID required; name optional (defaults to keypad ID).
 * Column order matches the school's reference roster sheet so the import is drop-in compatible.
 */
export function downloadParticipantImportSample(): void {
  const headers = [
    'Keypad ID',
    'Name',
    'Roll No',
    'WhatsApp Number',
    'Admission No',
    'Class',
    'Subject',
    'Section',
    'Team',
    'Group',
    'House',
    'Gender',
    'City',
    'UID',
    'Employee Code',
    'Teacher Name',
    'Email ID',
    'Parent Email ID',
    'Parent WhatsApp Number',
  ];
  const exampleRow = [
    '1',
    'raj',
    '100',
    '919599188116',
    '2020',
    '7',
    'hindi',
    'A',
    'A',
    'anikita',
    'b41',
    'male',
    'delhi',
    '444',
    '34343',
    'bhawna',
    'praveen.kumar@gmail.com',
    'praveen.kumar@gmail.com',
    '919599188117',
  ];
  const emptyRow = headers.map(() => '');
  downloadCsv('easytest-participants-import-sample.csv', [headers, exampleRow, emptyRow]);
}
