declare global {
  interface Window {
    qz?: any;
  }
}
'use client';

import React, { useState, useEffect } from 'react';

interface PrintTicketProps {
  number: number;
  counterId: string;
  counterName: string;
  autoPrint?: boolean;
  onPrintComplete?: () => void;
}

const PrintTicket: React.FC<PrintTicketProps> = ({
  number,
  counterId,
  counterName,
  autoPrint = false,
  onPrintComplete
}) => {
  const [printStatus, setPrintStatus] = useState<string>('');

  // ...removed kiosk detection logic...

  // 🖨️ Generate thermal HTML với enhanced debugging
  const generateThermalTicketHTML = (timeString: string, dateString: string): string => {
    const ticketHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Vé ${number} - ${counterName}</title>
        <style>
          @page {
            size: 80mm 60mm;
            margin: 0;
            page-break-after: always;
          }
          
          @media print {
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            body {
              width: 80mm;
              height: 60mm;
              margin: 0;
              padding: 4mm;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              page-break-inside: avoid;
              page-break-after: always;
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
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          .header {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            border-bottom: 1px dashed #000;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }
          
          .ticket-number {
            text-align: center;
            font-size: 48px;
            font-weight: bold;
            border: 2px solid #000;
            padding: 8px;
            margin: 16px 0;
          }
          
          .service-info, .counter-info, .timestamp, .footer {
            text-align: center;
            margin: 4px 0;
          }
          
          .counter-info {
            font-size: 16px;
            font-weight: bold;
          }
          
          .timestamp {
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 4px;
            margin-top: auto;
          }
          
          .footer {
            font-size: 10px;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          TRUNG TÂM PHỤC VỤ<br>
          HÀNH CHÍNH CÔNG<br>
          PHƯỜNG HÀ GIANG 1
        </div>
        
        <div class="service-info">SỐ THỨ TỰ</div>
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
      </body>
      </html>
    `;

    console.log('📄 Generated thermal ticket HTML:', {
      number,
      counterName,
      counterId,
      timeString,
      dateString,
      htmlLength: ticketHTML.length
    });

    return ticketHTML;
  };

  // 🖨️ In vé bằng QZ Tray (chỉ chạy ở client)
  const loadQZTrayScripts = () => {
    // Chỉ load nếu chưa có window.qz
    if (typeof window !== 'undefined' && !window.qz) {
      const scriptQZ = document.createElement('script');
      scriptQZ.src = '/src/components/kiosk/qz-tray.js';
      scriptQZ.async = false;
      document.body.appendChild(scriptQZ);

      const scriptSign = document.createElement('script');
      scriptSign.src = '/src/components/kiosk/sign-message.js';
      scriptSign.async = false;
      document.body.appendChild(scriptSign);
    }
  };

  const performQZTrayPrint = async (timeString: string, dateString: string): Promise<void> => {
    try {
      if (typeof window === 'undefined' || !window.qz) {
        setPrintStatus('❌ QZ Tray chưa sẵn sàng hoặc không hỗ trợ trên server');
        return;
      }
      setPrintStatus('🖨️ Đang kết nối QZ Tray...');
      if (!window.qz.websocket.isActive()) {
        await window.qz.websocket.connect();
      }

      setPrintStatus('🖨️ Đang gửi lệnh in qua QZ Tray...');
      const ticketHTML = generateThermalTicketHTML(timeString, dateString);
      const config = window.qz.configs.create('W80', {
        encoding: 'RAW',
        copies: 1,
        rasterize: true
      });
      const data = [
        { type: 'html', format: 'plain', data: ticketHTML }
      ];
      await window.qz.print(config, data);
      setPrintStatus('✅ Đã gửi lệnh in thành công qua QZ Tray');
      onPrintComplete?.();
      setTimeout(() => setPrintStatus(''), 3000);
    } catch (err) {
      setPrintStatus('❌ Lỗi in QZ Tray: ' + (err instanceof Error ? err.message : String(err)));
      console.error(err);
    }
  };

  // 🖨️ Browser print with dialog fallback
  const performBrowserPrint = async (timeString: string, dateString: string): Promise<void> => {
    try {
      setPrintStatus('🖨️ Mở hộp thoại in...');
      console.log('🖨️ Opening browser print dialog...');

      const thermalHTML = generateThermalTicketHTML(timeString, dateString);
      
      const originalContent = document.body.innerHTML;
      const originalTitle = document.title;
      
      document.title = `Vé ${number} - ${counterName}`;
      document.body.innerHTML = thermalHTML;

      window.print();
      
      setTimeout(() => {
        document.body.innerHTML = originalContent;
        document.title = originalTitle;
        setPrintStatus('✅ Hộp thoại in đã mở');
        onPrintComplete?.();
        
        setTimeout(() => setPrintStatus(''), 3000);
      }, 1000);

    } catch (error) {
      console.error('❌ Browser print failed:', error);
      setPrintStatus(`❌ Lỗi in: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 🎯 Main print handler: in qua QZ Tray
  const handlePrint = async () => {
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

      await performQZTrayPrint(timeString, dateString);
    } catch (error) {
      setPrintStatus(`💥 Lỗi nghiêm trọng: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`Lỗi in vé: ${error instanceof Error ? error.message : 'Unknown error'}\nVui lòng thử lại hoặc liên hệ nhân viên hỗ trợ.`);
      }
    }
  };

  // 🔄 Auto-load QZ Tray scripts và auto-print khi mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadQZTrayScripts();
    }
  }, []);

  useEffect(() => {
    if (autoPrint) {
      handlePrint();
    }
  }, [autoPrint, number, counterId, counterName]);

  return (
    <div className="flex flex-col space-y-4">
      {/* Print Button */}
      <button
        onClick={handlePrint}
        className="kiosk-card bg-red-600 hover:bg-red-700 text-white transition-colors duration-200 cursor-pointer p-8"
        disabled={!number || !counterId || !counterName}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-6xl mb-4">🖨️</div>
          <div className="text-2xl font-bold text-center">In số thứ tự</div>
          <div className="text-lg mt-2 opacity-90">Vé #{number}</div>
          <div className="text-sm opacity-75 mt-2">
            {counterName} - Quầy {counterId}
          </div>
        </div>
      </button>

      {/* Print Status Display */}
      {printStatus && (
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
          <div className="text-blue-800 font-medium text-center">
            {printStatus}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintTicket;
