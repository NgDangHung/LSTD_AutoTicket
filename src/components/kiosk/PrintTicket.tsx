'use client';
import { useEffect } from 'react';

interface Props {
  number: number;
  counterId: string;
  counterName: string;
  autoPrint?: boolean;
}

export default function PrintNow({ number,counterId, counterName, autoPrint }: Props) {
  useEffect(() => {
    if (!autoPrint) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const dateString = now.toLocaleDateString('vi-VN');

    // Nội dung HTML cho khổ giấy 8x6cm
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

    // In xong reload lại
    window.print();
    window.onafterprint = () => {
      window.location.reload();
    };
  }, [number, counterName, autoPrint]);

  return <div id="print-area" style={{ display: 'none' }} />;
}
