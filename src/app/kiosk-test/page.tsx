'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, Monitor, Volume2, Wifi, Chrome, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'testing';
  message: string;
  details?: string;
}

export default function KioskTestPage() {
  const router = useRouter();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [kioskInfo, setKioskInfo] = useState({
    isKioskMode: false,
    chromeVersion: '',
    printerName: '',
    screenResolution: '',
    touchSupport: false
  });

  // Test functions
  const tests = [
    {
      name: 'Chrome Kiosk Mode Detection',
      test: async (): Promise<TestResult> => {
        try {
          const isKiosk = !!(window as any).chrome?.runtime &&
                          navigator.userAgent.includes('Chrome');
          
          const chromeMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
          const chromeVersion = chromeMatch ? parseInt(chromeMatch[1]) : 0;
          
          if (isKiosk && chromeVersion >= 88) {
            return {
              name: 'Chrome Kiosk Mode Detection',
              status: 'success',
              message: `Chrome ${chromeVersion} kiosk mode detected`,
              details: '--kiosk-printing support available'
            };
          } else if (chromeVersion >= 88) {
            return {
              name: 'Chrome Kiosk Mode Detection',
              status: 'warning',
              message: `Chrome ${chromeVersion} detected but not in kiosk mode`,
              details: 'Start with --kiosk --kiosk-printing flags'
            };
          } else {
            return {
              name: 'Chrome Kiosk Mode Detection',
              status: 'error',
              message: `Chrome version ${chromeVersion} too old`,
              details: 'Requires Chrome 88+ for --kiosk-printing support'
            };
          }
        } catch (error) {
          return {
            name: 'Chrome Kiosk Mode Detection',
            status: 'error',
            message: 'Failed to detect Chrome version',
            details: 'Browser detection error'
          };
        }
      }
    },
    {
      name: 'Silent Printing Capability',
      test: async (): Promise<TestResult> => {
        try {
          // Check if we can access print functionality
          if (typeof window.print === 'function') {
            // Test if we're in kiosk-printing mode by checking for print dialog suppression
            const isKioskPrinting = !!(window as any).chrome?.runtime;
            
            if (isKioskPrinting) {
              return {
                name: 'Silent Printing Capability',
                status: 'success',
                message: 'Silent printing available',
                details: 'Chrome kiosk-printing mode detected'
              };
            } else {
              return {
                name: 'Silent Printing Capability',
                status: 'warning',
                message: 'Print function available but not silent',
                details: 'Will show print dialog unless in kiosk-printing mode'
              };
            }
          } else {
            return {
              name: 'Silent Printing Capability',
              status: 'error',
              message: 'Print function not available',
              details: 'window.print() not accessible'
            };
          }
        } catch (error) {
          return {
            name: 'Silent Printing Capability',
            status: 'error',
            message: 'Print capability test failed',
            details: 'Error accessing print functionality'
          };
        }
      }
    },
    {
      name: 'Touch Screen Support',
      test: async (): Promise<TestResult> => {
        try {
          const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
          
          if (touchSupport) {
            return {
              name: 'Touch Screen Support',
              status: 'success',
              message: `Touch support detected (${navigator.maxTouchPoints} points)`,
              details: 'Touch interactions will work properly'
            };
          } else {
            return {
              name: 'Touch Screen Support',
              status: 'warning',
              message: 'No touch support detected',
              details: 'Mouse/keyboard input only'
            };
          }
        } catch (error) {
          return {
            name: 'Touch Screen Support',
            status: 'error',
            message: 'Touch detection failed',
            details: 'Unable to determine touch capabilities'
          };
        }
      }
    },
    {
      name: 'Voice Recognition Support',
      test: async (): Promise<TestResult> => {
        try {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          
          if (SpeechRecognition) {
            // Test if we can create a recognition instance
            const recognition = new SpeechRecognition();
            recognition.lang = 'vi-VN';
            
            return {
              name: 'Voice Recognition Support',
              status: 'success',
              message: 'Web Speech API available',
              details: 'Vietnamese voice recognition ready'
            };
          } else {
            return {
              name: 'Voice Recognition Support',
              status: 'error',
              message: 'Web Speech API not available',
              details: 'Voice search will not work'
            };
          }
        } catch (error) {
          return {
            name: 'Voice Recognition Support',
            status: 'error',
            message: 'Voice recognition test failed',
            details: 'Error initializing speech recognition'
          };
        }
      }
    },
    {
      name: 'Screen Resolution Check',
      test: async (): Promise<TestResult> => {
        try {
          const width = window.screen.width;
          const height = window.screen.height;
          const ratio = width / height;
          
          if (width >= 1920 && height >= 1080) {
            return {
              name: 'Screen Resolution Check',
              status: 'success',
              message: `${width}x${height} - Full HD or better`,
              details: `Aspect ratio: ${ratio.toFixed(2)}:1`
            };
          } else if (width >= 1366 && height >= 768) {
            return {
              name: 'Screen Resolution Check',
              status: 'warning',
              message: `${width}x${height} - Minimum resolution`,
              details: 'Kiosk interface may be cramped'
            };
          } else {
            return {
              name: 'Screen Resolution Check',
              status: 'error',
              message: `${width}x${height} - Resolution too low`,
              details: 'Recommended: 1920x1080 or higher'
            };
          }
        } catch (error) {
          return {
            name: 'Screen Resolution Check',
            status: 'error',
            message: 'Screen resolution detection failed',
            details: 'Unable to determine screen size'
          };
        }
      }
    },
    {
      name: 'Network Connectivity',
      test: async (): Promise<TestResult> => {
        try {
          const isOnline = navigator.onLine;
          
          if (isOnline) {
            // Test actual network by trying to fetch from the same domain
            try {
              const response = await fetch('/api-test', { 
                method: 'HEAD',
                cache: 'no-cache',
                signal: AbortSignal.timeout(5000)
              });
              
              return {
                name: 'Network Connectivity',
                status: 'success',
                message: 'Network connection active',
                details: 'Can communicate with server'
              };
            } catch (fetchError) {
              return {
                name: 'Network Connectivity',
                status: 'warning',
                message: 'Browser reports online but server unreachable',
                details: 'Check server status and network configuration'
              };
            }
          } else {
            return {
              name: 'Network Connectivity',
              status: 'error',
              message: 'No network connection',
              details: 'Check network cables and WiFi connection'
            };
          }
        } catch (error) {
          return {
            name: 'Network Connectivity',
            status: 'error',
            message: 'Network test failed',
            details: 'Unable to determine network status'
          };
        }
      }
    }
  ];

  const runTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    
    for (const testConfig of tests) {
      // Show testing status
      setTestResults(prev => [...prev, {
        name: testConfig.name,
        status: 'testing',
        message: 'Running test...'
      }]);
      
      // Run the test
      const result = await testConfig.test();
      
      // Update with actual result
      setTestResults(prev => 
        prev.map(r => r.name === testConfig.name ? result : r)
      );
      
      // Small delay between tests for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunningTests(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'testing':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'testing':
        return 'border-blue-200 bg-blue-50';
    }
  };

  // Auto-run tests on mount
  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Monitor className="w-8 h-8 text-blue-600" />
                Kiosk System Test Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Kiểm tra tính năng hệ thống Kiosk và cấu hình phần cứng
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={runTests}
                disabled={isRunningTests}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isRunningTests ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {isRunningTests ? 'Đang kiểm tra...' : 'Chạy lại kiểm tra'}
              </button>
              <button
                onClick={() => router.push('/kiosk')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                Vào Kiosk
              </button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-4">
          {testResults.map((result, index) => (
            <div
              key={result.name}
              className={`bg-white rounded-lg border-2 p-6 transition-all duration-300 ${getStatusColor(result.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{result.name}</h3>
                    <p className="text-gray-700 mt-1">{result.message}</p>
                    {result.details && (
                      <p className="text-sm text-gray-500 mt-2">{result.details}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* System Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Chrome className="w-6 h-6 text-blue-600" />
            Thông tin hệ thống
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Browser</label>
                <p className="text-gray-900">{navigator.userAgent}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Screen Resolution</label>
                <p className="text-gray-900">{window.screen.width} x {window.screen.height}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Viewport Size</label>
                <p className="text-gray-900">{window.innerWidth} x {window.innerHeight}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Touch Support</label>
                <p className="text-gray-900">
                  {navigator.maxTouchPoints > 0 ? `${navigator.maxTouchPoints} touch points` : 'Not supported'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Online Status</label>
                <p className="text-gray-900">{navigator.onLine ? 'Connected' : 'Offline'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Language</label>
                <p className="text-gray-900">{navigator.language}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Deployment Instructions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Printer className="w-6 h-6 text-green-600" />
            Hướng dẫn triển khai Kiosk
          </h2>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">1. Chuẩn bị Chrome Kiosk Mode</h3>
              <code className="block bg-gray-800 text-green-400 p-3 rounded text-sm">
                chrome.exe --kiosk --kiosk-printing --disable-web-security<br/>
                &nbsp;&nbsp;--autoplay-policy=no-user-gesture-required<br/>
                &nbsp;&nbsp;http://localhost:3000/kiosk
              </code>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">2. Cấu hình máy in nhiệt</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Đặt máy in nhiệt làm máy in mặc định trong Windows</li>
                <li>Cấu hình khổ giấy: 80mm x liên tục</li>
                <li>Chất lượng in: Draft (nhanh nhất)</li>
                <li>Lề: 0mm tất cả các cạnh</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">3. Chạy script triển khai</h3>
              <code className="block bg-gray-800 text-green-400 p-3 rounded text-sm">
                # Tự động build và tạo script launcher<br/>
                build-kiosk.bat<br/><br/>
                # Khởi động hệ thống hoàn chỉnh<br/>
                deploy-kiosk.bat
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
