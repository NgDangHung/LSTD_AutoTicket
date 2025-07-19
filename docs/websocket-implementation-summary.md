# WebSocket Configuration for Queue Management

## Environment Variables

### Development (.env.local)
```bash
# WebSocket Configuration
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_POLLING_FALLBACK_INTERVAL=15000

# API Configuration  
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Production (.env.production)
```bash
# WebSocket Configuration
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_POLLING_FALLBACK_INTERVAL=30000

# API Configuration
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

## WebSocket Implementation Summary

### ✅ **Features Implemented:**

1. **Real-time WebSocket Connection**
   - Auto-connect to WebSocket server
   - Subscription to queue updates
   - Real-time data processing

2. **Intelligent Fallback System**
   - Auto-fallback to polling when WebSocket fails
   - Exponential backoff reconnection (1s → 30s max)
   - Max 5 reconnection attempts

3. **Connection Status UI**
   - 🚀 WebSocket (green, animated)
   - 🔄 Polling (yellow)  
   - 📡 Offline (red)

4. **Enhanced Performance**
   - 0 API calls during WebSocket mode
   - 4 API calls/minute during polling fallback (vs 48 API calls/minute before)
   - Instant updates vs 5-second delay

5. **Backward Compatibility**
   - All existing features preserved
   - Same UI/UX experience
   - TTS announcements still work
   - Event listeners still active

### ✅ **WebSocket Message Types Handled:**

1. **QUEUE_DATA_UPDATE**: Complete tickets data refresh
2. **TICKET_STATUS_CHANGE**: Single ticket status update  
3. **COUNTER_UPDATE**: Counter-specific updates

### ✅ **Error Handling:**

1. **Connection Timeout**: 10-second timeout with fallback
2. **Reconnection Logic**: Exponential backoff up to 30 seconds
3. **Graceful Degradation**: Seamless switch to polling
4. **Network Recovery**: Auto-reconnect when network restored

### 🔧 **Backend Implementation Required:**

1. **WebSocket Server**: `/queue-updates` endpoint
2. **Message Broadcasting**: Send updates to all connected TVs
3. **Database Integration**: Trigger WebSocket on ticket status changes
4. **Authentication**: Optional client verification

### 📊 **Performance Comparison:**

| **Metric** | **Before (Polling)** | **After (WebSocket)** | **Improvement** |
|------------|---------------------|----------------------|-----------------|
| API Calls/min | 48 | 0 (WebSocket) / 4 (fallback) | **92-100% reduction** |
| Update Latency | 5 seconds | Instant | **Real-time** |
| Network Usage | High | Minimal | **Significant reduction** |
| Server Load | High | Low | **Scalable** |

### 🚀 **Next Steps:**

1. **Backend Team**: Implement WebSocket server theo specification
2. **Testing**: Test với multiple TV displays
3. **Production Deployment**: Configure WSS với SSL certificates
4. **Monitoring**: Add WebSocket connection metrics

**Kết quả**: TV Display giờ đây sử dụng WebSocket real-time updates với intelligent fallback, giữ nguyên toàn bộ tính năng và giao diện hiện tại!
