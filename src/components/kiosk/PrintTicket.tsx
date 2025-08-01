'use client';

import React, { useState, useEffect } from 'react';

interface PrintTicketProps {
  number: number;
  counterId: string;
  counterName: string;
  autoPrint?: boolean;
  onPrintComplete?: () => void;
}

const  PrintTicket: React.FC<PrintTicketProps> = ({
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
        PHƯỜNG HÀ GIANG 1 
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
          }
         },
        // { src: 'sign-message.js', id: 'signmessage-script' }
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
      (qz as any).security.setCertificatePromise(() => {
        return Promise.resolve("-----BEGIN CERTIFICATE-----\n" +
          "MIIDKzCCAhOgAwIBAgIUQRI+2zYB8bOEL8g8Flf6SMqW1jkwDQYJKoZIhvcNAQEL\n" +
          "BQAwJTEjMCEGA1UEAwwabHN0ZC1sb2NhbHRlc3QubmV0bGlmeS5hcHAwHhcNMjUw\n" +
          "NzMxMDk1NzA0WhcNMzUwNzI5MDk1NzA0WjAlMSMwIQYDVQQDDBpsc3RkLWxvY2Fs\n" +
          "dGVzdC5uZXRsaWZ5LmFwcDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB\n" +
          "ALEZw7lFQdFIuPzfTKwOq2XvbSwJaLH5cLPeJQUtFMrQlAZbGGt193UhU1F95xxG\n" +
          "5yBmQ8ZVNMhQlnqwkAMFwZJEkU3rYaz+7pPBP7SUH1z+lb+lfMsUn9SNxECXDmOe\n" +
          "/Qz6AcdNMyqMOzkyYsY0Fzt0FinGBnl2dtgcv3N5DqAKmNhAYWbY2wcn0Y6VsgZg\n" +
          "0skNjk78tZX4SR22rUlma6eSy4l4OWXZxf5BvuughOtGVtKWVVTZNCYuzLz83pFW\n" +
          "Wl/rU7LzDKqT4jBp+Va0X+KTaTx+j+dTXbX5ePwdLKPPyePUjYZIDGxm+bL5cNMF\n" +
          "vHQ8e7SkO5nhP3KC6bwP+w0CAwEAAaNTMFEwHQYDVR0OBBYEFNbj44q6SjARmGt/\n" +
          "3OOWjjOQTZ3zMB8GA1UdIwQYMBaAFNbj44q6SjARmGt/3OOWjjOQTZ3zMA8GA1Ud\n" +
          "EwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAA5e8J/Z7++VmSoApkOB3xmH\n" +
          "M4SlhiVwUB6kUoSzRWvFGEtikFrD0OM7BgEuB+7AkFi8EtJs2dp2PhUmlZVVND6t\n" +
          "4fVrPbOanmwoURTWPiapIRbzn6lU52R6WrN+oFojiudi7gGGj8k4NWWYkfSc5cjr\n" +
          "dEX4D+krFF5n16hyBODqznKUxMb2EMJGV7VT2n4U9o5K71nm6I+G1ts9Eh7OUC64\n" +
          "vN9nJX89S1wCPwbEpCCiICCV7T8bd90mEL2Y+fBvjqVW70wfHLpF23dyoJV6bxUu\n" +
          "vsgjTiKWlMHftL6+88zpxg8bI478CBqoS6HI+tsTb/kCcqlBUEsHkGorfWwzBuA=\n" +
          "-----END CERTIFICATE-----\n"
        );
      });

      (qz as any).security.setSignatureAlgorithm("SHA512");
      qz.security.setSignaturePromise(function(toSign: string) {
          return function(resolve: (sig: string) => void, reject: (err: any) => void) {
              try {
                  var pk = KEYUTIL.getKey("-----BEGIN PRIVATE KEY-----"+
                  "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCxGcO5RUHRSLj8\n" +
                  "30ysDqtl720sCWix+XCz3iUFLRTK0JQGWxhrdfd1IVNRfeccRucgZkPGVTTIUJZ6\n" +
                  "sJADBcGSRJFN62Gs/u6TwT+0lB9c/pW/pXzLFJ/UjcRAlw5jnv0M+gHHTTMqjDs5\n" +
                  "MmLGNBc7dBYpxgZ5dnbYHL9zeQ6gCpjYQGFm2NsHJ9GOlbIGYNLJDY5O/LWV+Ekd\n" +
                  "tq1JZmunksuJeDll2cX+Qb7roITrRlbSllVU2TQmLsy8/N6RVlpf61Oy8wyqk+Iw\n" +
                  "aflWtF/ik2k8fo/nU121+Xj8HSyjz8nj1I2GSAxsZvmy+XDTBbx0PHu0pDuZ4T9y\n" +
                  "gum8D/sNAgMBAAECggEAVymmEcZLWXSgTxybwMbLhrTrF1ReKdHprSz1LXH9nMBB\n" +
                  "SkuFXkZGD2jid+YuW9VtpZ2PV8rR2pEHLsU9a69mkNWcaiwh+6HQy/m9n+OS+BL4\n" +
                  "osURAWZaL6PCZkOyOkeipcNaIrwVJai08TaiNIiosoM08URcJWWvojer5mo7T3p2\n" +
                  "EETOC/99IQYd8nqG8UVesdNnf3/jBLmhudfvKGKCQ78iU7crT7Stc0n/861CoFBh\n" +
                  "1tS2UqQr7g5QnFEszp9KHb42rxMQTABxjMKSlovsDKQ59hBSPxjTajfRhxIGs2k6\n" +
                  "wEfUqFYwaWieVjseRi42nYkDI1Ei1CV9SHdG1I7TBQKBgQDZtk4SyTSS4E4OiZ/A\n" +
                  "Em48TDfFZWf+KFXZ8IJFNhemPflLeesciFUic1f7D106ZQbwMTFMgma9rYiowGv5\n" +
                  "aznKxEHMpKSVFcZk3xbqs2ATI4weE+LdnEZ3PH/oi/oU2NXSAFbr1UoVfW6Jcjqx\n" +
                  "0lozBpKsc+SkVDtPlsLIKPCIdwKBgQDQPxNQRKiVIltCEvswH4SVrzmKD+Fx58an\n" +
                  "b7u4Yoj3WTkRbniKXJwE7088DJqb3x+Uy/6qPKkoidqa6/jRZ2H2RxPeZceMGu2O\n" +
                  "vLtHpZJD5nK6iGUGj/LjMj+ix9+d0T89MDXyhJhWIU4cHdf1CJ5rQ0SkcoiSedyP\n" +
                  "7V2cIJ89mwKBgBvgxE6ThS/pmRUzeklWEteVyu5z9cUN1TB7I7NJIe4fsXSAwCJ/\n" +
                  "MqeerX1wkjeQCDtpkS6C5DUVq5IwUaM2n8ffKa3Sx2Bv0V/JUV3sajkJLEANu9c0\n" +
                  "07EhBh/5DKTuvzKM6JR6U2o9DZJ8Fhf/H525Eb8TeAuy3YVrgLWwyFwxAoGBAMK1\n" +
                  "xzwtBidzGTq9fqmvPouqa7VgRd335bGWckHjt8b2YLqgvQo5rxOaIk62RjVpuSCq\n" +
                  "YDISR+QEiSaDboF1FY5tRPGT3rFsWCQ26TEDabAdH7azYypwm5y81e1Azx/Dj0qJ\n" +
                  "8lcQjVMzDtKRQOP2LBGEswDDqliyonzcZsNdaSbzAoGBANff4Q4wXOvmYsorVd65\n" +
                  "NsESazu6GLx0iDrks2NLEEuZf/rOEN8t9x9WGpRwzzAvFNyQv2zXioCt9yAsuINX\n" +
                  "CETNtXPxX+ymjT5z+PLrMTi65tNPuRJAPVnLi8AZl3L/mNGtZMTnsLlpXCHOeWen\n" +
                  "wcWNMXw3mqtRVb4aZbK6benT\n" +
                  "-----END PRIVATE KEY-----\n");
                  var sig = new KJUR.crypto.Signature({"alg": "SHA512withRSA"});  // Use "SHA1withRSA" for QZ Tray 2.0 and older
                  sig.init(pk); 
                  sig.updateString(toSign);
                  var hex = sig.sign();
                  console.log("DEBUG: \n\n" + stob64(hextorstr(hex)));
                  resolve(stob64(hextorstr(hex)));
              } catch (err) {
                  console.error(err);
                  reject(err);
              }
          };
      });

      setPrintStatus('🖨️ Đang kết nối QZ Tray...');
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
      }

      setPrintStatus('🖨️ Đang gửi lệnh in qua QZ Tray...');
      const ticketHTML = generateThermalTicketHTML(timeString, dateString);
      const config = qz.configs.create('POS-80C', {
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