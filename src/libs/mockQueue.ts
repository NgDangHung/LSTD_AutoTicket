// Mock queue management for local storage
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

const QUEUE_STORAGE_KEY = 'kiosk_queue_data';

export class MockQueueManager {
  private static getQueueData(): QueueItem[] {
    if (typeof window === 'undefined') return [];
    
    const data = localStorage.getItem(QUEUE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private static saveQueueData(queue: QueueItem[]): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('queueUpdated', { detail: queue }));
  }

  static addToQueue(queueItem: Omit<QueueItem, 'id'>): QueueItem {
    const queue = this.getQueueData();
    const newItem: QueueItem = {
      ...queueItem,
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    queue.push(newItem);
    this.saveQueueData(queue);
    
    console.log('✅ Added to queue:', newItem);
    
    return newItem;
  }

  static getQueue(): QueueItem[] {
    return this.getQueueData();
  }

  static getQueueByStatus(status: QueueItem['status']): QueueItem[] {
    return this.getQueueData().filter(item => item.status === status);
  }

  static getCurrentServing(): QueueItem[] {
    return this.getQueueData().filter(item => item.status === 'serving');
  }

  static updateQueueStatus(id: string, status: QueueItem['status']): void {
    const queue = this.getQueueData();
    const index = queue.findIndex(item => item.id === id);
    
    if (index !== -1) {
      queue[index].status = status;
      
      if (status === 'calling') {
        queue[index].calledAt = new Date().toISOString();
      } else if (status === 'completed') {
        queue[index].completedAt = new Date().toISOString();
      }
      
      this.saveQueueData(queue);
    }
  }

  static clearQueue(): void {
    this.saveQueueData([]);
  }

  static getStats() {
    const queue = this.getQueueData();
    
    return {
      totalWaiting: queue.filter(item => item.status === 'waiting').length,
      totalServing: queue.filter(item => item.status === 'serving').length,
      totalCompleted: queue.filter(item => item.status === 'completed').length,
      averageWaitTime: 15, // Mock value
      averageServiceTime: 10 // Mock value
    };
  }
}
