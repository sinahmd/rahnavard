import type { ReactNode } from 'react'

/**
 * Form action bar shared by AdminForm and the settings page. On mobile it is
 * a sticky full-width bar pinned to the viewport bottom (with safe-area
 * padding); at md+ it becomes a plain right-aligned inline row — the exact
 * behavior both forms shipped with, extracted so the responsive classes have
 * one home.
 *
 * The negative margins (-mx-4) deliberately bleed through the shell's `p-4`
 * content padding so the bar spans the full card width on phones; the shell
 * steps to `md:p-6` exactly where this component switches to static layout,
 * so the bleed is scoped to mobile only.
 */
export default function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 md:mx-0 mt-6 md:mt-0 md:static bg-white/95 md:bg-transparent backdrop-blur border-t md:border-0 border-gray-200 px-4 md:px-0 py-3 md:py-0 md:flex md:gap-4 md:justify-end pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  )
}
