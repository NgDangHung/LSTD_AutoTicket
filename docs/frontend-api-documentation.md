# 📘 Tài liệu API Frontend – Kiosk Queue Management System

**Base URL:** `http://localhost:8000/app`

## 🏗️ Architecture Overview

Frontend sử dụng **TypeScript** và **React Hooks** để quản lý API calls. Tất cả API operations được abstract thông qua:
- **`/libs/api.ts`** - Core API layer với Axios
- **`/libs/apiTypes.ts`** - TypeScript type definitions
- **`/hooks/useApi.ts`** - React hooks cho từng operation
- **`/libs/apiExamples.ts`** - Usage examples và workflows

---

## 📋 Procedures API

### 🔍 **proceduresAPI.getProcedures(search?: string)**

- **Function:** `api.ts` → `proceduresAPI.getProcedures()`
- **Hook:** `useProcedures(search?: string)`
- **Backend Endpoint:** `GET /procedures/`

**Usage:**
```tsx
import { useProcedures } from '@/hooks/useApi';

function ProceduresList() {
  const { procedures, loading, error, refetch } = useProcedures();
  
  if (loading) return <div>Đang tải...</div>;
  if (error) return <div>Lỗi: {error.message}</div>;
  
  return (
    <ul>
      {procedures?.map(proc => (
        <li key={proc.id}>{proc.name}</li>
      ))}
    </ul>
  );
}
```

**Response Type:**
```typescript
interface Procedure {
  id: number;
  name: string;
  field_id: number;
}
```

---

### 🔎 **proceduresAPI.searchExtended(query: string)**

- **Function:** `api.ts` → `proceduresAPI.searchExtended()`
- **Hook:** `useSearchProcedures()`
- **Backend Endpoint:** `GET /procedures/search-extended`

**Usage:**
```tsx
import { useSearchProcedures } from '@/hooks/useApi';

function SearchResults() {
  const { searchProcedures, results, isSearching } = useSearchProcedures();
  
  const handleSearch = (query: string) => {
    searchProcedures(query);
  };
  
  return (
    <div>
      <input 
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Tìm kiếm thủ tục..."
      />
      {isSearching && <div>Đang tìm kiếm...</div>}
      {results?.map(proc => (
        <div key={proc.id}>
          <h3>{proc.name}</h3>
          <p>Quầy khả dụng: {proc.counters?.length || 0}</p>
        </div>
      ))}
    </div>
  );
}
```

**Response Type:**
```typescript
interface ProcedureWithCounters extends Procedure {
  counters?: Counter[];
}

interface Counter {
  id: number;
  name: string;
  status: string;
}
```

---

## 🎟 Tickets API

### 📝 **ticketsAPI.createTicket(data: CreateTicketRequest)**

- **Function:** `api.ts` → `ticketsAPI.createTicket()`
- **Hook:** `useCreateTicket()`
- **Backend Endpoint:** `POST /tickets/`

**Usage:**
```tsx
import { useCreateTicket } from '@/hooks/useApi';

function TicketCreator() {
  const { createTicket, isCreating, error } = useCreateTicket();
  
  const handleCreateTicket = async (counterId: number) => {
    try {
      const ticket = await createTicket({ counter_id: counterId });
      console.log('Ticket created:', ticket.number);
    } catch (err) {
      console.error('Failed to create ticket:', err);
    }
  };
  
  return (
    <button 
      onClick={() => handleCreateTicket(1)}
      disabled={isCreating}
    >
      {isCreating ? 'Đang tạo...' : 'Tạo phiếu'}
    </button>
  );
}
```

**Request Type:**
```typescript
interface CreateTicketRequest {
  counter_id: number;
}
```

**Response Type:**
```typescript
interface Ticket {
  id: number;
  number: number;
  counter_id: number;
  created_at: string;
  status: string;
}
```

---

## 🧾 Counters API

### ⏭️ **countersAPI.callNext(counterId: number)**

- **Function:** `api.ts` → `countersAPI.callNext()`
- **Hook:** `useCounterOperations()`
- **Backend Endpoint:** `POST /counters/{counter_id}/call-next`
- **Auth Required:** ✅ Bearer Token

**Usage:**
```tsx
import { useCounterOperations } from '@/hooks/useApi';

function CounterControl() {
  const { callNext, isCalling, callError } = useCounterOperations();
  
  const handleCallNext = async (counterId: number) => {
    try {
      const result = await callNext(counterId);
      console.log(`Gọi số ${result.number} tại ${result.counter_name}`);
    } catch (err) {
      console.error('Failed to call next:', err);
    }
  };
  
  return (
    <button 
      onClick={() => handleCallNext(1)}
      disabled={isCalling}
    >
      {isCalling ? 'Đang gọi...' : 'Gọi tiếp theo'}
    </button>
  );
}
```

**Response Type:**
```typescript
interface CallNextResponse {
  number: number;
  counter_name: string;
}
```

---

### ⏸️ **countersAPI.pauseCounter(counterId: number, reason: string)**

- **Function:** `api.ts` → `countersAPI.pauseCounter()`
- **Hook:** `useCounterOperations()`
- **Backend Endpoint:** `POST /counters/{counter_id}/pause`
- **Auth Required:** ✅ Bearer Token

**Usage:**
```tsx
import { useCounterOperations } from '@/hooks/useApi';

function PauseCounter() {
  const { pauseCounter, isPausing } = useCounterOperations();
  
  const handlePause = async (counterId: number, reason: string) => {
    try {
      const result = await pauseCounter(counterId, reason);
      console.log('Counter paused:', result.reason);
    } catch (err) {
      console.error('Failed to pause counter:', err);
    }
  };
  
  return (
    <button 
      onClick={() => handlePause(1, "Đi họp")}
      disabled={isPausing}
    >
      {isPausing ? 'Đang tạm dừng...' : 'Tạm dừng'}
    </button>
  );
}
```

**Request Type:**
```typescript
interface PauseCounterRequest {
  reason: string;
}
```

**Response Type:**
```typescript
interface PauseCounterResponse {
  id: number;
  counter_id: number;
  reason: string;
  created_at: string;
}
```

---

### ▶️ **countersAPI.resumeCounter(counterId: number)**

- **Function:** `api.ts` → `countersAPI.resumeCounter()`
- **Hook:** `useCounterOperations()`
- **Backend Endpoint:** `PUT /counters/{counter_id}/resume`
- **Auth Required:** ✅ Bearer Token

**Usage:**
```tsx
import { useCounterOperations } from '@/hooks/useApi';

function ResumeCounter() {
  const { resumeCounter, isResuming } = useCounterOperations();
  
  const handleResume = async (counterId: number) => {
    try {
      const result = await resumeCounter(counterId);
      console.log(`${result.name} đã hoạt động trở lại`);
    } catch (err) {
      console.error('Failed to resume counter:', err);
    }
  };
  
  return (
    <button 
      onClick={() => handleResume(1)}
      disabled={isResuming}
    >
      {isResuming ? 'Đang khôi phục...' : 'Tiếp tục'}
    </button>
  );
}
```

**Response Type:**
```typescript
interface ResumeCounterResponse {
  id: number;
  name: string;
  status: string;
}
```

---

## 🎯 Complete Kiosk Workflow

### **useKioskWorkflow() Hook**

Tích hợp toàn bộ workflow từ tìm kiếm thủ tục đến tạo ticket:

```tsx
import { useKioskWorkflow } from '@/hooks/useApi';

function KioskInterface() {
  const {
    // Search procedures
    searchQuery,
    setSearchQuery,
    procedures,
    isSearching,
    
    // Create ticket
    createTicketForCounter,
    isCreatingTicket,
    
    // States
    error,
    clearError
  } = useKioskWorkflow();
  
  const handleSelectProcedure = async (counterId: number) => {
    try {
      const ticket = await createTicketForCounter(counterId);
      alert(`Ticket được tạo: #${ticket.number}`);
    } catch (err) {
      console.error('Workflow error:', err);
    }
  };
  
  return (
    <div>
      <input 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Tìm kiếm dịch vụ..."
      />
      
      {isSearching && <div>Đang tìm kiếm...</div>}
      
      {procedures?.map(proc => (
        <div key={proc.id}>
          <h3>{proc.name}</h3>
          {proc.counters?.map(counter => (
            <button
              key={counter.id}
              onClick={() => handleSelectProcedure(counter.id)}
              disabled={isCreatingTicket}
            >
              Chọn {counter.name}
            </button>
          ))}
        </div>
      ))}
      
      {error && (
        <div className="error">
          Lỗi: {error.message}
          <button onClick={clearError}>✕</button>
        </div>
      )}
    </div>
  );
}
```

---

## 🛠️ Error Handling

### **Global Error Types**

```typescript
interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

interface ValidationError {
  detail: Array<{
    loc: string[];
    msg: string;
    type: string;
  }>;
}
```

### **Error Handling Pattern**

```tsx
import { isAxiosError } from 'axios';

function handleApiError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 422) {
      // Validation error
      const details = error.response.data?.detail || [];
      return details.map((d: any) => d.msg).join(', ');
    }
    return error.response?.data?.message || error.message;
  }
  return 'Đã xảy ra lỗi không xác định';
}
```

---

## 📦 Dependencies

- **axios** - HTTP client
- **react** - Hooks và state management
- **typescript** - Type safety

---

## 🔧 Configuration

### **API Base Configuration**

```typescript
// libs/api.ts
const api = axios.create({
  baseURL: 'http://localhost:8000/app',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### **Request/Response Interceptors**

```typescript
// Request interceptor để thêm auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor để handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 📝 Notes

1. **Authentication**: Các API cần auth sẽ tự động thêm Bearer token từ localStorage
2. **Error Handling**: Tất cả hooks đều có built-in error handling
3. **Loading States**: Mỗi operation đều có loading state tương ứng
4. **Type Safety**: Toàn bộ requests/responses đều được typed
5. **Retries**: Có thể gọi lại các operations thông qua các function returned từ hooks

---

**Cập nhật lần cuối:** 15/07/2025
