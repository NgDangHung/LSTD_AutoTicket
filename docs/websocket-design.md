# 🌐 WebSocket Design - FE ↔ BE Communication

## 📡 **WebSocket Connection Info**
- **URL:** `ws://localhost:3001` (development) / `wss://domain.com/ws` (production)
- **Protocol:** JSON message format
- **Auto-reconnect:** 5s interval on disconnect

---

## 📨 **1. FE → BE (Messages Frontend gửi)**

### 🔐 **Authentication**
```json
{
  "type": "AUTH",
  "payload": {
    "token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": 123,
    "role": "admin | leader | officer",
    "counter_id": 1
  }
}
```

### 📍 **Client Registration** 
```json
{
  "type": "REGISTER_CLIENT",
  "payload": {
    "client_type": "kiosk | tv | officer | admin",
    "client_id": "kiosk-001 | tv-hall-1 | officer-counter-1 | admin-001",
    "location": "main-hall | counter-1 | admin-office"
  }
}
```

### ⏸️ **Counter Status Change** (Admin/Officer → All clients)
```json
{
  "type": "COUNTER_STATUS_CHANGE",
  "payload": {
    "counter_id": 1,
    "status": "active | paused | offline",
    "reason": "Đi họp | Nghỉ trưa | Hỏng máy",
    "changed_by": {
      "user_id": 123,
      "username": "admin",
      "role": "admin"
    },
    "timestamp": "2025-07-19T10:30:00Z"
  }
}
```

### 🎟️ **New Ticket Created** (Kiosk → TV displays)
```json
{
  "type": "TICKET_CREATED",
  "payload": {
    "ticket_id": 456,
    "ticket_number": 105,
    "counter_id": 1,
    "counter_name": "Văn phòng đăng ký đất đai",
    "procedure_name": "Đăng ký đất đai, tài sản gắn liền với đất",
    "created_at": "2025-07-19T10:30:00Z",
    "estimated_wait_time": 15
  }
}
```

### 📢 **Call Next Ticket** (Officer → TV displays)
```json
{
  "type": "CALL_TICKET",
  "payload": {
    "ticket_number": 105,
    "counter_id": 1,
    "counter_name": "Văn phóng đăng ký đất đai",
    "called_by": {
      "user_id": 789,
      "username": "officer01",
      "full_name": "Nguyễn Văn A"
    },
    "timestamp": "2025-07-19T10:35:00Z"
  }
}
```

### 💬 **Custom Announcement** (Admin → TV displays)
```json
{
  "type": "ANNOUNCEMENT",
  "payload": {
    "message": "Thông báo: Hệ thống sẽ bảo trì từ 12:00-13:00",
    "priority": "high | medium | low",
    "duration": 30,
    "target_displays": ["tv-hall-1", "tv-hall-2"] // empty = all displays
  }
}
```

---

## 📨 **2. BE → FE (Messages Backend gửi)**

### ✅ **Connection Acknowledged**
```json
{
  "type": "CONNECTION_ACK",
  "payload": {
    "client_id": "kiosk-001",
    "server_time": "2025-07-19T10:30:00Z",
    "connected_clients": 15
  }
}
```

### 🔄 **Counter Status Update** (Broadcast to all clients)
```json
{
  "type": "COUNTER_STATUS_UPDATE", 
  "payload": {
    "counter_id": 1,
    "counter_name": "Văn phóng đăng ký đất đai",
    "status": "active | paused | offline",
    "reason": "Đi họp",
    "changed_by": "admin",
    "timestamp": "2025-07-19T10:30:00Z",
    "affected_tickets": 3
  }
}
```

### 🎟️ **Queue Update** (To TV displays)
```json
{
  "type": "QUEUE_UPDATE",
  "payload": {
    "counter_id": 1,
    "current_number": 105,
    "waiting_count": 8,
    "next_numbers": [106, 107, 108],
    "average_wait_time": 12
  }
}
```

### 📢 **Ticket Announcement** (To TV displays + Audio)
```json
{
  "type": "TICKET_ANNOUNCEMENT",
  "payload": {
    "ticket_number": 105,
    "counter_id": 1,
    "counter_name": "Văn phóng đăng ký đất đai",
    "announcement_text": "Mời khách hàng số 105 đến quầy Văn phóng đăng ký đất đai",
    "audio_url": "/audio/announcements/105-counter-1.mp3",
    "display_duration": 10
  }
}
```

### ⚠️ **System Alert** (To admin clients)
```json
{
  "type": "SYSTEM_ALERT",
  "payload": {
    "alert_type": "counter_offline | high_queue | system_error",
    "counter_id": 2,
    "message": "Quầy 2 không phản hồi trong 5 phút",
    "severity": "critical | warning | info",
    "timestamp": "2025-07-19T10:30:00Z"
  }
}
```

### 📊 **Statistics Update** (To admin dashboard)
```json
{
  "type": "STATS_UPDATE",
  "payload": {
    "total_tickets_today": 245,
    "active_counters": 3,
    "average_wait_time": 15,
    "busiest_counter": {
      "id": 1,
      "name": "Văn phóng đăng ký đất đai",
      "queue_length": 12
    },
    "timestamp": "2025-07-19T10:30:00Z"
  }
}
```

---

## 🔌 **3. Connection Events**

### 📡 **Client Connect**
```json
{
  "type": "CLIENT_CONNECTED",
  "payload": {
    "client_id": "kiosk-001",
    "client_type": "kiosk",
    "timestamp": "2025-07-19T10:30:00Z"
  }
}
```

### 📡 **Client Disconnect**
```json
{
  "type": "CLIENT_DISCONNECTED", 
  "payload": {
    "client_id": "kiosk-001",
    "reason": "network_error | manual_disconnect | timeout",
    "timestamp": "2025-07-19T10:35:00Z"
  }
}
```

### 💓 **Heartbeat** (Every 30s)
```json
{
  "type": "PING",
  "payload": {
    "timestamp": "2025-07-19T10:30:00Z"
  }
}

// Response
{
  "type": "PONG",
  "payload": {
    "timestamp": "2025-07-19T10:30:00Z"
  }
}
```

---

## 🎯 **4. Error Handling**

### ❌ **Error Response**
```json
{
  "type": "ERROR",
  "payload": {
    "error_code": "AUTH_FAILED | INVALID_MESSAGE | COUNTER_NOT_FOUND",
    "message": "Authentication failed: Invalid token",
    "timestamp": "2025-07-19T10:30:00Z"
  }
}
```

---

## 🏗️ **5. BE Implementation Requirements**

### **WebSocket Server Setup:**
```python
# FastAPI WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Handle client registration, message routing, broadcasting
```

### **Required Backend Features:**
1. **Client Management:** Track connected clients by type and ID
2. **Authentication:** Validate JWT tokens for WebSocket connections  
3. **Message Routing:** Route messages to specific client types/IDs
4. **Broadcasting:** Send updates to multiple clients simultaneously
5. **Queue Integration:** Real-time queue status from database
6. **Error Handling:** Graceful error responses and reconnection
7. **Logging:** Track all WebSocket events for debugging

### **Database Integration:**
- **Counter status changes** → Broadcast to all clients
- **New tickets** → Update queue, notify TV displays
- **Officer actions** → Real-time updates to admin dashboard
- **System events** → Alert relevant clients

### **Security Considerations:**
- **JWT Authentication** for all non-public messages
- **Rate limiting** to prevent spam
- **Client validation** based on roles and permissions
- **Message sanitization** to prevent XSS

---

## 🚀 **6. Usage Examples**

### **Admin pause counter:**
1. Admin clicks "Pause" → FE sends `COUNTER_STATUS_CHANGE`
2. BE validates → Updates database → Broadcasts `COUNTER_STATUS_UPDATE`
3. Kiosk receives update → Hides counter from UI
4. TV displays receive update → Shows "Tạm dừng" status

### **Customer gets ticket:**
1. Kiosk sends `TICKET_CREATED` → BE creates ticket in DB
2. BE broadcasts `QUEUE_UPDATE` → TV displays update queue
3. BE sends `TICKET_ANNOUNCEMENT` → Audio plays announcement

### **Officer calls next:**
1. Officer clicks "Call Next" → FE sends `CALL_TICKET` 
2. BE updates ticket status → Broadcasts `TICKET_ANNOUNCEMENT`
3. TV displays show current number → Audio announces ticket

This design ensures **real-time synchronization** across all interfaces! 🎯
