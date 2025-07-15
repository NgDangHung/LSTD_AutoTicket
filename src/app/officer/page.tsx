'use client';

import React from 'react';
import OfficerQueueList from '@/components/officer/OfficerQueueList';

export default function OfficerPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Giao diện cán bộ tiếp nhận
        </h1>
        <OfficerQueueList />
      </div>
    </div>
  );
}
