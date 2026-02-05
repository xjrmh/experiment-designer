import { MetricType, MetricCategory, MetricDirection, type Metric } from '@/types'

/**
 * Common metric definitions with typical baselines and variances
 * These serve as suggestions for users
 */
export const COMMON_METRICS: Partial<Metric>[] = [
  // Binary metrics
  {
    name: 'Conversion Rate',
    description: 'Percentage of users who complete a desired action',
    type: MetricType.BINARY,
    category: MetricCategory.PRIMARY,
    direction: MetricDirection.INCREASE,
    baseline: 0.05, // 5%
  },
  {
    name: 'Click-Through Rate (CTR)',
    description: 'Percentage of users who click on a specific element',
    type: MetricType.BINARY,
    category: MetricCategory.PRIMARY,
    direction: MetricDirection.INCREASE,
    baseline: 0.03, // 3%
  },
  {
    name: 'Bounce Rate',
    description: 'Percentage of users who leave without interaction',
    type: MetricType.BINARY,
    category: MetricCategory.GUARDRAIL,
    direction: MetricDirection.DECREASE,
    baseline: 0.4, // 40%
  },
  {
    name: 'Signup Rate',
    description: 'Percentage of visitors who create an account',
    type: MetricType.BINARY,
    category: MetricCategory.PRIMARY,
    direction: MetricDirection.INCREASE,
    baseline: 0.02, // 2%
  },
  {
    name: 'Retention Rate (7-day)',
    description: 'Percentage of users who return within 7 days',
    type: MetricType.BINARY,
    category: MetricCategory.PRIMARY,
    direction: MetricDirection.INCREASE,
    baseline: 0.25, // 25%
  },

  // Continuous metrics
  {
    name: 'Revenue per User',
    description: 'Average revenue generated per user',
    type: MetricType.CONTINUOUS,
    category: MetricCategory.PRIMARY,
    direction: MetricDirection.INCREASE,
    baseline: 50,
    variance: 2500, // stdDev = 50
  },
  {
    name: 'Average Order Value',
    description: 'Average value of each transaction',
    type: MetricType.CONTINUOUS,
    category: MetricCategory.PRIMARY,
    direction: MetricDirection.INCREASE,
    baseline: 75,
    variance: 1875, // stdDev = 43.3
  },
  {
    name: 'Session Duration',
    description: 'Average time users spend in a session (seconds)',
    type: MetricType.CONTINUOUS,
    category: MetricCategory.SECONDARY,
    direction: MetricDirection.INCREASE,
    baseline: 180, // 3 minutes
    variance: 14400, // stdDev = 120
  },
  {
    name: 'Page Load Time',
    description: 'Average time to load page (milliseconds)',
    type: MetricType.CONTINUOUS,
    category: MetricCategory.GUARDRAIL,
    direction: MetricDirection.DECREASE,
    baseline: 1500,
    variance: 250000, // stdDev = 500
  },
  {
    name: 'Engagement Score',
    description: 'Composite metric of user engagement',
    type: MetricType.CONTINUOUS,
    category: MetricCategory.SECONDARY,
    direction: MetricDirection.INCREASE,
    baseline: 7.5,
    variance: 6.25, // stdDev = 2.5
  },

  // Count metrics
  {
    name: 'Number of Purchases',
    description: 'Count of purchases per user',
    type: MetricType.COUNT,
    category: MetricCategory.PRIMARY,
    direction: MetricDirection.INCREASE,
    baseline: 1.5,
  },
  {
    name: 'Pages per Session',
    description: 'Number of pages viewed per session',
    type: MetricType.COUNT,
    category: MetricCategory.SECONDARY,
    direction: MetricDirection.INCREASE,
    baseline: 4,
  },
  {
    name: 'Error Count',
    description: 'Number of errors encountered per user',
    type: MetricType.COUNT,
    category: MetricCategory.GUARDRAIL,
    direction: MetricDirection.DECREASE,
    baseline: 0.1,
  },
  {
    name: 'Feature Usage Count',
    description: 'Number of times a feature is used per user',
    type: MetricType.COUNT,
    category: MetricCategory.SECONDARY,
    direction: MetricDirection.INCREASE,
    baseline: 2.5,
  },
]

/**
 * Get metrics by category
 */
export function getMetricsByCategory(category: MetricCategory): Partial<Metric>[] {
  return COMMON_METRICS.filter((m) => m.category === category)
}

/**
 * Get metrics by type
 */
export function getMetricsByType(type: MetricType): Partial<Metric>[] {
  return COMMON_METRICS.filter((m) => m.type === type)
}

/**
 * Search metrics by name or description
 */
export function searchMetrics(query: string): Partial<Metric>[] {
  const lowerQuery = query.toLowerCase()
  return COMMON_METRICS.filter(
    (m) =>
      m.name?.toLowerCase().includes(lowerQuery) ||
      m.description?.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Create a new metric with defaults
 */
export function createMetric(partial: Partial<Metric>): Metric {
  return {
    id: crypto.randomUUID(),
    name: partial.name || 'New Metric',
    description: partial.description,
    category: partial.category || MetricCategory.SECONDARY,
    type: partial.type || MetricType.CONTINUOUS,
    direction: partial.direction || MetricDirection.INCREASE,
    baseline: partial.baseline || 0,
    variance: partial.variance,
    stdDev: partial.stdDev,
    sampleSize: partial.sampleSize,
  }
}
