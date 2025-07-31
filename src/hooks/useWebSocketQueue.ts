import { useEffect, useRef, useState, useCallback } from 'react';

// WebSocket event types based on BE documentation
interface NewTicketEvent {
  event: 'new_ticket';
  ticket_number: number;
  counter_id: number;
  tenxa: string
}

interface TicketCalledEvent {
  event: 'ticket_called';
  ticket_number: number;
  counter_name: string;
  timestamp: string; // ISO timestamp
  tenxa: string
}

type WebSocketEvent = NewTicketEvent | TicketCalledEvent;

interface UseWebSocketQueueReturn {
  isConnected: boolean;
  connectionError: string | null;
  lastEvent: WebSocketEvent | null;
  reconnect: () => void;
}

// Singleton WebSocket instance to prevent multiple connections
let globalWebSocket: WebSocket | null = null;
const connectionListeners: Set<(connected: boolean) => void> = new Set();
const eventListeners: Set<(event: WebSocketEvent) => void> = new Set();
const errorListeners: Set<(error: string) => void> = new Set();

const createGlobalWebSocket = () => {
  if (globalWebSocket && globalWebSocket.readyState === WebSocket.OPEN) {
    console.log('🔄 Reusing existing WebSocket connection');
    return globalWebSocket;
  }

  // Close existing connection if it's not open
  if (globalWebSocket) {
    globalWebSocket.close();
  }

  const wsUrl = 'ws://192.168.92.143:8000/ws/updates';
  console.log('🔌 Creating new global WebSocket connection:', wsUrl);
  
  globalWebSocket = new WebSocket(wsUrl);

  globalWebSocket.onopen = (event) => {
    console.log('✅ Global WebSocket connected successfully');
    console.log('🔗 Connection details:', {
      url: wsUrl,
      readyState: globalWebSocket?.readyState,
      protocol: globalWebSocket?.protocol,
      extensions: globalWebSocket?.extensions
    });
    connectionListeners.forEach(listener => listener(true));
  };

  globalWebSocket.onmessage = (event) => {
    try {
      const data: WebSocketEvent = JSON.parse(event.data);
      console.log('📨 Global WebSocket message received:', data);
      eventListeners.forEach(listener => listener(data));
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
      console.error('Raw message:', event.data);
    }
  };

  globalWebSocket.onclose = (event) => {
    console.log('🔌 Global WebSocket connection closed:', {
      code: event.code,
      reason: event.reason || 'No reason provided',
      wasClean: event.wasClean,
      url: wsUrl,
      readyState: globalWebSocket?.readyState
    });
    
    connectionListeners.forEach(listener => listener(false));
    
    // Auto-reconnect after 3 seconds if not manually closed
    if (event.code !== 1000) {
      console.log('🔄 Auto-reconnecting in 3 seconds...');
      setTimeout(() => {
        createGlobalWebSocket();
      }, 3000);
    }
  };

  globalWebSocket.onerror = (error) => {
    console.error('❌ Global WebSocket connection error:', error);
    errorListeners.forEach(listener => listener('WebSocket connection failed'));
    connectionListeners.forEach(listener => listener(false));
  };

  return globalWebSocket;
};

export const useWebSocketQueue = (): UseWebSocketQueueReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);

  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    switch (event.event) {
      case 'new_ticket':
        handleNewTicketEvent(event);
        break;
      case 'ticket_called':
        handleTicketCalledEvent(event);
        break;
      default:
        console.warn('🤷‍♂️ Unknown WebSocket event type:', event);
    }
  }, []);

  useEffect(() => {
    // Register listeners for this hook instance
    const connectionListener = (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        setConnectionError(null);
      }
    };

    const eventListener = (event: WebSocketEvent) => {
      setLastEvent(event);
      handleWebSocketEvent(event);
    };

    const errorListener = (error: string) => {
      setConnectionError(error);
    };

    connectionListeners.add(connectionListener);
    eventListeners.add(eventListener);
    errorListeners.add(errorListener);

    // Create or get existing global WebSocket
    createGlobalWebSocket();

    // Set initial state if already connected
    if (globalWebSocket?.readyState === WebSocket.OPEN) {
      setIsConnected(true);
    }

    console.log('🎯 WebSocket hook registered, total listeners:', {
      connection: connectionListeners.size,
      event: eventListeners.size,
      error: errorListeners.size
    });

    // Cleanup on unmount
    return () => {
      connectionListeners.delete(connectionListener);
      eventListeners.delete(eventListener);
      errorListeners.delete(errorListener);
      console.log('🧹 WebSocket hook unregistered, remaining listeners:', {
        connection: connectionListeners.size,
        event: eventListeners.size,
        error: errorListeners.size
      });
    };
  }, [handleWebSocketEvent]); // Added missing dependency

  const reconnect = () => {
    console.log('🔄 Manual reconnect requested');
    if (globalWebSocket) {
      globalWebSocket.close();
      globalWebSocket = null;
    }
    createGlobalWebSocket();
  };

  const handleNewTicketEvent = (event: NewTicketEvent) => {
    console.log('🎫 New ticket created:', {
      ticketNumber: event.ticket_number,
      counterId: event.counter_id
    });

    // Only trigger UI refresh - data should come from API calls
    // Remove localStorage manipulation to avoid duplicates
    window.dispatchEvent(new CustomEvent('counterQueueUpdated'));
    
    console.log('✅ Triggered UI refresh for new ticket');
  };

  const handleTicketCalledEvent = (event: TicketCalledEvent) => {
    console.log('📢 Ticket called via WebSocket:', {
      ticketNumber: event.ticket_number,
      counterName: event.counter_name,
      timestamp: event.timestamp
    });

    // Only trigger UI refresh - data should come from API calls
    // Remove localStorage manipulation to avoid conflicts with backend
    window.dispatchEvent(new CustomEvent('counterQueueUpdated'));
    
    // Dispatch TTS event với timestamp để queue đúng thứ tự
    window.dispatchEvent(new CustomEvent('ticketCalledWithTimestamp', {
      detail: {
        ticket_number: event.ticket_number,
        counter_name: event.counter_name,
        timestamp: event.timestamp
      }
    }));
    
    console.log('✅ Triggered UI refresh and TTS event for ticket called');
  };

  return {
    isConnected,
    connectionError,
    lastEvent,
    reconnect
  };
};

export default useWebSocketQueue;