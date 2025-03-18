import { useState } from 'react'
import Modal from '../../common/Modal'
import { AddCandidateModalProps } from '../types'

const AddCandidateModal = ({ isOpen, onClose, onSuccess }: AddCandidateModalProps) => {
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    position: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCandidate),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erro ao adicionar candidato')
      }

      onSuccess()
      onClose()
      setNewCandidate({ name: '', email: '', phone: '', position: '' })
    } catch (error) {
      console.error('Erro ao adicionar candidato:', error)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adicionar Candidato"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome
          </label>
          <input
            type="text"
            required
            value={newCandidate.name}
            onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={newCandidate.email}
            onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <input
            type="tel"
            value={newCandidate.phone}
            onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cargo
          </label>
          <input
            type="text"
            value={newCandidate.position}
            onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
          >
            Adicionar
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AddCandidateModal
