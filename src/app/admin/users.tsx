'use client';

import React from 'react';
import UserManagement from '@/components/admin/UserManagement';

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Quản lý cán bộ & phân quyền
        </h1>
        <UserManagement />
      </div>
    </div>
  );
}
