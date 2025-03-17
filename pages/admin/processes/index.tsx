import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useNotification } from '../../../contexts/NotificationContext';
import AdminLayout from '../../../components/admin/AdminLayout';

interface ProcessStage {
  id: string;
  name: string;
  description?: string;
  order: number;
  type: string;
}

interface SelectionProcess {
  id: string;
  name: string;
  description?: string;
  cutoffScore?: number;
  evaluationType: string;
  createdAt: string;
  updatedAt: string;
  stages: ProcessStage[];
  _count?: {
    candidates: number;
  };
}

const ProcessList: React.FC = () => {
  const router = useRouter();
  const { showToast, showModal } = useNotification();
  const [processes, setProcesses] = useState<SelectionProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/processes');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar processos seletivos');
      }
      
      const data = await response.json();
      setProcesses(data);
    } catch (err) {
      console.error('Erro ao buscar processos:', err);
      setError('Não foi possível carregar os processos seletivos. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    showModal({
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este processo seletivo? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/processes/${id}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            throw new Error('Erro ao excluir processo seletivo');
          }
          
          showToast({
            type: 'success',
            message: 'Processo seletivo excluído com sucesso!',
          });
          
          // Atualizar a lista de processos
          setProcesses(processes.filter(process => process.id !== id));
        } catch (err) {
          console.error('Erro ao excluir processo:', err);
          showToast({
            type: 'error',
            message: 'Não foi possível excluir o processo seletivo. Tente novamente mais tarde.',
          });
        }
      },
    });
  };

  return (
    <AdminLayout activeSection="selecao">
      <main className="flex-1 p-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Processos Seletivos</h1>
          <Link href="/admin/processes/new">
            <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              Novo Processo
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
            <p>{error}</p>
          </div>
        ) : processes.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhum processo seletivo encontrado</h3>
            <p className="mt-1 text-gray-500">Crie seu primeiro processo seletivo para começar a gerenciar candidatos e testes.</p>
            <div className="mt-6">
              <Link href="/admin/processes/new">
                <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Criar Processo Seletivo
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Avaliação
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Etapas
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidatos
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Criação
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processes.map((process) => (
                  <tr key={process.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{process.name}</div>
                      {process.description && (
                        <div className="text-xs text-gray-500">{process.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {process.evaluationType === 'SCORE_BASED' ? 'Baseado em Pontuação' : 'Personalizado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{process.stages?.length || 0} etapas</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{process._count?.candidates || 0} candidatos</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(process.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/admin/processes/${process.id}`}>
                        <button className="text-indigo-600 hover:text-indigo-900 mr-4">
                          Visualizar
                        </button>
                      </Link>
                      <Link href={`/admin/processes/edit/${process.id}`}>
                        <button className="text-primary-600 hover:text-primary-900 mr-4">
                          Editar
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(process.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AdminLayout>
  );
};

export default ProcessList;
