import {cn, ds} from '@/lib/design-system'
import {Spinner} from '@heroui/react'
import {AlertCircle, CheckCircle} from 'lucide-react'
import React from 'react'

interface FormFieldWrapperProps {
  children: React.ReactNode
  label?: string
  description?: string
  error?: string
  required?: boolean
  isLoading?: boolean
  success?: string
  className?: string
  id?: string
}

/**
 * Reusable form field wrapper component that provides:
 * - Consistent spacing and layout using design system utilities
 * - Standard error display patterns
 * - Proper label and description handling
 * - Focus management integration
 * - Loading state support
 */
export function FormFieldWrapper({
  children,
  label,
  description,
  error,
  required = false,
  isLoading = false,
  success,
  className,
  id,
}: FormFieldWrapperProps) {
  const generatedId = React.useId()
  const fieldId = id || `field-${generatedId}`
  const descriptionId = description ? `${fieldId}-description` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const successId = success ? `${fieldId}-success` : undefined

  // Determine aria-describedby value
  const ariaDescribedBy = [descriptionId, errorId, successId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn(ds.form.fieldGroup, className)}>
      {label && (
        <label htmlFor={fieldId} className={cn(ds.form.label, 'block')}>
          {label}
          {required && (
            <span className="text-danger ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <div
          data-field-id={fieldId}
          data-aria-described-by={ariaDescribedBy}
          data-aria-invalid={error ? 'true' : undefined}
          className={cn(error && ds.state.error, success && ds.state.success, isLoading && ds.state.loading)}
        >
          {children}
        </div>

        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Spinner size="sm" color="primary" />
          </div>
        )}
      </div>

      {description && !error && !success && (
        <p id={descriptionId} className={cn(ds.form.helperText)}>
          {description}
        </p>
      )}

      {error && (
        <div
          id={errorId}
          className={cn(ds.form.errorText, 'flex items-start gap-2 mt-1')}
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && !error && (
        <div
          id={successId}
          className={cn('text-success-600 flex items-start gap-2 mt-1', ds.text.body.small)}
          role="status"
          aria-live="polite"
        >
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  )
}
