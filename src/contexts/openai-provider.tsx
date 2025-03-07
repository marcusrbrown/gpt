import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {openAIService} from '../services/openai-service';

interface OpenAIContextValue {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  isInitialized: boolean;
}

const OpenAIContext = createContext<OpenAIContextValue | undefined>(undefined);

interface OpenAIProviderProps {
  children: ReactNode;
}

export function OpenAIProvider({children}: OpenAIProviderProps) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize API key from local storage
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem('openai_api_key');
      if (storedKey) {
        setApiKeyState(storedKey);
        openAIService.setApiKey(storedKey);
      }
    } catch (error) {
      console.error('Error retrieving API key from storage:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const setApiKey = (key: string) => {
    try {
      setApiKeyState(key);
      openAIService.setApiKey(key);
      localStorage.setItem('openai_api_key', key);
    } catch (error) {
      console.error('Error storing API key:', error);
    }
  };

  const clearApiKey = () => {
    try {
      setApiKeyState(null);
      openAIService.setApiKey('');
      localStorage.removeItem('openai_api_key');
    } catch (error) {
      console.error('Error clearing API key:', error);
    }
  };

  return (
    <OpenAIContext.Provider value={{apiKey, setApiKey, clearApiKey, isInitialized}}>{children}</OpenAIContext.Provider>
  );
}

export function useOpenAI() {
  const context = useContext(OpenAIContext);
  if (context === undefined) {
    throw new Error('useOpenAI must be used within an OpenAIProvider');
  }
  return context;
}
