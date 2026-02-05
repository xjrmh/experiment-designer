import { useExperimentStore } from '@/store/experimentStore'

/**
 * Hook to access experiment state and actions
 */
export function useExperiment() {
  return useExperimentStore()
}
