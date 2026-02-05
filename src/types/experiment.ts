// Experiment type enumeration
export enum ExperimentType {
  AB_TEST = 'AB_TEST',
  CLUSTER = 'CLUSTER',
  SWITCHBACK = 'SWITCHBACK',
  CAUSAL_INFERENCE = 'CAUSAL_INFERENCE',
  FACTORIAL = 'FACTORIAL',
  MAB = 'MAB', // Multi-Armed Bandit
}

// Metric types
export enum MetricType {
  BINARY = 'BINARY', // e.g., conversion rate
  CONTINUOUS = 'CONTINUOUS', // e.g., revenue
  COUNT = 'COUNT', // e.g., number of purchases
}

// Metric categories
export enum MetricCategory {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  GUARDRAIL = 'GUARDRAIL',
  MONITOR = 'MONITOR',
}

// Direction for metrics
export enum MetricDirection {
  INCREASE = 'INCREASE', // Higher is better
  DECREASE = 'DECREASE', // Lower is better
  EITHER = 'EITHER', // Either direction is interesting
}

// Metric interface
export interface Metric {
  id: string
  name: string
  description?: string
  category: MetricCategory
  type: MetricType
  direction: MetricDirection
  baseline: number // Baseline value (mean for continuous, rate for binary)
  variance?: number // Variance (for continuous metrics)
  stdDev?: number // Standard deviation (alternative to variance)
  sampleSize?: number // Historical sample size
}

// Statistical parameters
export interface StatisticalParams {
  alpha: number // Significance level (default 0.05)
  power: number // Statistical power (default 0.8)
  mde: number // Minimum detectable effect (%)
  mdeType: 'relative' | 'absolute' // Relative % or absolute value
  trafficAllocation: number[] // e.g., [50, 50] or [90, 10]
  variants: number // Number of variants (including control)
}

// Sample size result
export interface SampleSizeResult {
  sampleSizePerVariant: number
  totalSampleSize: number
  calculatedPower: number
  calculatedMDE: number
  assumptions: string[]
  warnings?: string[]
}

// Duration estimation
export interface DurationEstimate {
  days: number
  weeks: number
  startDate?: Date
  endDate?: Date
  trafficPerDay: number
  assumptions: string[]
}

// Randomization configuration
export enum RandomizationUnit {
  USER_ID = 'USER_ID',
  SESSION = 'SESSION',
  DEVICE = 'DEVICE',
  REQUEST = 'REQUEST',
  CLUSTER = 'CLUSTER',
}

export enum BucketingStrategy {
  HASH_BASED = 'HASH_BASED',
  RANDOM = 'RANDOM',
}

export interface StratificationVariable {
  name: string
  values: string[]
}

export interface RandomizationConfig {
  unit: RandomizationUnit
  bucketingStrategy: BucketingStrategy
  consistentAssignment: boolean
  stratificationVariables: StratificationVariable[]
  sampleRatio: number[] // e.g., [50, 50]
  rationale?: string
}

// Variance reduction
export interface VarianceReductionConfig {
  useCUPED: boolean
  cupedCovariate?: string
  cupedExpectedReduction?: number // Expected variance reduction %
  useStratification: boolean
  stratificationVariables: string[]
  useMatchedPairs: boolean
  useBlocking: boolean
}

// Risk assessment
export enum RiskLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface RiskAssessment {
  riskLevel: RiskLevel
  blastRadius: number // % of users affected
  potentialNegativeImpacts: string[]
  mitigationStrategies: string[]
  gradualRolloutPlan?: string
  rollbackTriggers: string[]
  circuitBreakers: string[]
  preLaunchChecklist: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  label: string
  description?: string
  completed: boolean
  required: boolean
}

// Monitoring configuration
export enum StoppingRuleType {
  SUCCESS = 'SUCCESS',
  FUTILITY = 'FUTILITY',
  HARM = 'HARM',
}

export enum StatisticalTest {
  T_TEST = 'T_TEST',
  CHI_SQUARE = 'CHI_SQUARE',
  MANN_WHITNEY = 'MANN_WHITNEY',
  WELCH_T_TEST = 'WELCH_T_TEST',
}

export enum MultipleTestingCorrection {
  NONE = 'NONE',
  BONFERRONI = 'BONFERRONI',
  BENJAMINI_HOCHBERG = 'BENJAMINI_HOCHBERG',
  HOLM = 'HOLM',
}

export interface StoppingRule {
  type: StoppingRuleType
  description: string
  threshold?: number
  metricId?: string
}

export interface MonitoringConfig {
  metricsToTrack: string[] // Metric IDs
  refreshFrequency: number // Minutes
  alertThresholds: Record<string, number>
  stoppingRules: StoppingRule[]
  srmThreshold: number // Sample ratio mismatch threshold
  statisticalTests: Record<string, StatisticalTest> // Metric ID -> test type
  multipleTestingCorrection: MultipleTestingCorrection
  decisionCriteria: {
    ship: string[]
    iterate: string[]
    kill: string[]
  }
}

// Experiment template
export interface ExperimentTemplate {
  type: ExperimentType
  name: string
  description: string
  useCases: string[]
  pros: string[]
  cons: string[]
  whenToUse: string[]
  examples: string[]
  defaultParams: Partial<StatisticalParams>
  recommendedMetrics: Partial<Metric>[]
  recommendedRandomization: Partial<RandomizationConfig>
  icon?: string
}

// Full experiment configuration
export interface ExperimentConfig {
  id: string
  name: string
  description: string
  hypothesis?: string
  experimentType: ExperimentType | null
  metrics: Metric[]
  statisticalParams: StatisticalParams
  sampleSizeResult: SampleSizeResult | null
  durationEstimate: DurationEstimate | null
  randomization: RandomizationConfig
  varianceReduction: VarianceReductionConfig
  riskAssessment: RiskAssessment
  monitoring: MonitoringConfig
  createdAt: Date
  updatedAt: Date
}

// Cost estimation
export interface CostEstimate {
  infrastructureCost: number
  engineeringTime: number // Hours
  totalCost: number
  currency: string
  assumptions: string[]
}

// Export formats
export enum ExportFormat {
  JSON = 'JSON',
  MARKDOWN = 'MARKDOWN',
  PDF = 'PDF',
}
