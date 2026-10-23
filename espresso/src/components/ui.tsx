import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { parseDecimal } from '../domain/numeric'

const inputClass =
  'w-full min-h-11 rounded-lg border border-stone-700 bg-stone-900 px-3 text-base text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none'

interface FieldShellProps {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}

function FieldShell({ id, label, error, hint, required, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-stone-300">
        {label}
        {required && <span className="text-amber-500"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-stone-500">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'date'
  placeholder?: string
  error?: string
  hint?: string
  required?: boolean
}

export function TextField({ label, value, onChange, type = 'text', placeholder, error, hint, required }: TextFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={inputClass}
      />
    </FieldShell>
  )
}

interface NumberFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  unit?: string
  /** If set, a valid value is reformatted to this many decimals on blur (grams use 1). */
  decimals?: number
  error?: string
  required?: boolean
}

export function NumberField({ label, value, onChange, unit, decimals, error, required }: NumberFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={unit ? `${label} (${unit})` : label} error={error} required={required}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const n = parseDecimal(value)
          if (decimals !== undefined && n !== null) onChange(n.toFixed(decimals))
        }}
        aria-invalid={error ? true : undefined}
        className={inputClass}
      />
    </FieldShell>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  error?: string
  required?: boolean
}

export function SelectField({ label, value, onChange, options, placeholder, error, required }: SelectFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} required={required}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={inputClass}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

interface TextAreaFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
}

export function TextAreaField({ label, value, onChange }: TextAreaFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label}>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} py-2`}
      />
    </FieldShell>
  )
}

type Variant = 'primary' | 'secondary' | 'danger'

const variantClass: Record<Variant, string> = {
  primary: 'bg-amber-500 text-stone-950 active:bg-amber-400',
  secondary: 'border border-stone-600 text-stone-100 active:bg-stone-800',
  danger: 'border border-red-800 text-red-300 active:bg-red-950',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-11 rounded-lg px-4 text-base font-semibold disabled:opacity-50 ${variantClass[variant]} ${className}`}
      {...rest}
    />
  )
}

interface ChipProps {
  selected: boolean
  onClick: () => void
  children: ReactNode
}

/** Toggle chip for taste tags and segmented choices. */
export function Chip({ selected, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-base capitalize ${
        selected ? 'border-amber-500 bg-amber-500 text-stone-950 font-semibold' : 'border-stone-600 text-stone-200'
      }`}
    >
      {children}
    </button>
  )
}

interface EmptyStateProps {
  title: string
  body: string
  action: { label: string; to?: string; onClick?: () => void }
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  const cls = `inline-flex items-center justify-center ${variantClass.primary} min-h-11 rounded-lg px-5 text-base font-semibold`
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="max-w-xs text-stone-400">{body}</p>
      {action.to ? (
        <Link to={action.to} className={cls}>
          {action.label}
        </Link>
      ) : (
        <button type="button" onClick={action.onClick} className={cls}>
          {action.label}
        </button>
      )}
    </div>
  )
}

export function Screen({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-4">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {actions}
      </header>
      {children}
    </section>
  )
}
