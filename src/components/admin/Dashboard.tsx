import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import { format, parse } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { rootApi } from '@/libs/rootApi';
import { BarChart2, UserCheck, Clock, Hourglass, Slash } from "lucide-react";
import Button from "@/components/shared/Button";
import { toast } from 'react-toastify';


// Helper function to format date as yyyy-MM-dd
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export default function Dashboard() {
  // Luôn lấy ngày hiện tại làm mặc định cho cả startDate và endDate
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(today);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<{
    tickets?: any[];
    attended?: any[];
    avgTime?: any[];
    waitTime?: any[];
    absentTime?: any[];
  }>({});
  const [counterNames, setCounterNames] = useState<Record<number, string>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const authToken = sessionStorage.getItem('auth_token');
        const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
        // Chuyển ngày về yyyy-MM-dd cho API
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        const [tickets, attended, avgTime, waitTime, absentTime, counters] = await Promise.all([
          rootApi.get('/stats/tickets-per-counter', { params: { start_date: startStr, end_date: endStr, tenxa: 'xavixuyen' }, headers }),
          rootApi.get('/stats/attended-tickets', { params: { start_date: startStr, end_date: endStr, tenxa: 'xavixuyen' }, headers }),
          rootApi.get('/stats/average-handling-time', { params: { start_date: startStr, end_date: endStr, tenxa: 'xavixuyen' }, headers }),
          rootApi.get('/stats/average-waiting-time', { params: { start_date: startStr, end_date: endStr, tenxa: 'xavixuyen' }, headers }),
          rootApi.get('/stats/afk-duration', { params: { start_date: startStr, end_date: endStr, tenxa: 'xavixuyen' }, headers }),
          rootApi.get('/counters', { params: { tenxa: 'xavixuyen' }, headers }),
        ]);

        // Map counter_id -> name
        const counterNameMap: Record<number, string> = {};
        (counters.data || []).forEach((c: any) => {
          counterNameMap[c.id] = c.name;
        });
        setCounterNames(counterNameMap);

        setData({
          tickets: tickets.data,
          attended: attended.data,
          avgTime: avgTime.data,
          waitTime: waitTime.data,
          absentTime: absentTime.data,
        });
      } catch (error) {
        console.error("Error fetching data:", Error);
      }
    }

    fetchData();
  }, [startDate, endDate, refreshKey]);

  const cardStyle = "bg-white p-5 rounded-2xl shadow hover:shadow-lg transition-shadow";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">📊 Dashboard Quản trị</h1>

        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="mr-5 text-sm text-gray-600 font-medium">Từ ngày</label>
            <DatePicker
              selected={startDate}
              onChange={(date: Date | null) => { if (date) setStartDate(date); }}
              dateFormat="dd/MM/yyyy"
              className="border border-gray-300 px-3 py-2 rounded-md w-[140px] text-center"
              locale="vi"
              maxDate={endDate}
              showPopperArrow={false}
            />
          </div>
          <div>
            <label className="mr-5 text-sm text-gray-600 font-medium">Đến ngày</label>
            <DatePicker
              selected={endDate}
              onChange={(date: Date | null) => { if (date) setEndDate(date); }}
              dateFormat="dd/MM/yyyy"
              className="border border-gray-300 px-3 py-2 rounded-md w-[140px] text-center"
              locale="vi"
              minDate={startDate}
              showPopperArrow={false}
            />
          </div>
          <Button variant="success" size="md" onClick={() => {
            setRefreshKey(prev => prev + 1);
            toast.success(<div>Làm mới dữ liệu thành công</div>, {
              position: "top-center",
              autoClose: 2000,
              hideProgressBar: false,
              closeOnClick: false,
              pauseOnHover: false,
            draggable: false,
          });
            console.log("Dữ liệu đã được làm mới");
          }}>
            <span className="flex items-center gap-2">
              Làm mới dữ liệu
            </span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          <div className={cardStyle}>
            <div className="flex items-center justify-between gap-2 text-indigo-600 mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5" />
                <h2 className="font-semibold text-lg">Số vé / quầy</h2>
              </div>
              <h2 className="font-semibold text-lg">Tổng số vé đã in: {data.tickets?.reduce((acc, item) => acc + item.total_tickets, 0)}</h2>
            </div>
            <ul className="text-gray-700 text-sm space-y-3">
              {Object.entries(counterNames).map(([counterId, name]) => {
                const item = data.tickets?.find((i) => i.counter_id === Number(counterId));
                return (
                  <li className="flex items-center justify-between gap-2" key={counterId}>
                    <span>🎫 Quầy {counterId} ({name})</span>
                    <span className="bg-indigo-100 text-indigo-700 font-bold rounded px-3 py-0.5 min-w-[50px] text-center text-base">
                      {item ? item.total_tickets : 0}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={cardStyle}>
            <div className="flex items-center justify-between gap-2 text-green-600 mb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                <h2 className="font-semibold text-lg">Vé đã tiếp đón</h2>
              </div>
              <h2 className="font-semibold text-lg">Tổng số vé đã tiếp đón: {data.attended?.reduce((acc, item) => acc + item.attended_tickets, 0)}</h2>
            </div>
            <ul className="text-gray-700 text-sm space-y-3">
              {Object.entries(counterNames).map(([counterId, name]) => {
                const item = data.attended?.find((i) => i.counter_id === Number(counterId));
                return (
                  <li className="flex items-center justify-between gap-2" key={counterId}>
                    <span>✅ Quầy {counterId} ({name})</span>
                    <span className="bg-green-100 text-green-700 font-bold rounded px-3 py-0.5 min-w-[50px] text-center text-base">
                      {item ? item.attended_tickets : 0}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={cardStyle}>
            <div className="flex items-center gap-2 text-yellow-600 mb-4">
              <Clock className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Thời gian tiếp đón trung bình (phút)</h2>
            </div>
            <ul className="text-gray-700 text-sm space-y-3">
              {Object.entries(counterNames).map(([counterId, name]) => {
                const item = data.avgTime?.find((i) => i.counter_id === Number(counterId));
                return (
                  <li className="flex items-center justify-between gap-2" key={counterId}>
                    <span>⏱️ Quầy {counterId} ({name})</span>
                    <span className="bg-yellow-100 text-yellow-700 font-bold rounded px-3 py-0.5 min-w-[50px] text-center text-base">
                      {item ? Math.floor(item.avg_handling_time_seconds / 60) : 0}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={cardStyle}>
            <div className="flex items-center gap-2 text-blue-600 mb-4">
              <Hourglass className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Thời gian chờ trung bình (phút)</h2>
            </div>
            <ul className="text-gray-700 text-sm space-y-3">
              {Object.entries(counterNames).map(([counterId, name]) => {
                const item = data.waitTime?.find((i) => i.counter_id === Number(counterId));
                return (
                  <li className="flex items-center justify-between gap-2" key={counterId}>
                    <span>⌛ Quầy {counterId} ({name})</span>
                    <span className="bg-blue-100 text-blue-700 font-bold rounded px-3 py-0.5 min-w-[50px] text-center text-base">
                      {item ? Math.floor(item.avg_waiting_time_seconds / 60) : 0}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* <div className={cardStyle}>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <Slash className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Vắng mặt (phút)</h2>
            </div>
            <ul className="text-gray-700 text-sm space-y-1">
              {data.absentTime?.map((item) => (
                <li key={item.counter_id}>
                  🚫 Quầy {item.counter_id}
                  {counterNames[item.counter_id] ? ` (${counterNames[item.counter_id]})` : ''}
                  : {Math.round(item.total_absent_minutes)}
                </li>
              ))}
            </ul>
          </div> */}
        </div>
      </div>
    </div>
  );
}