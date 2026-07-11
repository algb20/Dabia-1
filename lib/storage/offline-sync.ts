// Offline Mode with Delayed Sync
// Queues operations when offline and syncs when connection restored

export interface SyncOperation {
  id: string
  type: 'upload' | 'delete' | 'update' | 'share'
  payload: any
  timestamp: number
  status: 'pending' | 'synced' | 'failed'
  retries: number
}

class OfflineSyncManager {
  private queue: SyncOperation[] = []
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  private syncInProgress = false

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline())
      window.addEventListener('offline', () => this.handleOffline())
    }
  }

  private handleOnline(): void {
    this.isOnline = true
    this.processSyncQueue()
  }

  private handleOffline(): void {
    this.isOnline = false
  }

  queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status' | 'retries'>): string {
    const op: SyncOperation = {
      ...operation,
      id: `sync-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    }
    this.queue.push(op)
    this.saveToLocalStorage()
    if (this.isOnline) {
      this.processSyncQueue()
    }
    return op.id
  }

  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return

    this.syncInProgress = true
    const pending = this.queue.filter(op => op.status === 'pending')

    for (const op of pending) {
      try {
        const response = await fetch('/api/dabia/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op),
        })

        if (response.ok) {
          op.status = 'synced'
        } else if (response.status === 429 || response.status >= 500) {
          op.retries++
          if (op.retries < 3) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, op.retries) * 1000))
          }
        } else {
          op.status = 'failed'
        }
      } catch (error) {
        op.retries++
        if (op.retries >= 3) {
          op.status = 'failed'
        }
      }
    }

    this.saveToLocalStorage()
    this.syncInProgress = false
  }

  private saveToLocalStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dabia-sync-queue', JSON.stringify(this.queue))
    }
  }

  loadFromLocalStorage(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('dabia-sync-queue')
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    }
  }

  getQueueStatus() {
    const pending = this.queue.filter(op => op.status === 'pending').length
    const synced = this.queue.filter(op => op.status === 'synced').length
    const failed = this.queue.filter(op => op.status === 'failed').length
    return { pending, synced, failed, isOnline: this.isOnline }
  }

  clearQueue(): void {
    this.queue = this.queue.filter(op => op.status !== 'synced')
    this.saveToLocalStorage()
  }
}

export const offlineSyncManager = new OfflineSyncManager()
offlineSyncManager.loadFromLocalStorage()
