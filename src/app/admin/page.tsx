'use client';

import React from 'react';
import Dashboard from '@/components/admin/Dashboard';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Dashboard Quản trị
        </h1>
        <Dashboard/>
      </div>
    </div>
  );
}
