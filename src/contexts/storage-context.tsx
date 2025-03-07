import {createContext} from 'react';
import {GPTConfiguration, Conversation} from '../types/gpt';

export interface StorageContextType {
  getGPT: (id: string) => GPTConfiguration | undefined;
  getAllGPTs: () => GPTConfiguration[];
  saveGPT: (gpt: GPTConfiguration) => void;
  deleteGPT: (id: string) => void;
  getConversation: (id: string) => Conversation | undefined;
  getConversationsForGPT: (gptId: string) => Conversation[];
  saveConversation: (conversation: Conversation) => void;
  deleteConversation: (id: string) => void;
  clearAll: () => void;
  isLoading: boolean;
}

export const StorageContext = createContext<StorageContextType | undefined>(undefined);
