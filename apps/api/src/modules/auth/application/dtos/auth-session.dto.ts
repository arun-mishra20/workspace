/**
 * AuthSession DTO
 *
 * Anemic model - simple data holder
 * All business logic moved to services
 */
export class AuthSessionDto {
  id: string
  userId: string
  token: string
  expiresAt: Date
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date

  constructor(data: {
    id: string
    userId: string
    token: string
    expiresAt: Date
    ipAddress: string | null
    userAgent: string | null
    createdAt: Date
  }) {
    this.id = data.id
    this.userId = data.userId
    this.token = data.token
    this.expiresAt = data.expiresAt
    this.ipAddress = data.ipAddress
    this.userAgent = data.userAgent
    this.createdAt = data.createdAt
  }

  /**
   * Check if session is valid (not expired)
   */
  get isValid(): boolean {
    return this.expiresAt > new Date()
  }

  /**
   * Check if session is expired
   */
  get isExpired(): boolean {
    return this.expiresAt <= new Date()
  }
}
