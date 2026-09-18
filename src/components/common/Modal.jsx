import { useEffect } from 'react'
import { X } from 'lucide-react'

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Box */}
      <div
        className={`relative w-full ${maxWidth} bg-white rounded-lg shadow-2xl border border-stone-200 z-10 overflow-hidden transform transition-all my-8`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/70">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900 tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-stone-500 mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-200/60 transition-colors focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(85vh-120px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
