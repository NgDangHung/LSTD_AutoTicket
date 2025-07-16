'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { userAPI } from '@/libs/api';
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
      console.log('🌐 Full URL: https://detect-seat.onrender.com/auths/login');
      console.log('📤 Payload:', JSON.stringify(loginData, null, 2));
      console.log('📋 Headers: Content-Type: application/json');
      
      const response = await userAPI.login(loginData as any);

      console.log('✅ Login Response:', response);

      // Lưu token vào localStorage
      const responseData = response.data || response;
      if (responseData.token || responseData.access_token) {
        const token = responseData.token || responseData.access_token;
        localStorage.setItem('auth_token', token);
        toast.success('Đăng nhập thành công!');
        
        // Chuyển hướng đến test-queue
        router.push('/test-queue');
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
