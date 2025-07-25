import {useState} from 'react'
import {type GPTConfiguration} from '../types/gpt'

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

const DEFAULT_ERRORS: FormErrors = {
  tools: {},
  knowledge: {
    urls: {},
  },
}

export function useGPTValidation() {
  const [errors, setErrors] = useState<FormErrors>(DEFAULT_ERRORS)

  const validateForm = (gpt: GPTConfiguration): boolean => {
    const newErrors: FormErrors = {
      tools: {},
      knowledge: {
        urls: {},
      },
    }

    let isValid = true

    // Basic validation with more detailed error messages
    if (!gpt.name.trim()) {
      newErrors.name = 'Name is required for your GPT'
      isValid = false
    } else if (gpt.name.length > 50) {
      newErrors.name = 'Name must be 50 characters or less'
      isValid = false
    }

    if (!gpt.description.trim()) {
      newErrors.description = 'Description is required to explain what your GPT does'
      isValid = false
    } else if (gpt.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less'
      isValid = false
    }

    if (!gpt.systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required to define your GPT behavior'
      isValid = false
    } else if (gpt.systemPrompt.length > 4000) {
      newErrors.systemPrompt = 'System prompt exceeds the maximum of 4000 characters'
      isValid = false
    }

    // Tool validation with specific field requirements
    gpt.tools.forEach((tool, index) => {
      const toolErrors: FormErrors['tools'][number] = {}

      if (!tool.name.trim()) {
        toolErrors.name = 'Tool name is required'
        isValid = false
      } else if (tool.name.length > 50) {
        toolErrors.name = 'Tool name must be 50 characters or less'
        isValid = false
      }

      if (!tool.description.trim()) {
        toolErrors.description = 'Tool description is required'
        isValid = false
      } else if (tool.description.length > 200) {
        toolErrors.description = 'Tool description must be 200 characters or less'
        isValid = false
      }

      if (!tool.endpoint.trim()) {
        toolErrors.endpoint = 'Tool endpoint URL is required'
        isValid = false
      } else if (!/^https?:\/\/.+/.test(tool.endpoint)) {
        toolErrors.endpoint = 'Tool endpoint must be a valid URL starting with http:// or https://'
        isValid = false
      }

      if (tool.authentication?.type && !tool.authentication.value) {
        toolErrors.authentication = 'Authentication value is required when type is selected'
        isValid = false
      }

      if (Object.keys(toolErrors).length > 0) {
        newErrors.tools[index] = toolErrors
      }
    })

    // URL validation with proper format checking
    gpt.knowledge.urls.forEach((url, index) => {
      if (!url) {
        newErrors.knowledge.urls[index] = 'URL cannot be empty'
        isValid = false
      } else if (!/^https?:\/\/.+/.test(url)) {
        newErrors.knowledge.urls[index] = 'Please enter a valid URL starting with http:// or https://'
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const clearFieldError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors(prev => ({...prev, [field]: undefined}))
    }
  }

  return {
    errors,
    validateForm,
    clearFieldError,
    setErrors,
  }
}
