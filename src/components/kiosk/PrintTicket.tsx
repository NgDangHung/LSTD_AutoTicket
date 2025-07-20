'use client';

import React, { useState, useEffect } from 'react';

interface PrintTicketProps {
  number: number;
  counterId: string;
  counterName: string;
  autoPrint?: boolean;
  onPrintComplete?: () => void;
}

interface DebugInfo {
  windowHeight: number;
  screenHeight: number;
  windowWidth: number;
  screenWidth: number;
  locationbarVisible: boolean | undefined;
  menubarVisible: boolean | undefined;
  toolbarVisible: boolean | undefined;
  statusbarVisible: boolean | undefined;
  isHTTPS: boolean;
  userAgent: string;
  isKioskInterface: boolean;
  kioskModeDetected: boolean;
  timestamp: string;
  error?: string;
}

// 🔍 Enhanced kiosk-printing mode detection with debug info
const checkKioskPrintingMode = async (updateDebug?: (info: DebugInfo) => void): Promise<boolean> => {
  try {
    // Collect comprehensive debug information
    const debugData: DebugInfo = {
      windowHeight: window.outerHeight,
      screenHeight: window.screen.height,
      windowWidth: window.outerWidth,
      screenWidth: window.screen.width,
      locationbarVisible: window.locationbar?.visible,
      menubarVisible: window.menubar?.visible,
      toolbarVisible: window.toolbar?.visible,
      statusbarVisible: window.statusbar?.visible,
      isHTTPS: window.location.protocol === 'https:',
      userAgent: navigator.userAgent,
      isKioskInterface: false,
      kioskModeDetected: false,
      timestamp: new Date().toLocaleTimeString('vi-VN')
    };

    // Method 1: Check window properties for kiosk mode
    const isKioskUI = () => {
      try {
        const isFullscreen = (
          window.outerHeight === window.screen.height &&
          window.outerWidth === window.screen.width
        );
        
        const noBrowserUI = (
          (!window.locationbar || !window.locationbar.visible) &&
          (!window.menubar || !window.menubar.visible) &&
          (!window.toolbar || !window.toolbar.visible) &&
          (!window.statusbar || !window.statusbar.visible)
        );

        return isFullscreen && noBrowserUI;
      } catch {
        // Fallback for browsers that don't support these properties
        return window.outerHeight === window.screen.height &&
               window.outerWidth === window.screen.width;
      }
    };

    const kioskDetected = isKioskUI();
    debugData.isKioskInterface = kioskDetected;
    debugData.kioskModeDetected = kioskDetected;

    // Update debug UI if callback provided
    if (updateDebug) {
      updateDebug(debugData);
    }

    console.log('🔍 Kiosk printing detection results:', debugData);

    // Additional checks for reliable detection
    const isHTTPS = window.location.protocol === 'https:';
    const isChrome = navigator.userAgent.includes('Chrome');
    const isKioskURL = window.location.pathname.includes('/kiosk');

    const finalResult = kioskDetected && isHTTPS && isChrome && isKioskURL;

    console.log('🎯 Final kiosk mode result:', {
      kioskDetected,
      isHTTPS,
      isChrome,
      isKioskURL,
      finalResult
    });

    return finalResult;

  } catch (error) {
    const errorInfo: DebugInfo = {
      windowHeight: 0,
      screenHeight: 0,
      windowWidth: 0,
      screenWidth: 0,
      locationbarVisible: undefined,
      menubarVisible: undefined,
      toolbarVisible: undefined,
      statusbarVisible: undefined,
      isHTTPS: false,
      userAgent: '',
      isKioskInterface: false,
      kioskModeDetected: false,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    if (updateDebug) {
      updateDebug(errorInfo);
    }

    console.error('❌ Kiosk print mode detection failed:', error);
    return false;
  }
};

// 🖨️ Generate thermal printer optimized HTML
const generateThermalTicketHTML = (number: number, counterId: string, counterName: string, timeString: string, dateString: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 80mm 60mm;
          margin: 0;
          page-break-after: always;  /* 🔧 Force auto-cut */
        }
        
        @media print {
          html, body {
            width: 80mm;
            height: 60mm;
            margin: 0;
            padding: 0;
            page-break-inside: avoid;
            page-break-after: always;  /* 🔧 Ensure cut after ticket */
          }
          
          .ticket-container {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .cut-line {
            page-break-after: always;
            height: 1px;
            visibility: hidden;
          }
        }
        
        body {
          width: 80mm;
          height: 60mm;
          margin: 0;
          padding: 4mm;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.2;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        
        .header {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 8px;
          border-bottom: 1px dashed #000;
          padding-bottom: 4px;
        }
        
        .ticket-number {
          text-align: center;
          font-size: 48px;
          font-weight: bold;
          margin: 16px 0;
          border: 2px solid #000;
          padding: 8px;
        }
        
        .counter-info {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          margin: 8px 0;
        }
        
        .timestamp {
          text-align: center;
          font-size: 10px;
          margin-top: auto;
          border-top: 1px dashed #000;
          padding-top: 4px;
        }
        
        .footer {
          text-align: center;
          font-size: 10px;
          font-style: italic;
          margin-top: 4px;
        }
      </style>
    </head>
    <body>
      <div class="ticket-container">
        <div class="header">
          TRUNG TÂM PHỤC VỤ<br>
          HÀNH CHÍNH CÔNG<br>
          PHƯỜNG HÀ GIANG 1
        </div>
        
        <div style="text-align: center; font-size: 12px; margin: 4px 0;">SỐ THỨ TỰ</div>
        
        <div class="ticket-number">${number}</div>
        
        <div class="counter-info">
          🏢 ${counterName}<br>
          Quầy số ${counterId}
        </div>
        
        <div class="timestamp">
          📅 ${dateString}<br>
          🕐 ${timeString}
        </div>
        
        <div class="footer">
          Vui lòng chờ được gọi<br>
          Cảm ơn quý khách!
        </div>
        
        <!-- 🔧 Auto-cut trigger -->
        <div class="cut-line"></div>
      </div>
    </body>
    </html>
  `;
};

// 🖨️ Silent printing for kiosk mode using iframe method
const performSilentPrint = async (number: number, counterId: string, counterName: string, timeString: string, dateString: string): Promise<void> => {
  try {
    console.log('🖨️ Performing silent thermal print...');

    // Generate thermal printer HTML
    const thermalPrintHTML = generateThermalTicketHTML(number, counterId, counterName, timeString, dateString);
    
    // Create hidden iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.left = '-9999px';
    printFrame.style.top = '-9999px';
    printFrame.style.width = '80mm';
    printFrame.style.height = '60mm';
    printFrame.style.border = 'none';
    printFrame.style.visibility = 'hidden';
    
    document.body.appendChild(printFrame);
    
    // Load content and execute print
    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(thermalPrintHTML);
      frameDoc.close();
      
      // Wait for content to load then print
      setTimeout(() => {
        try {
          printFrame.contentWindow?.print();
          console.log('✅ Silent print executed successfully');
          
          // Cleanup after print
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 2000);
          
        } catch (printError) {
          console.error('❌ Print execution failed:', printError);
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
          throw printError;
        }
      }, 800); // Increased delay for content loading
    } else {
      if (document.body.contains(printFrame)) {
        document.body.removeChild(printFrame);
      }
      throw new Error('Failed to access iframe document');
    }

  } catch (error) {
    console.error('❌ Silent print failed:', error);
    throw error;
  }
};

// 🖨️ Fallback browser print with enhanced thermal layout
const performBrowserPrint = async (number: number, counterId: string, counterName: string, timeString: string, dateString: string): Promise<void> => {
  try {
    console.log('🖨️ Performing browser print with dialog...');

    const thermalPrintHTML = generateThermalTicketHTML(number, counterId, counterName, timeString, dateString);
    
    // Create new window for printing to avoid disrupting main interface
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      throw new Error('Failed to open print window');
    }

    printWindow.document.open();
    printWindow.document.write(thermalPrintHTML);
    printWindow.document.close();

    // Focus and print
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      
      // Close print window after print dialog closes
      printWindow.onafterprint = () => {
        printWindow.close();
      };
      
      // Fallback close after timeout
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
        }
      }, 5000);
    }, 500);

  } catch (error) {
    console.error('❌ Browser print failed:', error);
    throw error;
  }
};

// 🎯 Main print handler
const handlePrint = async (number: number, counterId: string, counterName: string, onComplete?: () => void, updateDebug?: (info: DebugInfo) => void) => {
  try {
    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const dateString = now.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    console.log('🎯 Starting print process...');
    console.log('📄 Ticket details:', { number, counterName, counterId, timeString, dateString });

    // Check if in kiosk-printing mode
    const isKioskPrintMode = await checkKioskPrintingMode(updateDebug);
    
    if (isKioskPrintMode) {
      console.log('🏛️ Kiosk printing mode detected - performing silent print');
      await performSilentPrint(number, counterId, counterName, timeString, dateString);
    } else {
      console.log('🖥️ Browser mode detected - showing print dialog');
      await performBrowserPrint(number, counterId, counterName, timeString, dateString);
    }

    // Call completion callback
    onComplete?.();

  } catch (error) {
    console.error('❌ Print process failed:', error);
    
    // Show error message to user
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('Lỗi in vé. Vui lòng thử lại hoặc liên hệ nhân viên hỗ trợ.');
    }
    
    throw error;
  }
};

// 🎯 PrintTicket React Component with Debug UI
const PrintTicket: React.FC<PrintTicketProps> = ({ 
  number, 
  counterId, 
  counterName, 
  autoPrint = false, 
  onPrintComplete 
}) => {
  
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isKioskMode, setIsKioskMode] = useState<boolean | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  // Debug info updater
  const updateDebugInfo = (info: DebugInfo) => {
    setDebugInfo(info);
    setIsKioskMode(info.kioskModeDetected);
    console.log('🔍 Debug Info Updated:', info);
  };

  // 🖨️ Handle print button click
  const handlePrintClick = async () => {
    try {
      await handlePrint(number, counterId, counterName, onPrintComplete, updateDebugInfo);
    } catch (error) {
      console.error('Print failed:', error);
    }
  };

  // 🔄 Auto-print on component mount if autoPrint is true
  useEffect(() => {
    if (autoPrint) {
      handlePrintClick();
    }
  }, [autoPrint, number, counterId, counterName]);

  // 🔍 Test kiosk detection on component mount
  useEffect(() => {
    checkKioskPrintingMode(updateDebugInfo);
  }, []);

  // 🎨 Render print button UI with debug panel
  return (
    <div className="flex flex-col">
      {/* Main Print Button */}
      <button
        onClick={handlePrintClick}
        className="kiosk-card bg-red-600 hover:bg-red-700 text-white transition-colors duration-200 cursor-pointer mb-4"
        disabled={!number || !counterId || !counterName}
      >
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="text-6xl mb-4">🖨️</div>
          <div className="text-2xl font-bold text-center mb-2">In số thứ tự</div>
          <div className="text-lg opacity-90">Vé #{number}</div>
          <div className="text-sm opacity-75 mt-2">
            {counterName} - Quầy {counterId}
          </div>
        </div>
      </button>

      {/* Debug Toggle Button */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm transition-colors"
      >
        {showDebug ? '🔽 Ẩn Debug' : '🔍 Hiện Debug Info'}
      </button>

      {/* Debug Info Panel */}
      {showDebug && debugInfo && (
        <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 text-xs font-mono">
          {/* Status Indicator */}
          <div className="flex items-center mb-4">
            <span className={`inline-block w-4 h-4 rounded-full mr-3 ${
              isKioskMode === true ? 'bg-green-500' : 
              isKioskMode === false ? 'bg-red-500' : 'bg-yellow-500'
            }`}></span>
            <span className="font-bold text-lg">
              {isKioskMode === true ? '✅ Kiosk Mode Active' : 
               isKioskMode === false ? '❌ Browser Mode' : '🔄 Detecting...'}
            </span>
          </div>

          {/* Debug Details */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>🖥️ Window Size:</strong><br/>
                {debugInfo.windowWidth} x {debugInfo.windowHeight}
              </div>
              <div>
                <strong>📺 Screen Size:</strong><br/>
                {debugInfo.screenWidth} x {debugInfo.screenHeight}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>🔒 HTTPS:</strong> {debugInfo.isHTTPS ? '✅' : '❌'}
              </div>
              <div>
                <strong>🌐 Chrome:</strong> {debugInfo.userAgent.includes('Chrome') ? '✅' : '❌'}
              </div>
            </div>

            <div className="space-y-1">
              <div><strong>📍 Location Bar:</strong> {debugInfo.locationbarVisible ? '👁️ Visible' : '🚫 Hidden'}</div>
              <div><strong>📋 Menu Bar:</strong> {debugInfo.menubarVisible ? '👁️ Visible' : '🚫 Hidden'}</div>
              <div><strong>🔧 Tool Bar:</strong> {debugInfo.toolbarVisible ? '👁️ Visible' : '🚫 Hidden'}</div>
              <div><strong>📊 Status Bar:</strong> {debugInfo.statusbarVisible ? '👁️ Visible' : '🚫 Hidden'}</div>
            </div>

            <div className="border-t pt-2 mt-3">
              <strong>🕐 Last Check:</strong> {debugInfo.timestamp}
            </div>

            {debugInfo.error && (
              <div className="border-t pt-2 mt-3 text-red-600">
                <strong>❌ Error:</strong> {debugInfo.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintTicket;
