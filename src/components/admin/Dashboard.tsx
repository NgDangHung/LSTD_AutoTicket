import { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { BarChart2, UserCheck, Clock, Hourglass, Slash } from "lucide-react";

export default function Dashboard() {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [data, setData] = useState<{
    tickets?: any[];
    attended?: any[];
    avgTime?: any[];
    waitTime?: any[];
    absentTime?: any[];
  }>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const [tickets, attended, avgTime, waitTime, absentTime] = await Promise.all([
          axios.get(`https://detect-seat.onrender.com/stats/tickets-per-counter`, { params: { start_date: startDate, end_date: endDate } }),
          axios.get(`https://detect-seat.onrender.com/stats/attended-tickets`, { params: { start_date: startDate, end_date: endDate } }),
          axios.get(`https://detect-seat.onrender.com/stats/average-handling-time`, { params: { start_date: startDate, end_date: endDate } }),
          axios.get(`https://detect-seat.onrender.com/stats/average-waiting-time`, { params: { start_date: startDate, end_date: endDate } }),
          axios.get(`https://detect-seat.onrender.com/stats/afk-duration`, { params: { start_date: startDate, end_date: endDate } }),
        ]);

        setData({
          tickets: tickets.data,
          attended: attended.data,
          avgTime: avgTime.data,
          waitTime: waitTime.data,
          absentTime: absentTime.data,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, [startDate, endDate]);

  const cardStyle = "bg-white p-5 rounded-2xl shadow hover:shadow-lg transition-shadow";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">📊 Dashboard Quản trị</h1>

        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm text-gray-600 font-medium">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded-md"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 font-medium">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className={cardStyle}>
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <BarChart2 className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Số vé / quầy</h2>
            </div>
            <ul className="text-gray-700 text-sm space-y-1">
              {data.tickets?.map((item) => (
                <li key={item.counter_id}>🎫 Quầy {item.counter_id}: {item.total_tickets}</li>
              ))}
            </ul>
          </div>

          <div className={cardStyle}>
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <UserCheck className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Vé đã tiếp đón</h2>
            </div>
            <ul className="text-gray-700 text-sm space-y-1">
              {data.attended?.map((item) => (
                <li key={item.counter_id}>✅ Quầy {item.counter_id}: {item.attended_tickets}</li>
              ))}
            </ul>
          </div>

          <div className={cardStyle}>
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <Clock className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Thời gian tiếp đón trung bình (giây)</h2>
            </div>
            <ul className="text-gray-700 text-sm space-y-1">
              {data.avgTime?.map((item) => (
                <li key={item.counter_id}>⏱️ Quầy {item.counter_id}: {Math.round(item.avg_handling_time_seconds)}</li>
              ))}
            </ul>
          </div>

          <div className={cardStyle}>
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Hourglass className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Thời gian chờ trung bình</h2>
            </div>
            <ul className="text-gray-700 text-sm space-y-1">
              {data.waitTime?.map((item) => (
                <li key={item.counter_id}>⌛ Quầy {item.counter_id}: {Math.round(item.avg_waiting_time_seconds)}</li>
              ))}
            </ul>
          </div>

          <div className={cardStyle}>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <Slash className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Vắng mặt (phút)</h2>
            </div>
            <ul className="text-gray-700 text-sm space-y-1">
              {data.absentTime?.map((item) => (
                <li key={item.counter_id}>🚫 Quầy {item.counter_id}: {Math.round(item.total_absent_minutes)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
