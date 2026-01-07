'use client'

/**
 * Table of Contents Component
 * 
 * A calm, editorial TOC that sits like a book margin note.
 * Features:
 * - Sticky positioning on desktop
 * - Collapsible on mobile
 * - Active section highlighting via IntersectionObserver
 * - Hidden if fewer than 2 headings
 */

import { useState, useEffect, useCallback } from 'react'
import type { TocHeading } from '@/lib/toc'

interface TableOfContentsProps {
  headings: TocHeading[]
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)

  // Track active section with IntersectionObserver
  useEffect(() => {
    // Skip if fewer than 2 headings
    if (headings.length < 2) return

    const headingElements = headings
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    if (headingElements.length === 0) return

    // Set initial active to first heading
    if (headingElements[0]) {
      setActiveId(headings[0].id)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first heading that's visible
        const visibleEntries = entries.filter(entry => entry.isIntersecting)
        
        if (visibleEntries.length > 0) {
          // Sort by their position in the document
          const sorted = visibleEntries.sort((a, b) => {
            const aIndex = headingElements.indexOf(a.target as HTMLElement)
            const bIndex = headingElements.indexOf(b.target as HTMLElement)
            return aIndex - bIndex
          })
          setActiveId(sorted[0].target.id)
        } else {
          // If no heading is visible, find the one we just passed
          const scrollY = window.scrollY
          let lastPassedHeading = headings[0]?.id || ''
          
          for (const heading of headingElements) {
            const rect = heading.getBoundingClientRect()
            const absoluteTop = rect.top + scrollY
            
            // If heading is above viewport center
            if (absoluteTop < scrollY + window.innerHeight * 0.3) {
              lastPassedHeading = heading.id
            }
          }
          
          if (lastPassedHeading) {
            setActiveId(lastPassedHeading)
          }
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: [0, 0.5, 1]
      }
    )

    headingElements.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [headings])

  // Handle smooth scroll to heading
  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id)
    if (element) {
      // Account for sticky header
      const headerOffset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.scrollY - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })

      // Close mobile menu after click
      setIsOpen(false)
    }
  }, [])

  // Don't render if fewer than 2 headings
  if (headings.length < 2) {
    return null
  }

  return (
    <>
      {/* Mobile: Collapsible TOC */}
      <nav className="toc-mobile" aria-label="Table of contents">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="toc-mobile-toggle"
          aria-expanded={isOpen}
        >
          <span className="toc-mobile-label">Contents</span>
          <svg
            className={`toc-mobile-icon ${isOpen ? 'toc-mobile-icon-open' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
        
        {isOpen && (
          <ul className="toc-mobile-list">
            {headings.map(({ id, text, level }) => (
              <li key={id} className="toc-mobile-item">
                <button
                  onClick={() => scrollToHeading(id)}
                  className={`toc-mobile-link ${level === 3 ? 'toc-mobile-link-nested' : ''} ${level === 4 ? 'toc-mobile-link-deep' : ''} ${activeId === id ? 'toc-mobile-link-active' : ''}`}
                >
                  {text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* Desktop: Sticky sidebar TOC */}
      <nav className="toc-desktop" aria-label="Table of contents">
        <div className="toc-desktop-label">On this page</div>
        <ul className="toc-desktop-list">
          {headings.map(({ id, text, level }) => (
            <li key={id} className="toc-desktop-item">
              <button
                onClick={() => scrollToHeading(id)}
                className={`toc-desktop-link ${level === 3 ? 'toc-desktop-link-nested' : ''} ${level === 4 ? 'toc-desktop-link-deep' : ''} ${activeId === id ? 'toc-desktop-link-active' : ''}`}
              >
                {text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
