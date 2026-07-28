'use client'

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

import { clsxm } from '~/lib/helper'

export const StudioButton = ({
  className,
  tone = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'danger' | 'ghost'
}) => (
  <button
    className={clsxm(
      'inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45',
      tone === 'primary' &&
        'bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200',
      tone === 'secondary' &&
        'border border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100',
      tone === 'danger' &&
        'bg-red-600 text-white hover:bg-red-500 dark:bg-red-500 dark:text-white',
      tone === 'ghost' &&
        'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
      className,
    )}
    {...props}
  />
)

const fieldClass =
  'min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-800'

export const StudioInput = ({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={clsxm(fieldClass, className)} {...props} />
)

export const StudioTextArea = ({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={clsxm(fieldClass, 'min-h-28 resize-y', className)}
    {...props}
  />
)

export const StudioSelect = ({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={clsxm(fieldClass, className)} {...props} />
)

export const StudioCard = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={clsxm(
      'rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900',
      className,
    )}
    {...props}
  />
)

export const StudioLabel = ({
  label,
  hint,
  children,
}: PropsWithChildren<{ label: string; hint?: string }>) => (
  <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200">
    <span>
      {label}
      {hint && <span className="ml-2 font-normal text-zinc-400">{hint}</span>}
    </span>
    {children}
  </label>
)

export const StudioEmpty = ({ children }: PropsWithChildren) => (
  <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
    {children}
  </div>
)

export const StatusPill = ({ value }: { value: string }) => {
  const green = ['published', 'approved', 'selected', 'ready', 'analyzed']
  const amber = ['draft', 'in_review', 'scheduled', 'inbox']
  const red = ['failed', 'rejected', 'changes_requested', 'withdrawn']
  return (
    <span
      className={clsxm(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
        green.includes(value) &&
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        amber.includes(value) &&
          'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
        red.includes(value) &&
          'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
        ![...green, ...amber, ...red].includes(value) &&
          'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
      )}
    >
      {value}
    </span>
  )
}
