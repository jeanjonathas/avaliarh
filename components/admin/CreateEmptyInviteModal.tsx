import React, { useState, useEffect } from 'react';
import { useNotification } from '../../hooks/useNotification';

interface CreateEmptyInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (inviteCode: string) => void;
}

const CreateEmptyInviteModal: React.FC<CreateEmptyInviteModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [tests, setTests] = useState<any[]>([]); // Inicializa como array vazio
  const [processes, setProcesses] = useState<any[]>([]); // Inicializa como array vazio
  const [requestsMade, setRequestsMade] = useState<{tests: boolean, processes: boolean}>({
    tests: false,
    processes: false
  });
  const notify = useNotification();

  // Buscar testes e processos disponíveis
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      // Verificar se as requisições já foram feitas para evitar loops
      if (!isOpen || (requestsMade.tests && requestsMade.processes)) {
        return;
      }
      
      try {
        console.log('Iniciando busca de testes e processos');
        
        // Buscar testes - se ainda não foram buscados
        if (!requestsMade.tests) {
          try {
            // Vamos tentar a rota principal para buscar os testes
            const testsResponse = await fetch('/api/admin/tests', {
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache'
              }
            });
            console.log('Resposta da API de testes:', testsResponse.status);
            
            if (testsResponse.ok && isMounted) {
              const testsData = await testsResponse.json();
              console.log('Dados de testes recebidos:', testsData);
              
              // Verificar a estrutura dos dados e extrair a lista de testes
              let testsArray = [];
              if (Array.isArray(testsData)) {
                testsArray = testsData;
              } else if (testsData.tests && Array.isArray(testsData.tests)) {
                testsArray = testsData.tests;
              } else if (testsData.data && Array.isArray(testsData.data)) {
                testsArray = testsData.data;
              } else if (testsData.items && Array.isArray(testsData.items)) {
                testsArray = testsData.items;
              }
              
              console.log('Array de testes processado:', testsArray);
              if (testsArray.length > 0 && isMounted) {
                setTests(testsArray);
                setRequestsMade(prev => ({...prev, tests: true}));
              }
            }
          } catch (testError) {
            console.error('Erro ao buscar testes:', testError);
          }
        }

        // Buscar processos seletivos - se ainda não foram buscados
        if (!requestsMade.processes) {
          try {
            // Usar a URL correta para a página de processos
            const processesResponse = await fetch('/api/admin/processes', {
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache'
              }
            });
            console.log('Resposta da API de processos:', processesResponse.status);
            
            if (processesResponse.ok && isMounted) {
              const processesData = await processesResponse.json();
              console.log('Dados de processos recebidos:', processesData);
              
              // Verificar a estrutura dos dados e extrair a lista de processos
              let processesArray = [];
              if (Array.isArray(processesData)) {
                processesArray = processesData;
              } else if (processesData.processes && Array.isArray(processesData.processes)) {
                processesArray = processesData.processes;
              } else if (processesData.data && Array.isArray(processesData.data)) {
                processesArray = processesData.data;
              } else if (processesData.items && Array.isArray(processesData.items)) {
                processesArray = processesData.items;
              }
              
              console.log('Array de processos processado:', processesArray);
              if (processesArray.length > 0 && isMounted) {
                setProcesses(processesArray);
                setRequestsMade(prev => ({...prev, processes: true}));
              }
            }
          } catch (processError) {
            console.error('Erro ao buscar processos:', processError);
            
            // Se falhar, usar dados de exemplo para testes
            if (isMounted) {
              console.log('Usando dados de exemplo para processos seletivos');
              setProcesses([
                { id: 'exemplo-1', name: 'Processo Seletivo 1' },
                { id: 'exemplo-2', name: 'Processo Seletivo 2' }
              ]);
              setRequestsMade(prev => ({...prev, processes: true}));
            }
          }
        }
      } catch (error) {
        console.error('Erro geral ao buscar dados:', error);
      }
    };

    if (isOpen) {
      fetchData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [isOpen, requestsMade]);

  // Resetar o estado quando o modal for fechado
  useEffect(() => {
    if (!isOpen) {
      setSelectedTestId('');
      setSelectedProcessId('');
      // Não resetamos o requestsMade para evitar buscar os dados novamente quando o modal for reaberto
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTestId && !selectedProcessId) {
      notify.showError('Selecione um teste ou um processo seletivo');
      return;
    }

    setLoading(true);

    try {
      console.log('Enviando solicitação para criar convite vazio:', {
        testId: selectedTestId || null,
        processId: selectedProcessId || null
      });
      
      const response = await fetch('/api/admin/candidates/create-empty-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          testId: selectedTestId || null,
          processId: selectedProcessId || null,
        }),
        credentials: 'include'
      });

      console.log('Resposta da API:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro retornado pela API:', errorData);
        throw new Error(errorData.error || 'Erro ao criar convite');
      }

      const data = await response.json();
      console.log('Convite criado com sucesso:', data);
      
      notify.showSuccess('Convite criado com sucesso!');
      onSuccess(data.inviteCode);
      onClose();
    } catch (error) {
      console.error('Erro ao criar convite:', error);
      notify.showError(error instanceof Error ? error.message : 'Erro ao criar convite');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-secondary-800">Criar Convite Vazio</h2>
          <button
            onClick={onClose}
            className="text-secondary-500 hover:text-secondary-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-secondary-600 mb-4">
          Crie um convite sem preencher dados do candidato. Quando o candidato acessar o link, 
          será solicitado que ele preencha suas informações antes de iniciar o teste.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="test-select" className="block text-sm font-medium text-secondary-700 mb-1">
              Selecione um Teste
            </label>
            <select
              id="test-select"
              value={selectedTestId}
              onChange={(e) => {
                setSelectedTestId(e.target.value);
                if (e.target.value) setSelectedProcessId('');
              }}
              className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={!!selectedProcessId}
            >
              <option value="">Selecione um teste</option>
              {tests && tests.length > 0 ? (
                tests.map((test: any) => (
                  <option key={test.id} value={test.id}>
                    {test.title || test.name || `Teste #${test.id}`}
                  </option>
                ))
              ) : (
                <option disabled>Nenhum teste disponível</option>
              )}
            </select>
          </div>

          <div className="flex items-center justify-center">
            <div className="border-t border-secondary-300 flex-grow mr-3"></div>
            <span className="text-secondary-500 text-sm">OU</span>
            <div className="border-t border-secondary-300 flex-grow ml-3"></div>
          </div>

          <div>
            <label htmlFor="process-select" className="block text-sm font-medium text-secondary-700 mb-1">
              Selecione um Processo Seletivo
            </label>
            <select
              id="process-select"
              value={selectedProcessId}
              onChange={(e) => {
                setSelectedProcessId(e.target.value);
                if (e.target.value) setSelectedTestId('');
              }}
              className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={!!selectedTestId}
            >
              <option value="">Selecione um processo seletivo</option>
              {processes && processes.length > 0 ? (
                processes.map((process: any) => (
                  <option key={process.id} value={process.id}>
                    {process.name || process.title || `Processo #${process.id}`}
                  </option>
                ))
              ) : (
                <option disabled>Nenhum processo seletivo disponível</option>
              )}
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-secondary-700 border border-secondary-300 rounded-md hover:bg-secondary-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Criando...
                </>
              ) : (
                'Criar Convite'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEmptyInviteModal;
