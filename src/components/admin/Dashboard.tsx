import { useEffect, useState, useMemo, useRef } from "react";
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

// Map API rating keys to Vietnamese labels
const mapRatingLabel = (rating?: string) => {
  switch (rating) {
    case 'needs_improvement':
      return 'Cần cải thiện';
    case 'satisfied':
      return 'Hài lòng';
    case 'neutral':
      return 'Bình thường';
    default:
      return rating || '';
  }
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
  const [ratings, setRatings] = useState<any[]>([]);
  // keep the full feedback list returned by API and a derived filtered list for display
  const [allFeedbacks, setAllFeedbacks] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]); // legacy small-list kept for compatibility

  // Dropdown / filtering state for feedbacks
  const RATING_VALUES = ['satisfied', 'neutral', 'needs_improvement'] as const;
  const [selectedRatings, setSelectedRatings] = useState<string[]>([...RATING_VALUES]); // default: all
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const authToken = sessionStorage.getItem('auth_token');
        const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
        // Chuyển ngày về yyyy-MM-dd cho API
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        const [tickets, attended, avgTime, waitTime, absentTime, counters, ratingsRes, feedbacksRes] = await Promise.all([
          rootApi.get('/stats/tickets-per-counter', { params: { start_date: startStr, end_date: endStr, tenxa: 'xacaobo' }, headers }),
          rootApi.get('/stats/attended-tickets', { params: { start_date: startStr, end_date: endStr, tenxa: 'xacaobo' }, headers }),
          rootApi.get('/stats/average-handling-time', { params: { start_date: startStr, end_date: endStr, tenxa: 'xacaobo' }, headers }),
          rootApi.get('/stats/average-waiting-time', { params: { start_date: startStr, end_date: endStr, tenxa: 'xacaobo' }, headers }),
          rootApi.get('/stats/afk-duration', { params: { start_date: startStr, end_date: endStr, tenxa: 'xacaobo' }, headers }),
          rootApi.get('/counters', { params: { tenxa: 'xacaobo' }, headers }),
          // new endpoints
          rootApi.get('/stats/rating-per-counter', { params: { start_date: startStr, end_date: endStr, tenxa: 'xacaobo' }, headers }),
          rootApi.get('/stats/feedbacks', { params: { start_date: startStr, end_date: endStr, tenxa: 'xacaobo' }, headers }),
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
      setRatings(ratingsRes?.data || []);
      const all = feedbacksRes?.data || [];
      setAllFeedbacks(all);
      // initial displayed list (most recent 20)
      setFeedbacks(all.slice(0, 20));
      console.log("buh buh lmao:", ratingsRes?.data || []);
      } catch (error) {
        console.error("Error fetching data:", Error);
      }
    }

    fetchData();
  }, [startDate, endDate, refreshKey]);

  // Close filter dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!filterRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!filterRef.current.contains(e.target)) setFilterOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Compute filtered feedbacks based on selectedRatings
  const filteredFeedbacks = useMemo(() => {
    if (!allFeedbacks || !allFeedbacks.length) return [];
    // if all selected -> return full list
    if (selectedRatings.length === RATING_VALUES.length) return allFeedbacks;
    return allFeedbacks.filter(f => selectedRatings.includes(f.rating));
  }, [allFeedbacks, selectedRatings]);

  // fixed card height so all cards share the same size; inner content will scroll when overflow
  // assumption: 240px is a reasonable common height for these dashboard cards — adjust if you prefer another size
  const cardStyle = "bg-white p-5 rounded-2xl shadow hover:shadow-lg transition-shadow h-[360px] flex flex-col overflow-hidden";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">📊 Thống kê</h1>

        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="mr-5 text-sm text-gray-600 font-medium">Từ ngày</label>
            <DatePicker
              selected={startDate}
              onChange={(date: Date | null) => { if (date) setStartDate(date); }}
              dateFormat="dd/MM/yyyy"
              className="bg-gray-100 border border-gray-300 px-3 py-2 rounded-md w-[140px] text-gray-700 text-center"
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
              className="bg-gray-100 border border-gray-300 px-3 py-2 rounded-md w-[140px] text-gray-700 text-center"
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

        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6"> */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
          <div className={cardStyle}>
            <div className="flex items-center justify-between gap-2 text-purple-600 mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5" />
                <h2 className="font-semibold text-lg">Đánh giá theo quầy</h2>
              </div>
              <h2 className="font-semibold text-lg">Tổng đánh giá: {ratings?.reduce((acc, r) => acc + (r.satisfied + r.neutral + r.need_improvement), 0) || 0}</h2>
            </div>
            <div className="flex flex-col flex-1 overflow-y-auto card-scrollbar">
              <ul className="text-gray-700 text-sm space-y-2">
                {ratings.length === 0 && <li className="text-sm text-gray-500">Không có dữ liệu đánh giá</li>}
                {ratings.map((r: any) => (
                  <li key={r.counter_id} className="flex items-center justify-between">
                    <span className="truncate">🎯 Quầy {r.counter_id} {counterNames[r.counter_id] ? `(${counterNames[r.counter_id]})` : ''}</span>
                    {/* right column: fixed width, three evenly spaced items with right-aligned numbers */}
                    <div className="flex items-center gap-2 w-48 justify-end">
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <span className="select-none">✅</span>
                        <span className="w-6 text-right font-semibold">{r.satisfied ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-yellow-600">
                        <span className="select-none">😐</span>
                        <span className="w-6 text-right font-semibold">{r.neutral ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-red-500">
                        <span className="select-none">❗</span>
                        <span className="w-6 text-right font-semibold">{r.need_improvement ?? 0}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
              <div className="flex justify-evenly text-gray-700"> 
                <span className="">✅ : Hài lòng</span>
                <span className="">😐 : Bình thường</span>
                <span>❗ : Cần cải thiện</span>
              </div>
          </div>

          <div className={cardStyle}>
            <div className="flex items-center gap-2 text-gray-800 mb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                <h2 className="font-semibold text-lg">Phản hồi gần đây</h2>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="text-sm font-semibold text-gray-700">Tổng phản hồi ({filteredFeedbacks.length})</div>
                <div className="relative" ref={filterRef}>
                  <button onClick={() => setFilterOpen(v => !v)} className="border px-3 py-1 rounded bg-white hover:bg-gray-300 font-semibold text-md">Lọc</button>
                  {filterOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow-lg z-40 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">Lọc theo đánh giá</div>
                        <button className="font-medium text-blue-600" onClick={() => setSelectedRatings([...RATING_VALUES])}>Tất cả</button>
                      </div>
                      <div className="space-y-2">
                        {RATING_VALUES.map((val) => (
                          <label key={val} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={selectedRatings.includes(val)} onChange={() => {
                              setSelectedRatings(prev => prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]);
                            }} />
                            <span>{mapRatingLabel(val)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto card-scrollbar">
              {filteredFeedbacks.length === 0 && <div className="text-sm text-gray-500">Chưa có phản hồi nào</div>}
              <ul className="space-y-3 text-gray-700 text-sm">
                {filteredFeedbacks.slice(0, 20).map((f: any, idx: number) => (
                  <li key={idx} className="border-b pb-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Vé #{f.ticket_number} {counterNames[f.counter_id] ? `- ${counterNames[f.counter_id]}` : ''}</div>
                      <div className="text-xs font-medium text-gray-700">{format(new Date(f.created_at), 'dd/MM/yyyy, HH:mm')}</div>
                    </div>
                    <div className="text-sm font-medium mt-1">Đánh giá: {mapRatingLabel(f.rating)}</div>
                    {f.feedback && <div className="text-sm font-medium mt-1 text-gray-700">Góp ý: "{f.feedback}"</div>}
                  </li>
                ))}
              </ul>
            </div>
          </div>    
          
        {/* </div> */}

          <div className={cardStyle}>
            <div className="flex items-center justify-between gap-2 text-indigo-600 mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5" />
                <h2 className="font-semibold text-lg">Số vé / quầy</h2>
              </div>
              <h2 className="font-semibold text-lg">Tổng số vé đã in: {data.tickets?.reduce((acc, item) => acc + item.total_tickets, 0)}</h2>
            </div>
            <div className="flex-1 overflow-y-auto card-scrollbar">
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
          </div>

          <div className={cardStyle}>
            <div className="flex items-center justify-between gap-2 text-green-600 mb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                <h2 className="font-semibold text-lg">Vé đã tiếp đón</h2>
              </div>
              <h2 className="font-semibold text-lg">Tổng số vé đã tiếp đón: {data.attended?.reduce((acc, item) => acc + item.attended_tickets, 0)}</h2>
            </div>
            <div className="flex-1 overflow-y-auto card-scrollbar">
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
          </div>

          <div className={cardStyle}>
            <div className="flex items-center gap-2 text-yellow-600 mb-4">
              <Clock className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Thời gian tiếp đón trung bình (phút)</h2>
            </div>
            <div className="flex-1 overflow-y-auto card-scrollbar">
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
          </div>

          <div className={cardStyle}>
            <div className="flex items-center gap-2 text-blue-600 mb-4">
              <Hourglass className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Thời gian chờ trung bình (phút)</h2>
            </div>
            <div className="flex-1 overflow-y-auto card-scrollbar">
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
