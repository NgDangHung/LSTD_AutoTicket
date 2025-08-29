'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

// GIỮ NGUYÊN props
interface PrintTicketProps {
  number: number;
  counterId: string;
  counterName: string;
  // Optional server-signed token (Workflow A). If present the QR will encode /review?t=<token>
  token?: string;
  autoPrint?: boolean;
  onPrintComplete?: () => void;
}

/* ===== Các hằng số STABLE, không đổi mỗi render ===== */
const AGENT = 'http://127.0.0.1:5544';
const HEADERS_STABLE: Record<string, string> = { 'Content-Type': 'application/json' };
// Nếu agent có khóa: HEADERS_STABLE['x-agent-key'] = 'YOUR_KEY';

// QR / rasterization tuning
// Desired CSS size of the QR on the ticket (px)
const DESIRED_QR_CSS_PX = 220;
// html2canvas scale (kept in sync with renderTicketToPdfBase64)
const CANVAS_SCALE = 2;

function computeIntrinsicQrPx(desiredCssPx: number) {
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  return Math.ceil(desiredCssPx * CANVAS_SCALE * dpr);
}

const PrintTicket: React.FC<PrintTicketProps> = ({
  number,
  counterId,
  counterName,
  token, // server-signed token (optional)
  autoPrint = false,
  onPrintComplete
}) => {
  // TEN_XA config: prefer env var NEXT_PUBLIC_TENXA, fallback to localStorage or default
  const TEN_XA = 'xavinhtuy'
  // token prop is available as `token` (optional server-signed token for Workflow A)

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [printStatus, setPrintStatus] = useState('');
  const [busy, setBusy] = useState(false);

  // Khóa chống bấm trùng
  const lockRef = useRef(false);

  // Lấy tên máy in 1 lần (không đổi mỗi render)
  const [printerName] = useState<string>(() => {
    if (typeof window === 'undefined') return 'XP-80C';
    // if (typeof window === 'undefined') return 'Microsoft Print to PDF';
    return localStorage.getItem('kioskPrinterName') || 'XP-80C';
    // return localStorage.getItem('kioskPrinterName') || 'Microsoft Print to PDF';
  });

  // Đánh dấu đã in vé nào rồi (để autoPrint chạy đúng 1 lần/vé)
  const printedKeyRef = useRef<string | null>(null);

// ===== HTML vé – chữ to toàn bộ, cân giữa =====
const generateThermalTicketHTML = React.useCallback(
  (time: string, date: string, qr?: string) => {
    // Loại bỏ số 0 ở đầu nếu counterId đã có 0
    const counterIdDisplay = counterId.replace(/^0+/, '');
    // Use flex-start and minimal top padding so content sits higher on the printed paper
    return `
<div style="width:624px;height:464px;margin:0;padding:2px 0 6px;background:#fff;
            font-family:'Arial', monospace; text-align:center; display:flex; flex-direction:column; justify-content:flex-start; align-items:center;">
  <div style="padding-top:2px">
    <div style="font-weight:800;font-size:26px;line-height:1.05;">TRUNG TÂM</div>
    <div style="font-weight:800;font-size:26px;line-height:1.05;">PHỤC VỤ HÀNH CHÍNH CÔNG</div>
    <div style="font-weight:900;font-size:32px;line-height:1.05;margin-top:2px;">XÃ VĨNH TUY</div>
    <div style="font-weight:800;font-size:24px;line-height:1.05;margin-top:4px;">SỐ THỨ TỰ</div>
  </div>

  <div style="font-size:100px; font-weight:900; line-height:1; margin:2px 0 4px;">${number}</div>

  <div style="padding-bottom:4px">
    <div style="font-size:18px;line-height:1;">QUẦY PHỤC VỤ ${counterIdDisplay.padStart(2, '0')}</div>
    <div style="font-weight:900;font-size:26px;line-height:1.05;margin-top:2px;">${counterName.toUpperCase()}</div>
    <div style="font-size:16px;line-height:1.05;margin-top:6px;">THỜI GIAN IN VÉ: ${date} - ${time}</div>
  ${qr ? `<div style="margin-top:6px;text-align:center"><img src="${qr}" alt="QR đánh giá" style="width:220px;height:220px;display:block;margin:0 auto;border-radius:4px;image-rendering:pixelated;"/><div style="font-size:12px;margin-top:6px;">Quét mã để đánh giá dịch vụ</div></div>` : ''}
    <div style="font-style:italic;font-weight:800;font-size:20px;line-height:1.05;margin-top:8px;">Cảm ơn Quý khách!</div>
  </div>
</div>`;
  },
  [number, counterId, counterName]
);



// ===== HTML -> PDF base64 (80×60mm, scale tối đa, có offset mm) =====
const renderTicketToPdfBase64 = React.useCallback(async (html: string) => {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ]);

  // 78×58mm ~ 624×464 px
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = '624px';
  container.style.height = '464px';
  container.style.background = '#fff';
  container.innerHTML = html;
  document.body.appendChild(container);

  const canvas = await html2canvas(container, { scale: CANVAS_SCALE, backgroundColor: '#fff' });
  document.body.removeChild(container);

  const img = canvas.toDataURL('image/png');

  // KHỔ GIẤY CHUẨN
const PDF_W = 80, PDF_H = 60;

// Lề an toàn (mm) – 2.5mm mỗi cạnh là vừa, tránh cắt chữ
const MARGIN = 2.5;

// Hệ số co nhẹ để phòng vùng “không in được” của máy in
// 1.00 = in sát lề; 0.96–0.98 = an toàn hơn
const SAFE = 0.98;

// Offset tinh chỉnh (mm). Dương = dịch sang phải/xuống dưới
let OFF_X = -5, OFF_Y = -7;  // nếu còn lệch trái: tăng OFF_X; lệch lên: tăng OFF_Y


  try {
    const raw = localStorage.getItem('kioskPrintOffset'); // ví dụ "0.8,-0.2"
    if (raw) {
      const [sx, sy] = raw.split(',');
      OFF_X = Number(sx) || 0; OFF_Y = Number(sy) || 0;
    }
  } catch {}

  const cw = PDF_W - MARGIN * 2;
  const ch = PDF_H - MARGIN * 2;

  // scale tối đa theo cả 2 chiều + SAFE
  const ratio = canvas.height / canvas.width;
  let w = cw, h = w * ratio;
  if (h > ch) { h = ch; w = h / ratio; }
  w *= SAFE; h *= SAFE;

  // **CĂN THEO MÉP TRÊN** (tránh mất chữ đầu/cuối vì vùng không in của máy)
  const x = MARGIN + (cw - w) / 2 + OFF_X;
  const y = MARGIN + OFF_Y;

  const pdf = new jsPDF({ unit: 'mm', format: [PDF_W, PDF_H] });
  // Use 6-argument addImage to satisfy current jsPDF typings
  pdf.addImage(img, 'PNG', x, y, w, h);

  return pdf.output('datauristring').split(',')[1];
}, []);




  // /* ===== In qua Agent (dùng headers STABLE, kèm jobId) ===== */
  // const performAgentPrint = React.useCallback(
  //   async (timeString: string, dateString: string) => {
  //     setPrintStatus('🖨️ Kiểm tra Agent...');
  //     const ping = await fetch(`${AGENT}/status`).catch(() => null);
  //     if (!ping || !ping.ok) { setPrintStatus('❌ Không thấy Agent 127.0.0.1:5544'); return; }

  //     setPrintStatus('🖨️ Đang dựng PDF...');
  //     const html = generateThermalTicketHTML(timeString, dateString);
  //     const base64 = await renderTicketToPdfBase64(html);

  //     setPrintStatus('🖨️ Gửi lệnh in...');
  //     const jobId = `ticket-${number}-${counterId}-${Date.now()}`; // duy nhất cho click này
  //     const res = await fetch(`${AGENT}/print/pdf`, {
  //       method: 'POST',
  //       headers: HEADERS_STABLE,
  //       body: JSON.stringify({ base64, printer: printerName, copies: 1, jobId })
  //     });
  //     const json = await res.json();
  //     if (!res.ok || !json.ok) throw new Error(json?.error || 'In thất bại');

  //     setPrintStatus('✅ Đã gửi lệnh in');
  //     onPrintComplete?.();
  //     setTimeout(() => setPrintStatus(''), 1200);
  //   },
  //   [generateThermalTicketHTML, renderTicketToPdfBase64, number, counterId, printerName, onPrintComplete]
  // );
// đổi performAgentPrint để dùng /health + /print (gửi HTML)
const performAgentPrint = React.useCallback(
  async (timeString: string, dateString: string, qr?: string) => {
    setPrintStatus('🖨️ Kiểm tra Agent...');
    const ping = await fetch(`${AGENT}/health`).catch(() => null); // <-- /health
    if (!ping || !ping.ok) {
      setPrintStatus('❌ Không thấy Agent 127.0.0.1:5544');
      return;
    }

    setPrintStatus('🖨️ Đang dựng vé...');
  const html = generateThermalTicketHTML(timeString, dateString, qr);

    setPrintStatus('🖨️ Gửi lệnh in...');
    const jobId = `ticket-${number}-${counterId}-${Date.now()}`;
    const res = await fetch(`${AGENT}/print`, {                 // <-- /print
      method: 'POST',
      headers: HEADERS_STABLE,
      body: JSON.stringify({
        html,                                                   // <-- gửi HTML
        printer: printerName,
        width: 576,                                             // 80mm = 576px (58mm = 384)
        jobId
      })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error(json?.error || 'In thất bại');

    setPrintStatus('✅ Đã gửi lệnh in');
    onPrintComplete?.();
    setTimeout(() => setPrintStatus(''), 1200);
  },
  [generateThermalTicketHTML, number, counterId, printerName, onPrintComplete]
);

  /* ===== Nút in (có lock) ===== */
  const handlePrint = React.useCallback(async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy(true);

    const now = new Date();
    const t = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const d = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    try {
      // Generate QR synchronously before printing
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        // Build review URL: prefer server-signed token (Workflow A). If token missing, fall back
        // to embedding identifying params (Workflow B).
        // Use `token` query param as required by the backend
        const url = token
          ? `${origin}/review?token=${encodeURIComponent(token)}`
          : `${origin}/review?ticket_number=${number}&tenxa=${TEN_XA}&counter_name=${encodeURIComponent(counterName)}`;
  // Generate a higher-resolution QR for printing so it is scannable on paper
  const intrinsic = computeIntrinsicQrPx(DESIRED_QR_CSS_PX);
  const dataUrl = await QRCode.toDataURL(url, { width: intrinsic, margin: 2, errorCorrectionLevel: 'Q' });
        await performAgentPrint(t, d, dataUrl);
      } catch (qrErr) {
        console.warn('QR generation failed, printing without QR', qrErr);
        await performAgentPrint(t, d);
      }
    }
    finally { setTimeout(() => { lockRef.current = false; setBusy(false); }, 1500); }
  }, [performAgentPrint]);

  /* ===== AutoPrint: MỖI VÉ CHỈ 1 LẦN ===== */
  useEffect(() => {
    if (!autoPrint) return;
    const key = `${number}|${counterId}|${counterName}`;
    if (printedKeyRef.current === key) return; // đã in vé này rồi
    printedKeyRef.current = key;

    const now = new Date();
    const t = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const d = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Generate QR then print
    (async () => {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        // Use `t` query param for auto-printed tickets (server token). Keep fallback to ticket params.
        // Use `token` query param for auto-printed tickets (server token).
        const url = token
          ? `${origin}/review?token=${encodeURIComponent(token)}`
          : `${origin}/review?ticket_number=${number}&tenxa=${TEN_XA}&counter_name=${encodeURIComponent(counterName)}`;
  // AutoPrint uses a larger QR to ensure printed tickets have a scannable QR
  const intrinsic = computeIntrinsicQrPx(DESIRED_QR_CSS_PX);
  const dataUrl = await QRCode.toDataURL(url, { width: intrinsic, margin: 2, errorCorrectionLevel: 'Q' });
        setQrDataUrl(dataUrl);
        await performAgentPrint(t, d, dataUrl);
      } catch (err) {
        console.warn('AutoPrint: QR generation failed, printing without QR', err);
        await performAgentPrint(t, d);
      }
    })();
      // include handlePrint to satisfy hook deps
    }, [autoPrint, number, counterId, counterName, handlePrint, performAgentPrint, token]);

  return (
    <div className="flex flex-col space-y-4">
      {!autoPrint && (
        <button
          onClick={handlePrint}
          disabled={busy || !number || !counterId || !counterName}
          className="kiosk-card bg-red-600 hover:bg-red-700 text-white transition-colors duration-200 cursor-pointer p-8 disabled:opacity-60"
        >
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-6xl mb-4">🖨️</div>
            <div className="text-2xl font-bold text-center">In số thứ tự</div>
            <div className="text-lg mt-2 opacity-90">Vé #{number}</div>
            <div className="text-sm opacity-75 mt-2">{counterName} - Quầy {counterId}</div>
          </div>
        </button>
      )}

      {printStatus && (
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
          <div className="text-blue-800 font-medium text-center">{printStatus}</div>
        </div>
      )}
    </div>
  );
};

export default PrintTicket;
