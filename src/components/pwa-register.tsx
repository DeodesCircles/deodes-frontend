'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Registers the service worker and handles PWA install prompts
 */
export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const cleanup: (() => void)[] = []

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        // Check for updates periodically
        const interval = setInterval(() => {
          registration.update()
        }, 60000)
        cleanup.push(() => clearInterval(interval))
      }).catch(() => {})
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (event: Event) => {
      const e = event as BeforeInstallPromptEvent
      e.preventDefault()
      setInstallPrompt(e)
    }

    // Check if app is already installed
    const handleAppInstalled = () => {
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      for (const fn of cleanup) fn()
    }
  }, [])

  // Make install prompt available globally for UI components
  useEffect(() => {
    if (installPrompt) {
      window.dispatchEvent(new CustomEvent('pwa:install-available', { detail: { prompt: installPrompt } }))
    }
  }, [installPrompt])

  return null
}
