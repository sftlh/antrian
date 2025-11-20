import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-this-in-production'

export interface JWTPayload {
  userId: string
  username: string
  email?: string
  name: string
  role: string
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    return null
  }
}

export function hashPassword(password: string): string {
  const bcrypt = require('bcryptjs')
  return bcrypt.hashSync(password, 10)
}

export function comparePassword(password: string, hashedPassword: string): boolean {
  const bcrypt = require('bcryptjs')
  return bcrypt.compareSync(password, hashedPassword)
}