# Hướng dẫn sử dụng hệ thống quản lý số thứ tự

## Tổng quan
Hệ thống quản lý số thứ tự được thiết kế để tối ưu hóa quy trình phục vụ tại các trung tâm hành chính công.

## Modules chính

### 1. Kiosk (Máy lấy số)
- **Trang chính**: Hiển thị danh sách dịch vụ
- **Tìm kiếm giọng nói**: Cho phép tìm kiếm dịch vụ bằng giọng nói
- **Xác nhận quầy**: Chọn quầy và in số thứ tự

### 2. TV Display (Màn hình hiển thị)
- **Hiển thị số thứ tự**: Số đang phục vụ, số tiếp theo
- **Thông báo**: Gọi số và hướng dẫn đến quầy

### 3. Officer (Cán bộ tiếp nhận)
- **Gọi số**: Gọi số tiếp theo trong hàng đợi
- **Hoàn thành**: Đánh dấu hoàn thành phục vụ
- **Tạm ngưng**: Tạm ngưng phục vụ với lý do

### 4. Admin (Quản trị)
- **Dashboard**: Thống kê tổng quan
- **Quản lý người dùng**: Thêm, sửa, xóa cán bộ
- **Cài đặt**: Cấu hình hệ thống

## Cách sử dụng

### Đối với khách hàng:
1. Tại màn hình Kiosk, chọn dịch vụ cần sử dụng
2. Chọn quầy phục vụ (nếu có nhiều quầy)
3. Nhận và giữ phiếu số thứ tự
4. Theo dõi màn hình TV để biết lượt mình
5. Đến quầy khi được gọi

### Đối với cán bộ:
1. Đăng nhập vào hệ thống
2. Chọn quầy phục vụ của mình
3. Nhấn "Gọi số tiếp theo" để gọi khách
4. Phục vụ khách hàng
5. Nhấn "Hoàn thành" khi xong
6. Lặp lại quy trình

### Đối với quản trị viên:
1. Đăng nhập với quyền admin
2. Theo dõi dashboard để nắm tình hình
3. Quản lý cán bộ và phân quyền
4. Cấu hình hệ thống theo nhu cầu

## Lưu ý kỹ thuật

### Yêu cầu hệ thống:
- Trình duyệt hỗ trợ Web Speech API (Chrome, Edge)
- Kết nối internet ổn định
- Microphone cho tính năng tìm kiếm giọng nói
- Máy in nhiệt cho in phiếu số

### Cài đặt và triển khai:
1. Clone repository
2. Cài đặt dependencies: `npm install`
3. Cấu hình biến môi trường
4. Chạy development: `npm run dev`
5. Build production: `npm run build`

### API Backend:
Hệ thống cần kết nối với backend API để:
- Quản lý hàng đợi
- Xác thực người dùng
- Lưu trữ dữ liệu
- Real-time updates

## Troubleshooting

### Lỗi thường gặp:
1. **Không nhận diện được giọng nói**
   - Kiểm tra quyền truy cập microphone
   - Đảm bảo trình duyệt hỗ trợ

2. **Không in được phiếu**
   - Kiểm tra kết nối máy in
   - Kiểm tra giấy in

3. **Không hiển thị số trên TV**
   - Kiểm tra kết nối mạng
   - Refresh trang hiển thị

### Liên hệ hỗ trợ:
- Email: support@example.com
- Hotline: 1900-1234
- GitHub Issues: [Link repository]
