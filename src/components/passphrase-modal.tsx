import {useSession} from '@/hooks/use-session'
import {Button, Input, Link, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader} from '@heroui/react'
import {useCallback, useState} from 'react'

export type PassphraseModalMode = 'setup' | 'unlock' | 'change'

export interface PassphraseModalProps {
  mode: PassphraseModalMode
  isOpen: boolean
  onClose?: () => void
  onSuccess?: () => void
}

export function PassphraseModal({mode, isOpen, onClose, onSuccess}: PassphraseModalProps) {
  const {setInitialPassphrase, unlock, changePassphrase, resetAllData} = useSession()

  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [currentPassphrase, setCurrentPassphrase] = useState('')
  const [newPassphrase, setNewPassphrase] = useState('')
  const [confirmNewPassphrase, setConfirmNewPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const resetForm = useCallback(() => {
    setPassphrase('')
    setConfirmPassphrase('')
    setCurrentPassphrase('')
    setNewPassphrase('')
    setConfirmNewPassphrase('')
    setError(null)
    setShowResetConfirm(false)
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose?.()
  }, [resetForm, onClose])

  const handleSetup = useCallback(async () => {
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters')
      return
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await setInitialPassphrase(passphrase)
      resetForm()
      onSuccess?.()
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to set passphrase')
    } finally {
      setIsSubmitting(false)
    }
  }, [passphrase, confirmPassphrase, setInitialPassphrase, resetForm, onSuccess])

  const handleUnlock = useCallback(async () => {
    if (!passphrase) {
      setError('Please enter your passphrase')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const success = await unlock(passphrase)
      if (success) {
        resetForm()
        onSuccess?.()
      } else {
        setError('Incorrect passphrase')
      }
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to unlock')
    } finally {
      setIsSubmitting(false)
    }
  }, [passphrase, unlock, resetForm, onSuccess])

  const handleChange = useCallback(async () => {
    if (newPassphrase.length < 8) {
      setError('New passphrase must be at least 8 characters')
      return
    }
    if (newPassphrase !== confirmNewPassphrase) {
      setError('New passphrases do not match')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await changePassphrase(currentPassphrase, newPassphrase)
      resetForm()
      onSuccess?.()
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to change passphrase')
    } finally {
      setIsSubmitting(false)
    }
  }, [currentPassphrase, newPassphrase, confirmNewPassphrase, changePassphrase, resetForm, onSuccess])

  const handleReset = useCallback(async () => {
    setIsSubmitting(true)
    try {
      await resetAllData()
      resetForm()
      onSuccess?.()
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to reset')
    } finally {
      setIsSubmitting(false)
    }
  }, [resetAllData, resetForm, onSuccess])

  const handleSubmit = useCallback(async () => {
    switch (mode) {
      case 'setup':
        await handleSetup()
        break
      case 'unlock':
        await handleUnlock()
        break
      case 'change':
        await handleChange()
        break
    }
  }, [mode, handleSetup, handleUnlock, handleChange])

  const isFormValid = useCallback(() => {
    switch (mode) {
      case 'setup':
        return passphrase.length >= 8 && passphrase === confirmPassphrase
      case 'unlock':
        return passphrase.length > 0
      case 'change':
        return currentPassphrase.length > 0 && newPassphrase.length >= 8 && newPassphrase === confirmNewPassphrase
    }
  }, [mode, passphrase, confirmPassphrase, currentPassphrase, newPassphrase, confirmNewPassphrase])

  const getTitle = () => {
    switch (mode) {
      case 'setup':
        return 'Set Up Passphrase'
      case 'unlock':
        return 'Unlock Session'
      case 'change':
        return 'Change Passphrase'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={mode === 'unlock' ? undefined : handleClose}
      hideCloseButton={mode === 'unlock'}
      isDismissable={mode !== 'unlock'}
    >
      <ModalContent>
        <ModalHeader>{getTitle()}</ModalHeader>
        <ModalBody>
          {showResetConfirm ? (
            <div className="space-y-4">
              <p className="text-danger">
                Warning: This will permanently delete all encrypted data including API keys. This action cannot be
                undone.
              </p>
              <div className="flex gap-2">
                <Button
                  color="danger"
                  onPress={() => {
                    handleReset().catch(console.error)
                  }}
                  isLoading={isSubmitting}
                >
                  Yes, Reset Everything
                </Button>
                <Button variant="flat" onPress={() => setShowResetConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {mode === 'setup' && (
                <>
                  <Input
                    type="password"
                    label="Passphrase"
                    placeholder="Enter a secure passphrase"
                    value={passphrase}
                    onValueChange={setPassphrase}
                    aria-label="Passphrase"
                    description="Minimum 8 characters"
                    isInvalid={passphrase.length > 0 && passphrase.length < 8}
                    errorMessage={
                      passphrase.length > 0 && passphrase.length < 8 ? 'Must be at least 8 characters' : undefined
                    }
                  />
                  <Input
                    type="password"
                    label="Confirm Passphrase"
                    placeholder="Confirm your passphrase"
                    value={confirmPassphrase}
                    onValueChange={setConfirmPassphrase}
                    aria-label="Confirm passphrase"
                    isInvalid={confirmPassphrase.length > 0 && passphrase !== confirmPassphrase}
                    errorMessage={
                      confirmPassphrase.length > 0 && passphrase !== confirmPassphrase
                        ? 'Passphrases do not match'
                        : undefined
                    }
                  />
                </>
              )}

              {mode === 'unlock' && (
                <>
                  <Input
                    type="password"
                    label="Passphrase"
                    placeholder="Enter your passphrase"
                    value={passphrase}
                    onValueChange={setPassphrase}
                    aria-label="Passphrase"
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSubmit().catch(console.error)
                    }}
                  />
                  <Link as="button" type="button" size="sm" color="danger" onPress={() => setShowResetConfirm(true)}>
                    Forgot passphrase?
                  </Link>
                </>
              )}

              {mode === 'change' && (
                <>
                  <Input
                    type="password"
                    label="Current Passphrase"
                    placeholder="Enter current passphrase"
                    value={currentPassphrase}
                    onValueChange={setCurrentPassphrase}
                    aria-label="Current passphrase"
                  />
                  <Input
                    type="password"
                    label="New Passphrase"
                    placeholder="Enter new passphrase"
                    value={newPassphrase}
                    onValueChange={setNewPassphrase}
                    aria-label="New passphrase"
                    description="Minimum 8 characters"
                    isInvalid={newPassphrase.length > 0 && newPassphrase.length < 8}
                    errorMessage={
                      newPassphrase.length > 0 && newPassphrase.length < 8 ? 'Must be at least 8 characters' : undefined
                    }
                  />
                  <Input
                    type="password"
                    label="Confirm New Passphrase"
                    placeholder="Confirm new passphrase"
                    value={confirmNewPassphrase}
                    onValueChange={setConfirmNewPassphrase}
                    aria-label="Confirm new passphrase"
                    isInvalid={confirmNewPassphrase.length > 0 && newPassphrase !== confirmNewPassphrase}
                    errorMessage={
                      confirmNewPassphrase.length > 0 && newPassphrase !== confirmNewPassphrase
                        ? 'Passphrases do not match'
                        : undefined
                    }
                  />
                </>
              )}

              {error && <p className="text-small text-danger">{error}</p>}
            </div>
          )}
        </ModalBody>
        {!showResetConfirm && (
          <ModalFooter>
            {mode !== 'unlock' && (
              <Button variant="flat" onPress={handleClose}>
                Cancel
              </Button>
            )}
            <Button
              color="primary"
              onPress={() => {
                handleSubmit().catch(console.error)
              }}
              isDisabled={!isFormValid() || isSubmitting}
              isLoading={isSubmitting}
            >
              {mode === 'setup' ? 'Set Passphrase' : mode === 'unlock' ? 'Unlock' : 'Change'}
            </Button>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  )
}
