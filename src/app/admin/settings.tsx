'use client';

import React from 'react';
// Update the import path below if the file is located elsewhere
import AutoCallConfig from '@/components/admin/AutoCallConfig';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Cấu hình hệ thống
        </h1>
        <AutoCallConfig />
      </div>
    </div>
  );
}
