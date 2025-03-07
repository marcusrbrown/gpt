import {LocalStorageService} from '../services/storage';
import {ReactNode, useEffect, useState} from 'react';
import {GPTConfiguration, Conversation} from '../types/gpt';
import {StorageContext} from './storage-context';

interface StorageProviderProps {
  children: ReactNode;
}

export function StorageProvider({children}: StorageProviderProps) {
  const [storageService] = useState(() => new LocalStorageService());
  const [isLoading, setIsLoading] = useState(true);
  const [, setVersion] = useState(0);

  useEffect(() => {
    // Simulate async initialization
    setIsLoading(false);
  }, []);

  const value = {
    getGPT: (id: string) => storageService.getGPT(id),
    getAllGPTs: () => storageService.getAllGPTs(),
    saveGPT: (gpt: GPTConfiguration) => {
      storageService.saveGPT(gpt);
      setVersion((v) => v + 1); // Trigger re-render
    },
    deleteGPT: (id: string) => {
      storageService.deleteGPT(id);
      setVersion((v) => v + 1); // Trigger re-render
    },
    getConversation: (id: string) => storageService.getConversation(id),
    getConversationsForGPT: (gptId: string) => storageService.getConversationsForGPT(gptId),
    saveConversation: (conversation: Conversation) => {
      storageService.saveConversation(conversation);
      setVersion((v) => v + 1); // Trigger re-render
    },
    deleteConversation: (id: string) => {
      storageService.deleteConversation(id);
      setVersion((v) => v + 1); // Trigger re-render
    },
    clearAll: () => {
      storageService.clearAll();
      setVersion((v) => v + 1); // Trigger re-render
    },
    isLoading,
  };

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
}
