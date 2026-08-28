"use client";

import { useState } from "react";

interface TabsProps {
  /** Labels for each tab, in order. */
  labels: string[];
  /** Default index (0‑based). */
  defaultIndex?: number;
  /** Children – each child corresponds to a tab panel. */
  children: React.ReactNode[];
  /** Optional className for the wrapper. */
  className?: string;
}

/**
 * Minimal, reusable Tabs component.
 *
 * Uses plain React state and Tailwind classes already present in the
 * project design system (no extra dependencies). Works well inside
 * Server or Client components; the parent can render this client
 * component and pass static children.
 */
export default function Tabs({
  labels,
  defaultIndex = 0,
  children,
  className = "",
}: TabsProps) {
  const [active, setActive] = useState<number>(defaultIndex);

  // Dev‑time safety: warn if children count does not match labels
  if (process.env.NODE_ENV !== "production") {
    if (children.length !== labels.length) {
      // eslint-disable-next-line no-console
      console.warn(
        "Tabs: number of children must match number of labels",
        { labels, childrenCount: children.length }
      );
    }
  }

  return (
    <div className={className}>
      <div className="flex border-b border-gray-200 overflow-x-auto" role="tablist">
        {labels.map((label, idx) => {
          const isActive = active === idx;
          return (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(idx)}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "border-b-2 border-accent-dark text-dark"
                  : "text-gray hover:text-accent-dark border-b-2 border-transparent"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="mt-4" role="tabpanel">
        {children[active]}
      </div>
    </div>
  );
}
