import {cn, ds, theme} from '@/lib/design-system'
import {Accordion, AccordionItem} from '@heroui/react'
import {AnthropicSettings} from './anthropic-settings'
import {APISettings} from './api-settings'
import {OllamaSettings} from './ollama-settings'

/**
 * Unified provider settings component that combines all AI provider configurations.
 * Used in the global settings page to provide a single place for provider management.
 */
export function ProviderSettings() {
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className={cn(ds.text.heading.h3)}>AI Provider Configuration</h2>
        <p className={cn(ds.text.body.small, 'mt-1')}>
          Configure your AI providers below. Your API keys are encrypted and stored locally.
        </p>
      </div>

      <Accordion
        variant="default"
        selectionMode="multiple"
        defaultExpandedKeys={['openai']}
        className={cn(theme.surface(0))}
      >
        <AccordionItem key="openai" id="openai" aria-label="OpenAI Settings">
          <Accordion.Heading>
            <Accordion.Trigger className="px-2 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">OpenAI</span>
                <span className={cn(ds.text.body.small, 'text-content-tertiary')}>GPT-4, GPT-3.5</span>
              </div>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="px-2 pb-4">
              <APISettings />
            </Accordion.Body>
          </Accordion.Panel>
        </AccordionItem>

        <AccordionItem key="anthropic" id="anthropic" aria-label="Anthropic Settings">
          <Accordion.Heading>
            <Accordion.Trigger className="px-2 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">Anthropic</span>
                <span className={cn(ds.text.body.small, 'text-content-tertiary')}>Claude 3.5, Claude 3</span>
              </div>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="px-2 pb-4">
              <AnthropicSettings />
            </Accordion.Body>
          </Accordion.Panel>
        </AccordionItem>

        <AccordionItem key="ollama" id="ollama" aria-label="Ollama Settings">
          <Accordion.Heading>
            <Accordion.Trigger className="px-2 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">Ollama</span>
                <span className={cn(ds.text.body.small, 'text-content-tertiary')}>Local Models</span>
              </div>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="px-2 pb-4">
              <OllamaSettings />
            </Accordion.Body>
          </Accordion.Panel>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
