'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Dashboard from '@/components/admin/Dashboard';
import AuthGuard from '@/components/shared/AuthGuard';
import { rootApi } from '@/libs/rootApi';

interface CurrentUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
  counter_id?: number;
  is_active: boolean;
}

function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // ✅ Load current user info và kiểm tra quyền admin
  const loadCurrentUser = useCallback(async () => {
    try {
      setUserLoading(true);
      
      // ✅ Sử dụng sessionStorage thay vì localStorage
      const authToken = sessionStorage.getItem('auth_token');
      if (!authToken) {
        router.push('/login');
        return;
      }

      // ✅ Try to get cached user data first
      const cachedUserData = sessionStorage.getItem('user_data');
      if (cachedUserData) {
        try {
          const userData = JSON.parse(cachedUserData);
          console.log('👤 Using cached user data for admin:', userData);
          
          // ✅ Check if user is admin from cache
          if (userData.role !== 'admin') {
            toast.error('❌ Chỉ admin mới có thể truy cập trang này!');
            router.push('/login');
            return;
          }
          
          setCurrentUser(userData);
          setUserLoading(false);
          return; // Exit early if we have valid cached data
        } catch (parseError) {
          console.warn('⚠️ Invalid cached user data, fetching fresh data');
          sessionStorage.removeItem('user_data');
        }
      }
      
      // ✅ Fetch fresh user data if not cached
      console.log('🔍 Loading current user info for admin access...');
      const response = await rootApi.get('/auths/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        params: { tenxa: 'xavixuyen' }
      });
      
      const userData = response.data;
      console.log('👤 Current user data for admin:', userData);
      
      // ✅ Cache user data in sessionStorage
      sessionStorage.setItem('user_data', JSON.stringify(userData));
      
      // ✅ Check if user is admin
      if (userData.role !== 'admin') {
        toast.error('❌ Chỉ admin mới có thể truy cập trang này!');
        router.push('/login');
        return;
      }
      
      setCurrentUser(userData);
      console.log(`✅ Admin ${userData.full_name} access granted`);
      
    } catch (error) {
      console.error('❌ Failed to load user info for admin access:', error);
      // ✅ Clear sessionStorage on error
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('user_data');
      toast.error('❌ Không thể tải thông tin người dùng!');
      router.push('/login');
    } finally {
      setUserLoading(false);
    }
  }, [router]);

  // ✅ Initial authentication check
  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  // ✅ Handle logout
  const handleLogout = () => {
    // ✅ Clear sessionStorage thay vì localStorage
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_data');
    router.push('/login');
  };

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-center">Đang xác thực quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // No user data (shouldn't reach here due to redirects, but safety check)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-red-600 text-center">❌ Không thể xác thực người dùng</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header with user info and logout */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">QUẢN TRỊ HỆ THỐNG</h1>
              
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Đăng nhập với quyền</p>
                <p className="font-semibold text-purple-600">{currentUser.role.toUpperCase()}</p>
              </div>
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                🚪 Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <Dashboard />
    </div>
  );
}

export default function AdminPageWithAuth() {
  return (
    <AuthGuard>
      <AdminPage />
    </AuthGuard>
  );
}
