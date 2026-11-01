import {useSession} from '@/hooks/use-session'
import {cn, ds} from '@/lib/design-system'
import {PassphraseSchema} from '@/services/encryption'
import '@/styles/heroui-v3.css'
import {Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader} from '@heroui/react'
import {Button, Spinner} from '@heroui-v3/react'
import {useCallback, useState, type FormEvent} from 'react'

export type PassphraseModalMode = 'setup' | 'unlock'

export interface PassphraseModalProps {
  mode: PassphraseModalMode
  isOpen: boolean
  onClose?: () => void
  onSuccess?: () => void
}

/**
 * Creates the passphrase that encrypts stored API keys (`setup`), or unlocks a session that already has one
 * (`unlock`). Always dismissible: nothing outside the flow that needs a stored key waits on it.
 */
export function PassphraseModal({mode, isOpen, onClose, onSuccess}: PassphraseModalProps) {
  const {setInitialPassphrase, unlock} = useSession()

  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSetup = mode === 'setup'
  const isPassphraseValid = PassphraseSchema.safeParse(passphrase).success
  const isFormValid = isSetup ? isPassphraseValid && passphrase === confirmPassphrase : passphrase.length > 0

  const resetForm = useCallback(() => {
    setPassphrase('')
    setConfirmPassphrase('')
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose?.()
  }, [resetForm, onClose])

  const handleSetup = useCallback(async () => {
    const validation = PassphraseSchema.safeParse(passphrase)
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Invalid passphrase')
      return
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match')
      return
    }

    await setInitialPassphrase(passphrase)
    resetForm()
    onSuccess?.()
  }, [passphrase, confirmPassphrase, setInitialPassphrase, resetForm, onSuccess])

  const handleUnlock = useCallback(async () => {
    const success = await unlock(passphrase)
    if (success) {
      resetForm()
      onSuccess?.()
    } else {
      setError('Incorrect passphrase')
    }
  }, [passphrase, unlock, resetForm, onSuccess])

  const handleSubmit = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault()
      if (!isFormValid || isSubmitting) return

      setIsSubmitting(true)
      setError(null)
      try {
        await (isSetup ? handleSetup() : handleUnlock())
      } catch (error_) {
        // Never surface or log the passphrase; only the error message is shown.
        setError(error_ instanceof Error ? error_.message : isSetup ? 'Failed to set passphrase' : 'Failed to unlock')
      } finally {
        setIsSubmitting(false)
      }
    },
    [isFormValid, isSubmitting, isSetup, handleSetup, handleUnlock],
  )

  const mismatch = confirmPassphrase.length > 0 && passphrase !== confirmPassphrase
  const tooShort = passphrase.length > 0 && !isPassphraseValid

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      placement="center"
      backdrop="opaque"
      hideCloseButton
      data-testid="passphrase-modal"
    >
      <ModalContent>
        <ModalHeader>{isSetup ? 'Create a Passphrase' : 'Unlock Session'}</ModalHeader>
        <form
          className="flex flex-col"
          onSubmit={event => {
            handleSubmit(event).catch(console.error)
          }}
        >
          <ModalBody className="space-y-4">
            <p className={cn(ds.text.body.small)}>
              {isSetup
                ? 'Your passphrase encrypts API keys stored in this browser. It is never stored and cannot be recovered if you forget it.'
                : 'Enter your passphrase to unlock your stored API keys.'}
            </p>

            <Input
              type="password"
              validationBehavior="aria"
              label="Passphrase"
              placeholder={isSetup ? 'Enter a secure passphrase' : 'Enter your passphrase'}
              value={passphrase}
              onValueChange={setPassphrase}
              autoFocus
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              description={isSetup ? 'Minimum 8 characters' : undefined}
              isInvalid={isSetup ? tooShort : error !== null}
              errorMessage={isSetup && tooShort ? 'Must be at least 8 characters' : undefined}
            />

            {isSetup && (
              <Input
                type="password"
                validationBehavior="aria"
                label="Confirm Passphrase"
                placeholder="Confirm your passphrase"
                value={confirmPassphrase}
                onValueChange={setConfirmPassphrase}
                autoComplete="new-password"
                isInvalid={mismatch}
                errorMessage={mismatch ? 'Passphrases do not match' : undefined}
              />
            )}

            {error && (
              <p role="alert" data-testid="passphrase-error" className="text-small text-danger">
                {error}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="tertiary" onPress={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isDisabled={!isFormValid} isPending={isSubmitting}>
              {({isPending}) => (
                <>
                  {isPending && <Spinner size="sm" color="current" />}
                  {isSetup ? 'Set Passphrase' : 'Unlock'}
                </>
              )}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
