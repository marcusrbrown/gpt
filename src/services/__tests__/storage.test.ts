import {vi} from 'vitest';
import {LocalStorageService} from '../storage';
import {GPTConfiguration, Conversation} from '../../types/gpt';
import {v4 as uuidv4} from 'uuid';

describe('LocalStorageService', () => {
  let storage: LocalStorageService;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    storage = new LocalStorageService();
  });

  const mockGPT: GPTConfiguration = {
    id: uuidv4(),
    name: 'Test GPT',
    description: 'Test Description',
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
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  const mockConversation: Conversation = {
    id: uuidv4(),
    gptId: mockGPT.id,
    messages: [
      {
        id: uuidv4(),
        role: 'system',
        content: 'System message',
        timestamp: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GPT Configuration Operations', () => {
    test('should save and retrieve a GPT configuration', () => {
      storage.saveGPT(mockGPT);
      const retrieved = storage.getGPT(mockGPT.id);

      expect(localStorage.setItem).toHaveBeenCalled();
      expect(localStorage.getItem).toHaveBeenCalled();
      expect(retrieved).toEqual(mockGPT);
    });

    test('should return undefined for non-existent GPT', () => {
      const retrieved = storage.getGPT('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    test('should return all saved GPTs', () => {
      const mockGPT2 = {...mockGPT, id: uuidv4()};
      storage.saveGPT(mockGPT);
      storage.saveGPT(mockGPT2);
      const allGPTs = storage.getAllGPTs();
      expect(allGPTs).toHaveLength(2);
      expect(allGPTs).toEqual(expect.arrayContaining([mockGPT, mockGPT2]));
    });

    test('should delete a GPT configuration', () => {
      storage.saveGPT(mockGPT);
      storage.deleteGPT(mockGPT.id);
      const retrieved = storage.getGPT(mockGPT.id);
      expect(retrieved).toBeUndefined();
    });

    test('should handle invalid GPT data gracefully', () => {
      const invalidGPT = {
        ...mockGPT,
        capabilities: undefined as unknown as GPTConfiguration['capabilities'],
      };
      expect(() => storage.saveGPT(invalidGPT)).toThrow();
    });
  });

  describe('Conversation Operations', () => {
    test('should save and retrieve a conversation', () => {
      storage.saveConversation(mockConversation);
      const retrieved = storage.getConversation(mockConversation.id);

      expect(localStorage.setItem).toHaveBeenCalled();
      expect(localStorage.getItem).toHaveBeenCalled();
      expect(retrieved).toEqual(mockConversation);
    });

    test('should return undefined for non-existent conversation', () => {
      const retrieved = storage.getConversation('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    test('should return all conversations for a GPT', () => {
      const mockConversation2 = {...mockConversation, id: uuidv4()};
      storage.saveConversation(mockConversation);
      storage.saveConversation(mockConversation2);
      const conversations = storage.getConversationsForGPT(mockGPT.id);
      expect(conversations).toHaveLength(2);
      expect(conversations).toEqual(expect.arrayContaining([mockConversation, mockConversation2]));
    });

    test('should delete a conversation', () => {
      storage.saveConversation(mockConversation);
      storage.deleteConversation(mockConversation.id);
      const retrieved = storage.getConversation(mockConversation.id);
      expect(retrieved).toBeUndefined();
    });

    test('should handle invalid conversation data gracefully', () => {
      const invalidConversation = {
        ...mockConversation,
        messages: undefined as unknown as Conversation['messages'],
      };
      expect(() => storage.saveConversation(invalidConversation)).toThrow();
    });
  });

  describe('Persistence', () => {
    test('should persist data across service instances', () => {
      storage.saveGPT(mockGPT);
      storage.saveConversation(mockConversation);

      // Create new instance to test persistence
      const newStorage = new LocalStorageService();

      expect(localStorage.setItem).toHaveBeenCalled();
      expect(localStorage.getItem).toHaveBeenCalled();
      expect(newStorage.getGPT(mockGPT.id)).toEqual(mockGPT);
      expect(newStorage.getConversation(mockConversation.id)).toEqual(mockConversation);
    });

    test('should clear all data', () => {
      storage.saveGPT(mockGPT);
      storage.saveConversation(mockConversation);

      storage.clearAll();

      expect(storage.getGPT(mockGPT.id)).toBeUndefined();
      expect(storage.getConversation(mockConversation.id)).toBeUndefined();
      expect(storage.getAllGPTs()).toHaveLength(0);
      expect(storage.getConversationsForGPT(mockGPT.id)).toHaveLength(0);
    });

    test('should handle localStorage errors', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      setItemSpy.mockImplementation(() => {
        throw new Error('Storage full');
      });

      expect(() => storage.saveGPT(mockGPT)).not.toThrow();
      expect(setItemSpy).toHaveBeenCalled();
    });
  });
});
