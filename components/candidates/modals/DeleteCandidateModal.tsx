import Modal from '../../common/Modal'
import { DeleteCandidateModalProps } from '../types'

const DeleteCandidateModal = ({ isOpen, onClose, candidate, onSuccess }: DeleteCandidateModalProps) => {
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/admin/candidates/${candidate.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir candidato')
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao excluir candidato:', error)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Excluir Candidato"
    >
      <div className="mt-2">
        <p className="text-gray-600">
          Tem certeza que deseja excluir o candidato <strong>{candidate.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
      </div>

      <div className="mt-4 flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded"
        >
          Excluir
        </button>
      </div>
    </Modal>
  )
}

export default DeleteCandidateModal
