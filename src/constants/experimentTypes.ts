import {
  ExperimentType,
  MetricCategory,
  MetricType,
  RandomizationUnit,
  BucketingStrategy,
  type ExperimentTemplate
} from '@/types'

export const EXPERIMENT_TEMPLATES: Record<ExperimentType, ExperimentTemplate> = {
  [ExperimentType.AB_TEST]: {
    type: ExperimentType.AB_TEST,
    name: 'A/B Test',
    description: 'Compare two or more variants to determine which performs better',
    useCases: [
      'Testing new features or UI changes',
      'Comparing different algorithms or ranking systems',
      'Optimizing conversion funnels',
      'Testing marketing copy or creative',
    ],
    pros: [
      'Simple to understand and implement',
      'Clean causal inference',
      'Well-established statistical methods',
      'Easy to analyze',
    ],
    cons: [
      'Can only test one change at a time (unless factorial)',
      'Requires sufficient traffic',
      'May take time to reach statistical significance',
    ],
    whenToUse: [
      'You have sufficient traffic (>1000 users/day)',
      'You want to test discrete changes',
      'You need clear causal evidence',
      'The treatment effect is expected to be immediate',
    ],
    examples: [
      'Testing a new checkout flow vs. the current one',
      'Comparing two different recommendation algorithms',
      'Testing a green vs. blue CTA button',
    ],
    defaultParams: {
      alpha: 0.05,
      power: 0.8,
      variants: 2,
      trafficAllocation: [50, 50],
    },
    recommendedMetrics: [
      {
        name: 'Conversion Rate',
        category: MetricCategory.PRIMARY,
        type: MetricType.BINARY,
      },
      {
        name: 'Revenue per User',
        category: MetricCategory.PRIMARY,
        type: MetricType.CONTINUOUS,
      },
    ],
    recommendedRandomization: {
      unit: RandomizationUnit.USER_ID,
      bucketingStrategy: BucketingStrategy.HASH_BASED,
      consistentAssignment: true,
    },
    icon: '🔀',
  },
  [ExperimentType.CLUSTER]: {
    type: ExperimentType.CLUSTER,
    name: 'Cluster Randomized Experiment',
    description: 'Randomize groups or clusters instead of individual users',
    useCases: [
      'When treatment affects groups (e.g., cities, stores)',
      'Network effects or interference between users',
      'Marketplace or two-sided platform experiments',
      'Geographic-based treatments',
    ],
    pros: [
      'Handles network effects and spillover',
      'Suitable for group-level interventions',
      'Prevents contamination between treatment and control',
    ],
    cons: [
      'Requires larger sample sizes',
      'Fewer degrees of freedom',
      'More complex analysis',
      'Need many clusters for sufficient power',
    ],
    whenToUse: [
      'Treatment affects entire groups',
      'Significant risk of interference between users',
      'Geographic or marketplace experiments',
      'You have at least 20+ clusters available',
    ],
    examples: [
      'Testing a new driver incentive program in different cities',
      'Marketplace pricing changes by region',
      'Store-level promotions',
    ],
    defaultParams: {
      alpha: 0.05,
      power: 0.8,
      variants: 2,
      trafficAllocation: [50, 50],
    },
    recommendedMetrics: [
      {
        name: 'Cluster-level Average',
        category: MetricCategory.PRIMARY,
        type: MetricType.CONTINUOUS,
      },
    ],
    recommendedRandomization: {
      unit: RandomizationUnit.CLUSTER,
      bucketingStrategy: BucketingStrategy.RANDOM,
      consistentAssignment: true,
    },
    icon: '🏘️',
  },
  [ExperimentType.SWITCHBACK]: {
    type: ExperimentType.SWITCHBACK,
    name: 'Switchback Experiment',
    description: 'Alternate between treatment and control over time periods',
    useCases: [
      'Two-sided marketplaces with strong network effects',
      'Supply-constrained systems',
      'When randomization by user is not feasible',
      'Testing operational changes',
    ],
    pros: [
      'Handles network effects well',
      'All users experience both conditions',
      'Good for supply-demand balance',
      'Reduces variance from time-of-day effects',
    ],
    cons: [
      'Requires careful handling of carryover effects',
      'Longer experiment duration',
      'More complex analysis',
      'Sensitive to non-stationarity',
    ],
    whenToUse: [
      'Strong network effects exist',
      'Supply and demand are tightly coupled',
      'User-level randomization causes issues',
      'You can switch treatments quickly',
    ],
    examples: [
      'Rideshare pricing algorithms',
      'Delivery dispatch systems',
      'Restaurant recommendations in food delivery',
    ],
    defaultParams: {
      alpha: 0.05,
      power: 0.8,
      variants: 2,
      trafficAllocation: [50, 50],
    },
    recommendedMetrics: [
      {
        name: 'Time-period Average',
        category: MetricCategory.PRIMARY,
        type: MetricType.CONTINUOUS,
      },
    ],
    recommendedRandomization: {
      unit: RandomizationUnit.SESSION,
      bucketingStrategy: BucketingStrategy.RANDOM,
      consistentAssignment: false,
    },
    icon: '🔄',
  },
  [ExperimentType.CAUSAL_INFERENCE]: {
    type: ExperimentType.CAUSAL_INFERENCE,
    name: 'Causal Inference (Observational)',
    description: 'Estimate causal effects from observational data using quasi-experimental methods',
    useCases: [
      'Cannot run randomized experiment',
      'Post-hoc analysis of policy changes',
      'Natural experiments',
      'Studying long-term effects',
    ],
    pros: [
      'Can analyze past data without running experiment',
      'Useful for post-hoc analysis',
      'Can study effects over longer time periods',
      'Lower cost than randomized experiments',
    ],
    cons: [
      'Stronger assumptions required',
      'Risk of confounding bias',
      'More complex statistical methods',
      'Results may be less definitive',
    ],
    whenToUse: [
      'Randomization is not feasible',
      'Analyzing historical data',
      'Natural experiment occurred',
      'Long-term causal effects needed',
    ],
    examples: [
      'Difference-in-differences: Policy change impact across regions',
      'Regression discontinuity: Eligibility threshold effects',
      'Instrumental variables: Effect of education on earnings',
    ],
    defaultParams: {
      alpha: 0.05,
      power: 0.8,
      variants: 2,
    },
    recommendedMetrics: [
      {
        name: 'Outcome Variable',
        category: MetricCategory.PRIMARY,
        type: MetricType.CONTINUOUS,
      },
    ],
    recommendedRandomization: {
      unit: RandomizationUnit.USER_ID,
      bucketingStrategy: BucketingStrategy.HASH_BASED,
      consistentAssignment: true,
    },
    icon: '📊',
  },
  [ExperimentType.FACTORIAL]: {
    type: ExperimentType.FACTORIAL,
    name: 'Factorial Design',
    description: 'Test multiple factors simultaneously to understand interactions',
    useCases: [
      'Testing multiple changes together',
      'Understanding interaction effects',
      'Efficient testing of multiple hypotheses',
      'Complex system optimization',
    ],
    pros: [
      'Test multiple factors efficiently',
      'Detect interaction effects',
      'More information per user',
      'Faster than sequential A/B tests',
    ],
    cons: [
      'More complex analysis',
      'Requires larger sample sizes',
      'Harder to interpret with many factors',
      'Risk of false positives increases',
    ],
    whenToUse: [
      'Need to test multiple independent changes',
      'Interested in interaction effects',
      'Have sufficient traffic for power',
      'Changes are unlikely to conflict',
    ],
    examples: [
      '2x2 test: Button color (blue/green) × Copy (short/long)',
      'Email optimization: Subject line × Send time × Personalization',
      'Landing page: Hero image × Headline × CTA button',
    ],
    defaultParams: {
      alpha: 0.05,
      power: 0.8,
      variants: 4, // 2x2 factorial
      trafficAllocation: [25, 25, 25, 25],
    },
    recommendedMetrics: [
      {
        name: 'Primary Outcome',
        category: MetricCategory.PRIMARY,
        type: MetricType.CONTINUOUS,
      },
    ],
    recommendedRandomization: {
      unit: RandomizationUnit.USER_ID,
      bucketingStrategy: BucketingStrategy.HASH_BASED,
      consistentAssignment: true,
    },
    icon: '📐',
  },
  [ExperimentType.MAB]: {
    type: ExperimentType.MAB,
    name: 'Multi-Armed Bandit',
    description: 'Dynamically allocate traffic to optimize outcomes while learning',
    useCases: [
      'Content recommendations',
      'Personalization optimization',
      'Continuous optimization',
      'When you want to minimize regret',
    ],
    pros: [
      'Minimizes opportunity cost',
      'Adapts to changing conditions',
      'Automatic traffic allocation',
      'Good for ongoing optimization',
    ],
    cons: [
      'Less interpretable than A/B tests',
      'Harder to establish causality',
      'Requires more sophisticated infrastructure',
      'May converge to local optimum',
    ],
    whenToUse: [
      'Continuous optimization is priority',
      'Opportunity cost of poor variants is high',
      'Multiple options to test',
      'Can tolerate adaptive allocation',
    ],
    examples: [
      'Content headline optimization',
      'Recommendation algorithm selection',
      'Promotional banner testing',
      'Push notification copy testing',
    ],
    defaultParams: {
      alpha: 0.05,
      power: 0.8,
      variants: 3,
    },
    recommendedMetrics: [
      {
        name: 'Reward (CTR, Revenue)',
        category: MetricCategory.PRIMARY,
        type: MetricType.CONTINUOUS,
      },
    ],
    recommendedRandomization: {
      unit: RandomizationUnit.REQUEST,
      bucketingStrategy: BucketingStrategy.RANDOM,
      consistentAssignment: false,
    },
    icon: '🎰',
  },
}
