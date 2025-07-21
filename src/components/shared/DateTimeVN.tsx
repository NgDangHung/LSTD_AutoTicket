import React, { useEffect, useState } from 'react';

function formatDateVN(date: Date) {
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const d = days[date.getDay()];
  const dd = date.getDate();
  const mm = date.getMonth() + 1;
  const yyyy = date.getFullYear();
  return `${d}, ngày ${dd} tháng ${mm} năm ${yyyy}`;
}

export default function DateTimeVN() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="text-xl font-semibold text-red-700 italic">
      {time} - {formatDateVN(now)}
    </div>
  );
}