import { useEffect, useRef } from 'react'

/** Focus containment for portalled sheets; the underlying app is inert while open. */
export function useDialogFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previous = useRef(document.activeElement as HTMLElement | null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const dialog = dialogRef.current
    const root = document.getElementById('root')
    if (!dialog) return
    const wasInert = root?.inert ?? false
    if (root) root.inert = true
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length > 0)
    const initial = dialog.querySelector<HTMLElement>('input, select, textarea') ?? focusable()[0] ?? dialog
    initial.focus()
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const elements = focusable(), first = elements[0], last = elements[elements.length - 1]
      if (!first || !last) { event.preventDefault(); dialog?.focus(); return }
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      if (root) root.inert = wasInert
      if (previous.current?.isConnected) previous.current.focus()
    }
  }, [])
  return dialogRef
}
