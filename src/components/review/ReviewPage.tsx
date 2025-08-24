'use client'

import { useEffect, useState } from "react";
import { ticketsAPI } from '@/libs/rootApi';
import Image from "next/image";
import { color } from "html2canvas/dist/types/css/types/color";

interface TicketFeedbackInfo {
  ticket_number: number;
  counter_name: string
  status: string;
  finished_at: string;
  can_rate: boolean;
  rating: string | null;
  feedback: string | null;
}

interface TicketRatingUpdate {
  rating: "Hài lòng" | "Bình thường" | "Cần cải thiện";
  feedback?: string;
}

function ReviewPage() {
  const [ticketInfo, setTicketInfo] = useState<TicketFeedbackInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<TicketRatingUpdate["rating"] | null>(null);
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("");

  const API_BASE = "https://detect-seat-we21.onrender.com/app/tickets";

  // Helper: map API status to Vietnamese label
  const getStatusLabel = (s: string | null | undefined) => {
    if (!s) return '';
    const m: Record<string, string> = {
      done: 'Hoàn thành',
      called: 'Đang phục vụ',
      waiting: 'Đang chờ',
    };
    return m[s] ?? s;
  };

  // Helper: map API rating (or Vietnamese label) to Vietnamese label
  const getRatingLabel = (r: string | null | undefined) => {
    if (!r) return '';
    const mapApiToVn: Record<string, string> = {
      satisfied: 'Hài lòng',
      neutral: 'Bình thường',
      needs_improvement: 'Cần cải thiện',
      'Hài lòng': 'Hài lòng',
      'Bình thường': 'Bình thường',
      'Cần cải thiện': 'Cần cải thiện'
    };
    return mapApiToVn[r] ?? r;
  };

  // Read query params from window.location.search (client-only) to avoid next/navigation SSR subtlety
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [tenxa, setTenxa] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setTicketNumber(params.get('ticket_number'));
    setTenxa(params.get('tenxa'));
    setToken(params.get('token'));
  }, []);

  // fetchTicketInfo moved inside effect to satisfy hook dependency rules

  const submitFeedback = async () => {
  if (!rating) return;
    setLoading(true);
    try {
      // Map Vietnamese UI labels to API expected enum values if needed
      const ratingMap: Record<string, string> = {
        'Hài lòng': 'satisfied',
        'Bình thường': 'neutral',
        'Cần cải thiện': 'needs_improvement'
      };
      const payloadRating = (ratingMap as any)[rating] ?? rating;

      const payload = { rating: payloadRating, feedback };
      console.debug('📤 Submitting feedback payload', payload, { ticketNumber, tenxa });

      let res: Response | null = null;
      let resBody: any = null;

      if (token) {
        // Workflow A: submit using token-based endpoint
        try {
          const resp = await ticketsAPI.submitFeedback({ token: token }, payload as any);
          // ticketsAPI returns parsed response body
          resBody = resp;
          setMessage('Đã gửi đánh giá thành công!');
          setTicketInfo(prev => ({ ...(prev || {}), rating: (payload as any).rating, can_rate: false } as TicketFeedbackInfo));
          return;
        } catch (err: any) {
          throw new Error(err?.message || 'Gửi đánh giá thất bại');
        }
      } else {
        // Workflow B: fallback to ticket_number + tenxa
        if (!ticketNumber || !tenxa) {
          throw new Error('Thiếu thông tin vé để gửi đánh giá');
        }
        res = await fetch(`${API_BASE}/${ticketNumber}/feedback?tenxa=${tenxa}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      // Attempt to read response body for better error messages
      // If we reach here it means we used Workflow B and have a fetch Response
      if (res) {
        try { resBody = await res.json(); } catch { try { resBody = await res.text(); } catch {} }

        if (!res.ok) {
          console.warn('❌ Feedback API returned error', res.status, resBody);
          const detail = (typeof resBody === 'object' && resBody && typeof resBody.detail === 'string')
            ? resBody.detail
            : (typeof resBody === 'object' ? JSON.stringify(resBody) : String(resBody || res.statusText));
          throw new Error(detail);
        }

        setMessage('Đã gửi đánh giá thành công!');
        setTicketInfo(prev => ({ ...(prev || (resBody || {})), rating: payloadRating, can_rate: false } as TicketFeedbackInfo));
      }
    } catch (err: any) {
      setMessage('*Vui lòng nhập góp ý của bạn để Trung tâm có thể phục vụ bạn tốt hơn');
    } finally {
      setLoading(false);
    }
  };

  // gọi fetch khi params/token thay đổi
  useEffect(() => {
    (async () => {
      // Workflow A: token-based verify
      if (token) {
        setLoading(true);
        try {
          // Use `token` param as returned/required by backend
          // Log token for debugging
          // eslint-disable-next-line no-console
          console.log('[ReviewPage] verifying token via ticketsAPI.getFeedback', { token });
          const data = await ticketsAPI.getFeedback({ token } as any);
          // eslint-disable-next-line no-console
          console.log('[ReviewPage] ticketsAPI.getFeedback response', data);
          setTicketInfo(data);
          setMessage('');
        } catch (err: any) {
          setMessage('Không tìm thấy vé hoặc vé chưa hoàn tất');
          setTicketInfo(null);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Workflow B: ticket_number + tenxa
      if (!ticketNumber || !tenxa) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/${ticketNumber}/feedback?tenxa=${tenxa}`);
        if (!res.ok) throw new Error('Không tìm thấy vé hoặc vé chưa hoàn tất');
        const data = await res.json();
        setTicketInfo(data);
        setMessage('');
      } catch (err: any) {
        setMessage(err.message);
        setTicketInfo(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [ticketNumber, tenxa, token]);

  return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white shadow-md rounded-2xl p-4 w-full" style={{maxWidth: '500px'}}>
      <div className="flex flex-col items-center mb-4 text-center">
        <Image
          src="/images/logo_vang.png"
          alt="logo_vang"
          width={100}
          height={100}
          className="w-20 h-20 object-contain mb-2"
          unoptimized
        />
        <div style={{ fontSize: '12px' }}>
          <h1 className="font-bold text-gray-700">TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG</h1>
          <h1 className="font-bold text-gray-700">PHƯỜNG TÂN PHONG</h1>
        </div>
      </div>
        
        <h1 className="font-bold mb-4 text-gray-700 text-center" style={{ fontSize: '10px' }}>HỆ THỐNG ĐÁNH GIÁ MỨC ĐỘ HÀI LÒNG</h1>
        {loading && <p>Đang tải...</p>}

        {ticketInfo && (
          <div className="text-gray-700">
            <p className="mb-2">
              Vé số: <b>{ticketInfo.ticket_number}</b>
            </p>
            <p className="mb-2">
              Quầy: <b>{ticketInfo.counter_name}</b>
            </p>
            <p className="mb-2">Trạng thái: <b>{getStatusLabel(ticketInfo.status)}</b></p>
            <p className="mb-2">
              Hoàn tất lúc:{" "}
              {new Date(ticketInfo.finished_at).toLocaleString("vi-VN")}
            </p>
            
            {ticketInfo.can_rate ? (
              <div className="mt-4">
                <p className="font-semibold mb-2">Mời Quý khách đánh giá mức độ hài lòng đối với lượt phục vụ</p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setRating("Hài lòng")}
                    className={`px-3 py-2 rounded-lg border ${
                      rating === "Hài lòng" ? "bg-green-500 text-white" : ""
                    }`}
                  >
                    Hài lòng
                  </button>
                  <button
                    onClick={() => setRating("Bình thường")}
                    className={`px-3 py-2 rounded-lg border ${
                      rating === "Bình thường" ? "bg-yellow-400 text-white" : ""
                    }`}
                  >
                    Bình thường
                  </button>
                  <button
                    onClick={() => setRating("Cần cải thiện")}
                    className={`px-3 py-2 rounded-lg border ${
                      rating === "Cần cải thiện"
                        ? "bg-red-500 text-white"
                        : ""
                    }`}
                  >
                    Cần cải thiện
                  </button>
                </div>

                <textarea
                  placeholder="Nhập góp ý của bạn..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full border rounded-lg p-2 mt-3 bg-white text"
                />

                <button
                  onClick={submitFeedback}
                  disabled={loading || !rating}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg mt-3 w-full"
                >
                  Gửi đánh giá
                </button>
                
              </div>
              ) : (
                // Nếu không còn được phép đánh giá thì chỉ hiển thị kết quả đánh giá nếu có
                ticketInfo.rating ? (
                  <p className="mt-3 text-gray-600">Bạn đã đánh giá: {getRatingLabel(ticketInfo.rating)}</p>
                ) : null
              )}

          </div>
        )}

        {message && <p className="mt-3 text-red-500">{message}</p>}
      </div>
    </div>
  );
}

export default ReviewPage;
