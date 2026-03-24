import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Users,
  BarChart3,
  CalendarCheck,
  Trophy,
  LogOut,
  Menu,
  X,
  Building2,
  UserPlus,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth';
import { canManageSchools, canCreateSchoolAdmin, canCreateTeacher } from '@/services/schools';
import { DarkModeToggle } from './DarkModeToggle';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useState } from 'react';

const baseNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Exams', href: '/exams', icon: FileText },
  { name: 'Question Bank', href: '/questions', icon: BookOpen },
  { name: 'Participants', href: '/participants', icon: Users },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Student Performance', href: '/student-performance', icon: BarChart3 },
  { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
];

function roleLabel(role: string): string {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'school_admin') return 'School Admin';
  if (role === 'teacher') return 'Teacher';
  return role;
}

export function Sidebar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  const user = useAuthUser();

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-card border-r transition-transform duration-300',
          'lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b px-6">
            <h1
              className="text-2xl"
              style={{
                fontFamily: "Cinzel",
                letterSpacing: '2px',
                padding: '10px 16px',
                display: 'inline-block',
              }}
            >
              EasyTest
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {baseNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
            {canManageSchools(user?.role) && (
              <Link
                to="/schools"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  location.pathname === '/schools'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Building2 className="h-5 w-5" />
                <span className="font-medium">Schools</span>
              </Link>
            )}
            {canCreateSchoolAdmin(user?.role) && (
              <Link
                to="/school-admins"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  location.pathname.startsWith('/school-admins')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <UserPlus className="h-5 w-5" />
                <span className="font-medium">School Admin</span>
              </Link>
            )}
            {canCreateTeacher(user?.role) && (
              <Link
                to="/teachers"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  location.pathname.startsWith('/teachers')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <GraduationCap className="h-5 w-5" />
                <span className="font-medium">Teacher</span>
              </Link>
            )}
          </nav>

          {/* User info and logout */}
          <div className="border-t p-4">
            <div className="mb-3 px-4">
              <p className="text-sm font-medium">{user?.name || user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.role ? roleLabel(user.role) : ''}</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <DarkModeToggle />
              <Button
                variant="ghost"
                className="flex-1 justify-start"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

