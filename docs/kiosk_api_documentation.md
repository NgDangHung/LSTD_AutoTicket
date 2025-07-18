
# 📘 Tài liệu API – Kiosk API

**Base URL:** `/app`

## 🧾 Authentication

---

### 🔐 [POST] `/auths/auth/token` – Đăng nhập lấy access token

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

- **Response:**
```json
{
  "number": 105,
  "counter_name": "Quầy 1"
}
```

---

### ⏸️ [POST] `/counters/{counter_id}/pause` – Tạm dừng quầy
- **Headers:**
  - `Authorization: Bearer <access_token>`

- **Path Param:**
  - `counter_id` (integer)

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
- **Headers:**
  - `Authorization: Bearer <access_token>`

- **Path Param:**
  - `counter_id` (integer)

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
