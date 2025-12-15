import type {CreateOpenAIService} from '../services/openai-service'
import {useMemo} from 'react'
import createOpenAIService from '../services/openai-service'

/**
 * Hook to access OpenAI service functionality
 *
 * Provides access to methods for interacting with the OpenAI API,
 * including deploying GPTs, managing assistants, and handling files.
 *
 * @example
 * ```tsx
 * function DeployGPTComponent({ gpt }) {
 *   const openAIService = useOpenAIService();
 *   const [isDeploying, setIsDeploying] = useState(false);
 *
 *   const handleDeploy = async () => {
 *     setIsDeploying(true);
 *     try {
 *       await openAIService.deployGPT(gpt);
 *       // Success handling
 *     } catch (error) {
 *       // Error handling
 *     } finally {
 *       setIsDeploying(false);
 *     }
 *   };
 *
 *   // ...
 * }
 * ```
 *
 * @returns OpenAI service for API interactions
 */
export function useOpenAIService(): CreateOpenAIService {
  // Create a memoized instance of the service to avoid recreating on each render
  const openAIService = useMemo(() => createOpenAIService(), [])

  return openAIService
}
