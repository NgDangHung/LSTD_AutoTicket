📡 WebSocket API: Nhận sự kiện từ backend
🔌 Endpoint WebSocket:
wss://detect-seat.onrender.com/ws/updates
________________________________________
🔁 Cách sử dụng
Frontend cần:
1.	Kết nối WebSocket đến /ws/updates
2.	Lắng nghe các sự kiện JSON gửi từ backend
3.	Parse và xử lý hiển thị theo từng sự kiện
________________________________________
📨 Các loại sự kiện sẽ nhận được
✅ 1. Sự kiện: new_ticket – Khi người dùng tạo vé mới
json
{
  "event": "new_ticket",
  "ticket_number": 20,
  "counter_id": 1
  "tenxa": phuonghagiang1
}
📌 Ý nghĩa:
•	Một vé mới được tạo từ kiosk
•	ticket_number: mã vé hiển thị
•	counter_id: ID của quầy sẽ xử lý vé (có thể dùng để hiển thị thông báo/đợi)
________________________________________
✅ 2. Sự kiện: ticket_called – Khi hệ thống gọi vé tiếp theo tại quầy (tự động và thủ công)
Json
{
  "event": "ticket_called",
  "ticket_number": 20,
  "counter_name": "Văn phòng"
  "tenxa": phuonghagiang1
}
📌 Ý nghĩa:
•	Hệ thống gọi khách có số vé 20 tới quầy
•	ticket_number: mã vé được gọi
•	counter_name: tên quầy gọi (hiển thị cho khách biết đi đâu)
________________________________________

📌 Ghi chú thêm
Vấn đề	Lưu ý
Định dạng dữ liệu	JSON (UTF-8)
Kết nối lại nếu mất	Nên có retry nếu mất kết nối WebSocket
Không cần gửi gì từ frontend	WebSocket chỉ để nhận thông tin từ backend
________________________________________
📋 Tổng kết
Sự kiện	Khi nào xảy ra	Dữ liệu
new_ticket	Khi người dùng bấm lấy vé	ticket_number, counter_name (ID quầy)
ticket_called	Khi hệ thống gọi vé	ticket_number, counter_name (tên quầy)

