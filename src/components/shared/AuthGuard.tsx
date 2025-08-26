'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-toastify';
import { rootApi } from '@/libs/rootApi';

interface CurrentUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
  counter_id?: number;
  is_active: boolean;
}

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Optional: specific roles allowed
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ✅ Sử dụng sessionStorage thay vì localStorage
        const token = sessionStorage.getItem('auth_token');
        
        if (!token) {
          console.log('🔒 No auth token found');
          router.push('/login');
          return;
        }

        // ✅ Try to get cached user data first
        const cachedUserData = sessionStorage.getItem('user_data');
        
        let userData;
        if (cachedUserData) {
          try {
            userData = JSON.parse(cachedUserData);
            console.log('📋 Using cached user data:', userData);
            setCurrentUser(userData);
          } catch (parseError) {
            console.warn('⚠️ Failed to parse cached user data, fetching fresh...');
            sessionStorage.removeItem('user_data');
          }
        }

        // If no cached userData but a login is in progress, wait shortly for login to populate it
        async function waitForUserData(ms = 1500, interval = 100) {
          const start = Date.now();
          while (Date.now() - start < ms) {
            const ud = sessionStorage.getItem('user_data');
            if (ud) {
              try { return JSON.parse(ud); } catch { return null; }
            }
            const inProgress = sessionStorage.getItem('auth_in_progress');
            if (!inProgress) break;
            await new Promise(res => setTimeout(res, interval));
          }
          return null;
        }

        if (!userData) {
          const waited = await waitForUserData(1500, 100);
          if (waited) {
            userData = waited;
            console.log('📥 Found user_data populated by login flow:', userData);
            setCurrentUser(userData);
          }
        }

        // ✅ Fetch fresh user data if still not available after waiting
        if (!userData) {
          console.log('🔍 Verifying auth token...');
          const response = await rootApi.get('/auths/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          userData = response.data;
          console.log('👤 Fresh user data:', userData);
          
          // ✅ Cache user data in sessionStorage
          sessionStorage.setItem('user_data', JSON.stringify(userData));
          setCurrentUser(userData);
        }

        // ✅ Role-based routing logic
        if (pathname.startsWith('/test-queue')) {
          // test-queue is for admin only
          if (userData.role !== 'admin') {
            console.log(`🚫 Access denied: ${userData.role} trying to access test-queue`);
            
            // Redirect officer to their page
            if (userData.role === 'officer') {
              router.push('/officer');
              return;
            }
            
            router.push('/login');
            return;
          }
        }

        if (pathname.startsWith('/officer')) {
          // officer page is for officers only
          if (userData.role !== 'officer') {
            console.log(`🚫 Access denied: ${userData.role} trying to access officer page`);
            toast.error('❌ Chỉ cán bộ (officer) mới có thể truy cập trang này!');
            
            // Redirect admin to test-queue
            if (userData.role === 'admin') {
              router.push('/test-queue');
              return;
            }
            
            router.push('/login');
            return;
          }

          // Check if officer has counter assigned
          if (!userData.counter_id) {
            console.log(`🚫 Officer ${userData.username} has no counter assigned`);
            toast.error('❌ Tài khoản officer chưa được gán quầy làm việc!');
            router.push('/login');
            return;
          }
        }

        if (pathname.startsWith('/admin')) {
          // admin pages for admin/leader roles
          if (!['admin', 'leader'].includes(userData.role)) {
            console.log(`🚫 Access denied: ${userData.role} trying to access admin`);
            toast.error('❌ Chỉ admin hoặc leader mới có thể truy cập!');
            
            // Redirect officer to their page
            if (userData.role === 'officer') {
              router.push('/officer');
              return;
            }
            
            router.push('/login');
            return;
          }
        }

        // ✅ Check allowedRoles if specified
        if (allowedRoles && !allowedRoles.includes(userData.role)) {
          console.log(`🚫 Role ${userData.role} not in allowed roles:`, allowedRoles);
          toast.error(`❌ Bạn không có quyền truy cập trang này!`);
          
          // Redirect based on user role
          if (userData.role === 'admin') {
            router.push('/test-queue');
          } else if (userData.role === 'officer') {
            router.push('/officer');
          } else {
            router.push('/login');
          }
          return;
        }

        console.log(`✅ Authentication successful for ${userData.role} accessing ${pathname}`);
        setIsAuthenticated(true);

      } catch (error) {
        console.error('❌ Auth verification failed:', error);
        // ✅ Clear sessionStorage thay vì localStorage
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user_data');
        toast.error('❌ Phiên đăng nhập đã hết hạn!');
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname, allowedRoles]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Router.push sẽ redirect
  }

  return <>{children}</>;
}
