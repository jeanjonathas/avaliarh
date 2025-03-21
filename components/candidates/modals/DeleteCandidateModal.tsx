import Modal from '../../common/Modal'
import { DeleteCandidateModalProps } from '../types'
import toast from 'react-hot-toast'
import { useState } from 'react'

const DeleteCandidateModal = ({ isOpen, onClose, candidate, onSuccess }: DeleteCandidateModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/candidates/${candidate.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir candidato')
      }

      toast.success(`Candidato ${candidate.name} excluído com sucesso!`, {
        position: 'bottom-center',
      });
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao excluir candidato:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erro ao excluir candidato',
        {
          position: 'bottom-center',
        }
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Excluir Candidato"
    >
      <div className="mt-3">
        <div className="flex items-center justify-center mb-4 text-red-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <p className="text-secondary-700 text-center mb-2">
          Tem certeza que deseja excluir o candidato:
        </p>
        <p className="text-center font-medium text-secondary-900 text-lg mb-4">
          {candidate.name}
        </p>
        <p className="text-secondary-600 text-sm text-center bg-red-50 p-3 rounded-md border border-red-100">
          Esta ação não pode ser desfeita. Todos os dados associados a este candidato serão permanentemente removidos.
        </p>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white border border-secondary-300 text-secondary-700 rounded-md hover:bg-secondary-50 transition-colors"
          disabled={isDeleting}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isDeleting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Excluindo...
            </>
          ) : 'Excluir'}
        </button>
      </div>
    </Modal>
  )
}

export default DeleteCandidateModal
