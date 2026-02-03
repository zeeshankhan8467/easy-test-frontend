# EasyTest - Online Exam Platform

A modern, premium-quality Online Exam, Clicker-Based Assessment, and Analytics Platform.

## Features

- 📝 **Exam Management**: Create, configure, and manage exams with question-wise marks
- ❓ **Question Bank**: Create questions manually or generate using AI (OpenAI/Gemini)
- 👥 **Participant Management**: Manage exam participants and track their performance
- 📊 **Analytics & Reports**: Detailed analytics and reports for exams and participants
- 🏆 **Leaderboard**: Real-time leaderboard for exam results
- 🔒 **Exam Freeze**: Freeze exams to prevent further edits
- 📱 **Responsive Design**: Modern, responsive UI with dark mode support

## Tech Stack

### Frontend
- React 19 with Vite
- TypeScript
- Tailwind CSS v3
- shadcn/ui components
- Axios for API calls
- Recharts for analytics
- TipTap for rich text editing

### Backend
- Django REST Framework
- MySQL database
- JWT Authentication
- OpenAI & Google Gemini AI integration

## Project Structure

```
easytest/
├── frontend/          # React frontend application
├── backend/          # Django REST API
└── README.md         # This file
```

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python3 -m venv ../backend-venv
source ../backend-venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database and API keys
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Create superuser:
```bash
python manage.py createsuperuser
```

7. Run server:
```bash
python manage.py runserver
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API URL
```

4. Run development server:
```bash
npm run dev
```

## Documentation

- [AI Question Generation Setup](backend/AI_SETUP.md)
- [Free AI Setup (Gemini)](backend/FREE_AI_SETUP.md)
- [Question Creation Improvements](QUESTION_CREATION_IMPROVEMENTS.md)
- [AI Generation Summary](AI_GENERATION_SUMMARY.md)
- [Exam Feature Update](EXAM_FEATURE_UPDATE.md)

## License

This project is for personal use.
