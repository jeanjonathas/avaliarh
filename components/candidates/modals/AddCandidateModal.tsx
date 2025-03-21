import { useState, useEffect } from 'react'
import Modal from '../../common/Modal'
import { AddCandidateModalProps } from '../types'
import toast from 'react-hot-toast'

interface Test {
  id: string;
  title: string;
}

interface TestsResponse {
  success: boolean;
  tests: Test[];
}

const AddCandidateModal = ({ isOpen, onClose, onSuccess, processId }: AddCandidateModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    testId: '',
    processId: processId || ''
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
      toast.error('Nome e email são obrigatórios', {
        position: 'bottom-center',
      });
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

      toast.success('Candidato adicionado com sucesso!', {
        position: 'bottom-center',
      });
      onSuccess();
      onClose();
      setNewCandidate({ name: '', email: '', phone: '', position: '', testId: '', processId: processId || '' });
    } catch (error) {
      console.error('Erro ao adicionar candidato:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao adicionar candidato',
        {
          position: 'bottom-center',
        }
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
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
            Nome *
          </label>
          <input
            type="text"
            required
            value={newCandidate.name}
            onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Nome completo do candidato"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            required
            value={newCandidate.email}
            onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="email@exemplo.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
            Telefone
          </label>
          <input
            type="tel"
            value={newCandidate.phone}
            onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="(00) 00000-0000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
            Cargo
          </label>
          <input
            type="text"
            value={newCandidate.position}
            onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Cargo ou posição"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-secondary-300 text-secondary-700 rounded-md hover:bg-secondary-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adicionando...
              </>
            ) : 'Adicionar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AddCandidateModal
