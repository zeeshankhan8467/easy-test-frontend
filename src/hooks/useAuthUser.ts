import { useEffect, useState } from 'react';
import { authService, type User } from '@/services/auth';

const AUTH_CHANGE_EVENT = 'authchange';

export function useAuthUser(): User | null {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const sync = () => setUser(authService.getCurrentUser());

    // Handle login/logout updates triggered in this tab
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    // Handle updates from other tabs
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return user;
}

