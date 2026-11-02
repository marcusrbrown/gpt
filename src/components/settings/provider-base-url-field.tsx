import type {BaseUrlProviderId} from '@/types/provider'
import {useAIProvider} from '@/hooks/use-ai-provider'
import {cn, ds} from '@/lib/design-system'
import {ProviderBaseUrlSchema} from '@/types/provider'
import '@/styles/heroui-v3.css'
import {addToast} from '@heroui/react'
import {Button, Description, FieldError, Input, Label, Spinner, TextField} from '@heroui-v3/react'
import {XCircle} from 'lucide-react'
import {useState} from 'react'

interface ProviderBaseUrlFieldProps {
  providerId: BaseUrlProviderId
  /** Display name, for example `OpenAI`. */
  providerName: string
  /** Leading label of the compatible API family, for example `an OpenAI-compatible`. */
  compatibleWith: string
  /** Shown as the empty-field hint: the vendor's own endpoint. */
  defaultUrl: string
}

/**
 * Optional endpoint override for a provider, so the app can talk to a compatible gateway. The URL is not secret:
 * saving it never asks for the passphrase. Saving re-checks a stored key against the new URL when the session allows.
 */
export function ProviderBaseUrlField({
  providerId,
  providerName,
  compatibleWith,
  defaultUrl,
}: ProviderBaseUrlFieldProps) {
  const {baseUrls, setBaseUrl} = useAIProvider()
  const [draft, setDraft] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const saved = baseUrls[providerId] ?? ''
  const value = draft ?? saved
  const trimmed = value.trim()

  const parsed = trimmed ? ProviderBaseUrlSchema.safeParse(trimmed) : undefined
  const errorMessage = parsed && !parsed.success ? (parsed.error.issues[0]?.message ?? 'Enter a valid URL') : undefined
  const normalized = parsed?.success ? parsed.data : ''
  const canSave = !errorMessage && normalized !== saved && !isSaving

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await setBaseUrl(providerId, normalized || undefined)
      setDraft(null)

      const destination = normalized || `${providerName} directly`
      if (result && !result.valid) {
        addToast({
          title: 'Base URL Saved, Key Not Validated',
          description: `Your API key could not be validated against it${result.error ? `: ${result.error}` : '.'}`,
          color: 'warning',
          timeout: 6000,
        })
      } else {
        addToast({
          title: normalized ? 'Base URL Saved' : 'Base URL Cleared',
          description: result
            ? `${providerName} requests now go to ${destination}. Your API key works with it.`
            : `${providerName} requests now go to ${destination}. Your key is checked against it when you save it or unlock the session.`,
          color: 'success',
          timeout: 4000,
        })
      }
    } catch (error_: unknown) {
      addToast({
        title: 'Error',
        description: 'Failed to save the base URL. Please try again.',
        color: 'danger',
        icon: <XCircle size={20} />,
        timeout: 5000,
      })
      console.error('Error saving base URL:', error_)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div data-testid={`${providerId}-base-url`} className="pt-4">
      <TextField type="url" value={value} onChange={setDraft} isInvalid={Boolean(errorMessage)} fullWidth>
        <Label>Base URL</Label>
        <Input placeholder={defaultUrl} autoComplete="off" spellCheck="false" />
        <Description className="text-content-secondary">
          {`Leave empty to use ${providerName} directly. Set it to use ${compatibleWith} gateway, for example http://localhost:8317/v1. Include the /v1 path.`}
        </Description>
        <FieldError>{errorMessage}</FieldError>
      </TextField>

      <div className={cn('flex mt-4 space-x-2', ds.form.fieldRow)}>
        <Button
          onPress={() => {
            handleSave().catch(console.error)
          }}
          variant="outline"
          isPending={isSaving}
          isDisabled={!canSave && !isSaving}
        >
          {({isPending}) => (
            <>
              {isPending && <Spinner size="sm" color="current" />}
              Save Base URL
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
