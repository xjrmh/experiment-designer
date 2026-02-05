import { useState } from 'react'
import { useExperiment } from '@/hooks/useExperiment'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { getAllExperimentTemplates } from '@/lib/experimentTemplates'
import { ExperimentType } from '@/types'

export function Step1ExperimentType() {
  const { experimentType, setExperimentType, nextStep } = useExperiment()
  const [selectedType, setSelectedType] = useState<ExperimentType | null>(experimentType)
  const templates = getAllExperimentTemplates()

  const handleSelect = (type: ExperimentType) => {
    setSelectedType(type)
    setExperimentType(type)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Select Experiment Type</h2>
        <p className="mt-2 text-gray-600">
          Choose the type of experiment that best fits your use case
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card
            key={template.type}
            hover
            selected={selectedType === template.type}
            onClick={() => handleSelect(template.type)}
          >
            <div className="flex items-start space-x-4">
              <div className="text-4xl">{template.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{template.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedType && (
        <Card className="bg-primary-50 border-primary">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {templates.find((t) => t.type === selectedType)?.name}
            </h3>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">When to use:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {templates.find((t) => t.type === selectedType)?.whenToUse.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Pros:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {templates.find((t) => t.type === selectedType)?.pros.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Cons:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {templates.find((t) => t.type === selectedType)?.cons.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Examples:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {templates.find((t) => t.type === selectedType)?.examples.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <Button onClick={nextStep} className="mt-4">
              Continue with {templates.find((t) => t.type === selectedType)?.name} →
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
