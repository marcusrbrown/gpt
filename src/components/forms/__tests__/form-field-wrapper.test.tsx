import {render, screen} from '@testing-library/react'
import React from 'react'
import {describe, expect, it} from 'vitest'
import {FormFieldWrapper} from '../form-field-wrapper'

describe('formFieldWrapper', () => {
  it('renders children with proper wrapper structure', () => {
    render(
      <FormFieldWrapper label="Test Field">
        <input type="text" data-testid="test-input" />
      </FormFieldWrapper>,
    )

    expect(screen.getByTestId('test-input')).toBeInTheDocument()
    expect(screen.getByText('Test Field')).toBeInTheDocument()
  })

  it('displays required asterisk when required prop is true', () => {
    render(
      <FormFieldWrapper label="Required Field" required>
        <input type="text" />
      </FormFieldWrapper>,
    )

    expect(screen.getByLabelText('required')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('displays description text when provided', () => {
    const description = 'This is a helpful description'
    render(
      <FormFieldWrapper label="Test Field" description={description}>
        <input type="text" />
      </FormFieldWrapper>,
    )

    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it('displays error message with alert icon when error is provided', () => {
    const errorMessage = 'This field is required'
    render(
      <FormFieldWrapper label="Test Field" error={errorMessage}>
        <input type="text" />
      </FormFieldWrapper>,
    )

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('displays success message with check icon when success is provided', () => {
    const successMessage = 'Field is valid'
    render(
      <FormFieldWrapper label="Test Field" success={successMessage}>
        <input type="text" />
      </FormFieldWrapper>,
    )

    expect(screen.getByText(successMessage)).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows loading spinner when isLoading is true', () => {
    render(
      <FormFieldWrapper label="Test Field" isLoading>
        <input type="text" />
      </FormFieldWrapper>,
    )

    // HeroUI Spinner has aria-label="Loading"
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('uses provided id or generates one', () => {
    const customId = 'custom-field-id'
    render(
      <FormFieldWrapper label="Test Field" id={customId}>
        <input type="text" data-testid="test-input" />
      </FormFieldWrapper>,
    )

    const wrapper = screen.getByTestId('test-input').closest('[data-field-id]')
    expect(wrapper).toHaveAttribute('data-field-id', customId)
  })

  it('applies custom className to wrapper', () => {
    const customClass = 'custom-wrapper-class'
    render(
      <FormFieldWrapper label="Test Field" className={customClass}>
        <input type="text" />
      </FormFieldWrapper>,
    )

    expect(document.querySelector(`.${customClass}`)).toBeInTheDocument()
  })

  it('prioritizes error over success message', () => {
    const errorMessage = 'Error message'
    const successMessage = 'Success message'

    render(
      <FormFieldWrapper label="Test Field" error={errorMessage} success={successMessage}>
        <input type="text" />
      </FormFieldWrapper>,
    )

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.queryByText(successMessage)).not.toBeInTheDocument()
  })

  it('hides description when error is present', () => {
    const description = 'Field description'
    const errorMessage = 'Error message'

    render(
      <FormFieldWrapper label="Test Field" description={description} error={errorMessage}>
        <input type="text" />
      </FormFieldWrapper>,
    )

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.queryByText(description)).not.toBeInTheDocument()
  })

  it('sets aria attributes correctly', () => {
    const description = 'Field description'
    render(
      <FormFieldWrapper label="Test Field" description={description}>
        <input type="text" data-testid="test-input" />
      </FormFieldWrapper>,
    )

    const wrapper = screen.getByTestId('test-input').closest('[data-aria-described-by]')
    expect(wrapper).toHaveAttribute('data-aria-described-by')
  })

  it('sets aria-invalid when error is present', () => {
    render(
      <FormFieldWrapper label="Test Field" error="Field error">
        <input type="text" data-testid="test-input" />
      </FormFieldWrapper>,
    )

    const wrapper = screen.getByTestId('test-input').closest('[data-aria-invalid]')
    expect(wrapper).toHaveAttribute('data-aria-invalid', 'true')
  })
})
