// Statistical distribution types
export interface Distribution {
  type: 'normal' | 'binomial' | 't' | 'chi-square'
  parameters: Record<string, number>
}

// Power analysis result
export interface PowerAnalysisResult {
  power: number
  sampleSize: number
  effectSize: number
  alpha: number
}

// Power curve data point
export interface PowerCurvePoint {
  sampleSize: number
  power: number
}

// MDE calculation result
export interface MDEResult {
  mdeAbsolute: number
  mdeRelative: number // Percentage
  sampleSize: number
  power: number
  alpha: number
}

// Variance calculation
export interface VarianceCalculation {
  variance: number
  stdDev: number
  standardError: number
  confidenceInterval: {
    lower: number
    upper: number
    level: number // e.g., 0.95 for 95% CI
  }
}

// Sample size calculation inputs
export interface SampleSizeInput {
  alpha: number
  power: number
  baseline: number
  mde: number
  mdeType: 'relative' | 'absolute'
  variance?: number
  stdDev?: number
  metricType: 'binary' | 'continuous' | 'count'
  variants: number
  trafficAllocation: number[]
}

// Duration calculation inputs
export interface DurationInput {
  totalSampleSize: number
  dailyTraffic: number
  trafficAllocation: number[]
  variants: number
  bufferDays?: number // Additional days for ramp-up/cool-down
}

// Statistical test result
export interface StatisticalTestResult {
  testType: string
  statistic: number
  pValue: number
  significant: boolean
  alpha: number
  confidenceInterval?: {
    lower: number
    upper: number
  }
  effectSize: number
  interpretation: string
}

// CUPED calculation
export interface CUPEDCalculation {
  adjustedVariance: number
  varianceReduction: number // Percentage
  theta: number // Adjustment coefficient
  covariate: string
  correlation: number // Between covariate and metric
}

// Sequential testing
export interface SequentialTestConfig {
  alpha: number
  beta: number
  spendingFunction: 'obrien-fleming' | 'pocock' | 'linear'
  maxLooks: number
  currentLook: number
  boundary: number
}

// Sample ratio mismatch detection
export interface SRMCheck {
  expectedRatio: number[]
  observedRatio: number[]
  chiSquareStatistic: number
  pValue: number
  passed: boolean
  threshold: number
}
