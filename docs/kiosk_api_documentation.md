
# 📘 Tài liệu API – Kiosk API

**Base URL:** `/app`

## 🧾 Authentication

---

### 🔐 [POST] `/auths/login` – Đăng nhập lấy access token

- **Body (x-www-form-urlencoded):**
  | Field         | Type     | Required | Description        |
  |---------------|----------|----------|--------------------|
  | username      | string   | ✅       | Tên đăng nhập      |
  | password      | string   | ✅       | Mật khẩu           |

- **Response:**
```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

---

### 🧑‍💻 [GET] `/auths/me` – Lấy thông tin người dùng hiện tại

- **Headers:**
  - `Authorization: Bearer <access_token>`

- **Response:**
```json
{
  "id": 1,
  "username": "admin",
  "full_name": "Nguyễn Văn A",
  "role": "officer",
  "counter_id": 1,
  "is_active": true
}
```

---

### 🆕 [POST] `/auths/users/` – Tạo người dùng mới
- **Headers:**
  - `Authorization: Bearer <access_token>`

- **Body (application/json):**
```json
{
  "username": "string",
  "full_name": "string",
  "password": "string",
  "role": "admin | leader | officer",
  "counter_id": 1
}
```

- **Response:**
```json
{
  "id": 1,
  "username": "string",
  "full_name": "string",
  "role": "admin",
  "counter_id": 1,
  "is_active": true
}
```

---

## 📋 Procedures

---

### 🔍 [GET] `/procedures/` – Lấy danh sách thủ tục

- **Query Params:**
  - `search` (string, optional)

- **Response:**
```json
[
  {
    "id": 1,
    "name": "Đăng ký xe",
    "field_id": 2
  }
]
```

---

### 🔎 [GET] `/procedures/search-extended` – Tìm kiếm thủ tục kèm quầy

- **Query Params:**
  - `search` (string, optional)

- **Response:**
```json
[
  {
    "id": 1,
    "name": "Đăng ký",
    "field_id": 2,
    "counters": [
      {
        "id": 1,
        "name": "Quầy 1",
        "status": "active"
      }
    ]
  }
]
```

---

## 🎟 Tickets

---

### 📝 [POST] `/tickets/` – Tạo phiếu mới

- **Body (application/json):**
```json
{
  "counter_id": 1
}
```

- **Response:**
```json
{
  "id": 1,
  "number": 101,
  "counter_id": 1,
  "created_at": "2025-07-15T14:00:00",
  "status": "waiting"
}
```

---

## 🪑 Seats

---

### 📋 [GET] `/seats/` – Lấy danh sách chỗ ngồi

- **Response:**
```json
[
  {
    "id": 1,
    "name": "Ghế 1",
    "type": "client",
    "counter_id": 2,
    "occupied": false,
    "last_empty_time": "2025-07-15T13:50:00"
  }
]
```

---

### ✏️ [PUT] `/seats/{seat_id}` – Cập nhật trạng thái ghế

- **Path Param:**
  - `seat_id` (integer)

- **Body (application/json):**
```json
{
  "status": true
}
```

- **Response:** giống với `GET /seats/`

---

## 🧾 Counters

---

### ⏭️ [POST] `/counters/{counter_id}/call-next` – Gọi lượt tiếp theo

- **Path Param:**
  - `counter_id` (integer)

- **Headers:**
  - `Authorization: Bearer <access_token>`

- **Authorization Rules:**
  - `admin`: ✅ Có thể gọi bất kỳ counter nào
  - `officer`: ✅ Chỉ có thể gọi counter được gán (`user.counter_id == counter_id`)
  - `other roles`: ❌ Không có quyền

- **Response:**
```json
{
  "number": 105,
  "counter_name": "Quầy 1"
}
```

- **Error Responses:**
```json
// 403 Forbidden - Officer không có quyền với counter này
{
  "detail": "Officer chỉ có quyền với counter 1"
}

// 404 Not Found - Counter không tồn tại
{
  "detail": "Counter not found"
}

// 400 Bad Request - Không có vé đang chờ
{
  "detail": "No waiting tickets for this counter"
}
```

---

### ⏸️ [POST] `/counters/{counter_id}/pause` – Tạm dừng quầy

- **Path Param:**
  - `counter_id` (integer)

- **Headers:**
  - `Authorization: Bearer <access_token>`

- **Authorization Rules:**
  - `admin`: ✅ Có thể tạm dừng bất kỳ counter nào
  - `officer`: ✅ Chỉ có thể tạm dừng counter được gán (`user.counter_id == counter_id`)
  - `other roles`: ❌ Không có quyền

- **Body (application/json):**
```json
{
  "reason": "Đi họp"
}
```

- **Response:**
```json
{
  "id": 1,
  "counter_id": 2,
  "reason": "Đi họp",
  "created_at": "2025-07-15T14:30:00"
}
```

---

### ▶️ [PUT] `/counters/{counter_id}/resume` – Tiếp tục quầy

- **Path Param:**
  - `counter_id` (integer)

- **Headers:**
  - `Authorization: Bearer <access_token>`

- **Authorization Rules:**
  - `admin`: ✅ Có thể mở lại bất kỳ counter nào
  - `officer`: ✅ Chỉ có thể mở lại counter được gán (`user.counter_id == counter_id`)
  - `other roles`: ❌ Không có quyền

- **Response:**
```json
{
  "id": 2,
  "name": "Quầy 1",
  "status": "active"
}
```

---

## 🛑 Validation Error Response (chung)

```json
{
  "detail": [
    {
      "loc": ["body", "username"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## 🔐 Backend Authorization Implementation Guide

### Counter-specific Endpoints Authorization Logic:

```python
# FastAPI implementation example
from fastapi import HTTPException, Depends

async def validate_counter_access(
    counter_id: int,
    current_user = Depends(get_current_user)
):
    """Validate user has access to specific counter"""
    
    # Admin has access to all counters
    if current_user.role == "admin":
        return True
    
    # Officer can only access assigned counter
    elif current_user.role == "officer":
        if current_user.counter_id != counter_id:
            raise HTTPException(
                status_code=403,
                detail=f"Officer chỉ có quyền với counter {current_user.counter_id}"
            )
        return True
    
    # Other roles denied
    else:
        raise HTTPException(
            status_code=403,
            detail="Không có quyền truy cập"
        )

@app.post("/counters/{counter_id}/call-next")
async def call_next_ticket(
    counter_id: int,
    current_user = Depends(get_current_user),
    _: bool = Depends(validate_counter_access)
):
    # Implementation here...
    pass
```

### Database Schema Requirements:

```sql
-- Ensure users table has counter_id for officers
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) CHECK (role IN ('admin', 'leader', 'officer')),
    counter_id INTEGER REFERENCES counters(id), -- Required for officer role
    is_active BOOLEAN DEFAULT true
);

-- Sample officer data
INSERT INTO users (username, full_name, role, counter_id) VALUES
('officer1', 'Nhân viên Quầy 1', 'officer', 1),
('officer2', 'Nhân viên Quầy 2', 'officer', 2),
('officer3', 'Nhân viên Quầy 3', 'officer', 3),
('officer4', 'Nhân viên Quầy 4', 'officer', 4);
```

Tài liệu API Thống kê (Stats APIs - API cho Dashboard)
Tất cả các API trong nhóm Stats đều sử dụng phương thức GET và trả về dữ liệu dưới dạng application/json.
________________________________________
1. /stats/tickets-per-counter
Mô tả: Lấy tổng số vé đã phát theo từng quầy.
🟢 Method: GET
🔸 Query Params:
Tên	Kiểu dữ liệu	Mô tả	Bắt buộc
start_date	string (date)	Ngày bắt đầu (format: YYYY-MM-DD)	Không
end_date	string (date)	Ngày kết thúc (format: YYYY-MM-DD)	Không
🔁 Response:
json
Sao chépChỉnh sửa
[
  {
    "counter_id": 1,
    "total_tickets": 150
  },
  ...
]
________________________________________
2. /stats/attended-tickets
Mô tả: Lấy số vé đã tiếp nhận (gọi thành công) theo từng quầy.
🟢 Method: GET
🔸 Query Params:
Tên	Kiểu dữ liệu	Mô tả	Bắt buộc
start_date	string (date)	Ngày bắt đầu	Không
end_date	string (date)	Ngày kết thúc	Không
🔁 Response:
json
Sao chépChỉnh sửa
[
  {
    "counter_id": 1,
    "attended_tickets": 120
  },
  ...
]
________________________________________
3. /stats/average-handling-time
Mô tả: Lấy thời gian xử lý trung bình của từng quầy.
🟢 Method: GET
🔸 Query Params:
Tên	Kiểu dữ liệu	Mô tả	Bắt buộc
start_date	string (date)	Ngày bắt đầu	Không
end_date	string (date)	Ngày kết thúc	Không
🔁 Response:
json
Sao chépChỉnh sửa
[
  {
    "counter_id": 1,
    "avg_handling_time_seconds": 65.4
  },
  ...
]
________________________________________
4. /stats/average-waiting-time
Mô tả: Lấy thời gian chờ trung bình của người dân ở mỗi quầy.
🟢 Method: GET
🔸 Query Params:
Tên	Kiểu dữ liệu	Mô tả	Bắt buộc
start_date	string (date)	Ngày bắt đầu	Không
end_date	string (date)	Ngày kết thúc	Không
🔁 Response:
json
Sao chépChỉnh sửa
[
  {
    "counter_id": 1,
    "avg_waiting_time_seconds": 30.2
  },
  ...
]
________________________________________
5. /stats/afk-duration
Mô tả: Lấy tổng thời gian "vắng mặt" (AFK) theo từng quầy.
🟢 Method: GET
🔸 Query Params:
Tên	Kiểu dữ liệu	Mô tả	Bắt buộc
start_date	string (date)	Ngày bắt đầu	Không
end_date	string (date)	Ngày kết thúc	Không
🔁 Response:
json
Sao chépChỉnh sửa
[
  {
    "counter_id": 1,
    "total_afk_seconds": 3200
  },
  ...
]
________________________________________
6. /stats/working-time-check
Mô tả: Kiểm tra giờ làm việc (có đi làm đúng ca hay không) trong ngày.
🟢 Method: GET
🔸 Query Params:
Tên	Kiểu dữ liệu	Mô tả	Bắt buộc
date_check	string (date)	Ngày kiểm tra (YYYY-MM-DD)	Không
🔁 Response:
json
Sao chépChỉnh sửa
[
  {
    "counter_id": 1,
    "started_at": "08:01:12",
    "ended_at": "16:59:00"
  },
  ...
]
(Trường hợp schema đầy đủ có thể thêm vào phần này)
________________________________________
🛑 Lưu ý chung:
•	Tất cả các thời gian được tính bằng giây.
•	Các endpoint có thể dùng kết hợp start_date và end_date để lọc dữ liệu theo khoảng thời gian cụ thể.
•	Nếu không truyền start_date và end_date, hệ thống sẽ lấy dữ liệu theo mặc định (có thể là ngày hiện tại hoặc toàn bộ).


Footers API — Quản lý thông tin giờ làm việc & hotline từng xã
Base URL:
/footers
________________________________________
🔹 1. GET /footers
✅ Mục đích:
Lấy thông tin work_time và hotline của một xã (tenxa)
📥 Query Params:
Tên	Kiểu	Bắt buộc	Mô tả
tenxa	string	✅	Slug/xã cần lấy dữ liệu (ví dụ: phuonghagiang1)
📤 Response: 200 OK
json
{
  "work_time": "7h30 - 11h30 và 13h30 - 17h",
  "hotline": "1900 1234"
}
⚠️ Lỗi:
•	404 Not Found – Không tìm thấy dữ liệu tương ứng
________________________________________
🔹 2. POST /footers
✅ Mục đích:
Tạo hoặc cập nhật thông tin work_time và hotline cho một xã.
📥 Query Params:
Tên	Kiểu	Bắt buộc	Mô tả
tenxa	string	✅	Slug/xã cần cập nhật dữ liệu
📥 Request Body (JSON):
json
{
  "work_time": "7h30 - 11h30 và 13h30 - 17h",
  "hotline": "1900 1234"
}
📤 Response: 200 OK
json
{
  "work_time": "7h30 - 11h30 và 13h30 - 17h",
  "hotline": "1900 1234"
}
⚠️ Ghi chú:
•	Nếu xã đã có bản ghi, hệ thống sẽ cập nhật.
•	Nếu chưa có, hệ thống sẽ tạo mới.

