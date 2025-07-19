/**
 * 🔐 Session Management Utility
 * Handles authentication token and user data storage using sessionStorage
 * Provides multi-tab detection and session management features
 */

import { toast } from 'react-toastify';

export interface UserData {
  id: number;
  username: string;
  full_name: string;
  role: string;
  counter_id?: number;
  is_active: boolean;
}

/**
 * Session Storage Keys
 */
const SESSION_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  SESSION_ID: 'session_id'
} as const;

/**
 * Session Manager Class
 */
export class SessionManager {
  private static instance: SessionManager;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.setSessionId();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set session ID in sessionStorage
   */
  private setSessionId(): void {
    sessionStorage.setItem(SESSION_KEYS.SESSION_ID, this.sessionId);
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Set authentication token
   */
  public setAuthToken(token: string): void {
    sessionStorage.setItem(SESSION_KEYS.AUTH_TOKEN, token);
    console.log('🔐 Auth token set for session:', this.sessionId);
  }

  /**
   * Get authentication token
   */
  public getAuthToken(): string | null {
    return sessionStorage.getItem(SESSION_KEYS.AUTH_TOKEN);
  }

  /**
   * Set user data
   */
  public setUserData(userData: UserData): void {
    sessionStorage.setItem(SESSION_KEYS.USER_DATA, JSON.stringify(userData));
    console.log('👤 User data set for session:', this.sessionId, userData);
  }

  /**
   * Get user data
   */
  public getUserData(): UserData | null {
    const data = sessionStorage.getItem(SESSION_KEYS.USER_DATA);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.error('❌ Failed to parse user data:', error);
        this.clearUserData();
        return null;
      }
    }
    return null;
  }

  /**
   * Clear authentication token
   */
  public clearAuthToken(): void {
    sessionStorage.removeItem(SESSION_KEYS.AUTH_TOKEN);
    console.log('🗑️ Auth token cleared for session:', this.sessionId);
  }

  /**
   * Clear user data
   */
  public clearUserData(): void {
    sessionStorage.removeItem(SESSION_KEYS.USER_DATA);
    console.log('🗑️ User data cleared for session:', this.sessionId);
  }

  /**
   * Clear all session data
   */
  public clearAll(): void {
    this.clearAuthToken();
    this.clearUserData();
    sessionStorage.removeItem(SESSION_KEYS.SESSION_ID);
    console.log('🧹 All session data cleared for session:', this.sessionId);
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    const token = this.getAuthToken();
    const userData = this.getUserData();
    return !!(token && userData);
  }

  /**
   * Get user role
   */
  public getUserRole(): string | null {
    const userData = this.getUserData();
    return userData?.role || null;
  }

  /**
   * Check if user has specific role
   */
  public hasRole(role: string): boolean {
    return this.getUserRole() === role;
  }

  /**
   * Check if user is admin
   */
  public isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Check if user is officer
   */
  public isOfficer(): boolean {
    return this.hasRole('officer');
  }

  /**
   * Get user counter ID (for officers)
   */
  public getCounterId(): number | null {
    const userData = this.getUserData();
    return userData?.counter_id || null;
  }
}

/**
 * Multi-tab Detection Hook
 * Warns users when they login from another tab
 */
export function useMultiTabDetection() {
  if (typeof window === 'undefined') return; // SSR safety

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === SESSION_KEYS.AUTH_TOKEN && e.newValue !== e.oldValue) {
      // Another tab has changed the auth token
      if (e.newValue && e.oldValue) {
        // Token was replaced (new login in another tab)
        toast.warning(
          '⚠️ Phát hiện đăng nhập từ tab khác - Session hiện tại có thể bị ảnh hưởng',
          { 
            autoClose: 5000,
            position: 'top-right'
          }
        );
      } else if (!e.newValue && e.oldValue) {
        // Token was removed (logout in another tab)
        toast.info(
          '🔓 Đăng xuất từ tab khác - Tự động chuyển đến trang đăng nhập',
          { 
            autoClose: 3000,
            position: 'top-right'
          }
        );
        
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      }
    }
  };

  // Listen for storage changes from other tabs
  window.addEventListener('storage', handleStorageChange);
  
  // Cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

/**
 * Export singleton instance
 */
export const sessionManager = SessionManager.getInstance();

/**
 * Legacy compatibility functions
 * These maintain the same API as the old localStorage approach
 */
export const authStorage = {
  setToken: (token: string) => sessionManager.setAuthToken(token),
  getToken: () => sessionManager.getAuthToken(),
  removeToken: () => sessionManager.clearAuthToken(),
  setUserData: (userData: UserData) => sessionManager.setUserData(userData),
  getUserData: () => sessionManager.getUserData(),
  removeUserData: () => sessionManager.clearUserData(),
  clearAll: () => sessionManager.clearAll(),
  isAuthenticated: () => sessionManager.isAuthenticated()
};
