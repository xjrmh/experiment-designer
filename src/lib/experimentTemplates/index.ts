import { EXPERIMENT_TEMPLATES } from '@/constants/experimentTypes'
import type { ExperimentType, ExperimentTemplate } from '@/types'

/**
 * Get experiment template by type
 */
export function getExperimentTemplate(type: ExperimentType): ExperimentTemplate {
  return EXPERIMENT_TEMPLATES[type]
}

/**
 * Get all experiment templates as an array
 */
export function getAllExperimentTemplates(): ExperimentTemplate[] {
  return Object.values(EXPERIMENT_TEMPLATES)
}

/**
 * Search experiment templates by keyword
 */
export function searchExperimentTemplates(query: string): ExperimentTemplate[] {
  const lowerQuery = query.toLowerCase()
  return getAllExperimentTemplates().filter((template) => {
    return (
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.useCases.some((useCase) => useCase.toLowerCase().includes(lowerQuery))
    )
  })
}
