import {describe, test, expect} from 'vitest';
import {
  GPTCapabilitiesSchema,
  LocalFileSchema,
  MCPToolSchema,
  GPTConfigurationSchema,
  ConversationMessageSchema,
  ConversationSchema,
} from '../gpt';
import {v4 as uuidv4} from 'uuid';

describe('GPT Type Schemas', () => {
  describe('GPTCapabilitiesSchema', () => {
    test('should validate valid capabilities', () => {
      const validCapabilities = {
        codeInterpreter: true,
        webBrowsing: false,
        imageGeneration: true,
        fileSearch: {
          enabled: false,
        },
      };
      expect(() => GPTCapabilitiesSchema.parse(validCapabilities)).not.toThrow();
    });

    test('should provide default values for missing fields', () => {
      const result = GPTCapabilitiesSchema.parse({fileSearch: {enabled: false}});
      expect(result).toEqual({
        codeInterpreter: false,
        webBrowsing: false,
        imageGeneration: false,
        fileSearch: {
          enabled: false,
        },
      });
    });

    test('should reject invalid boolean values', () => {
      const invalidCapabilities = {
        codeInterpreter: 'true',
        webBrowsing: 1,
        imageGeneration: null,
      };
      expect(() => GPTCapabilitiesSchema.parse(invalidCapabilities)).toThrow();
    });
  });

  describe('LocalFileSchema', () => {
    test('should validate valid file data', () => {
      const validFile = {
        name: 'test.txt',
        content: 'Hello, World!',
        type: 'text/plain',
        size: 1024,
        lastModified: Date.now(),
      };
      expect(() => LocalFileSchema.parse(validFile)).not.toThrow();
    });

    test('should reject missing required fields', () => {
      const invalidFile = {
        name: 'test.txt',
        content: 'Hello, World!',
      };
      expect(() => LocalFileSchema.parse(invalidFile)).toThrow();
    });

    test('should reject invalid types', () => {
      const invalidFile = {
        name: 123,
        content: null,
        type: {},
        size: '1024',
        lastModified: 'now',
      };
      expect(() => LocalFileSchema.parse(invalidFile)).toThrow();
    });
  });

  describe('MCPToolSchema', () => {
    test('should validate valid tool configuration', () => {
      const validTool = {
        name: 'TestTool',
        description: 'A test tool',
        schema: {type: 'object'},
        endpoint: 'https://api.test.com',
        authentication: {
          type: 'bearer',
          value: 'token123',
        },
      };
      expect(() => MCPToolSchema.parse(validTool)).not.toThrow();
    });

    test('should allow missing authentication', () => {
      const validTool = {
        name: 'TestTool',
        description: 'A test tool',
        schema: {type: 'object'},
        endpoint: 'https://api.test.com',
      };
      expect(() => MCPToolSchema.parse(validTool)).not.toThrow();
    });

    test('should reject invalid authentication type', () => {
      const invalidTool = {
        name: 'TestTool',
        description: 'A test tool',
        schema: {type: 'object'},
        endpoint: 'https://api.test.com',
        authentication: {
          type: 'invalid',
          value: 'token123',
        },
      };
      expect(() => MCPToolSchema.parse(invalidTool)).toThrow();
    });
  });

  describe('GPTConfigurationSchema', () => {
    test('should validate valid GPT configuration', () => {
      const validConfig = {
        id: uuidv4(),
        name: 'Test GPT',
        description: 'A test GPT',
        systemPrompt: 'You are a test assistant',
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
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      expect(() => GPTConfigurationSchema.parse(validConfig)).not.toThrow();
    });

    test('should validate configuration with tools and knowledge', () => {
      const validConfig = {
        id: uuidv4(),
        name: 'Test GPT',
        description: 'A test GPT',
        systemPrompt: 'You are a test assistant',
        tools: [
          {
            name: 'TestTool',
            description: 'A test tool',
            schema: {type: 'object'},
            endpoint: 'https://api.test.com',
          },
        ],
        knowledge: {
          files: [
            {
              name: 'test.txt',
              content: 'Hello, World!',
              type: 'text/plain',
              size: 1024,
              lastModified: Date.now(),
            },
          ],
          urls: ['https://test.com'],
        },
        capabilities: {
          codeInterpreter: true,
          webBrowsing: true,
          imageGeneration: false,
          fileSearch: {
            enabled: false,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      expect(() => GPTConfigurationSchema.parse(validConfig)).not.toThrow();
    });

    test('should reject invalid dates', () => {
      const invalidConfig = {
        id: uuidv4(),
        name: 'Test GPT',
        description: 'A test GPT',
        systemPrompt: 'You are a test assistant',
        tools: [],
        knowledge: {
          files: [],
          urls: [],
        },
        capabilities: {
          codeInterpreter: false,
          webBrowsing: false,
          imageGeneration: false,
        },
        createdAt: 'invalid date',
        updatedAt: 'invalid date',
        version: 1,
      };
      expect(() => GPTConfigurationSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('ConversationMessageSchema', () => {
    test('should validate valid message', () => {
      const validMessage = {
        id: uuidv4(),
        role: 'user',
        content: 'Hello, GPT!',
        timestamp: new Date(),
      };
      expect(() => ConversationMessageSchema.parse(validMessage)).not.toThrow();
    });

    test('should reject invalid role', () => {
      const invalidMessage = {
        id: uuidv4(),
        role: 'invalid',
        content: 'Hello, GPT!',
        timestamp: new Date(),
      };
      expect(() => ConversationMessageSchema.parse(invalidMessage)).toThrow();
    });

    test('should validate all valid roles', () => {
      const roles = ['user', 'assistant', 'system'];
      roles.forEach((role) => {
        const message = {
          id: uuidv4(),
          role,
          content: 'Test message',
          timestamp: new Date(),
        };
        expect(() => ConversationMessageSchema.parse(message)).not.toThrow();
      });
    });
  });

  describe('ConversationSchema', () => {
    test('should validate valid conversation', () => {
      const validConversation = {
        id: uuidv4(),
        gptId: uuidv4(),
        messages: [
          {
            id: uuidv4(),
            role: 'system',
            content: 'You are a test assistant',
            timestamp: new Date(),
          },
          {
            id: uuidv4(),
            role: 'user',
            content: 'Hello!',
            timestamp: new Date(),
          },
          {
            id: uuidv4(),
            role: 'assistant',
            content: 'Hi there!',
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(() => ConversationSchema.parse(validConversation)).not.toThrow();
    });

    test('should reject invalid UUIDs', () => {
      const invalidConversation = {
        id: 'not-a-uuid',
        gptId: 'not-a-uuid',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(() => ConversationSchema.parse(invalidConversation)).toThrow();
    });

    test('should reject invalid message array', () => {
      const invalidConversation = {
        id: uuidv4(),
        gptId: uuidv4(),
        messages: 'not an array',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(() => ConversationSchema.parse(invalidConversation)).toThrow();
    });
  });
});
