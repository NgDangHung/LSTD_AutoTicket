# 📋 Queue Management API Specification

**Base URL:** `/app`  
**Version:** 1.0  
**Date:** July 16, 2025

---

## 🎟 Ticket Management APIs

### 📝 [POST] `/tickets/` – Tạo vé mới (Kiosk)

**Mô tả:** API dành cho kiosk tạo vé số thứ tự mới cho khách hàng

**Headers:**
```
Content-Type: application/json
```

**Body (application/json):**
```json
{
  "counter_id": 1,
  "procedure_id": 123,     // Optional - ID thủ tục cụ thể
  "priority": "normal"     // Optional: "normal" | "priority" | "elderly"
}
```

**Response Success (201):**
```json
{
  "id": 1001,
  "number": 101,           // Số thứ tự hiển thị (3 digits)
  "counter_id": 1,
  "counter_name": "Quầy Tư pháp",
  "procedure_id": 123,
  "procedure_name": "Chứng thực giấy tờ",
  "priority": "normal",
  "status": "waiting",     // "waiting" | "called" | "serving" | "completed" | "cancelled"
  "created_at": "2025-07-16T10:30:00Z",
  "estimated_wait_time": 15  // Phút dự kiến chờ
}
```

**Response Error (400):**
```json
{
  "error": "invalid_counter",
  "message": "Counter ID không tồn tại hoặc đang tạm dừng",
  "details": {
    "counter_id": 1,
    "counter_status": "paused"
  }
}
```

**Business Logic:**
- Tự động tăng số thứ tự theo counter
- Kiểm tra counter có đang hoạt động không
- Tính toán thời gian chờ dự kiến
- Emit WebSocket event `ticket-created`

---

### 📊 [GET] `/api/tickets/waiting` – Lấy danh sách vé đang chờ (TV Display)

**Mô tả:** API dành cho TV lấy toàn bộ hàng đợi hiển thị real-time

**Query Parameters:**
```
counter_id (optional): number     // Lọc theo quầy cụ thể
limit (optional): number = 50     // Giới hạn số vé trả về
include_details (optional): boolean = false  // Bao gồm thông tin chi tiết
```

**Examples:**
```
GET /api/tickets/waiting
GET /api/tickets/waiting?counter_id=1
GET /api/tickets/waiting?limit=20&include_details=true
```

**Response Success (200):**
```json
{
  "counters": [
    {
      "counter_id": 1,
      "counter_name": "Quầy Tư pháp",
      "status": "active",           // "active" | "paused" | "offline"
      "current_serving": {
        "ticket_id": 1000,
        "number": 100,
        "called_at": "2025-07-16T10:25:00Z",
        "procedure_name": "Chứng thực giấy tờ"
      },
      "waiting_queue": [
        {
          "ticket_id": 1001,
          "number": 101,
          "priority": "normal",
          "wait_time": 15,           // Phút chờ hiện tại
          "procedure_name": "Hộ tịch"  // Only if include_details=true
        },
        {
          "ticket_id": 1002,
          "number": 102,
          "priority": "elderly",
          "wait_time": 20
        }
      ],
      "total_waiting": 2,
      "average_service_time": 8     // Phút trung bình mỗi vé
    }
  ],
  "last_updated": "2025-07-16T10:30:15Z",
  "total_waiting_all": 15
}
```

**Response Success - Empty Queue (200):**
```json
{
  "counters": [
    {
      "counter_id": 1,
      "counter_name": "Quầy Tư pháp",
      "status": "active",
      "current_serving": null,
      "waiting_queue": [],
      "total_waiting": 0,
      "average_service_time": 0
    }
  ],
  "last_updated": "2025-07-16T10:30:15Z",
  "total_waiting_all": 0
}
```

**Cache Headers:**
```
Cache-Control: no-cache
ETag: "queue-version-12345"
```

---

### ✏️ [PATCH] `/api/tickets/{ticket_id}` – Cập nhật trạng thái vé (Officer)

**Mô tả:** API dành cho nhân viên quầy cập nhật trạng thái vé

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters:**
```
ticket_id: number (required)
```

**Body (application/json):**
```json
{
  "status": "called",              // Required: "called" | "serving" | "completed" | "cancelled"
  "notes": "Khách hàng cần bổ sung giấy tờ",  // Optional
  "completion_reason": "success"    // Optional: "success" | "document_missing" | "customer_absent"
}
```

**Examples:**

**1. Gọi số thứ tự:**
```json
{
  "status": "called"
}
```

**2. Bắt đầu phục vụ:**
```json
{
  "status": "serving"
}
```

**3. Hoàn thành:**
```json
{
  "status": "completed",
  "completion_reason": "success",
  "notes": "Đã cấp giấy chứng nhận"
}
```

**4. Hủy vé:**
```json
{
  "status": "cancelled",
  "completion_reason": "customer_absent",
  "notes": "Khách hàng không có mặt sau 3 lần gọi"
}
```

**Response Success (200):**
```json
{
  "id": 1001,
  "number": 101,
  "counter_id": 1,
  "status": "called",
  "updated_at": "2025-07-16T10:35:00Z",
  "updated_by": {
    "user_id": 5,
    "username": "officer01",
    "full_name": "Nguyễn Văn A"
  },
  "service_duration": null,        // Seconds - chỉ có khi completed
  "notes": "Khách hàng cần bổ sung giấy tờ"
}
```

**Response Error (404):**
```json
{
  "error": "ticket_not_found",
  "message": "Không tìm thấy vé với ID: 1001"
}
```

**Response Error (403):**
```json
{
  "error": "unauthorized_counter", 
  "message": "Bạn không có quyền cập nhật vé của quầy này",
  "details": {
    "ticket_counter_id": 1,
    "user_counter_id": 2
  }
}
```

**Response Error (400):**
```json
{
  "error": "invalid_status_transition",
  "message": "Không thể chuyển từ 'completed' sang 'called'",
  "details": {
    "current_status": "completed",
    "requested_status": "called",
    "allowed_transitions": []
  }
}
```

**Business Logic:**
- Validate status transitions (waiting → called → serving → completed)
- Kiểm tra quyền officer chỉ cập nhật vé của counter mình
- Tự động tính service_duration khi completed
- Emit WebSocket event `ticket-updated`

---

## 🔌 WebSocket Events Specification

**WebSocket URL:** `ws://localhost:3001/ws/queue`  
**Authentication:** Bearer token in connection headers

### Connection Setup

**Client Connection:**
```javascript
const socket = io('ws://localhost:3001/ws/queue', {
  auth: {
    token: 'bearer_token_here'
  },
  query: {
    client_type: 'tv_display',    // 'tv_display' | 'officer' | 'admin'
    counter_id: 1                 // Optional - for officer clients
  }
});
```

### 📡 Server-to-Client Events

#### 1. `ticket-created` - Vé mới được tạo
```javascript
socket.on('ticket-created', (data) => {
  console.log('New ticket:', data);
});
```

**Payload:**
```json
{
  "event": "ticket-created",
  "ticket": {
    "id": 1001,
    "number": 101,
    "counter_id": 1,
    "counter_name": "Quầy Tư pháp",
    "priority": "normal",
    "created_at": "2025-07-16T10:30:00Z"
  },
  "queue_summary": {
    "counter_id": 1,
    "total_waiting": 5,
    "estimated_wait_time": 25
  },
  "timestamp": "2025-07-16T10:30:00Z"
}
```

#### 2. `ticket-updated` - Trạng thái vé thay đổi
```javascript
socket.on('ticket-updated', (data) => {
  console.log('Ticket updated:', data);
});
```

**Payload:**
```json
{
  "event": "ticket-updated", 
  "ticket": {
    "id": 1001,
    "number": 101,
    "counter_id": 1,
    "old_status": "waiting",
    "new_status": "called",
    "updated_at": "2025-07-16T10:35:00Z",
    "updated_by": "officer01"
  },
  "queue_summary": {
    "counter_id": 1,
    "current_serving": 101,
    "total_waiting": 4,
    "next_numbers": [102, 103, 104]
  },
  "timestamp": "2025-07-16T10:35:00Z"
}
```

#### 3. `counter-status-changed` - Trạng thái quầy thay đổi
```javascript
socket.on('counter-status-changed', (data) => {
  console.log('Counter status:', data);
});
```

**Payload:**
```json
{
  "event": "counter-status-changed",
  "counter": {
    "id": 1,
    "name": "Quầy Tư pháp", 
    "old_status": "active",
    "new_status": "paused",
    "reason": "Đi họp",
    "changed_by": "officer01"
  },
  "affected_tickets": 5,          // Số vé đang chờ bị ảnh hưởng
  "timestamp": "2025-07-16T11:00:00Z"
}
```

#### 4. `queue-announcement` - Thông báo hệ thống
```javascript
socket.on('queue-announcement', (data) => {
  console.log('System announcement:', data);
});
```

**Payload:**
```json
{
  "event": "queue-announcement",
  "type": "number-calling",        // "number-calling" | "system-message" | "emergency"
  "message": "Mời số 101 đến quầy Tư pháp",
  "ticket": {
    "number": 101,
    "counter_name": "Quầy Tư pháp"
  },
  "priority": "high",             // "low" | "normal" | "high" | "urgent"
  "auto_dismiss": 10,             // Seconds - tự động ẩn sau 10s
  "timestamp": "2025-07-16T10:35:00Z"
}
```

### 📤 Client-to-Server Events

#### 1. `subscribe-counter` - Subscribe cập nhật của counter cụ thể
```javascript
// Officer subscribe to their counter only
socket.emit('subscribe-counter', { 
  counter_id: 1 
});
```

#### 2. `heartbeat` - Maintain connection
```javascript
// Client gửi heartbeat mỗi 30s
setInterval(() => {
  socket.emit('heartbeat', { 
    client_type: 'tv_display',
    timestamp: new Date().toISOString()
  });
}, 30000);
```

### 🔌 Connection Events

#### Connection Success
```javascript
socket.on('connect', () => {
  console.log('Connected to queue WebSocket');
  
  // Server gửi initial queue state
  socket.on('initial-queue-state', (data) => {
    console.log('Initial state:', data);
  });
});
```

#### Connection Error
```javascript
socket.on('connect_error', (error) => {
  console.error('WebSocket connection failed:', error);
});
```

#### Disconnection Handling
```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  // Auto-reconnect logic
  if (reason === 'io server disconnect') {
    socket.connect();
  }
});
```

---

## 🚀 Implementation Examples

### Frontend Integration (React)

#### TV Display Component
```tsx
// src/hooks/useQueueWebSocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useQueueWebSocket = () => {
  const [queueData, setQueueData] = useState(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('ws://localhost:3001/ws/queue', {
      query: { client_type: 'tv_display' }
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to queue WebSocket');
    });

    newSocket.on('initial-queue-state', (data) => {
      setQueueData(data);
    });

    newSocket.on('ticket-created', (data) => {
      // Refresh queue display
      setQueueData(prev => updateQueueWithNewTicket(prev, data));
    });

    newSocket.on('ticket-updated', (data) => {
      setQueueData(prev => updateQueueWithTicketChange(prev, data));
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  return { queueData, socket };
};
```

#### Kiosk Ticket Creation
```tsx
// src/components/kiosk/KioskMainScreen.tsx
const handleConfirmCounter = async (counterId: string) => {
  try {
    const response = await fetch('/app/tickets/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        counter_id: parseInt(counterId),
        procedure_id: selectedProcedure?.id,
        priority: 'normal'
      })
    });

    const newTicket = await response.json();
    
    // Success toast
    toast.success(
      <div className="text-left">
        <div className="font-bold text-lg">✅ Đã tạo số thứ tự thành công!</div>
        <div className="mt-2">
          <div>🎫 Số của bạn: <span className="font-bold text-2xl text-blue-600">{newTicket.number}</span></div>
          <div>🏢 Quầy: {newTicket.counter_name}</div>
          <div>⏰ Thời gian chờ dự kiến: ~{newTicket.estimated_wait_time} phút</div>
        </div>
      </div>
    );

    // Reset form
    setShowConfirmCounter(false);
    resetSearchState();
    
  } catch (error) {
    console.error('❌ Error creating ticket:', error);
    toast.error('Có lỗi xảy ra khi tạo số thứ tự');
  }
};
```

#### Officer Interface
```tsx
// src/components/officer/OfficerQueueList.tsx
const handleCallNext = async () => {
  try {
    // Get next ticket from queue
    const waitingTickets = await fetchWaitingTickets(counterID);
    const nextTicket = waitingTickets.waiting_queue[0];
    
    if (!nextTicket) {
      toast.info('Không còn khách hàng nào đang chờ');
      return;
    }

    // Update ticket status to 'called'
    await fetch(`/app/tickets/${nextTicket.ticket_id}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ status: 'called' })
    });

    toast.success(`🔊 Đã gọi số ${nextTicket.number}`);
    
  } catch (error) {
    toast.error('Có lỗi khi gọi số tiếp theo');
  }
};
```

---

## 🔧 Backend Implementation Notes

### Database Schema Suggestions
```sql
-- tickets table
CREATE TABLE tickets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  number INT NOT NULL,
  counter_id INT NOT NULL,
  procedure_id INT,
  priority ENUM('normal', 'priority', 'elderly') DEFAULT 'normal',
  status ENUM('waiting', 'called', 'serving', 'completed', 'cancelled') DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  called_at TIMESTAMP NULL,
  served_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  service_duration INT NULL, -- seconds
  notes TEXT,
  updated_by INT, -- user_id
  INDEX idx_counter_status (counter_id, status),
  INDEX idx_created_at (created_at)
);
```

### Redis Cache Strategy
```
Key: queue:counter:{counter_id}
Value: {
  current_serving: ticket_id,
  waiting_queue: [ticket_id1, ticket_id2, ...],
  last_updated: timestamp
}
TTL: 300 seconds (5 minutes)
```

### Rate Limiting
```
POST /tickets/ - 5 requests/minute per IP
PATCH /api/tickets/{id} - 30 requests/minute per user
GET /api/tickets/waiting - 60 requests/minute per client
```

---

## 📊 Monitoring & Analytics

### Metrics to Track
- Average service time per counter
- Peak hours queue length
- Ticket abandonment rate
- Counter utilization
- WebSocket connection stability

### Health Check Endpoint
```
GET /health/queue-system
Response: {
  "status": "healthy",
  "active_tickets": 45,
  "websocket_connections": 12,
  "average_response_time": "150ms"
}
```

---

**📝 Notes:**
- Tất cả timestamps sử dụng ISO 8601 format (UTC)
- WebSocket auto-reconnect với exponential backoff
- API rate limiting để tránh spam
- Logging tất cả queue operations để audit
- Support multiple language trong message (vi/en)
