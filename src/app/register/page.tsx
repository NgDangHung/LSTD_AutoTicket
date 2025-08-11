'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { userAPI } from '@/libs/api';
import { toast } from 'react-toastify';
import Link from 'next/link';

interface RegisterFormData {
  username: string;
  password: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const registerData = {
        username: formData.username,
        password: formData.password
      };
      
      console.log('📝 Register Request Details:');
      console.log('📡 Endpoint: POST /auths/users/');
      console.log('🌐 Full URL: https://lstd.onrender.com/auths/users/');
      console.log('📤 Payload:', JSON.stringify(registerData, null, 2));
      console.log('📋 Headers: Content-Type: application/json');
      
      const response = await userAPI.register(registerData);

      console.log('✅ Registration Response:', response);
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      
      // Chuyển về trang đăng nhập
      router.push('/login');
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Đăng ký thất bại';
      toast.error(`Lỗi đăng ký: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Đăng Ký</h1>
          <p className="text-gray-600">Tạo tài khoản mới cho hệ thống</p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-6">
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
                Đang đăng ký...
              </span>
            ) : (
              'Đăng Ký'
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Đã có tài khoản?
            <Link 
              href="/login"
              className="ml-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
