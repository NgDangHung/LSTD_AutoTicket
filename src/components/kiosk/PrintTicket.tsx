'use client';
import { useEffect } from 'react';

interface Props {
  number: number;
  counterId: string;
  counterName: string;
  autoPrint?: boolean;
}

// 🔧 Enhanced kiosk-printing mode detection
const checkKioskPrintingMode = async (): Promise<boolean> => {
  try {
    // Method 1: Check UI elements visibility (kiosk mode indicators)
    const isKioskUI = !window.locationbar.visible && 
                     !window.menubar.visible && 
                     !window.toolbar.visible &&
                     window.outerHeight === window.screen.height &&
                     window.outerWidth === window.screen.width;

    // Method 2: Check URL and HTTPS
    const isProductionKiosk = window.location.hostname.includes('netlify.app') ||
                             window.location.pathname === '/kiosk';

    // Method 3: Test print behavior timing
    const testSilentPrint = (): Promise<boolean> => {
      return new Promise((resolve) => {
        const startTime = Date.now();
        let resolved = false;

        const originalPrint = window.print;
        window.print = function() {
          if (!resolved) {
            const executionTime = Date.now() - startTime;
            const isSilent = executionTime < 100; // Silent print is immediate
            resolved = true;
            window.print = originalPrint;
            resolve(isSilent);
          }
          return originalPrint.call(this);
        };

        // Trigger test print
        setTimeout(() => {
          if (!resolved) {
            window.print = originalPrint;
            resolve(false);
          }
        }, 200);

        window.print();
      });
    };

    const hasSilentPrint = await testSilentPrint();

    console.log('🔍 Kiosk printing detection:', {
      isKioskUI,
      isProductionKiosk,
      hasSilentPrint,
      finalResult: isKioskUI && hasSilentPrint
    });

    return isKioskUI && hasSilentPrint;

  } catch (error) {
    console.log('❌ Kiosk detection failed:', error);
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

// 🔧 Silent printing for kiosk mode
const performSilentPrint = async (number: number, counterId: string, counterName: string, timeString: string, dateString: string) => {
  try {
    console.log('🖨️ Performing silent print for thermal printer...');
    
    const thermalHTML = generateThermalTicketHTML(number, counterId, counterName, timeString, dateString);
    
    // Store original content
    const originalContent = document.body.innerHTML;
    const originalTitle = document.title;
    
    // Set optimized content for thermal printing
    document.title = `Vé số ${number} - ${counterName}`;
    document.body.innerHTML = thermalHTML;
    
    // Silent print
    window.print();
    
    // Restore and reload after print
    setTimeout(() => {
      document.body.innerHTML = originalContent;
      document.title = originalTitle;
      console.log('✅ Silent print completed, reloading kiosk...');
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Silent print failed:', error);
    // Fallback to normal print
    performBrowserPrint(number, counterId, counterName, timeString, dateString);
  }
};

// 🔧 Browser print fallback
const performBrowserPrint = (number: number, counterId: string, counterName: string, timeString: string, dateString: string) => {
  console.log('🖨️ Performing browser print with dialog...');
  
  document.body.innerHTML = `
    <div style="
      width: 300px;
      margin: auto;
      padding: 12px;
      font-family: monospace;
      font-size: 16px;
      text-align: center;
    ">
      <div style="font-size: 18px; font-weight: bold;">SỐ THỨ TỰ</div>
      <div style="font-size: 64px; font-weight: bold; margin: 20px 0;">${number}</div>
      <div style="font-size: 16px;">Quầy số ${counterId} - ${counterName}</div>
      <div style="font-size: 14px; margin-top: 8px;">${timeString} ${dateString}</div>
    </div>
  `;

  window.print();
  window.onafterprint = () => {
    window.location.reload();
  };
};

export default function PrintNow({ number, counterId, counterName, autoPrint }: Props) {
  useEffect(() => {
    if (!autoPrint) return;

    const executePrint = async () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const dateString = now.toLocaleDateString('vi-VN');

      // 🔧 Detect kiosk-printing mode and choose appropriate method
      const isKioskPrintMode = await checkKioskPrintingMode();
      
      console.log(`🎯 Print mode detected: ${isKioskPrintMode ? 'KIOSK-PRINTING (Silent)' : 'BROWSER (Dialog)'}`);

      if (isKioskPrintMode) {
        await performSilentPrint(number, counterId, counterName, timeString, dateString);
      } else {
        performBrowserPrint(number, counterId, counterName, timeString, dateString);
      }
    };

    executePrint();
  }, [number, counterId, counterName, autoPrint]);

  return <div id="print-area" style={{ display: 'none' }} />;
}
