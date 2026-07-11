// Zero Knowledge Encryption System with Smart Recovery
// Client-side encryption ensures data privacy even from servers

interface EncryptionKey {
  id: string
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305'
  created: number
  rotationSchedule?: number
}

interface EncryptedData {
  ciphertext: string
  iv: string
  tag: string
  algorithm: string
  keyVersion: string
}

interface VersionSnapshot {
  id: string
  timestamp: number
  hash: string
  size: number
  metadata: Record<string, any>
}

export class ZeroKnowledgeEncryption {
  private key: CryptoKey | null = null
  private keyVersion: string = '1'
  private versionHistory: Map<string, VersionSnapshot> = new Map()

  async initializeKey(password: string): Promise<void> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    
    this.key = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    )
  }

  async encrypt(plaintext: string): Promise<EncryptedData> {
    if (!this.key) throw new Error('Encryption key not initialized')

    const encoder = new TextEncoder()
    const data = encoder.encode(plaintext)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key,
      data
    )

    const encryptedArray = new Uint8Array(encryptedData)
    const tag = encryptedArray.slice(-16)
    const ciphertext = encryptedArray.slice(0, -16)

    return {
      ciphertext: this.arrayToBase64(ciphertext),
      iv: this.arrayToBase64(iv),
      tag: this.arrayToBase64(tag),
      algorithm: 'AES-256-GCM',
      keyVersion: this.keyVersion,
    }
  }

  async decrypt(encrypted: EncryptedData): Promise<string> {
    if (!this.key) throw new Error('Encryption key not initialized')

    const iv = this.base64ToArray(encrypted.iv)
    const ciphertext = this.base64ToArray(encrypted.ciphertext)
    const tag = this.base64ToArray(encrypted.tag)
    const data = new Uint8Array([...ciphertext, ...tag])

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.key,
      data
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedData)
  }

  recordVersion(fileId: string, hash: string, size: number, metadata?: Record<string, any>): void {
    const snapshot: VersionSnapshot = {
      id: `${fileId}-v${Date.now()}`,
      timestamp: Date.now(),
      hash,
      size,
      metadata: metadata || {},
    }
    this.versionHistory.set(snapshot.id, snapshot)
  }

  getVersionHistory(fileId: string): VersionSnapshot[] {
    return Array.from(this.versionHistory.values())
      .filter(v => v.id.startsWith(fileId))
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  private arrayToBase64(array: Uint8Array): string {
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
  }

  private base64ToArray(base64: string): Uint8Array {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }

  getEncryptionStatus(): { algorithm: string; keyVersion: string; rotationDue: boolean } {
    return {
      algorithm: 'AES-256-GCM',
      keyVersion: this.keyVersion,
      rotationDue: Date.now() - (parseInt(this.keyVersion) * 90 * 24 * 60 * 60 * 1000) > 0,
    }
  }
}

export const zeroKnowledgeEncryption = new ZeroKnowledgeEncryption()
