import { ReactNode } from 'react'

interface PaperProps {
  children: ReactNode
  className?: string
  hover?: boolean
  fold?: boolean
  texture?: boolean
}

/**
 * Paper Component
 * 
 * A reusable tactile paper container with:
 * - Subtle grain texture (CSS-based)
 * - Optional folded corner effect
 * - Gentle hover elevation
 * - Literary, calm aesthetic
 */
export default function Paper({ 
  children, 
  className = '', 
  hover = true,
  fold = false,
  texture = true,
}: PaperProps) {
  return (
    <div
      className={`
        paper-card
        ${hover ? '' : 'hover:transform-none hover:shadow-none'}
        ${className}
      `.trim()}
    >
      {/* Paper texture overlay */}
      {texture && <div className="paper-texture" aria-hidden="true" />}
      
      {/* Folded corner effect */}
      {fold && (
        <>
          <div className="paper-fold" aria-hidden="true" />
          <div className="paper-fold-shadow" aria-hidden="true" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
