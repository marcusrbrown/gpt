import {useContext} from 'react';
import {StorageContext, StorageContextType} from '../contexts/storage-context';

/**
 * Hook to access storage management functionality
 *
 * Provides access to methods for managing GPT configurations and conversations
 * with proper error handling and loading state management.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { getAllGPTs, saveGPT, isLoading, error } = useStorage();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   const gpts = getAllGPTs();
 *   // ...
 * }
 * ```
 *
 * @returns Storage context with methods for managing GPT configurations and conversations
 * @throws Error if used outside of a StorageProvider
 */
export function useStorage(): StorageContextType {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}
