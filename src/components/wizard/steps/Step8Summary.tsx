import { useState } from 'react'
import { useExperiment } from '@/hooks/useExperiment'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { generateMarkdownDocument, generateJSONDocument, downloadFile } from '@/lib/export/documentGenerator'

export function Step8Summary() {
  const state = useExperiment()
  const [showPreview, setShowPreview] = useState(false)

  const handleDownloadMarkdown = () => {
    const content = generateMarkdownDocument()
    const filename = `experiment-${state.name || 'untitled'}-${Date.now()}.md`
    downloadFile(content, filename, 'text/markdown')
  }

  const handleDownloadJSON = () => {
    const content = generateJSONDocument()
    const filename = `experiment-${state.name || 'untitled'}-${Date.now()}.json`
    downloadFile(content, filename, 'application/json')
  }

  const handleCopyToClipboard = () => {
    const content = generateMarkdownDocument()
    navigator.clipboard.writeText(content)
    alert('Copied to clipboard!')
  }

  const completionPercentage =
    (state.riskAssessment.preLaunchChecklist.filter((i) => i.completed).length /
      state.riskAssessment.preLaunchChecklist.length) *
    100

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Summary & Export</h2>
        <p className="mt-2 text-gray-600">
          Review your experiment configuration and export documentation
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Experiment Details</h3>
          <div className="space-y-4">
            <Input
              label="Experiment Name"
              placeholder="e.g., Homepage Banner Test Q1 2026"
              value={state.name}
              onChange={(e) => state.setName(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="Brief description of what this experiment tests"
                value={state.description}
                onChange={(e) => state.setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hypothesis</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="e.g., Changing the CTA button color to green will increase conversion rate by at least 5%"
                value={state.hypothesis}
                onChange={(e) => state.setHypothesis(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Readiness Check</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Pre-Launch Checklist</span>
              <span
                className={`text-sm font-semibold ${
                  completionPercentage === 100 ? 'text-success' : 'text-warning'
                }`}
              >
                {completionPercentage.toFixed(0)}%
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Configuration</span>
                <span className="text-sm font-medium text-success">✓ Complete</span>
              </div>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Experiment type selected</li>
                <li>✓ Metrics defined ({state.metrics.length} total)</li>
                <li>✓ Sample size calculated</li>
                <li>✓ Randomization configured</li>
              </ul>
            </div>

            {completionPercentage < 100 && (
              <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                <p className="text-sm text-warning-800">
                  ⚠️ Complete all pre-launch checklist items before launching
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Quick Summary</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-primary-50 rounded-lg">
            <div className="text-sm text-gray-600">Experiment Type</div>
            <div className="text-lg font-semibold text-gray-900 mt-1">
              {state.experimentType || 'Not selected'}
            </div>
          </div>
          <div className="p-4 bg-primary-50 rounded-lg">
            <div className="text-sm text-gray-600">Sample Size (Total)</div>
            <div className="text-lg font-semibold text-gray-900 mt-1">
              {state.sampleSizeResult?.totalSampleSize.toLocaleString() || 'Not calculated'}
            </div>
          </div>
          <div className="p-4 bg-primary-50 rounded-lg">
            <div className="text-sm text-gray-600">Estimated Duration</div>
            <div className="text-lg font-semibold text-gray-900 mt-1">
              {state.durationEstimate ? `${state.durationEstimate.days} days` : 'Not calculated'}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Export Documentation</h3>
        <p className="text-sm text-gray-600 mb-4">
          Download your experiment design document or configuration
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleDownloadMarkdown}>
            📄 Download Markdown
          </Button>
          <Button variant="outline" onClick={handleDownloadJSON}>
            📦 Download JSON
          </Button>
          <Button variant="outline" onClick={handleCopyToClipboard}>
            📋 Copy to Clipboard
          </Button>
          <Button variant="ghost" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? '👁️ Hide Preview' : '👁️ Show Preview'}
          </Button>
        </div>
      </Card>

      {showPreview && (
        <Card className="bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-4">Document Preview</h3>
          <div className="bg-white p-6 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
              {generateMarkdownDocument()}
            </pre>
          </div>
        </Card>
      )}

      <Card className="bg-success-50 border-success-200">
        <h4 className="font-medium text-success-900 mb-2">🎉 You're Ready!</h4>
        <p className="text-sm text-success-800">
          Your experiment design is complete. Review the generated documentation, complete any remaining
          checklist items, and you're ready to launch your experiment!
        </p>
      </Card>
    </div>
  )
}
