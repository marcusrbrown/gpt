import type {GPTConfiguration} from '@/types/gpt'
import {v4 as uuidv4} from 'uuid'

/**
 * Test data factory for creating GPT configurations
 * Provides consistent mock data for testing
 */
export const GPTDataFactory = {
  /**
   * Create a basic GPT configuration for testing
   */
  createBasicGPT(overrides: Partial<GPTConfiguration> = {}): GPTConfiguration {
    const id = uuidv4()
    const now = new Date()

    return {
      id,
      name: 'Test GPT',
      description: 'A test GPT for automated testing',
      systemPrompt: 'You are a helpful assistant created for testing purposes.',
      tools: [],
      knowledge: {
        files: [],
        urls: [],
      },
      capabilities: {
        codeInterpreter: false,
        webBrowsing: false,
        imageGeneration: false,
        fileSearch: {
          enabled: false,
        },
      },
      createdAt: now,
      updatedAt: now,
      version: 1,
      ...overrides,
    }
  },

  /**
   * Create a GPT with code interpreter enabled
   */
  createCodeInterpreterGPT(overrides: Partial<GPTConfiguration> = {}): GPTConfiguration {
    return this.createBasicGPT({
      name: 'Code Interpreter GPT',
      description: 'A GPT with code interpreter capabilities',
      systemPrompt: 'You are a programming assistant that can execute code.',
      capabilities: {
        codeInterpreter: true,
        webBrowsing: false,
        imageGeneration: false,
        fileSearch: {
          enabled: false,
        },
      },
      ...overrides,
    })
  },

  /**
   * Create a GPT with web browsing enabled
   */
  createWebBrowsingGPT(overrides: Partial<GPTConfiguration> = {}): GPTConfiguration {
    return this.createBasicGPT({
      name: 'Web Browsing GPT',
      description: 'A GPT with web browsing capabilities',
      systemPrompt: 'You are a research assistant that can browse the web.',
      capabilities: {
        codeInterpreter: false,
        webBrowsing: true,
        imageGeneration: false,
        fileSearch: {
          enabled: false,
        },
      },
      ...overrides,
    })
  },

  /**
   * Create a GPT with all capabilities enabled
   */
  createFullFeaturedGPT(overrides: Partial<GPTConfiguration> = {}): GPTConfiguration {
    return this.createBasicGPT({
      name: 'Full Featured GPT',
      description: 'A GPT with all capabilities enabled',
      systemPrompt: 'You are an advanced assistant with all capabilities enabled.',
      capabilities: {
        codeInterpreter: true,
        webBrowsing: true,
        imageGeneration: true,
        fileSearch: {
          enabled: true,
        },
      },
      ...overrides,
    })
  },

  /**
   * Create a GPT with knowledge URLs
   */
  createKnowledgeGPT(overrides: Partial<GPTConfiguration> = {}): GPTConfiguration {
    return this.createBasicGPT({
      name: 'Knowledge GPT',
      description: 'A GPT with knowledge sources',
      systemPrompt: 'You are an assistant with access to specific knowledge sources.',
      knowledge: {
        files: [],
        urls: ['https://docs.example.com/api', 'https://guides.example.com/best-practices'],
      },
      ...overrides,
    })
  },

  /**
   * Create multiple test GPTs
   */
  createMultipleGPTs(count: number): GPTConfiguration[] {
    const gpts: GPTConfiguration[] = []

    for (let i = 0; i < count; i++) {
      gpts.push(
        this.createBasicGPT({
          name: `Test GPT ${i + 1}`,
          description: `Test GPT number ${i + 1} for automated testing`,
        }),
      )
    }

    return gpts
  },

  /**
   * Create test messages for chat testing
   */
  createTestMessages() {
    return [
      'Hello, can you help me?',
      'What can you do?',
      'Tell me a joke',
      'Explain quantum computing in simple terms',
      'What is the weather like today?',
    ]
  },

  /**
   * Create invalid GPT configuration for negative testing
   */
  createInvalidGPT(): Partial<GPTConfiguration> {
    return {
      name: '', // Invalid: empty name
      description: 'Test GPT with invalid configuration',
      systemPrompt: 'A'.repeat(10000), // Invalid: too long
    }
  },
}
