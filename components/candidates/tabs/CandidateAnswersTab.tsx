import { Candidate } from '../types'

interface CandidateAnswersTabProps {
  candidate: Candidate
}

export const CandidateAnswersTab = ({ candidate }: CandidateAnswersTabProps) => {
  if (!candidate.completed) {
    return (
      <p className="text-gray-500">O candidato ainda não completou o teste.</p>
    )
  }

  return (
    <div className="space-y-4">
      {candidate.stageScores?.map((stage, index) => (
        <div key={index} className="border-b pb-4">
          <h3 className="font-medium">{stage.name}</h3>
          <div className="mt-2 grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Acertos</p>
              <p className="text-lg font-medium">{stage.correct}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-lg font-medium">{stage.total}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Porcentagem</p>
              <p className="text-lg font-medium">{stage.percentage}%</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
