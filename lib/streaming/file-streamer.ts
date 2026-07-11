// Instant File Streaming Engine
// High-performance file transfer with chunking and progress tracking

export interface StreamSession {
  id: string
  fileId: string
  startedAt: number
  completedAt?: number
  status: 'active' | 'paused' | 'completed' | 'failed'
  bytesTransferred: number
  totalBytes: number
  chunkSize: number
  chunks: ChunkInfo[]
}

export interface ChunkInfo {
  index: number
  startByte: number
  endByte: number
  hash: string
  status: 'pending' | 'transferred' | 'verified'
  attempts: number
}

class InstantFileStreamer {
  private sessions: Map<string, StreamSession> = new Map()
  private readonly defaultChunkSize = 1024 * 1024 // 1MB chunks

  async startStream(fileId: string, totalBytes: number): Promise<StreamSession> {
    const session: StreamSession = {
      id: `stream-${Date.now()}`,
      fileId,
      startedAt: Date.now(),
      status: 'active',
      bytesTransferred: 0,
      totalBytes,
      chunkSize: this.defaultChunkSize,
      chunks: this.createChunks(totalBytes),
    }

    this.sessions.set(session.id, session)
    return session
  }

  async uploadChunk(
    sessionId: string,
    chunkIndex: number,
    data: ArrayBuffer
  ): Promise<{ success: boolean; verified: boolean }> {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Session not found')

    const chunk = session.chunks[chunkIndex]
    if (!chunk) throw new Error('Invalid chunk index')

    try {
      // Calculate hash for integrity verification
      const hash = await this.calculateHash(data)
      
      // Upload chunk
      const response = await fetch('/api/dabia/streaming/chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Session-ID': sessionId,
          'X-Chunk-Index': String(chunkIndex),
          'X-Chunk-Hash': hash,
        },
        body: data,
      })

      if (response.ok) {
        chunk.status = 'verified'
        chunk.hash = hash
        session.bytesTransferred += data.byteLength
        return { success: true, verified: true }
      }

      chunk.attempts++
      return { success: false, verified: false }
    } catch (error) {
      chunk.attempts++
      throw error
    }
  }

  async downloadChunk(sessionId: string, chunkIndex: number): Promise<ArrayBuffer> {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Session not found')

    const response = await fetch(`/api/dabia/streaming/chunk/${sessionId}/${chunkIndex}`)
    return await response.arrayBuffer()
  }

  async completeStream(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Session not found')

    // Verify all chunks
    const allVerified = session.chunks.every(c => c.status === 'verified')
    if (!allVerified) return false

    session.status = 'completed'
    session.completedAt = Date.now()
    return true
  }

  pauseStream(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) session.status = 'paused'
  }

  resumeStream(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) session.status = 'active'
  }

  getProgress(sessionId: string): number {
    const session = this.sessions.get(sessionId)
    if (!session) return 0
    return (session.bytesTransferred / session.totalBytes) * 100
  }

  private createChunks(totalBytes: number): ChunkInfo[] {
    const chunks: ChunkInfo[] = []
    let startByte = 0
    let index = 0

    while (startByte < totalBytes) {
      const endByte = Math.min(startByte + this.defaultChunkSize, totalBytes)
      chunks.push({
        index,
        startByte,
        endByte,
        hash: '',
        status: 'pending',
        attempts: 0,
      })
      startByte = endByte
      index++
    }

    return chunks
  }

  private async calculateHash(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}

export const instantFileStreamer = new InstantFileStreamer()
