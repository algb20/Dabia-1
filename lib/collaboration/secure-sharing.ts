// Secure Collaboration System
// Manage sharing permissions, access control, and audit trails

export interface CollaborationUser {
  id: string
  email: string
  name: string
  role: 'owner' | 'editor' | 'viewer'
  addedAt: number
  lastAccessed?: number
  permissions: Permission[]
}

export interface Permission {
  fileId: string
  action: 'read' | 'write' | 'delete' | 'share'
  granted: boolean
  grantedBy: string
  grantedAt: number
  expiresAt?: number
}

export interface ShareToken {
  token: string
  fileId: string
  createdBy: string
  createdAt: number
  expiresAt?: number
  accessCount: number
  maxAccess?: number
  password?: string
}

export interface CollaborationAuditLog {
  id: string
  fileId: string
  userId: string
  action: 'shared' | 'accessed' | 'modified' | 'permission_changed' | 'deleted'
  timestamp: number
  metadata: Record<string, any>
}

class SecureCollaborationManager {
  private collaborators: Map<string, CollaborationUser> = new Map()
  private shareTokens: Map<string, ShareToken> = new Map()
  private auditLogs: CollaborationAuditLog[] = []

  async addCollaborator(
    fileId: string,
    email: string,
    role: 'editor' | 'viewer' = 'viewer'
  ): Promise<CollaborationUser> {
    const userId = `user-${Date.now()}`
    const collaborator: CollaborationUser = {
      id: userId,
      email,
      name: email.split('@')[0],
      role,
      addedAt: Date.now(),
      permissions: [
        {
          fileId,
          action: role === 'editor' ? 'write' : 'read',
          granted: true,
          grantedBy: 'owner',
          grantedAt: Date.now(),
        },
      ],
    }

    this.collaborators.set(userId, collaborator)
    this.logAction(fileId, userId, 'shared', { email, role })

    // Send notification
    await this.notifyCollaborator(email, fileId, role)
    return collaborator
  }

  async createShareLink(
    fileId: string,
    options: {
      expiresIn?: number
      password?: string
      maxAccess?: number
    } = {}
  ): Promise<ShareToken> {
    const token = this.generateToken()
    const shareToken: ShareToken = {
      token,
      fileId,
      createdBy: 'owner',
      createdAt: Date.now(),
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined,
      accessCount: 0,
      maxAccess: options.maxAccess,
      password: options.password,
    }

    this.shareTokens.set(token, shareToken)
    return shareToken
  }

  async revokeAccess(fileId: string, userId: string): Promise<boolean> {
    const collaborator = this.collaborators.get(userId)
    if (!collaborator) return false

    collaborator.permissions = collaborator.permissions.filter(p => p.fileId !== fileId)
    this.logAction(fileId, userId, 'permission_changed', { action: 'revoked' })

    return true
  }

  async getAuditLog(fileId: string): Promise<CollaborationAuditLog[]> {
    return this.auditLogs.filter(log => log.fileId === fileId)
  }

  private logAction(
    fileId: string,
    userId: string,
    action: CollaborationAuditLog['action'],
    metadata: Record<string, any> = {}
  ): void {
    const log: CollaborationAuditLog = {
      id: `audit-${Date.now()}`,
      fileId,
      userId,
      action,
      timestamp: Date.now(),
      metadata,
    }
    this.auditLogs.push(log)
  }

  private async notifyCollaborator(email: string, fileId: string, role: string): Promise<void> {
    // Send notification via API
    await fetch('/api/dabia/collaboration/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fileId, role }),
    })
  }

  private generateToken(): string {
    return btoa(Math.random().toString(36).substring(2) + Date.now().toString(36))
  }

  getCollaborators(fileId: string): CollaborationUser[] {
    return Array.from(this.collaborators.values()).filter(c =>
      c.permissions.some(p => p.fileId === fileId)
    )
  }
}

export const secureCollaborationManager = new SecureCollaborationManager()
