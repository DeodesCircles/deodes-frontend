/**
 * #207: Centralized CSRF/Origin Protection for State-Changing Routes
 * 
 * Validates origin and enforces CSRF token for all mutating API routes
 */

import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'https://moistello.com',
  'http://localhost:3000',
  'http://localhost:3001',
]

const MUTATING_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']

/**
 * Check if request origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith(allowed))
}

/**
 * Verify CSRF token from request
 */
export function verifyCsrfToken(req: NextRequest): boolean {
  const csrfCookie = req.cookies.get('csrf-token')?.value
  const csrfHeader = req.headers.get('x-csrf-token')
  
  if (!csrfCookie || !csrfHeader) return false
  return csrfCookie === csrfHeader
}

/**
 * CSRF middleware for protecting state-changing routes
 */
export function csrfProtection(req: NextRequest): NextResponse | null {
  // Only check mutating methods
  if (!MUTATING_METHODS.includes(req.method)) {
    return null
  }

  // Check origin
  const origin = req.headers.get('origin')
  if (!isOriginAllowed(origin)) {
    return NextResponse.json(
      { error: 'Invalid origin' },
      { status: 403 }
    )
  }

  // Verify CSRF token
  if (!verifyCsrfToken(req)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }

  return null
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}
