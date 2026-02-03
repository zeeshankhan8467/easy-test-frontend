# EasyTest - Online Exam & Analytics Platform

A modern, premium-quality frontend application for managing online exams, clicker-based assessments, and comprehensive analytics.

## 🚀 Features

### Core Functionality
- **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin, Instructor)
- **Dashboard**: Overview with statistics, performance charts, and recent exams
- **Exam Management**: Create, edit, delete, and configure exams with various settings
- **Question Bank**: Manual question creation and AI-powered question generation
- **Participant Management**: Import participants via CSV/Excel and assign clicker IDs
- **Reports & Analytics**: Detailed question-wise and participant-wise analysis with export capabilities
- **Leaderboard**: Rankings and top performers visualization

### Technical Features
- **Modern UI**: Built with React, TypeScript, Tailwind CSS, and shadcn/ui
- **Responsive Design**: Fully responsive, desktop-first approach
- **Dark Mode**: Optional dark mode support
- **API Integration**: Completely decoupled from backend, consumes REST APIs only
- **Charts & Visualization**: Interactive charts using Recharts

## 📋 Prerequisites

- Node.js 18+ and npm
- Backend Django REST API running (default: http://localhost:8000)

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_APP_NAME=EasyTest
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
easytest-frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── layout/           # Layout components (Sidebar, Layout)
│   │   └── auth/            # Authentication components
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Questions.tsx
│   │   ├── Participants.tsx
│   │   ├── Reports.tsx
│   │   ├── Leaderboard.tsx
│   │   └── exams/
│   │       ├── ExamList.tsx
│   │       └── ExamForm.tsx
│   ├── services/
│   │   ├── api.ts           # Axios instance with interceptors
│   │   ├── auth.ts          # Authentication service
│   │   ├── exams.ts         # Exam management service
│   │   ├── questions.ts     # Question bank service
│   │   ├── participants.ts  # Participant management service
│   │   ├── reports.ts       # Reports & analytics service
│   │   ├── dashboard.ts     # Dashboard service
│   │   └── leaderboard.ts   # Leaderboard service
│   ├── lib/
│   │   └── utils.ts         # Utility functions
│   ├── App.tsx              # Main app component with routing
│   └── main.tsx             # Entry point
├── public/
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## 🔌 API Integration

The frontend is completely decoupled from the backend and communicates via REST APIs. All API calls are handled through service files in `src/services/`.

### Expected API Endpoints

- `POST /api/auth/login/` - User authentication
- `GET /api/exams/` - List all exams
- `POST /api/exams/` - Create exam
- `GET /api/exams/:id/` - Get exam details
- `PATCH /api/exams/:id/` - Update exam
- `DELETE /api/exams/:id/` - Delete exam
- `POST /api/exams/:id/freeze/` - Freeze exam
- `GET /api/exams/:id/snapshot/` - Generate exam snapshot
- `GET /api/questions/` - List questions
- `POST /api/questions/` - Create question
- `POST /api/questions/generate/` - AI generate questions
- `GET /api/participants/` - List participants
- `POST /api/participants/import/` - Import participants
- `GET /api/reports/exams/:id/` - Get exam report
- `GET /api/reports/exams/:id/export/` - Export report
- `GET /api/leaderboard/exams/:id/` - Get leaderboard
- `GET /api/dashboard/` - Get dashboard data

## 🎨 Design System

- **Colors**: Professional color palette with CSS variables for easy theming
- **Typography**: System fonts with proper hierarchy
- **Spacing**: Consistent spacing using Tailwind's spacing scale
- **Shadows**: Soft shadows for depth (`shadow-soft`, `shadow-soft-lg`)
- **Components**: Reusable shadcn/ui components

## 🔐 Authentication Flow

1. User logs in via `/login`
2. JWT token is stored in localStorage
3. Token is automatically attached to all API requests via Axios interceptor
4. Protected routes check authentication status
5. On 401 response, user is redirected to login

## 📱 Responsive Design

- **Desktop-first**: Optimized for desktop, responsive for mobile
- **Mobile Menu**: Collapsible sidebar on mobile devices
- **Breakpoints**: Uses Tailwind's default breakpoints (sm, md, lg, xl)

## 🌙 Dark Mode

Dark mode can be toggled via the button in the sidebar. Preference is saved in localStorage and persists across sessions.

## 🚀 Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. The `dist/` folder contains the production-ready files

3. Deploy to your preferred hosting service (Vercel, Netlify, etc.)

## 📝 Notes

- All API URLs are configurable via environment variables
- No hardcoded backend data
- Clean, scalable code structure
- TypeScript for type safety
- ESLint for code quality

## 🤝 Contributing

This is a frontend-only application. Ensure all API endpoints match the expected structure before making changes.

## 📄 License

Proprietary - All rights reserved
