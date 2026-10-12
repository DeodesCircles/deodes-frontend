"use client"

import { useCallback, useEffect, useState } from "react"

interface IntersectionObserverOptions {
  root?: Element | Document | null
  rootMargin?: string
  threshold?: number | number[]
}

export function useIntersectionObserver(options?: IntersectionObserverOptions) {
  const [node, setNode] = useState<Element | null>(null)
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  const ref = useCallback((element: Element | null) => {
    setNode(element)
  }, [])

  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      ([nextEntry]) => setEntry(nextEntry ?? null),
      options,
    )
    observer.observe(node)

    return () => observer.disconnect()
  }, [node, options?.root, options?.rootMargin, options?.threshold])

  return {
    ref,
    entry,
    isIntersecting: entry?.isIntersecting ?? false,
  }
}
