'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { userAPI } from '@/libs/api';
import { rootApi } from '@/libs/rootApi';
import { toast } from 'react-toastify';
import Link from 'next/link';

interface LoginFormData {
  username: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Try different payload formats
      const loginFormats = [
        // Format 1: Direct
        { username: formData.username, password: formData.password },
        
        // Format 2: Wrapped in body
        { body: { username: formData.username, password: formData.password } },
        
        // Format 3: Different field names
        { email: formData.username, password: formData.password },
        { user: formData.username, pass: formData.password }
      ];
      
      const loginData = loginFormats[0]; // Start with format 1
      
      console.log('🔐 Login Request Details:');
      console.log('📡 Endpoint: POST /auths/login');
      console.log('🌐 Full URL: https://lstd.onrender.com/auths/login');
      console.log('📤 Payload:', JSON.stringify(loginData, null, 2));
      console.log('📋 Headers: Content-Type: application/json');
      
      const response = await userAPI.login(loginData as any);

      console.log('✅ Login Response:', response);

      // ✅ Lưu token vào sessionStorage thay vì localStorage
      const responseData = response.data || response;
      if (responseData.token || responseData.access_token) {
        const token = responseData.token || responseData.access_token;

        // Mark login flow in-progress so AuthGuard can wait for user_data
        try { sessionStorage.setItem('auth_in_progress', '1'); } catch {}
        sessionStorage.setItem('auth_token', token);

        // helper: wrap a promise with timeout
        const withTimeout = async <T,>(p: Promise<T>, ms = 7000): Promise<T> => {
          const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
          return Promise.race([p, timeout]) as Promise<T>;
        };

        // ✅ Get user info to determine redirect path using rootApi (same axios instance)
        try {
          console.log('🔍 Getting user info for redirect (rootApi)...');
          const resp = await withTimeout(rootApi.get('/auths/me', { params: { tenxa: 'xabachxa' } }), 7000);
          const userData = resp.data;
          console.log('👤 User info:', userData);

          // ✅ Lưu user data vào sessionStorage
          sessionStorage.setItem('user_data', JSON.stringify(userData));

          // clear in-progress flag
          try { sessionStorage.removeItem('auth_in_progress'); } catch {}

          toast.success(`🎉 Chào mừng ${userData.full_name}!`);

          // ✅ Role-based redirect
          if (userData.role === 'admin') {
            console.log('🔀 Redirecting admin to test-queue');
            router.push('/test-queue');
          } else if (userData.role === 'officer') {
            console.log('🔀 Redirecting officer to officer page');

            // Check if officer has counter assigned
            if (userData.counter_id) {
              router.push('/officer');
            } else {
              toast.error('❌ Tài khoản officer chưa được gán quầy!');
              sessionStorage.removeItem('auth_token');
              sessionStorage.removeItem('user_data');
              return;
            }
          } else if (userData.role === 'leader') {
            console.log('🔀 Redirecting leader to admin');
            router.push('/admin');
          } else {
            console.log('🔀 Unknown role, redirecting to default');
            router.push('/test-queue');
          }
        } catch (userError) {
          console.error('❌ Error getting user info (rootApi or timeout):', userError);
          // clear flag
          try { sessionStorage.removeItem('auth_in_progress'); } catch {}

          // Fallback to test-queue but keep token for manual verification later
          toast.success('Đăng nhập thành công!');
          router.push('/test-queue');
        }
        
      } else {
        console.log('Response data:', responseData);
        toast.error('Không nhận được token từ server');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Đăng nhập thất bại';
      toast.error(`Lỗi đăng nhập: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Đăng Nhập</h1>
          <p className="text-gray-600">Truy cập hệ thống quản lý hàng đợi</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Tên đăng nhập
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              className="bg-gray-200 text-gray-800 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Nhập tên đăng nhập"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="bg-gray-200 text-gray-800 w-full px-4 py-3 border border-gr y-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Nhập mật khẩu"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang đăng nhập...
              </span>
            ) : (
              'Đăng Nhập'
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Chưa có tài khoản?
            <Link 
              href="/register"
              className="ml-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
