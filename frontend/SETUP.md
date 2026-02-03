# EasyTest Frontend - Quick Setup Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd easytest-frontend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=EasyTest
```

**Important**: Update `VITE_API_BASE_URL` to match your Django backend API URL.

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```

## 📋 Backend API Requirements

Ensure your Django REST API has the following endpoints:

### Authentication
- `POST /api/auth/login/` - Returns `{ token, user }`

### Exams
- `GET /api/exams/` - List all exams
- `POST /api/exams/` - Create exam
- `GET /api/exams/:id/` - Get exam details
- `PATCH /api/exams/:id/` - Update exam
- `DELETE /api/exams/:id/` - Delete exam
- `POST /api/exams/:id/freeze/` - Freeze exam
- `GET /api/exams/:id/snapshot/` - Download exam snapshot

### Questions
- `GET /api/questions/` - List questions
- `POST /api/questions/` - Create question
- `POST /api/questions/generate/` - AI generate questions
- `DELETE /api/questions/:id/` - Delete question

### Participants
- `GET /api/participants/` - List participants
- `POST /api/participants/` - Create participant
- `POST /api/participants/import/` - Import from CSV/Excel
- `DELETE /api/participants/:id/` - Delete participant

### Reports
- `GET /api/reports/exams/:id/` - Get exam report
- `GET /api/reports/exams/:id/export/?format=excel|csv` - Export report

### Dashboard
- `GET /api/dashboard/` - Get dashboard statistics

### Leaderboard
- `GET /api/leaderboard/exams/:id/` - Get leaderboard

## 🔑 Authentication

The frontend expects JWT tokens. The login endpoint should return:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "admin@easytest.com",
    "role": "admin",
    "name": "Admin User"
  }
}
```

## 🎨 Customization

### Colors
Edit `src/index.css` to customize the color scheme. The CSS variables are defined in the `:root` and `.dark` selectors.

### API Base URL
Change `VITE_API_BASE_URL` in `.env` file.

## 🐛 Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure your Django backend has CORS configured:
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]
```

### API Connection Issues
1. Verify `VITE_API_BASE_URL` in `.env`
2. Check if backend is running
3. Verify API endpoints match expected structure
4. Check browser console for detailed error messages

### Build Issues
1. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Check Node.js version (requires 18+)

## 📝 Notes

- All API calls are made through service files in `src/services/`
- JWT token is automatically attached to requests via Axios interceptor
- Protected routes redirect to `/login` if not authenticated
- Dark mode preference is saved in localStorage

