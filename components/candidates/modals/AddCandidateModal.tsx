import { useState, useEffect } from 'react'
import Modal from '../../common/Modal'
import { AddCandidateModalProps } from '../types'
import { useNotification } from '../../../contexts/NotificationContext'

interface Test {
  id: string;
  title: string;
}

interface TestsResponse {
  success: boolean;
  tests: Test[];
}

const AddCandidateModal = ({ isOpen, onClose, onSuccess }: AddCandidateModalProps) => {
  const { showToast } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    testId: ''
  })

  // Carregar testes disponíveis
  useEffect(() => {
    const fetchTests = async () => {
      try {
        setIsLoadingTests(true);
        const response = await fetch('/api/admin/tests?active=true');
        if (response.ok) {
          const data = await response.json() as TestsResponse;
          console.log('Resposta de testes:', data);
          
          // A API retorna um objeto com uma propriedade 'tests'
          if (data && data.tests && Array.isArray(data.tests)) {
            setTests(data.tests);
          } else {
            console.error('Formato de resposta inesperado:', data);
            setTests([]);
          }
        } else {
          console.error('Erro ao carregar testes');
          setTests([]);
        }
      } catch (error) {
        console.error('Erro ao carregar testes:', error);
        setTests([]);
      } finally {
        setIsLoadingTests(false);
      }
    };

    if (isOpen) {
      fetchTests();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCandidate.name || !newCandidate.email) {
      showToast('Nome e email são obrigatórios', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log('Enviando dados:', newCandidate);
      
      const response = await fetch('/api/admin/candidates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCandidate),
        credentials: 'include'
      })

      const responseData = await response.json();
      console.log('Resposta:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao adicionar candidato');
      }

      showToast('Candidato adicionado com sucesso!', 'success');
      onSuccess();
      onClose();
      setNewCandidate({ name: '', email: '', phone: '', position: '', testId: '' });
    } catch (error) {
      console.error('Erro ao adicionar candidato:', error);
      showToast(
        error instanceof Error ? error.message : 'Erro ao adicionar candidato',
        'error'
      );
    } finally {
      setIsSubmitting(false);
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
            Nome *
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
            Email *
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teste (opcional)
          </label>
          <select
            value={newCandidate.testId}
            onChange={(e) => setNewCandidate({ ...newCandidate, testId: e.target.value })}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            disabled={isLoadingTests}
          >
            <option value="">Selecione um teste</option>
            {tests && tests.length > 0 ? (
              tests.map((test) => (
                <option key={test.id} value={test.id}>
                  {test.title}
                </option>
              ))
            ) : (
              <option value="" disabled>Nenhum teste disponível</option>
            )}
          </select>
          {isLoadingTests && (
            <p className="mt-1 text-sm text-gray-500">Carregando testes...</p>
          )}
          {!isLoadingTests && tests.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">Nenhum teste ativo encontrado</p>
          )}
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
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AddCandidateModal
