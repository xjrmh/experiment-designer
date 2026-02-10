import {
  ExperimentType,
  MetricCategory,
  type Metric,
  type MonitoringConfig,
  type RandomizationConfig,
  type RiskAssessment,
  type StatisticalParams,
  type VarianceReductionConfig,
} from '@/types'

const CAUSAL_METHODS = new Set(['did', 'rdd', 'psm', 'iv'])

export interface StepValidationState {
  experimentType: ExperimentType | null
  metrics: Metric[]
  statisticalParams: StatisticalParams
  dailyTraffic: number
  randomization: RandomizationConfig
  varianceReduction: VarianceReductionConfig
  riskAssessment: RiskAssessment
  monitoring: MonitoringConfig
  name: string
  hypothesis?: string
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonEmptyText(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasPrimaryMetric(metrics: Metric[]): boolean {
  return metrics.some((metric) => metric.category === MetricCategory.PRIMARY)
}

function hasValidTrafficAllocation(allocation: number[], variants: number): boolean {
  if (!Number.isInteger(variants) || variants < 2) return false
  if (allocation.length < variants) return false

  const relevantAllocations = allocation.slice(0, variants)
  if (relevantAllocations.some((value) => !isFiniteNumber(value) || value <= 0 || value > 100)) {
    return false
  }

  const totalAllocation = relevantAllocations.reduce((sum, value) => sum + value, 0)
  return Math.abs(totalAllocation - 100) < 0.0001
}

function isStep3TypeSpecificComplete(state: StepValidationState): boolean {
  const params = state.statisticalParams.typeSpecificParams || {}

  switch (state.experimentType) {
    case ExperimentType.CLUSTER:
      return (
        isFiniteNumber(params.icc) &&
        params.icc > 0 &&
        params.icc <= 1 &&
        isFiniteNumber(params.clusterSize) &&
        params.clusterSize >= 2
      )

    case ExperimentType.SWITCHBACK:
      return (
        isFiniteNumber(params.numPeriods) &&
        params.numPeriods >= 4 &&
        isFiniteNumber(params.periodLength) &&
        params.periodLength >= 1 &&
        isFiniteNumber(params.autocorrelation) &&
        params.autocorrelation >= 0 &&
        params.autocorrelation < 1
      )

    case ExperimentType.FACTORIAL:
      return (
        Array.isArray(params.factors) &&
        params.factors.length >= 2 &&
        params.factors.every((factor) => isNonEmptyText(factor.name) && isFiniteNumber(factor.levels) && factor.levels >= 2)
      )

    case ExperimentType.MAB:
      return (
        isFiniteNumber(params.numArms) &&
        params.numArms >= 2 &&
        isFiniteNumber(params.horizon) &&
        params.horizon >= 1000 &&
        isFiniteNumber(params.explorationRate) &&
        params.explorationRate > 0 &&
        params.explorationRate <= 0.5
      )

    case ExperimentType.CAUSAL_INFERENCE: {
      if (!params.causalMethod || !CAUSAL_METHODS.has(params.causalMethod)) return false
      if (params.causalMethod === 'did') {
        return isFiniteNumber(params.serialCorrelation) && params.serialCorrelation >= 0 && params.serialCorrelation < 1
      }
      if (params.causalMethod === 'rdd') {
        return isFiniteNumber(params.bandwidth) && params.bandwidth > 0
      }
      return true
    }

    default:
      return true
  }
}

function isStep1Complete(state: StepValidationState): boolean {
  return state.experimentType !== null
}

function isStep2Complete(state: StepValidationState): boolean {
  return isStep1Complete(state) && hasPrimaryMetric(state.metrics)
}

function isStep3Complete(state: StepValidationState): boolean {
  const params = state.statisticalParams
  const hasValidCoreParams =
    isFiniteNumber(params.alpha) &&
    params.alpha > 0 &&
    params.alpha < 1 &&
    isFiniteNumber(params.power) &&
    params.power > 0 &&
    params.power < 1 &&
    isFiniteNumber(params.mde) &&
    params.mde > 0 &&
    isFiniteNumber(state.dailyTraffic) &&
    state.dailyTraffic > 0 &&
    hasValidTrafficAllocation(params.trafficAllocation, params.variants)

  return isStep2Complete(state) && hasValidCoreParams && isStep3TypeSpecificComplete(state)
}

function isStep4Complete(state: StepValidationState): boolean {
  const hasValidStratificationVariables = state.randomization.stratificationVariables.every((variable) => isNonEmptyText(variable.name))
  return (
    isStep1Complete(state) &&
    Boolean(state.randomization.unit) &&
    Boolean(state.randomization.bucketingStrategy) &&
    typeof state.randomization.consistentAssignment === 'boolean' &&
    hasValidStratificationVariables
  )
}

function isStep5Complete(state: StepValidationState): boolean {
  if (!isStep1Complete(state)) return false
  if (state.experimentType === ExperimentType.MAB) return true

  const varianceReduction = state.varianceReduction
  const cupedComplete =
    !varianceReduction.useCUPED ||
    (
      isNonEmptyText(varianceReduction.cupedCovariate) &&
      isFiniteNumber(varianceReduction.cupedExpectedReduction) &&
      varianceReduction.cupedExpectedReduction >= 0 &&
      varianceReduction.cupedExpectedReduction <= 70
    )

  const stratificationComplete =
    !varianceReduction.useStratification ||
    (
      varianceReduction.stratificationVariables.length > 0 &&
      varianceReduction.stratificationVariables.every((variable) => isNonEmptyText(variable))
    )

  return cupedComplete && stratificationComplete
}

function isStep6Complete(state: StepValidationState): boolean {
  const requiredItems = state.riskAssessment.preLaunchChecklist.filter((item) => item.required)
  return (
    isStep1Complete(state) &&
    isFiniteNumber(state.riskAssessment.blastRadius) &&
    state.riskAssessment.blastRadius >= 0 &&
    state.riskAssessment.blastRadius <= 100 &&
    requiredItems.every((item) => item.completed)
  )
}

function isStep7Complete(state: StepValidationState): boolean {
  return (
    isStep1Complete(state) &&
    Number.isInteger(state.monitoring.refreshFrequency) &&
    state.monitoring.refreshFrequency > 0 &&
    isFiniteNumber(state.monitoring.srmThreshold) &&
    state.monitoring.srmThreshold > 0 &&
    state.monitoring.srmThreshold < 1 &&
    state.monitoring.stoppingRules.every((rule) => isNonEmptyText(rule.description))
  )
}

function isStep8Complete(state: StepValidationState): boolean {
  return isStep1Complete(state) && isNonEmptyText(state.name) && isNonEmptyText(state.hypothesis)
}

export function isStepComplete(step: number, state: StepValidationState): boolean {
  switch (step) {
    case 1:
      return isStep1Complete(state)
    case 2:
      return isStep2Complete(state)
    case 3:
      return isStep3Complete(state)
    case 4:
      return isStep4Complete(state)
    case 5:
      return isStep5Complete(state)
    case 6:
      return isStep6Complete(state)
    case 7:
      return isStep7Complete(state)
    case 8:
      return isStep8Complete(state)
    default:
      return false
  }
}
