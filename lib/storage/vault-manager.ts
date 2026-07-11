// Vault Storage Management System
// Handles 500GB+ scalable storage with intelligent organization

export interface StorageFile {
  id: string
  name: string
  type: string
  size: number
  encrypted: boolean
  encryptionType?: string
  createdAt: number
  updatedAt: number
  path: string
  tags: string[]
  aiAnalyzed: boolean
  aiSummary?: string
}

export interface StorageStats {
  totalSize: number
  usedSize: number
  fileCount: number
  filesByType: Record<string, number>
  aiUsage: { analyzed: number; pending: number }
  optimization: {
    duplicates: number
    duplicateSize: number
    compressible: number
    compressibleSize: number
  }
}

export interface StorageQuota {
  tier: 'free' | 'pro' | 'enterprise'
  limitGB: number
  currentGB: number
  percentage: number
}

class VaultStorageManager {
  private files: Map<string, StorageFile> = new Map()
  private stats: StorageStats | null = null

  async getStorageStats(): Promise<StorageStats> {
    if (!this.stats) {
      const response = await fetch('/api/dabia/storage/stats')
      this.stats = (await response.json()).stats
    }
    return this.stats
  }

  async getQuota(): Promise<StorageQuota> {
    const response = await fetch('/api/dabia/storage/quota')
    return (await response.json()).quota
  }

  async uploadFile(file: File, path: string, encrypt: boolean = true): Promise<StorageFile> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', path)
    formData.append('encrypt', String(encrypt))

    const response = await fetch('/api/dabia/storage/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()
    const storageFile: StorageFile = {
      id: data.id,
      name: file.name,
      type: file.type,
      size: file.size,
      encrypted: encrypt,
      encryptionType: encrypt ? 'AES-256-GCM' : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      path,
      tags: [],
      aiAnalyzed: false,
    }

    this.files.set(storageFile.id, storageFile)
    this.stats = null // Invalidate cache
    return storageFile
  }

  async createFolder(name: string, path: string): Promise<{ id: string; path: string }> {
    const response = await fetch('/api/dabia/storage/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, path }),
    })
    return (await response.json()).folder
  }

  async scanFile(fileId: string): Promise<{ type: string; size: number; malware: boolean }> {
    const response = await fetch(`/api/dabia/storage/scan/${fileId}`, { method: 'POST' })
    return (await response.json()).scan
  }

  async getFilesByType(type: string): Promise<StorageFile[]> {
    return Array.from(this.files.values()).filter(f => f.type === type)
  }

  async optimizeStorage(): Promise<{
    duplicatesRemoved: number
    spaceFreed: number
    compressed: number
  }> {
    const response = await fetch('/api/dabia/storage/optimize', { method: 'POST' })
    const result = await response.json()
    this.stats = null // Invalidate cache
    return result.optimization
  }

  async deleteFile(fileId: string, permanent: boolean = false): Promise<void> {
    await fetch(`/api/dabia/storage/delete/${fileId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permanent }),
    })
    this.files.delete(fileId)
    this.stats = null
  }

  async shareFile(fileId: string, recipientId: string, permissions: string[]): Promise<string> {
    const response = await fetch('/api/dabia/storage/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, recipientId, permissions }),
    })
    const data = await response.json()
    return data.shareToken
  }

  async getEncryptionStatus(fileId: string): Promise<{
    encrypted: boolean
    algorithm: string
    keyRotationDue: boolean
    securityScore: number
  }> {
    const response = await fetch(`/api/dabia/storage/encryption/${fileId}`)
    return (await response.json()).status
  }

  getLocalFiles(): StorageFile[] {
    return Array.from(this.files.values())
  }

  addLocalFile(file: StorageFile): void {
    this.files.set(file.id, file)
  }
}

export const vaultStorageManager = new VaultStorageManager()
