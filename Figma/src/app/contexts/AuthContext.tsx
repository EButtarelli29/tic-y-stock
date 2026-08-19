import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type UserRole = 'user' | 'superuser';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('ticstock_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Mock authentication - in production, this would call an API
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if user exists in localStorage
    const users = JSON.parse(localStorage.getItem('ticstock_users') || '[]');
    const foundUser = users.find((u: any) => u.email === email && u.password === password);
    
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('ticstock_user', JSON.stringify(userWithoutPassword));
    } else {
      throw new Error('Invalid credentials');
    }
    
    setIsLoading(false);
  };

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get existing users
    const users = JSON.parse(localStorage.getItem('ticstock_users') || '[]');
    
    // Check if user already exists
    if (users.some((u: any) => u.email === email)) {
      setIsLoading(false);
      throw new Error('User already exists');
    }
    
    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email,
      password,
      name,
      role
    };
    
    users.push(newUser);
    localStorage.setItem('ticstock_users', JSON.stringify(users));
    
    // Log them in
    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    localStorage.setItem('ticstock_user', JSON.stringify(userWithoutPassword));
    
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ticstock_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
