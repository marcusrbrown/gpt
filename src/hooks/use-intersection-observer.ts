import {useEffect, useRef, useState} from 'react'

export interface UseIntersectionObserverOptions {
  threshold?: number | number[]
  root?: Element | null
  rootMargin?: string
  triggerOnce?: boolean
}

/**
 * Hook for observing element intersection with viewport for scroll-triggered animations.
 * Respects prefers-reduced-motion user preference by disabling animations when preferred.
 *
 * @param options - Intersection observer configuration
 * @returns Tuple of [ref to attach to element, isIntersecting state]
 */
export function useIntersectionObserver<T extends Element = HTMLDivElement>(
  options: UseIntersectionObserverOptions = {},
): [React.RefObject<T | null>, boolean] {
  const {threshold = 0.1, root = null, rootMargin = '0px', triggerOnce = true} = options

  const elementRef = useRef<T | null>(null)

  // Check if matchMedia is available (not available in test environments)
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  // Default to visible if IntersectionObserver or reduced motion
  const shouldBeVisible = typeof IntersectionObserver === 'undefined' || prefersReducedMotion
  const [isIntersecting, setIsIntersecting] = useState(shouldBeVisible)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Skip observer setup if not available or reduced motion is preferred
    if (shouldBeVisible) {
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsIntersecting(true)
            if (triggerOnce && observer) {
              observer.unobserve(entry.target)
            }
          } else if (!triggerOnce) {
            setIsIntersecting(false)
          }
        })
      },
      {threshold, root, rootMargin},
    )

    observer.observe(element)

    return () => {
      if (observer && element) {
        observer.unobserve(element)
      }
    }
  }, [threshold, root, rootMargin, triggerOnce, shouldBeVisible])

  return [elementRef, isIntersecting]
}
