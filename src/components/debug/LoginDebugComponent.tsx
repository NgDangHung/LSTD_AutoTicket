import React, { useState } from 'react';
import { userAPI } from '@/libs/api';
import axios from 'axios';

const baseURL = 'https://detect-seat.onrender.com/app';

// Test different endpoints
const testEndpoints = [
  '/login',
  '/auth/login', 
  '/api/auth/login',
  '/v1/auth/login',
  '/user/login',
  '/api/login'
];

export default function LoginDebugComponent() {
  const [credentials, setCredentials] = useState({ username: 'admin', password: '123456' });
  const [selectedEndpoint, setSelectedEndpoint] = useState('/login');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing login with endpoint:', selectedEndpoint);
      console.log('📝 Credentials:', credentials);
      
      const result = await axios.post(`${baseURL}${selectedEndpoint}`, credentials, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      setResponse(result);
      setError(null);
      console.log('✅ Login success:', result);
    } catch (err: any) {
      setError(err);
      setResponse(null);
      console.error('❌ Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testApiLogin = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing with userAPI.login');
      const result = await userAPI.login(credentials);
      setResponse(result);
      setError(null);
      console.log('✅ API Login success:', result);
    } catch (err: any) {
      setError(err);
      setResponse(null);
      console.error('❌ API Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h3 className="text-lg font-bold mb-4">🧪 Login Debug Tool</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username:</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              placeholder="Enter username"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password:</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              placeholder="Enter password"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Test Endpoint:</label>
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              {testEndpoints.map(endpoint => (
                <option key={endpoint} value={endpoint}>
                  {baseURL}{endpoint}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={testLogin}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? '⏳ Testing...' : '🚀 Test Direct Axios'}
            </button>
            
            <button
              onClick={testApiLogin}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? '⏳ Testing...' : '🔧 Test userAPI.login'}
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          {response && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <h4 className="font-medium text-green-800">✅ Success Response:</h4>
              <div className="text-sm mt-2 text-green-700">
                <p><strong>Status:</strong> {response.status}</p>
                <p><strong>URL:</strong> {response.config?.url}</p>
                <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <h4 className="font-medium text-red-800">❌ Error Response:</h4>
              <div className="text-sm mt-2 text-red-700">
                <p><strong>Status:</strong> {error.response?.status || 'Network Error'}</p>
                <p><strong>URL:</strong> {error.config?.url}</p>
                <p><strong>Message:</strong> {error.message}</p>
                {error.response?.data && (
                  <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(error.response.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
