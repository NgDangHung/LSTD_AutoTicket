// libs/counterStatus.ts
export type CounterStatus = 'active' | 'paused';

interface CounterStatusData {
  id: string;
  status: CounterStatus;
  pauseReason?: string;
  pausedAt?: string;
}

class CounterStatusManager {
  private readonly STORAGE_KEY = 'counter_status_data';

  // Get all counter statuses
  getAllStatuses(): Record<string, CounterStatusData> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading counter status:', error);
      return {};
    }
  }

  // Get specific counter status
  getCounterStatus(counterId: string): CounterStatusData {
    const allStatuses = this.getAllStatuses();
    return allStatuses[counterId] || {
      id: counterId,
      status: 'active'
    };
  }

  // Update counter status
  updateCounterStatus(counterId: string, status: CounterStatus, reason?: string): void {
    const allStatuses = this.getAllStatuses();
    
    allStatuses[counterId] = {
      id: counterId,
      status,
      pauseReason: status === 'paused' ? reason : undefined,
      pausedAt: status === 'paused' ? new Date().toISOString() : undefined
    };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allStatuses));
      
      // Dispatch custom event for real-time updates
      window.dispatchEvent(new CustomEvent('counterStatusUpdated', {
        detail: { counterId, status, reason }
      }));
    } catch (error) {
      console.error('Error saving counter status:', error);
    }
  }

  // Pause counter
  pauseCounter(counterId: string, reason: string): void {
    this.updateCounterStatus(counterId, 'paused', reason);
  }

  // Resume counter
  resumeCounter(counterId: string): void {
    this.updateCounterStatus(counterId, 'active');
  }

  // Check if counter is paused
  isCounterPaused(counterId: string): boolean {
    return this.getCounterStatus(counterId).status === 'paused';
  }

  // Clear all counter statuses
  clearAllStatuses(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('counterStatusUpdated'));
    } catch (error) {
      console.error('Error clearing counter statuses:', error);
    }
  }
}

export const counterStatusManager = new CounterStatusManager();
