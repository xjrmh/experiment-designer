// Default statistical parameters
export const DEFAULT_ALPHA = 0.05 // 5% significance level
export const DEFAULT_POWER = 0.8 // 80% power
export const DEFAULT_MDE = 5 // 5% minimum detectable effect
export const DEFAULT_TRAFFIC_ALLOCATION = [50, 50] // Equal split
export const DEFAULT_VARIANTS = 2 // Control + 1 treatment

// Minimum recommended values
export const MIN_SAMPLE_SIZE = 100
export const MIN_POWER = 0.7
export const MAX_ALPHA = 0.1
export const MIN_DURATION_DAYS = 7

// SRM detection
export const DEFAULT_SRM_THRESHOLD = 0.001 // p-value threshold for SRM detection

// Type-specific parameter defaults
import type { TypeSpecificParams, ExperimentType, ChecklistItem } from '@/types'

export function getTypeSpecificDefaults(type: ExperimentType): TypeSpecificParams {
  switch (type) {
    case 'CLUSTER':
      return { icc: 0.05, clusterSize: 50 }
    case 'SWITCHBACK':
      return { numPeriods: 14, periodLength: 24, autocorrelation: 0.3 }
    case 'FACTORIAL':
      return { factors: [{ name: 'Factor A', levels: 2 }, { name: 'Factor B', levels: 2 }], detectInteraction: false }
    case 'MAB':
      return { horizon: 100000, explorationRate: 0.1, numArms: 3 }
    case 'CAUSAL_INFERENCE':
      return { causalMethod: 'did', serialCorrelation: 0.2 }
    default:
      return {}
  }
}

// Base pre-launch checklist (shared across all types)
export const BASE_CHECKLIST: ChecklistItem[] = [
  { id: '1', label: 'Logging instrumented', description: 'All metrics are being logged correctly', completed: false, required: true },
  { id: '2', label: 'AA test passed', description: 'Verified no SRM in AA test', completed: false, required: true },
  { id: '3', label: 'Alerts configured', description: 'Monitoring alerts are set up', completed: false, required: true },
  { id: '4', label: 'Rollback plan documented', description: 'Clear rollback procedure exists', completed: false, required: true },
  { id: '5', label: 'Stakeholder approval', description: 'All stakeholders have approved', completed: false, required: true },
]

// Type-specific checklist items appended per experiment type
export const TYPE_CHECKLIST_ITEMS: Partial<Record<ExperimentType, ChecklistItem[]>> = {
  CLUSTER: [
    { id: 'cluster-1', label: 'Cluster definition validated', description: 'Cluster boundaries are well-defined and stable', completed: false, required: true },
    { id: 'cluster-2', label: 'Sufficient clusters available', description: 'At least 20+ clusters per arm for reliable inference', completed: false, required: false },
  ],
  SWITCHBACK: [
    { id: 'sb-1', label: 'Carryover effects assessed', description: 'Verified minimal carryover between periods', completed: false, required: true },
    { id: 'sb-2', label: 'Period length validated', description: 'Period length is appropriate for treatment effect to manifest', completed: false, required: false },
  ],
  MAB: [
    { id: 'mab-1', label: 'Exploration budget sufficient', description: 'Enough exploration rounds to identify best arm', completed: false, required: true },
    { id: 'mab-2', label: 'Reward function defined', description: 'Clear reward signal for the bandit algorithm', completed: false, required: true },
  ],
  CAUSAL_INFERENCE: [
    { id: 'ci-1', label: 'Identifying assumptions documented', description: 'Key assumptions (e.g., parallel trends for DiD) are stated and justified', completed: false, required: true },
  ],
  FACTORIAL: [
    { id: 'fact-1', label: 'Factor independence verified', description: 'Factors are not expected to conflict or interact negatively', completed: false, required: false },
  ],
}
