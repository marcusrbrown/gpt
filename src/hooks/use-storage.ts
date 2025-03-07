import {useContext} from 'react';
import {StorageContext, StorageContextType} from '../contexts/storage-context';

export function useStorage(): StorageContextType {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}
