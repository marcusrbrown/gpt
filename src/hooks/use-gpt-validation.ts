import type {GPTConfiguration} from '../types/gpt'
import {useCallback, useState} from 'react'

interface FormErrors {
  name?: string
  description?: string
  systemPrompt?: string
  tools: {
    [key: number]: {
      name?: string
      description?: string
      endpoint?: string
      authentication?: string
    }
  }
  knowledge: {
    urls: {
      [key: number]: string
    }
  }
}

interface FormSuccessStates {
  name?: boolean
  description?: boolean
  systemPrompt?: boolean
  tools: {
    [key: number]: {
      name?: boolean
      description?: boolean
      endpoint?: boolean
      authentication?: boolean
    }
  }
  knowledge: {
    urls: {
      [key: number]: boolean
    }
  }
}

type ValidationTiming = 'blur' | 'change' | 'submit'

const DEFAULT_ERRORS: FormErrors = {
  tools: {},
  knowledge: {
    urls: {},
  },
}

const DEFAULT_SUCCESS: FormSuccessStates = {
  tools: {},
  knowledge: {
    urls: {},
  },
}

export function useGPTValidation() {
  const [errors, setErrors] = useState<FormErrors>(DEFAULT_ERRORS)
  const [successStates, setSuccessStates] = useState<FormSuccessStates>(DEFAULT_SUCCESS)
  const [isValidating, setIsValidating] = useState(false)
  const [validationTiming, setValidationTiming] = useState<ValidationTiming>('submit')

  // Helper for nested field validation
  const validateNestedField = useCallback(
    (
      pathParts: string[],
      value: string | boolean | object,
      gpt: GPTConfiguration,
    ): {isValid: boolean; error?: string; success?: boolean} => {
      const [parent, index, field] = pathParts

      if (parent === 'tools' && index && field) {
        const toolIndex = Number.parseInt(index, 10)
        const tool = gpt.tools[toolIndex]
        if (!tool) return {isValid: false, error: 'Tool not found'}

        switch (field) {
          case 'name':
            if (typeof value !== 'string') return {isValid: false, error: 'Invalid tool name'}
            if (!value.trim()) return {isValid: false, error: 'Tool name is required'}
            if (value.length > 50) return {isValid: false, error: 'Tool name must be 50 characters or less'}
            return {isValid: true, success: true}

          case 'description':
            if (typeof value !== 'string') return {isValid: false, error: 'Invalid tool description'}
            if (!value.trim()) return {isValid: false, error: 'Tool description is required'}
            if (value.length > 200) return {isValid: false, error: 'Tool description must be 200 characters or less'}
            return {isValid: true, success: true}

          case 'endpoint':
            if (typeof value !== 'string') return {isValid: false, error: 'Invalid endpoint'}
            if (!value.trim()) return {isValid: false, error: 'Tool endpoint URL is required'}
            if (!/^https?:\/\/.+/.test(value))
              return {isValid: false, error: 'Tool endpoint must be a valid URL starting with http:// or https://'}
            return {isValid: true, success: true}

          case 'authentication':
            if (tool.authentication?.type && !tool.authentication.value) {
              return {isValid: false, error: 'Authentication value is required when type is selected'}
            }
            return {isValid: true, success: true}
        }
      }

      if (parent === 'knowledge' && pathParts[1] === 'urls' && pathParts[2]) {
        if (typeof value !== 'string') return {isValid: false, error: 'Invalid URL'}
        if (!value) return {isValid: false, error: 'URL cannot be empty'}
        if (!/^https?:\/\/.+/.test(value))
          return {isValid: false, error: 'Please enter a valid URL starting with http:// or https://'}
        return {isValid: true, success: true}
      }

      return {isValid: true}
    },
    [],
  )

  // Individual field validation for real-time feedback
  const validateField = useCallback(
    (
      fieldPath: string,
      value: string | boolean | object,
      gpt: GPTConfiguration,
    ): {isValid: boolean; error?: string; success?: boolean} => {
      const pathParts = fieldPath.split('.')
      const fieldName = pathParts[0]

      switch (fieldName) {
        case 'name':
          if (typeof value !== 'string') return {isValid: false, error: 'Invalid name value'}
          if (!value.trim()) {
            return {isValid: false, error: 'Name is required for your GPT'}
          }
          if (value.length > 50) {
            return {isValid: false, error: 'Name must be 50 characters or less'}
          }
          return {isValid: true, success: true}

        case 'description':
          if (typeof value !== 'string') return {isValid: false, error: 'Invalid description value'}
          if (!value.trim()) {
            return {isValid: false, error: 'Description is required to explain what your GPT does'}
          }
          if (value.length > 500) {
            return {isValid: false, error: 'Description must be 500 characters or less'}
          }
          return {isValid: true, success: true}

        case 'systemPrompt':
          if (typeof value !== 'string') return {isValid: false, error: 'Invalid system prompt value'}
          if (!value.trim()) {
            return {isValid: false, error: 'System prompt is required to define your GPT behavior'}
          }
          if (value.length > 4000) {
            return {isValid: false, error: 'System prompt exceeds the maximum of 4000 characters'}
          }
          return {isValid: true, success: true}

        default:
          // Handle nested field validation (tools, knowledge)
          if (pathParts.length > 1) {
            return validateNestedField(pathParts, value, gpt)
          }
          return {isValid: true}
      }
    },
    [validateNestedField],
  )

  // Update field error and success state
  const updateFieldState = useCallback((fieldPath: string, error?: string, success?: boolean) => {
    const pathParts = fieldPath.split('.')
    const [fieldName, index, subField] = pathParts

    setErrors(prev => {
      const newErrors = {...prev}
      if (pathParts.length === 1) {
        if (error && (fieldName === 'name' || fieldName === 'description' || fieldName === 'systemPrompt')) {
          // Safe assignment for top-level fields
          ;(newErrors as any)[fieldName] = error
        } else if (!error && (fieldName === 'name' || fieldName === 'description' || fieldName === 'systemPrompt')) {
          // Safe deletion for top-level fields
          delete (newErrors as any)[fieldName]
        }
      } else if (pathParts.length === 3 && index && subField) {
        const idx = Number.parseInt(index, 10)
        if (fieldName === 'tools') {
          if (!newErrors.tools[idx]) newErrors.tools[idx] = {}
          if (error) {
            newErrors.tools[idx][subField as keyof FormErrors['tools'][number]] = error
          } else {
            delete newErrors.tools[idx][subField as keyof FormErrors['tools'][number]]
            if (Object.keys(newErrors.tools[idx]).length === 0) {
              delete newErrors.tools[idx]
            }
          }
        } else if (fieldName === 'knowledge' && index === 'urls') {
          const urlIdx = Number.parseInt(subField, 10)
          if (error) {
            newErrors.knowledge.urls[urlIdx] = error
          } else {
            delete newErrors.knowledge.urls[urlIdx]
          }
        }
      }
      return newErrors
    })

    setSuccessStates(prev => {
      const newSuccess = {...prev}
      if (pathParts.length === 1) {
        if (success && (fieldName === 'name' || fieldName === 'description' || fieldName === 'systemPrompt')) {
          // Safe assignment for top-level fields
          ;(newSuccess as any)[fieldName] = true
        } else if (!success && (fieldName === 'name' || fieldName === 'description' || fieldName === 'systemPrompt')) {
          // Safe deletion for top-level fields
          delete (newSuccess as any)[fieldName]
        }
      } else if (pathParts.length === 3 && index && subField) {
        const idx = Number.parseInt(index, 10)
        if (fieldName === 'tools') {
          if (!newSuccess.tools[idx]) newSuccess.tools[idx] = {}
          if (success) {
            newSuccess.tools[idx][subField as keyof FormSuccessStates['tools'][number]] = true
          } else {
            delete newSuccess.tools[idx][subField as keyof FormSuccessStates['tools'][number]]
            if (Object.keys(newSuccess.tools[idx]).length === 0) {
              delete newSuccess.tools[idx]
            }
          }
        } else if (fieldName === 'knowledge' && index === 'urls') {
          const urlIdx = Number.parseInt(subField, 10)
          if (success) {
            newSuccess.knowledge.urls[urlIdx] = true
          } else {
            delete newSuccess.knowledge.urls[urlIdx]
          }
        }
      }
      return newSuccess
    })
  }, [])

  // Real-time field validation with timing control
  const handleFieldValidation = useCallback(
    (
      fieldPath: string,
      value: string | boolean | object,
      gpt: GPTConfiguration,
      timing: ValidationTiming = validationTiming,
    ) => {
      if (timing === 'submit') return // Only validate on form submit

      const result = validateField(fieldPath, value, gpt)
      updateFieldState(fieldPath, result.error, result.success)
    },
    [validateField, updateFieldState, validationTiming],
  )

  const validateForm = (gpt: GPTConfiguration): boolean => {
    setIsValidating(true)
    const newErrors: FormErrors = {
      tools: {},
      knowledge: {
        urls: {},
      },
    }
    const newSuccess: FormSuccessStates = {
      tools: {},
      knowledge: {
        urls: {},
      },
    }

    let isValid = true

    // Basic validation with success tracking
    const nameResult = validateField('name', gpt.name, gpt)
    if (!nameResult.isValid && nameResult.error) {
      newErrors.name = nameResult.error
      isValid = false
    } else if (nameResult.success) {
      newSuccess.name = true
    }

    const descriptionResult = validateField('description', gpt.description, gpt)
    if (!descriptionResult.isValid && descriptionResult.error) {
      newErrors.description = descriptionResult.error
      isValid = false
    } else if (descriptionResult.success) {
      newSuccess.description = true
    }

    const systemPromptResult = validateField('systemPrompt', gpt.systemPrompt, gpt)
    if (!systemPromptResult.isValid && systemPromptResult.error) {
      newErrors.systemPrompt = systemPromptResult.error
      isValid = false
    } else if (systemPromptResult.success) {
      newSuccess.systemPrompt = true
    }

    // Tool validation with success tracking
    gpt.tools.forEach((tool, index) => {
      const toolErrors: FormErrors['tools'][number] = {}
      const toolSuccess: FormSuccessStates['tools'][number] = {}

      const nameResult = validateField(`tools.${index}.name`, tool.name, gpt)
      if (!nameResult.isValid && nameResult.error) {
        toolErrors.name = nameResult.error
        isValid = false
      } else if (nameResult.success) {
        toolSuccess.name = true
      }

      const descResult = validateField(`tools.${index}.description`, tool.description, gpt)
      if (!descResult.isValid && descResult.error) {
        toolErrors.description = descResult.error
        isValid = false
      } else if (descResult.success) {
        toolSuccess.description = true
      }

      const endpointResult = validateField(`tools.${index}.endpoint`, tool.endpoint, gpt)
      if (!endpointResult.isValid && endpointResult.error) {
        toolErrors.endpoint = endpointResult.error
        isValid = false
      } else if (endpointResult.success) {
        toolSuccess.endpoint = true
      }

      const authResult = validateField(`tools.${index}.authentication`, tool.authentication || '', gpt)
      if (!authResult.isValid && authResult.error) {
        toolErrors.authentication = authResult.error
        isValid = false
      } else if (authResult.success) {
        toolSuccess.authentication = true
      }

      if (Object.keys(toolErrors).length > 0) {
        newErrors.tools[index] = toolErrors
      }
      if (Object.keys(toolSuccess).length > 0) {
        newSuccess.tools[index] = toolSuccess
      }
    })

    // URL validation with success tracking
    gpt.knowledge.urls.forEach((url, index) => {
      const urlResult = validateField(`knowledge.urls.${index}`, url, gpt)
      if (!urlResult.isValid && urlResult.error) {
        newErrors.knowledge.urls[index] = urlResult.error
        isValid = false
      } else if (urlResult.success) {
        newSuccess.knowledge.urls[index] = true
      }
    })

    setErrors(newErrors)
    setSuccessStates(newSuccess)
    setIsValidating(false)
    return isValid
  }

  const clearFieldError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors(prev => ({...prev, [field]: undefined}))
    }
  }

  // Clear success state for a field
  const clearFieldSuccess = useCallback(
    (fieldPath: string) => {
      updateFieldState(fieldPath, undefined, false)
    },
    [updateFieldState],
  )

  // Set validation timing for the entire form
  const setValidationTimingMode = useCallback((timing: ValidationTiming) => {
    setValidationTiming(timing)
  }, [])

  // Check if a field has success state
  const hasFieldSuccess = useCallback(
    (fieldPath: string): boolean => {
      const pathParts = fieldPath.split('.')
      const [fieldName, index, subField] = pathParts

      if (pathParts.length === 1) {
        return !!successStates[fieldName as keyof FormSuccessStates]
      } else if (pathParts.length === 3 && index && subField) {
        const idx = Number.parseInt(index, 10)
        if (fieldName === 'tools') {
          return !!successStates.tools[idx]?.[subField as keyof FormSuccessStates['tools'][number]]
        } else if (fieldName === 'knowledge' && index === 'urls') {
          const urlIdx = Number.parseInt(subField, 10)
          return !!successStates.knowledge.urls[urlIdx]
        }
      }
      return false
    },
    [successStates],
  )

  return {
    errors,
    successStates,
    isValidating,
    validateForm,
    validateField,
    handleFieldValidation,
    clearFieldError,
    clearFieldSuccess,
    hasFieldSuccess,
    setValidationTiming: setValidationTimingMode,
    setErrors,
  }
}
