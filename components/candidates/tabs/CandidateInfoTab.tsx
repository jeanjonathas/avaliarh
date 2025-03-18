import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Candidate } from '../types'

export interface CandidateInfoTabProps {
  candidate: Candidate
  onUpdate?: () => void
}

export const CandidateInfoTab = ({ candidate, onUpdate }: CandidateInfoTabProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Email:</h3>
        <p>{candidate.email}</p>
      </div>
      <div>
        <h3 className="font-medium">Telefone:</h3>
        <p>{candidate.phone || 'Não informado'}</p>
      </div>
      <div>
        <h3 className="font-medium">Cargo:</h3>
        <p>{candidate.position || 'Não informado'}</p>
      </div>
      <div>
        <h3 className="font-medium">Status:</h3>
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
      <div>
        <h3 className="font-medium">Data do Teste:</h3>
        <p>{candidate.testDate ? format(new Date(candidate.testDate), 'dd/MM/yyyy', { locale: ptBR }) : 'Não realizado'}</p>
      </div>
      {candidate.interviewDate && (
        <div>
          <h3 className="font-medium">Data da Entrevista:</h3>
          <p>{format(new Date(candidate.interviewDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
        </div>
      )}
    </div>
  )
}
