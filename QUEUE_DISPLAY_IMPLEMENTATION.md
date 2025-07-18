# QueueDisplay Component Update - Real API Integration

## 🎯 **Implemented Changes**

### **1. Updated API Integration**
- **New API Endpoint**: `GET /tickets/waiting` from `rootApi`
- **Real Ticket Interface**: Updated to match actual BE response structure
- **Status Types**: 'waiting', 'called', 'done' (removed 'serving', 'completed')

### **2. New Data Flow Logic**

#### **API Response Structure**:
```typescript
interface RealTicket {
  id: number;
  number: number;
  counter_id: number;
  status: 'waiting' | 'called' | 'done';
  created_at: string;
  called_at: string | null;
  finished_at: string | null;
}
```

#### **Status Processing Logic**:
- **'waiting'** → Render in "SỐ ĐANG CHỜ" column
- **'called'** → Render in "ĐANG PHỤC VỤ" column  
- **'done'** → Filtered out completely (không hiển thị)

### **3. Counter Data Processing**

#### **ProcessedCounterData Interface**:
```typescript
interface ProcessedCounterData {
  counter_id: number;
  counter_name: string;
  serving_tickets: RealTicket[];      // status: 'called'
  waiting_tickets: RealTicket[];      // status: 'waiting'
  serving_number: number | null;      // Latest called ticket number
  waiting_numbers: number[];          // Waiting ticket numbers (sorted by ID)
  waiting_count: number;              // Total waiting count
}
```

#### **Data Processing Steps**:
1. **Fetch all tickets** từ API
2. **Filter out 'done' tickets** (active tickets only)
3. **Group by counter_id and status**
4. **Sort waiting tickets by ID** (FIFO order)
5. **Get latest serving number** (most recent 'called' ticket)

### **4. Real-time Updates Strategy**

#### **Polling System**:
- **Base interval**: 5 seconds
- **Exponential backoff**: 10s → 20s → 40s on errors
- **Event-driven refresh** on officer actions

#### **Event Listeners**:
```typescript
// Officer interface events
'callNextTriggered' → Immediate API refresh

// System events  
'queueUpdated' → Standard refresh
'counterStatusUpdated' → Standard refresh
'ticketAnnouncement' → UI announcement only
```

### **5. UI Rendering Logic**

#### **Đang Phục Vụ Column**:
```typescript
// Show latest called ticket per counter
{counter.serving_number ? (
  <NumberAnimation number={counter.serving_number.toString()} />
) : (
  <span>Chưa có số được phục vụ</span>
)}
```

#### **Số Đang Chờ Column**:
```typescript
// Show waiting tickets sorted by ID
{counter.waiting_numbers.slice(0, 10).map(number => (
  <NumberAnimation number={number.toString()} />
))}
// Show "... và X số khác" if > 10 tickets
```

## 🔄 **Workflow Example**

### **Scenario: Officer clicks "Số tiếp theo"**

1. **Officer Interface** calls API `POST /counters/{id}/call-next`
2. **Backend** changes ticket status: `'waiting' → 'called'`
3. **Backend** dispatches `callNextTriggered` event
4. **TV Display** receives event → immediately calls `fetchAndProcessQueueData()`
5. **API Response** returns updated tickets with new statuses
6. **Data Processing** moves ticket from waiting to serving
7. **UI Update** reflects changes in both columns instantly

### **Data Flow Visualization**:
```
API /tickets/waiting
        ↓
Filter out 'done' tickets  
        ↓
Group by counter_id + status
        ↓
Process into display format
        ↓
Update UI state (processedCounters)
        ↓
Render 2-column layout
```

## 📊 **Benefits of New Implementation**

### **✅ Data Accuracy**:
- Single source of truth from database
- No mock data dependencies
- Real-time synchronization between interfaces

### **✅ Performance**:
- Efficient API polling with backoff
- Event-driven updates for immediate response
- Filtered data processing (exclude 'done' tickets)

### **✅ Scalability**:
- Standard REST API pattern
- Supports concurrent users
- Production-ready error handling

### **✅ User Experience**:
- Immediate updates when officer calls next
- Clear status indicators
- Proper FIFO queue ordering

## 🧪 **Testing Scenarios**

### **Test 1: Basic Display**
- Load `/tv` page → Should show all 4 counters
- Verify empty states show proper messages
- Check 2-column grid layout is maintained

### **Test 2: Ticket Status Flow**
1. Create new ticket → Should appear in "Số đang chờ"
2. Officer calls next → Should move to "Đang phục vụ"  
3. Officer completes → Should disappear from UI

### **Test 3: Real-time Updates**
- Open TV display and officer interface side-by-side
- Call next from officer → TV should update immediately
- Verify proper queue ordering (FIFO)

### **Test 4: Error Handling**
- Simulate API failure → Should show error state with retry button
- Test exponential backoff → Console should show retry attempts
- Network recovery → Should resume normal operation

## 🔮 **Future Enhancements**

1. **WebSocket Integration**: Replace polling with real-time WebSocket updates
2. **Cache Strategy**: Implement smart caching for better performance  
3. **Analytics**: Track queue metrics and display performance
4. **Responsive Design**: Optimize for different screen sizes
5. **Accessibility**: Add screen reader support and keyboard navigation

## 📝 **Configuration Notes**

- **API Base URL**: Configured in `rootApi.ts`
- **Polling Interval**: 5 seconds (configurable in component)
- **Counter Names**: Hardcoded mapping for Vietnamese government departments
- **Ticket Display Limit**: 10 tickets per counter (with overflow indicator)
- **Status Colors**: Yellow (serving), Blue (waiting), Red (announcements)
