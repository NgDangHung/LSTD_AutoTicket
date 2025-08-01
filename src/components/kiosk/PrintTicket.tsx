'use client';

// declare global {
//   interface Window {
//     qz: any;
//   }
// }

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
  const [qzReady, setQzReady] = useState(false);

  // ...removed kiosk detection logic...

  // 🖨️ Generate thermal HTML với enhanced debugging
    const generateThermalTicketHTML = React.useCallback((timeString: string, dateString: string): string => {
  //     const ticketHTML = `
  //   <div style="width:80mm;height:60mm;padding:0;margin:0;font-family:'Arial', monospace;font-size:12px;line-height:1.4;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:space-between;">
  //     <div>
  //       <div style="font-weight:bold;font-size:14px;">
  //         TRUNG TÂM DỊCH VỤ HÀNH CHÍNH CÔNG
  //       </div>
  //       <div style="font-weight:bold;font-size:18px;">
  //         PHƯỜNG HÀ GIANG 1
  //       </div>
  //       <div style="margin-top:8px;font-weight: 20;">SỐ THỨ TỰ</div>
  //       <div style="font-size:60px;font-weight:900;margin:8px 0;">
  //         ${number}
  //       </div>
  //       <div style="margin-top:4px;font-weight: 20;">QUẦY PHỤC VỤ 0${counterId}</div>
  //       <div style="font-weight:900;font-size:18px">${counterName.toUpperCase()}</div>
  //     </div>
  //     <div>
  //       <div style="margin-top:12px;font-weight: 20;font-size:12px;">
  //         THỜI GIAN IN VÉ:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${dateString} - ${timeString}
  //       </div>
  //       <div style="font-style:italic;font-weight: bold;margin-top:8px;font-size:14px;">
  //         Cảm ơn Quý khách!
  //       </div>
  //     </div>
  //   </div>
  // `;
    const ticketHTML = `
  <div style="width:80mm;min-height:60mm;padding:0;margin:0;font-family:'Arial', monospace;font-size:12px;line-height:1.4;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-weight:bold;font-size:14px;">
        TRUNG TÂM DỊCH VỤ HÀNH CHÍNH CÔNG
      </div>
      <div style="font-weight:bold;font-size:18px;">
        XÃ VỊ XUYÊN 
      </div>
      <div style="margin-top:8px;font-weight: bold;">SỐ THỨ TỰ</div>
      <div style="font-size:60px;font-weight:900;margin:8px 0;">
        ${number}
      </div>
      <div style="margin-top:4px;font-weight: 20;">QUẦY PHỤC VỤ 0${counterId}</div>
      <div style="font-weight:900;font-size:18px">${counterName.toUpperCase()}</div>
    </div>
    <div>
      <div style="margin-top:12px;font-weight: 20;font-size:12px;">
        THỜI GIAN IN VÉ:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${dateString} - ${timeString}
      </div>
      <div style="font-style:italic;font-weight: bold;margin-top:8px;font-size:14px;">
        Cảm ơn Quý khách!
      </div>
    </div>
    <div></div> <!-- Đảm bảo kéo đủ giấy -->
  </div>
`;
  console.log('📄 Generated thermal ticket HTML:', {
    number,
    counterId,
    counterName,
    timeString,
    dateString,
    htmlLength: ticketHTML.length
  });

  return ticketHTML;
}, [number, counterId, counterName]);



  // 🖨️ In vé bằng QZ Tray (chỉ chạy ở client)
  const loadQZTrayScripts = () => {
    if (typeof window !== 'undefined') {
      // Luôn load 3 file khi mount, không phụ thuộc vào window.qz
      const scripts = [
        { src: 'jsrsasign-all-min.js', id: 'jsrsasign-script' },
        { src: 'qz-tray.js', id: 'qztray-script', 
          onload: () => {
            console.log('qz-tray.js loaded');
            setQzReady(true);
            const qz = (window as any).qz;
            (qz as any).security.setCertificatePromise(function (resolve: any, reject: any) {
              resolve("-----BEGIN CERTIFICATE-----\n" +
            "MIIECzCCAvOgAwIBAgIGAZg/4qd3MA0GCSqGSIb3DQEBCwUAMIGiMQswCQYDVQQG\n" +
            "EwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS\n" +
            "UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx\n" +
            "HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg\n" +
            "RGVtbyBDZXJ0MB4XDTI1MDcyNDA0NDExNVoXDTQ1MDcyNDA0NDExNVowgaIxCzAJ\n" +
            "BgNVBAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD\n" +
            "VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs\n" +
            "IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog\n" +
            "VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDF\n" +
            "Jrz71Nj2KVmR8LBj7ovgC049m8Bya5AerOA/98zizcVTnGQKZczw8ccTzELupxjE\n" +
            "mxaM/jTPVgDEzLhjJFSIYzEgDXLyQD/8SABAjbGI2wRajYyD9TnT8UBOVmLepEV7\n" +
            "d8LRh6IfUiQavFE6VpXI1+slN5TjCOOoK62/KY+ReLmngIRncuvD3NRwBhjtwDv+\n" +
            "hknY+TtPNxM2/cSDhfwBNZaf0UQKnpvK/xRL4OoKYUH/6Wjxt24+2isCGBxWS5Th\n" +
            "i6dayPT36jFqq4gPmY4GNO00g0A4hZMSWA8sK+3q0o72/pg8BuJoL4vYMW9q0eYJ\n" +
            "W1eyNtxAj9GjWLKqs9W/AgMBAAGjRTBDMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD\n" +
            "VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBTYRD3jUy8D4V3rdE8/7bqsLyZFoTANBgkq\n" +
            "hkiG9w0BAQsFAAOCAQEAI18C7NlJoGvg2M/SjzMMzFyCLVDitg8IGGI2Q8OJZLyF\n" +
            "8/Jy0UYey9ecoD4q8l47U8359xs9JsRlewTwfmyMpqhw7Tnz2nOvtwvXTd/XLXil\n" +
            "To34Gt0P9TkeAhxNPVH4whK6muIbqRtlg+1WO1H5Z9Xv/mAEM+NlhP5d5VHLlV8X\n" +
            "4pGUXhLTnsbjeDEZKsSizlQ8Zbu8H27Ja42MHvCYyOKeXxHI3DziO/U1w/J5xLEn\n" +
            "ZKkKI1Pk48D1NTyj6KeVxlERs0xCn4a/oJ0xBV9cb9shD7FDCkAz9Bj7ip2qMwzk\n" +
            "VwXT8sfr5n+phIDdQlHhrZSm9ssj2DgrJD9hHbhAWg==\n" +
            "-----END CERTIFICATE-----\n"
            );
            });
          }
         },
        { src: 'sign-message-xavixuyen.js', id: 'signmessage-script' }
      ];
      scripts.forEach(({ src, id, onload}) => {
        if (!document.getElementById(id)) {
          const script = document.createElement('script');
          script.src = src;
          script.async = false;
          script.id = id;
          if (onload) script.onload = onload;
          document.body.appendChild(script);
        } else if (id === 'qztray-script') {
          setQzReady(true);
          if (autoPrint) {
            setTimeout(() => handlePrint(), 300); // Delay để đảm bảo QZ Tray đã sẵn sàng
          }
        }
      });
    }
  };

  const performQZTrayPrint = React.useCallback(async (timeString: string, dateString: string) => {
    try {
      if (typeof window === 'undefined') {
        setPrintStatus('❌ QZ Tray chưa sẵn sàng hoặc không hỗ trợ trên server');
        return;
      }
      const qz = (window as any).qz;
      if (!qz) {
        setPrintStatus('❌ QZ Tray chưa sẵn sàng hoặc không hỗ trợ trên client');
        return;
      }
      (qz as any).security.setCertificatePromise(function (resolve: any, reject: any) {
        resolve("-----BEGIN CERTIFICATE-----\n" +
      "MIIECzCCAvOgAwIBAgIGAZg/4qd3MA0GCSqGSIb3DQEBCwUAMIGiMQswCQYDVQQG\n" +
      "EwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS\n" +
      "UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx\n" +
      "HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg\n" +
      "RGVtbyBDZXJ0MB4XDTI1MDcyNDA0NDExNVoXDTQ1MDcyNDA0NDExNVowgaIxCzAJ\n" +
      "BgNVBAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD\n" +
      "VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs\n" +
      "IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog\n" +
      "VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDF\n" +
      "Jrz71Nj2KVmR8LBj7ovgC049m8Bya5AerOA/98zizcVTnGQKZczw8ccTzELupxjE\n" +
      "mxaM/jTPVgDEzLhjJFSIYzEgDXLyQD/8SABAjbGI2wRajYyD9TnT8UBOVmLepEV7\n" +
      "d8LRh6IfUiQavFE6VpXI1+slN5TjCOOoK62/KY+ReLmngIRncuvD3NRwBhjtwDv+\n" +
      "hknY+TtPNxM2/cSDhfwBNZaf0UQKnpvK/xRL4OoKYUH/6Wjxt24+2isCGBxWS5Th\n" +
      "i6dayPT36jFqq4gPmY4GNO00g0A4hZMSWA8sK+3q0o72/pg8BuJoL4vYMW9q0eYJ\n" +
      "W1eyNtxAj9GjWLKqs9W/AgMBAAGjRTBDMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD\n" +
      "VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBTYRD3jUy8D4V3rdE8/7bqsLyZFoTANBgkq\n" +
      "hkiG9w0BAQsFAAOCAQEAI18C7NlJoGvg2M/SjzMMzFyCLVDitg8IGGI2Q8OJZLyF\n" +
      "8/Jy0UYey9ecoD4q8l47U8359xs9JsRlewTwfmyMpqhw7Tnz2nOvtwvXTd/XLXil\n" +
      "To34Gt0P9TkeAhxNPVH4whK6muIbqRtlg+1WO1H5Z9Xv/mAEM+NlhP5d5VHLlV8X\n" +
      "4pGUXhLTnsbjeDEZKsSizlQ8Zbu8H27Ja42MHvCYyOKeXxHI3DziO/U1w/J5xLEn\n" +
      "ZKkKI1Pk48D1NTyj6KeVxlERs0xCn4a/oJ0xBV9cb9shD7FDCkAz9Bj7ip2qMwzk\n" +
      "VwXT8sfr5n+phIDdQlHhrZSm9ssj2DgrJD9hHbhAWg==\n" +
      "-----END CERTIFICATE-----\n"
      );
      });

(qz as any).security.setSignatureAlgorithm("SHA512");


      setPrintStatus('🖨️ Đang kết nối QZ Tray...');
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
      }

      setPrintStatus('🖨️ Đang gửi lệnh in qua QZ Tray...');
      const ticketHTML = generateThermalTicketHTML(timeString, dateString);
      const config = qz.configs.create('EPSON TM-T81III Receipt', {
        encoding: 'RAW',
        copies: 1,
        rasterize: true
      });
      const data = [
        { type: 'html', format: 'plain', data: ticketHTML }
      ];
      await qz.print(config, data);
      setPrintStatus('✅ Đã gửi lệnh in thành công qua QZ Tray');
      onPrintComplete?.();
      setTimeout(() => setPrintStatus(''), 3000);
    } catch (err) {
      setPrintStatus('❌ Lỗi in QZ Tray: ' + (err instanceof Error ? err.message : String(err)));
      console.error(err);
    }
  }, [onPrintComplete, generateThermalTicketHTML]);

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
  const handlePrint = React.useCallback(async () => {
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
  }, [performQZTrayPrint]);

  // 🔄 Auto-load QZ Tray scripts và auto-print khi mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadQZTrayScripts();
    }
  }, []);

useEffect(() => {
  // Chỉ gọi in khi autoPrint=true và qzReady=true
  if (autoPrint && qzReady) {
    // Đảm bảo QZ Tray websocket đã kết nối
    const tryPrint = async () => {
      const qz = (window as any).qz;
      if (qz && qz.websocket && qz.websocket.isActive()) {
        await handlePrint();
      } else if (qz && qz.websocket) {
        // Nếu chưa kết nối, thử kết nối rồi in
        try {
          await qz.websocket.connect();
          await handlePrint();
        } catch (err) {
          setPrintStatus('❌ QZ Tray chưa sẵn sàng hoặc không thể kết nối. Vui lòng kiểm tra lại QZ Tray.');
        }
      } else {
        setPrintStatus('❌ QZ Tray chưa sẵn sàng trên kiosk.');
      }
    };
    tryPrint();
  }
}, [autoPrint, qzReady, number, counterId, counterName, handlePrint]);


  return (
    <div className="flex flex-col space-y-4">
      {/* Chỉ hiển thị nút in khi autoPrint=false */}
      {!autoPrint && (
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
      )}

      {/* Print Status Display */}
      {printStatus && !printStatus.includes('❌ Lỗi in QZ Tray') && !printStatus.includes('❌ QZ Tray chưa sẵn sàng') && !printStatus.includes('Unable to establish connection with QZ') && (
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