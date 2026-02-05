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
