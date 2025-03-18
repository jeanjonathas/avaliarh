import { Candidate } from '../types'

interface CandidateResultsTabProps {
  candidate: Candidate
}

export const CandidateResultsTab = ({ candidate }: CandidateResultsTabProps) => {
  if (!candidate.completed) {
    return (
      <p className="text-gray-500">O candidato ainda não completou o teste.</p>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Nota Final:</h3>
        <p className="text-2xl font-bold">{candidate.score?.toFixed(1) || '-'}</p>
      </div>
      <div>
        <h3 className="font-medium">Status Final:</h3>
        <span className={`px-2 py-1 rounded ${
          candidate.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
          candidate.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {candidate.status === 'APPROVED' ? 'Aprovado' :
           candidate.status === 'REJECTED' ? 'Rejeitado' :
           'Pendente'}
        </span>
      </div>
      {candidate.inviteSent && (
        <div>
          <h3 className="font-medium">Convite:</h3>
          <p>Enviado {candidate.inviteAttempts} vez(es)</p>
          {candidate.inviteExpires && (
            <p className="text-sm text-gray-500">
              Expira em: {new Date(candidate.inviteExpires).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
