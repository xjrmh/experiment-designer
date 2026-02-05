import { useExperimentStore } from '@/store/experimentStore'
import { getExperimentTemplate } from '../experimentTemplates'

/**
 * Generate experiment documentation in Markdown format
 */
export function generateMarkdownDocument(): string {
  const state = useExperimentStore.getState()

  const template = state.experimentType ? getExperimentTemplate(state.experimentType) : null

  const doc = `# Experiment Design Document

## Overview
- **Experiment Name:** ${state.name || 'Unnamed Experiment'}
- **Type:** ${template?.name || 'Not selected'}
- **Created:** ${new Date().toLocaleDateString()}
- **Status:** Draft

## Description
${state.description || 'No description provided'}

## Hypothesis
${state.hypothesis || 'No hypothesis provided'}

---

## Experiment Configuration

### Experiment Type: ${template?.name || 'Not selected'}
${template ? `
**Description:** ${template.description}

**When to use:**
${template.whenToUse.map((item) => `- ${item}`).join('\n')}

**Pros:**
${template.pros.map((item) => `- ${item}`).join('\n')}

**Cons:**
${template.cons.map((item) => `- ${item}`).join('\n')}
` : ''}

---

## Metrics

### Primary Metrics
${state.metrics
  .filter((m) => m.category === 'PRIMARY')
  .map(
    (m) => `
- **${m.name}**
  - Type: ${m.type}
  - Baseline: ${m.baseline}
  - Direction: ${m.direction}
  ${m.variance ? `- Variance: ${m.variance}` : ''}
`
  )
  .join('\n') || 'No primary metrics defined'}

### Secondary Metrics
${state.metrics
  .filter((m) => m.category === 'SECONDARY')
  .map((m) => `- ${m.name} (${m.type})`)
  .join('\n') || 'None'}

### Guardrail Metrics
${state.metrics
  .filter((m) => m.category === 'GUARDRAIL')
  .map((m) => `- ${m.name} (${m.type})`)
  .join('\n') || 'None'}

---

## Sample Size Calculation

### Statistical Parameters
- **Significance Level (α):** ${(state.statisticalParams.alpha * 100).toFixed(1)}%
- **Statistical Power (1-β):** ${(state.statisticalParams.power * 100).toFixed(1)}%
- **Minimum Detectable Effect (MDE):** ${state.statisticalParams.mde}%
- **Number of Variants:** ${state.statisticalParams.variants}
- **Traffic Allocation:** ${state.statisticalParams.trafficAllocation.join('/')}

### Results
${
  state.sampleSizeResult
    ? `
- **Sample Size per Variant:** ${state.sampleSizeResult.sampleSizePerVariant.toLocaleString()}
- **Total Sample Size:** ${state.sampleSizeResult.totalSampleSize.toLocaleString()}
- **Calculated Power:** ${(state.sampleSizeResult.calculatedPower * 100).toFixed(1)}%
- **Calculated MDE:** ${state.sampleSizeResult.calculatedMDE.toFixed(2)}%

#### Assumptions
${state.sampleSizeResult.assumptions.map((a) => `- ${a}`).join('\n')}

${state.sampleSizeResult.warnings ? `#### Warnings\n${state.sampleSizeResult.warnings.map((w) => `⚠️ ${w}`).join('\n')}` : ''}
`
    : 'Not calculated yet'
}

### Duration Estimate
${
  state.durationEstimate
    ? `
- **Estimated Duration:** ${state.durationEstimate.days} days (${state.durationEstimate.weeks} weeks)
- **Daily Traffic:** ${state.dailyTraffic.toLocaleString()} users
- **Effective Daily Traffic:** ${state.durationEstimate.trafficPerDay.toLocaleString()} users (after allocation)
`
    : 'Not calculated yet'
}

---

## Randomization Strategy

- **Randomization Unit:** ${state.randomization.unit}
- **Bucketing Strategy:** ${state.randomization.bucketingStrategy}
- **Consistent Assignment:** ${state.randomization.consistentAssignment ? 'Yes' : 'No'}
- **Sample Ratio:** ${state.randomization.sampleRatio.join('/')}
${state.randomization.stratificationVariables.length > 0 ? `- **Stratification Variables:** ${state.randomization.stratificationVariables.map((v) => v.name).join(', ')}` : ''}

---

## Variance Reduction

${
  state.varianceReduction.useCUPED
    ? `
### CUPED
- **Enabled:** Yes
- **Covariate:** ${state.varianceReduction.cupedCovariate || 'Not specified'}
- **Expected Variance Reduction:** ${state.varianceReduction.cupedExpectedReduction}%
`
    : '### CUPED\n- **Enabled:** No'
}

${state.varianceReduction.useStratification ? `### Post-Stratification\n- **Enabled:** Yes\n- **Variables:** ${state.varianceReduction.stratificationVariables.join(', ')}` : ''}
${state.varianceReduction.useMatchedPairs ? '- **Matched Pairs:** Yes' : ''}
${state.varianceReduction.useBlocking ? '- **Blocking:** Yes' : ''}

---

## Risk Assessment

- **Risk Level:** ${state.riskAssessment.riskLevel}
- **Blast Radius:** ${state.riskAssessment.blastRadius}% of users

### Pre-Launch Checklist
${state.riskAssessment.preLaunchChecklist
  .map((item) => `- [${item.completed ? 'x' : ' '}] ${item.label}${item.required ? ' *(Required)*' : ''}`)
  .join('\n')}

---

## Monitoring & Analysis

### Monitoring
- **Refresh Frequency:** Every ${state.monitoring.refreshFrequency} minutes
- **SRM Threshold:** ${state.monitoring.srmThreshold}
- **Multiple Testing Correction:** ${state.monitoring.multipleTestingCorrection}

### Statistical Tests
${Object.entries(state.monitoring.statisticalTests)
  .map(([metricId, test]) => {
    const metric = state.metrics.find((m) => m.id === metricId)
    return `- ${metric?.name || metricId}: ${test}`
  })
  .join('\n') || 'To be determined'}

---

## Decision Criteria

### Ship (✅ Launch to 100%)
${state.monitoring.decisionCriteria.ship.join('\n- ') || 'To be defined'}

### Iterate (🔄 Refine and re-test)
${state.monitoring.decisionCriteria.iterate.join('\n- ') || 'To be defined'}

### Kill (❌ Abandon)
${state.monitoring.decisionCriteria.kill.join('\n- ') || 'To be defined'}

---

## Appendix

### Document Version
- **Version:** 1.0
- **Last Updated:** ${new Date().toISOString()}
- **Generated by:** Experiment Designer

### References
- [Trustworthy Online Controlled Experiments](https://experimentguide.com/)
- [Statistical Methods for A/B Testing](https://www.evanmiller.org/ab-testing/)

---

*This document was automatically generated by Experiment Designer.*
`

  return doc
}

/**
 * Generate experiment configuration as JSON
 */
export function generateJSONDocument(): string {
  const state = useExperimentStore.getState()

  const config = {
    name: state.name,
    description: state.description,
    hypothesis: state.hypothesis,
    experimentType: state.experimentType,
    metrics: state.metrics,
    statisticalParams: state.statisticalParams,
    sampleSizeResult: state.sampleSizeResult,
    durationEstimate: state.durationEstimate,
    randomization: state.randomization,
    varianceReduction: state.varianceReduction,
    riskAssessment: state.riskAssessment,
    monitoring: state.monitoring,
    generated: new Date().toISOString(),
  }

  return JSON.stringify(config, null, 2)
}

/**
 * Download a file
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
