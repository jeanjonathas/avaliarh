import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';

const UpdateDeletedFlagPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Verificar autenticação
  if (status === 'loading') {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (status === 'unauthenticated' || !session) {
    router.push('/login');
    return null;
  }

  // Verificar se o usuário é administrador
  if (session.user.role !== 'COMPANY_ADMIN') {
    router.push('/admin');
    return null;
  }

  const handleUpdateDeletedFlag = async () => {
    if (loading) return;

    try {
      setLoading(true);
      toast.loading('Atualizando campo deleted em perguntas excluídas...');

      const response = await fetch('/api/admin/questions/update-deleted-flag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      setResults(data);

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error || 'Erro ao atualizar campo deleted');
      }
    } catch (error) {
      console.error('Erro ao atualizar campo deleted:', error);
      toast.error('Erro ao atualizar campo deleted');
    } finally {
      setLoading(false);
      toast.dismiss();
    }
  };

  return (
    <AdminLayout>
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold text-secondary-900 mb-6">Atualizar Campo Deleted em Perguntas Excluídas</h1>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-blue-700">
            Esta ferramenta atualiza o campo <code className="bg-blue-100 px-1 rounded">deleted</code> em perguntas 
            que foram excluídas usando o método antigo (apenas com <code className="bg-blue-100 px-1 rounded">showResults = false</code>).
            Isso garante que todas as perguntas excluídas sejam corretamente identificadas pelo novo sistema.
          </p>
        </div>

        <div className="mb-6">
          <button
            onClick={handleUpdateDeletedFlag}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-white ${
              loading ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {loading ? 'Processando...' : 'Atualizar Campo Deleted'}
          </button>
        </div>

        {results && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-secondary-800 mb-2">Resultados:</h2>
            
            <div className="bg-secondary-50 p-4 rounded-md">
              <p className="mb-2">
                <span className="font-medium">Status:</span>{' '}
                <span className={results.success ? 'text-green-600' : 'text-red-600'}>
                  {results.success ? 'Sucesso' : 'Falha'}
                </span>
              </p>
              
              <p className="mb-2">
                <span className="font-medium">Mensagem:</span> {results.message}
              </p>
              
              {results.details && results.details.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium mb-2">Detalhes:</p>
                  <div className="max-h-60 overflow-y-auto border border-secondary-200 rounded-md">
                    <table className="min-w-full divide-y divide-secondary-200">
                      <thead className="bg-secondary-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Erro</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-secondary-200">
                        {results.details.map((item: any, index: number) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-secondary-50'}>
                            <td className="px-4 py-2 text-sm text-secondary-900">{item.id}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${item.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {item.success ? 'Sucesso' : 'Falha'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-secondary-900">{item.error || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UpdateDeletedFlagPage;
