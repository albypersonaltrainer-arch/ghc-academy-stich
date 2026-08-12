'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

function protectMedia(root: ParentNode) {
  root.querySelectorAll<HTMLMediaElement>('video, audio').forEach((media) => {
    media.setAttribute('controlsList', 'nodownload')
    media.setAttribute('disablepictureinpicture', '')
    media.setAttribute('oncontextmenu', 'return false;')
  })
}

export default function AcademyMediaGuard() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith('/preventa') || pathname === '/legal') return

    protectMedia(document)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof Element)) continue
          if (node.matches('video, audio')) protectMedia(node.parentNode || document)
          else protectMedia(node)
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [pathname])

  return null
}
