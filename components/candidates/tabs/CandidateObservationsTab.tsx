import { useState } from 'react'
import { Candidate } from '../types'

interface CandidateObservationsTabProps {
  candidate: Candidate
  onUpdate?: () => void
}

export const CandidateObservationsTab = ({ candidate, onUpdate }: CandidateObservationsTabProps) => {
  const [observations, setObservations] = useState(candidate.observations || '')

  const handleUpdateObservations = async () => {
    try {
      const response = await fetch(`/api/admin/candidates/${candidate.id}/observations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observations }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar observações')
      }

      onUpdate?.()
    } catch (error) {
      console.error('Erro ao atualizar observações:', error)
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        className="w-full p-2 border rounded"
        rows={4}
        placeholder="Adicione observações sobre o candidato..."
        value={observations}
        onChange={(e) => setObservations(e.target.value)}
        onBlur={handleUpdateObservations}
      />
    </div>
  )
}
