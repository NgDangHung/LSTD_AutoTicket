// Counter-based queue management for local storage
export interface QueueItem {
  id: string;
  number: string;
  serviceId: string;
  serviceName: string;
  counterId: string;
  counterName: string;
  status: 'waiting' | 'calling' | 'serving' | 'completed' | 'skipped' | 'no_show';
  priority: number;
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
  estimatedWaitTime: number;
}

export interface QueuesByCounter {
  [counterId: string]: QueueItem[];
}

export interface CounterInfo {
  id: string;
  name: string;
  shortName: string; // e.g., "QUẦY 1", "QUẦY 2"
  isActive: boolean;
}

const COUNTER_QUEUE_STORAGE_KEY = 'counter_queue_data';
const COUNTER_INFO_STORAGE_KEY = 'counter_info_data';

// Default counter configuration
const DEFAULT_COUNTERS: CounterInfo[] = [
  { id: '1', name: 'Tư pháp', shortName: 'QUẦY 1', isActive: true },
  { id: '2', name: 'Kinh tế - Hạ tầng - Đô Thị', shortName: 'QUẦY 2', isActive: true },
  { id: '3', name: 'Văn phòng đăng ký đất đai', shortName: 'QUẦY 3', isActive: true },
  { id: '4', name: 'Văn hóa - Xã hội', shortName: 'QUẦY 4', isActive: true }
];

export class CounterQueueManager {
  private static getCounterQueues(): QueuesByCounter {
    if (typeof window === 'undefined') return {};
    
    const data = localStorage.getItem(COUNTER_QUEUE_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }

  private static saveCounterQueues(queues: QueuesByCounter): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(COUNTER_QUEUE_STORAGE_KEY, JSON.stringify(queues));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('counterQueueUpdated', { detail: queues }));
  }

  private static getCounterInfoData(): CounterInfo[] {
    if (typeof window === 'undefined') return DEFAULT_COUNTERS;
    
    const data = localStorage.getItem(COUNTER_INFO_STORAGE_KEY);
    return data ? JSON.parse(data) : DEFAULT_COUNTERS;
  }

  private static saveCounterInfo(counters: CounterInfo[]): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(COUNTER_INFO_STORAGE_KEY, JSON.stringify(counters));
  }

  // Initialize default data if not exists
  static initializeCounters(): void {
    const counters = this.getCounterInfoData();
    if (counters.length === 0) {
      this.saveCounterInfo(DEFAULT_COUNTERS);
    }
  }

  // Add queue item to specific counter
  static addToCounterQueue(counterId: string, queueItem: Omit<QueueItem, 'id'>): QueueItem {
    const queues = this.getCounterQueues();
    
    if (!queues[counterId]) {
      queues[counterId] = [];
    }
    
    const newItem: QueueItem = {
      ...queueItem,
      id: `queue_${counterId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    queues[counterId].push(newItem);
    this.saveCounterQueues(queues);
    
    console.log('✅ Added to counter queue:', counterId, newItem);
    
    return newItem;
  }

  // Get queue for specific counter
  static getQueueForCounter(counterId: string): QueueItem[] {
    const queues = this.getCounterQueues();
    return queues[counterId] || [];
  }

  // Get all counter queues
  static getAllCounterQueues(): QueuesByCounter {
    return this.getCounterQueues();
  }

  // Get queue by status for specific counter
  static getQueueByStatusForCounter(counterId: string, status: QueueItem['status']): QueueItem[] {
    return this.getQueueForCounter(counterId)
      .filter(item => item.status === status)
      .sort((a, b) => {
        // Priority first, then creation time
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }

  // Get next queue item for counter (for officer)
  static getNextForCounter(counterId: string): QueueItem | null {
    const waitingQueue = this.getQueueByStatusForCounter(counterId, 'waiting');
    return waitingQueue[0] || null;
  }

  // Get all serving queues across all counters
  static getAllServingQueues(): QueueItem[] {
    const queues = this.getCounterQueues();
    const servingQueues: QueueItem[] = [];
    
    Object.values(queues).forEach(counterQueue => {
      const serving = counterQueue.filter(item => item.status === 'serving');
      servingQueues.push(...serving);
    });
    
    return servingQueues.sort((a, b) => 
      new Date(a.calledAt || a.createdAt).getTime() - new Date(b.calledAt || b.createdAt).getTime()
    );
  }

  // Get all waiting queues across all counters
  static getAllWaitingQueues(): QueueItem[] {
    const queues = this.getCounterQueues();
    const waitingQueues: QueueItem[] = [];
    
    Object.values(queues).forEach(counterQueue => {
      const waiting = counterQueue.filter(item => item.status === 'waiting');
      waitingQueues.push(...waiting);
    });
    
    return waitingQueues.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  // Update queue status
  static updateQueueStatus(queueId: string, status: QueueItem['status']): void {
    const queues = this.getCounterQueues();
    
    // Find the queue item across all counters
    for (const counterId in queues) {
      const counterQueue = queues[counterId];
      const index = counterQueue.findIndex(item => item.id === queueId);
      
      if (index !== -1) {
        counterQueue[index].status = status;
        
        if (status === 'calling') {
          counterQueue[index].calledAt = new Date().toISOString();
        } else if (status === 'completed') {
          counterQueue[index].completedAt = new Date().toISOString();
        }
        
        this.saveCounterQueues(queues);
        break;
      }
    }
  }

  // Accept next in queue for a counter (move from waiting to serving)
  static acceptNextInQueue(counterId: string): boolean {
    const queues = this.getCounterQueues();
    const counterQueue = queues[counterId] || [];
    
    // Find the next waiting item
    const nextWaiting = counterQueue.find(item => item.status === 'waiting');
    if (!nextWaiting) {
      return false; // No waiting items
    }
    
    // Update status to serving
    const index = counterQueue.findIndex(item => item.id === nextWaiting.id);
    counterQueue[index].status = 'serving';
    counterQueue[index].calledAt = new Date().toISOString();
    
    this.saveCounterQueues(queues);
    
    // Dispatch event for real-time updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('counterQueueUpdated', {
        detail: {
          action: 'accepted',
          counterId,
          queueItem: counterQueue[index]
        }
      }));
    }
    
    return true;
  }

  // Mark current serving as completed
  static markCurrentAsCompleted(counterId: string): boolean {
    const queues = this.getCounterQueues();
    const counterQueue = queues[counterId] || [];
    
    // Find the serving item
    const servingItem = counterQueue.find(item => item.status === 'serving');
    if (!servingItem) {
      return false; // No serving items
    }
    
    // Update status to completed
    const index = counterQueue.findIndex(item => item.id === servingItem.id);
    counterQueue[index].status = 'completed';
    counterQueue[index].completedAt = new Date().toISOString();
    
    this.saveCounterQueues(queues);
    
    // Dispatch event for real-time updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('counterQueueUpdated', {
        detail: {
          action: 'completed',
          counterId,
          queueItem: counterQueue[index]
        }
      }));
    }
    
    return true;
  }

  // Get counter info
  static getCounterInfo(): CounterInfo[] {
    return this.getCounterInfoData();
  }

  // Get stats for all counters
  static getStats() {
    const queues = this.getCounterQueues();
    let totalWaiting = 0;
    let totalServing = 0;
    let totalCompleted = 0;
    
    Object.values(queues).forEach(counterQueue => {
      totalWaiting += counterQueue.filter(item => item.status === 'waiting').length;
      totalServing += counterQueue.filter(item => item.status === 'serving').length;
      totalCompleted += counterQueue.filter(item => item.status === 'completed').length;
    });
    
    return {
      totalWaiting,
      totalServing,
      totalCompleted,
      averageWaitTime: 15, // Mock value
      averageServiceTime: 10 // Mock value
    };
  }

  // Clear all queues
  static clearAllQueues(): void {
    this.saveCounterQueues({});
  }

  // Clear queue for specific counter
  static clearCounterQueue(counterId: string): void {
    const queues = this.getCounterQueues();
    delete queues[counterId];
    this.saveCounterQueues(queues);
  }

  // Get queues grouped by counter for display
  static getQueuesGroupedByCounter(): Array<{
    counter: CounterInfo;
    serving: QueueItem[];
    waiting: QueueItem[];
  }> {
    const counters = this.getCounterInfoData();
    const queues = this.getCounterQueues();
    
    return counters
      .filter(counter => counter.isActive)
      .map(counter => ({
        counter,
        serving: this.getQueueByStatusForCounter(counter.id, 'serving'),
        waiting: this.getQueueByStatusForCounter(counter.id, 'waiting')
      }));
  }
}

// Initialize counters on module load
if (typeof window !== 'undefined') {
  CounterQueueManager.initializeCounters();
}
