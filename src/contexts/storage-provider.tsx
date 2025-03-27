import {LocalStorageService} from '../services/storage';
import {ReactNode, useEffect, useState, useCallback} from 'react';
import {GPTConfiguration, Conversation} from '../types/gpt';
import {StorageContext} from './storage-context';

interface StorageProviderProps {
  children: ReactNode;
}

/**
 * Provider component for storage functionality
 * Manages access to the LocalStorageService and provides error handling
 */
export function StorageProvider({children}: StorageProviderProps) {
  const [storageService] = useState(() => new LocalStorageService());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [, setVersion] = useState(0);

  // Initialize storage service
  useEffect(() => {
    const initializeStorage = (): void => {
      try {
        setIsLoading(true);
        // Storage service is initialized in constructor
        setError(null);
      } catch (err) {
        console.error('Failed to initialize storage service:', err);
        setError(err instanceof Error ? err : new Error('Unknown storage initialization error'));
      } finally {
        setIsLoading(false);
      }
    };

    initializeStorage();
  }, []);

  // Wrap storage methods with error handling
  const getGPT = useCallback(
    (id: string): GPTConfiguration | undefined => {
      try {
        return storageService.getGPT(id);
      } catch (err) {
        console.error(`Error getting GPT ${id}:`, err);
        setError(err instanceof Error ? err : new Error(`Failed to get GPT ${id}`));
        return undefined;
      }
    },
    [storageService],
  );

  const getAllGPTs = useCallback((): GPTConfiguration[] => {
    try {
      return storageService.getAllGPTs();
    } catch (err) {
      console.error('Error getting all GPTs:', err);
      setError(err instanceof Error ? err : new Error('Failed to get all GPTs'));
      return [];
    }
  }, [storageService]);

  const saveGPT = useCallback(
    (gpt: GPTConfiguration): void => {
      try {
        storageService.saveGPT(gpt);
        setVersion((v) => v + 1); // Trigger re-render
      } catch (err) {
        console.error('Error saving GPT:', err);
        setError(err instanceof Error ? err : new Error('Failed to save GPT'));
        throw err; // Re-throw to allow component to handle the error
      }
    },
    [storageService],
  );

  const deleteGPT = useCallback(
    (id: string): void => {
      try {
        storageService.deleteGPT(id);
        setVersion((v) => v + 1); // Trigger re-render
      } catch (err) {
        console.error(`Error deleting GPT ${id}:`, err);
        setError(err instanceof Error ? err : new Error(`Failed to delete GPT ${id}`));
        throw err; // Re-throw to allow component to handle the error
      }
    },
    [storageService],
  );

  const getConversation = useCallback(
    (id: string): Conversation | undefined => {
      try {
        return storageService.getConversation(id);
      } catch (err) {
        console.error(`Error getting conversation ${id}:`, err);
        setError(err instanceof Error ? err : new Error(`Failed to get conversation ${id}`));
        return undefined;
      }
    },
    [storageService],
  );

  const getConversationsForGPT = useCallback(
    (gptId: string): Conversation[] => {
      try {
        return storageService.getConversationsForGPT(gptId);
      } catch (err) {
        console.error(`Error getting conversations for GPT ${gptId}:`, err);
        setError(err instanceof Error ? err : new Error(`Failed to get conversations for GPT ${gptId}`));
        return [];
      }
    },
    [storageService],
  );

  const saveConversation = useCallback(
    (conversation: Conversation): void => {
      try {
        storageService.saveConversation(conversation);
        setVersion((v) => v + 1); // Trigger re-render
      } catch (err) {
        console.error('Error saving conversation:', err);
        setError(err instanceof Error ? err : new Error('Failed to save conversation'));
        throw err; // Re-throw to allow component to handle the error
      }
    },
    [storageService],
  );

  const deleteConversation = useCallback(
    (id: string): void => {
      try {
        storageService.deleteConversation(id);
        setVersion((v) => v + 1); // Trigger re-render
      } catch (err) {
        console.error(`Error deleting conversation ${id}:`, err);
        setError(err instanceof Error ? err : new Error(`Failed to delete conversation ${id}`));
        throw err; // Re-throw to allow component to handle the error
      }
    },
    [storageService],
  );

  const clearAll = useCallback((): void => {
    try {
      storageService.clearAll();
      setVersion((v) => v + 1); // Trigger re-render
    } catch (err) {
      console.error('Error clearing storage:', err);
      setError(err instanceof Error ? err : new Error('Failed to clear storage'));
      throw err; // Re-throw to allow component to handle the error
    }
  }, [storageService]);

  // Create context value with memoized functions
  const value = {
    getGPT,
    getAllGPTs,
    saveGPT,
    deleteGPT,
    getConversation,
    getConversationsForGPT,
    saveConversation,
    deleteConversation,
    clearAll,
    isLoading,
    error,
  };

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
}
