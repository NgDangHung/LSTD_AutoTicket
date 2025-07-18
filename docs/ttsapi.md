API 1: Lấy thông tin ghế theo ID
GET /seats/{seat_id}
Mục đích: Lấy thông tin chi tiết của một ghế theo seat_id.
🔹 Path Parameters
Tên	Kiểu	Bắt buộc	Mô tả
seat_id	integer	✔️	ID của ghế cần truy vấn
________________________________________
🔹 Response 200 – Thành công
Trả về thông tin ghế dạng:
json
Sao chépChỉnh sửa
{
  "id": 1,
  "status": true,
  "type": "client",
  "counter_id": 2,
  "last_empty_time": "2025-07-17T12:00:00+07:00"
}
________________________________________
🔹 Response 422 – Lỗi validate
Gửi sai kiểu seat_id (không phải số nguyên) sẽ trả về lỗi định dạng.
________________________________________
________________________________________
📘 API 2: Lấy danh sách ghế type = "client" của quầy
GET /seats/counter/{counter_id}
Mục đích: Trả về danh sách tất cả các ghế thuộc quầy có counter_id, và có type = "client".
🔹 Path Parameters
Tên	Kiểu	Bắt buộc	Mô tả
counter_id	integer	✔️	ID của quầy cần truy vấn
________________________________________
🔹 Response 200 – Thành công
json
Sao chépChỉnh sửa
[
  {
    "id": 1,
    "status": false,
    "type": "client",
    "counter_id": 2,
    "last_empty_time": "2025-07-17T10:22:00+07:00"
  }
]
________________________________________
🔹 Response 422 – Lỗi validate
Gửi sai kiểu counter_id (không phải số nguyên) sẽ trả về lỗi định dạng.
________________________________________
________________________________________
📘 API 3: Chuyển text mời khách hàng thành file âm thanh .mp3
POST /tts
Mục đích: Tạo file âm thanh (.mp3) với nội dung dạng:
“Xin mời khách hàng số {ticket_number} đến quầy số {counter_id} – {Tên quầy}”
🔹 Request Body
json
Sao chépChỉnh sửa
{
  "counter_id": 2,
  "ticket_number": 15
}
Trường	Kiểu	Bắt buộc	Mô tả
counter_id	integer	✔️	ID của quầy cần gọi
ticket_number	integer	✔️	Số thứ tự của khách hàng
________________________________________
🔹 Response 200 – Thành công
•	Trả về file .mp3 giọng nói tiếng Việt.
•	Content-Type: audio/mpeg
•	Có thể mở bằng HTML5 <audio> hoặc tải về.
________________________________________
🔹 Response 404 – Không tìm thấy quầy
json
Sao chépChỉnh sửa
{
  "detail": "Counter not found"
}
________________________________________
🔹 Response 422 – Lỗi validate
Ví dụ: thiếu trường, sai kiểu dữ liệu.
________________________________________
🧩 Gợi ý cho frontend:
Tình huống	Gợi ý xử lý
Phát âm thanh trực tiếp	Gọi POST /tts, rồi dùng URL phản hồi để <audio src=... autoplay />
Lấy trạng thái ghế	Dùng GET /seats/counter/{counter_id}
Gọi lại thông tin 1 ghế cụ thể	Dùng GET /seats/{seat_id}

