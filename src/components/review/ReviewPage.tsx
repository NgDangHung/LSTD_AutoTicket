'use client'

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

interface TicketFeedbackInfo {
  ticket_number: number;
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

  // lấy query param (safe trong client component)
    const searchParams = useSearchParams();
    const ticketNumber = searchParams?.get("ticket_number");
    const tenxa = searchParams?.get("tenxa");

  const fetchTicketInfo = async () => {
    if (!ticketNumber || !tenxa) {
      setMessage("Thiếu thông tin vé.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${ticketNumber}/feedback?tenxa=${tenxa}`);
      if (!res.ok) throw new Error("Không tìm thấy vé hoặc vé chưa hoàn tất");
      const data = await res.json();
      setTicketInfo(data);
      setMessage("");
    } catch (err: any) {
      setMessage(err.message);
      setTicketInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!ticketNumber || !tenxa || !rating) return;
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

      const res = await fetch(`${API_BASE}/${ticketNumber}/feedback?tenxa=${tenxa}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Attempt to read response body for better error messages
      let resBody: any = null;
      try { resBody = await res.json(); } catch { try { resBody = await res.text(); } catch {} }

      if (!res.ok) {
        console.warn('❌ Feedback API returned error', res.status, resBody);
        const detail = typeof resBody === 'object' ? JSON.stringify(resBody) : String(resBody || res.statusText);
        throw new Error(`Gửi đánh giá thất bại (${res.status}): ${detail}`);
      }

      setMessage('Đã gửi đánh giá thành công!');
      // Update local ticket info to show submitted rating and disable further rating
      setTicketInfo(prev => ({
        ...(prev || (resBody || {})),
        rating: payloadRating,
        can_rate: false,
      } as TicketFeedbackInfo));
    } catch (err: any) {
      setMessage(err.message || 'Gửi đánh giá thất bại');
    } finally {
      setLoading(false);
    }
  };

  // gọi fetch khi params thay đổi / khi client đã có search params
  useEffect(() => {
    // only attempt fetch on client when params are present
    if (!ticketNumber || !tenxa) return;
    fetchTicketInfo();
  }, [ticketNumber, tenxa]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white shadow-md rounded-2xl p-6 w-full" style={{maxWidth: '500px'}}>
        <div className="flex items-center gap-2">
            <Image
                src="/images/logo_vang.png" 
                alt="logo_vang" 
                width={120}
                height={120}
                className="w-30 h-30 object-contain"
                unoptimized
            />
            <div style={{ marginLeft: '15px'  }}>
                <h1 className="text-xl font-bold mb-4 text-gray-700">Đánh giá chất lượng dịch vụ</h1>
            </div>
        </div>

        {loading && <p>Đang tải...</p>}

        {ticketInfo && (
          <div className="text-gray-700">
            <p>
              Vé số: <b>{ticketInfo.ticket_number}</b>
            </p>
            <p>Trạng thái: {getStatusLabel(ticketInfo.status)}</p>
            <p>
              Hoàn tất lúc:{" "}
              {new Date(ticketInfo.finished_at).toLocaleString("vi-VN")}
            </p>

            {ticketInfo.can_rate ? (
              <div className="mt-4">
                <p className="font-semibold mb-2">Bạn cảm thấy thế nào?</p>
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
                  placeholder="Góp ý cải thiện dịch vụ ..."
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
