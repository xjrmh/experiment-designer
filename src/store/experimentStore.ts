import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ExperimentConfig,
  ExperimentType,
  Metric,
  StatisticalParams,
  SampleSizeResult,
  DurationEstimate,
  RandomizationConfig,
  VarianceReductionConfig,
  RiskAssessment,
  MonitoringConfig,
  TypeSpecificParams,
  RandomizationUnit,
  BucketingStrategy,
  RiskLevel,
  MultipleTestingCorrection,
} from '@/types'
import { DEFAULT_ALPHA, DEFAULT_POWER, DEFAULT_MDE, DEFAULT_TRAFFIC_ALLOCATION, DEFAULT_VARIANTS, getTypeSpecificDefaults, BASE_CHECKLIST, TYPE_CHECKLIST_ITEMS } from '@/constants/defaults'
import { EXPERIMENT_TEMPLATES } from '@/constants/experimentTypes'

interface ExperimentState extends Omit<ExperimentConfig, 'id' | 'createdAt' | 'updatedAt'> {
  currentStep: number
  dailyTraffic: number
  aiUpdatedFields: string[]
  aiUpdatedMetricIds: string[]
  aiUpdatedSteps: number[]
  // Actions
  setCurrentStep: (step: number) => void
  setExperimentType: (type: ExperimentType) => void
  setName: (name: string) => void
  setDescription: (description: string) => void
  setHypothesis: (hypothesis: string) => void
  addMetric: (metric: Metric) => void
  updateMetric: (id: string, updates: Partial<Metric>) => void
  removeMetric: (id: string) => void
  updateStatisticalParams: (params: Partial<StatisticalParams>) => void
  updateTypeSpecificParams: (params: Partial<TypeSpecificParams>) => void
  setSampleSizeResult: (result: SampleSizeResult) => void
  setDurationEstimate: (estimate: DurationEstimate) => void
  setDailyTraffic: (traffic: number) => void
  updateRandomization: (config: Partial<RandomizationConfig>) => void
  updateVarianceReduction: (config: Partial<VarianceReductionConfig>) => void
  updateRiskAssessment: (assessment: Partial<RiskAssessment>) => void
  updateMonitoring: (config: Partial<MonitoringConfig>) => void
  toggleChecklistItem: (id: string) => void
  markAIUpdates: (payload: { fields?: string[]; metricIds?: string[]; steps?: number[] }) => void
  clearAIFieldHighlight: (field: string) => void
  clearAIMetricHighlight: (metricId: string) => void
  clearAIStepHighlight: (step: number) => void
  clearAIHighlights: () => void
  reset: () => void
  nextStep: () => void
  previousStep: () => void
}

const initialState = {
  currentStep: 1,
  name: '',
  description: '',
  hypothesis: '',
  experimentType: null,
  metrics: [],
  statisticalParams: {
    alpha: DEFAULT_ALPHA,
    power: DEFAULT_POWER,
    mde: DEFAULT_MDE,
    mdeType: 'relative' as const,
    trafficAllocation: DEFAULT_TRAFFIC_ALLOCATION,
    variants: DEFAULT_VARIANTS,
    typeSpecificParams: {},
  },
  sampleSizeResult: null,
  durationEstimate: null,
  dailyTraffic: 10000,
  aiUpdatedFields: [],
  aiUpdatedMetricIds: [],
  aiUpdatedSteps: [],
  randomization: {
    unit: 'USER_ID' as RandomizationUnit,
    bucketingStrategy: 'HASH_BASED' as BucketingStrategy,
    consistentAssignment: true,
    stratificationVariables: [],
    sampleRatio: [50, 50],
  },
  varianceReduction: {
    useCUPED: false,
    cupedCovariate: undefined,
    cupedExpectedReduction: 0,
    useStratification: false,
    stratificationVariables: [],
    useMatchedPairs: false,
    useBlocking: false,
  },
  riskAssessment: {
    riskLevel: 'MEDIUM' as RiskLevel,
    blastRadius: 50,
    potentialNegativeImpacts: [],
    mitigationStrategies: [],
    rollbackTriggers: [],
    circuitBreakers: [],
    preLaunchChecklist: [
      { id: '1', label: 'Logging instrumented', description: 'All metrics are being logged correctly', completed: false, required: true },
      { id: '2', label: 'AA test passed', description: 'Verified no SRM in AA test', completed: false, required: true },
      { id: '3', label: 'Alerts configured', description: 'Monitoring alerts are set up', completed: false, required: true },
      { id: '4', label: 'Rollback plan documented', description: 'Clear rollback procedure exists', completed: false, required: true },
      { id: '5', label: 'Stakeholder approval', description: 'All stakeholders have approved', completed: false, required: true },
    ],
  },
  monitoring: {
    metricsToTrack: [],
    refreshFrequency: 60,
    alertThresholds: {},
    stoppingRules: [],
    srmThreshold: 0.001,
    statisticalTests: {},
    multipleTestingCorrection: 'BONFERRONI' as MultipleTestingCorrection,
    decisionCriteria: {
      ship: [],
      iterate: [],
      kill: [],
    },
  },
}

export const useExperimentStore = create<ExperimentState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentStep: (step) => set({ currentStep: step }),

      setExperimentType: (type) =>
        set((state) => {
          const template = EXPERIMENT_TEMPLATES[type]
          const typeDefaults = getTypeSpecificDefaults(type)
          const typeChecklist = TYPE_CHECKLIST_ITEMS[type] || []
          return {
            experimentType: type,
            randomization: {
              ...state.randomization,
              ...template.recommendedRandomization,
            },
            statisticalParams: {
              ...state.statisticalParams,
              ...template.defaultParams,
              typeSpecificParams: typeDefaults,
            },
            riskAssessment: {
              ...state.riskAssessment,
              preLaunchChecklist: [...BASE_CHECKLIST, ...typeChecklist],
            },
          }
        }),

      setName: (name) => set({ name }),

      setDescription: (description) => set({ description }),

      setHypothesis: (hypothesis) => set({ hypothesis }),

      addMetric: (metric) =>
        set((state) => ({
          metrics: [...state.metrics, metric],
        })),

      updateMetric: (id, updates) =>
        set((state) => ({
          metrics: state.metrics.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      removeMetric: (id) =>
        set((state) => ({
          metrics: state.metrics.filter((m) => m.id !== id),
        })),

      updateStatisticalParams: (params) =>
        set((state) => ({
          statisticalParams: { ...state.statisticalParams, ...params },
        })),

      updateTypeSpecificParams: (params) =>
        set((state) => ({
          statisticalParams: {
            ...state.statisticalParams,
            typeSpecificParams: {
              ...state.statisticalParams.typeSpecificParams,
              ...params,
            },
          },
        })),

      setSampleSizeResult: (result) => set({ sampleSizeResult: result }),

      setDurationEstimate: (estimate) => set({ durationEstimate: estimate }),

      setDailyTraffic: (traffic) => set({ dailyTraffic: traffic }),

      updateRandomization: (config) =>
        set((state) => ({
          randomization: { ...state.randomization, ...config },
        })),

      updateVarianceReduction: (config) =>
        set((state) => ({
          varianceReduction: { ...state.varianceReduction, ...config },
        })),

      updateRiskAssessment: (assessment) =>
        set((state) => ({
          riskAssessment: { ...state.riskAssessment, ...assessment },
        })),

      updateMonitoring: (config) =>
        set((state) => ({
          monitoring: { ...state.monitoring, ...config },
        })),

      toggleChecklistItem: (id) =>
        set((state) => ({
          riskAssessment: {
            ...state.riskAssessment,
            preLaunchChecklist: state.riskAssessment.preLaunchChecklist.map((item) =>
              item.id === id ? { ...item, completed: !item.completed } : item
            ),
          },
        })),

      markAIUpdates: ({ fields = [], metricIds = [], steps = [] }) =>
        set({
          aiUpdatedFields: Array.from(new Set(fields)),
          aiUpdatedMetricIds: Array.from(new Set(metricIds)),
          aiUpdatedSteps: Array.from(new Set(steps)).sort((a, b) => a - b),
        }),

      clearAIFieldHighlight: (field) =>
        set((state) => ({
          aiUpdatedFields: state.aiUpdatedFields.filter((f) => f !== field),
        })),

      clearAIMetricHighlight: (metricId) =>
        set((state) => ({
          aiUpdatedMetricIds: state.aiUpdatedMetricIds.filter((id) => id !== metricId),
        })),

      clearAIStepHighlight: (step) =>
        set((state) => ({
          aiUpdatedSteps: state.aiUpdatedSteps.filter((s) => s !== step),
        })),

      clearAIHighlights: () =>
        set({
          aiUpdatedFields: [],
          aiUpdatedMetricIds: [],
          aiUpdatedSteps: [],
        }),

      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, 8),
        })),

      previousStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 1),
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'experiment-designer-storage',
    }
  )
)
