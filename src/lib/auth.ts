const AUTH_KEY = 'dbe_auth_token';

export const isAuthenticated = (): boolean => {
  return localStorage.getItem(AUTH_KEY) === 'true';
};

export const login = (email: string, pass: string): boolean => {
  const allowedUsersStr = import.meta.env.VITE_AUTH_USERS || '';
  const validPassword = import.meta.env.VITE_AUTH_PASSWORD || '';
  
  const allowedUsers = allowedUsersStr.split(',').map((u: string) => u.trim().toLowerCase());
  
  if (allowedUsers.includes(email.toLowerCase()) && pass === validPassword) {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem('dbe_user_email', email);
    return true;
  }
  return false;
};

export const logout = () => {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem('dbe_user_email');
};
