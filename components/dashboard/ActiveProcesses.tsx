import React from 'react';
import Link from 'next/link';

interface Process {
  id: string;
  title: string;
  position: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DRAFT';
  candidateCount: number;
  startDate: string;
  endDate?: string;
  progress: number;
}

interface ActiveProcessesProps {
  processes: Process[];
}

const ActiveProcesses: React.FC<ActiveProcessesProps> = ({ processes }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-700">Processos Seletivos Ativos</h3>
      </div>
      <div className="divide-y divide-secondary-200">
        {processes.length === 0 ? (
          <div className="px-6 py-4 text-center text-secondary-500">
            Nenhum processo seletivo ativo no momento
          </div>
        ) : (
          processes.slice(0, 5).map((process) => (
            <div key={process.id} className="px-6 py-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-md font-medium text-secondary-900">{process.title}</h4>
                  <p className="text-sm text-secondary-500">{process.position}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  process.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-800' 
                    : process.status === 'COMPLETED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  {process.status === 'ACTIVE' 
                    ? 'Ativo' 
                    : process.status === 'COMPLETED'
                      ? 'Concluído'
                      : 'Rascunho'}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-secondary-600">
                  <span className="font-medium">{process.candidateCount}</span> candidatos
                </div>
                <div className="text-sm text-secondary-600">
                  {new Date(process.startDate).toLocaleDateString('pt-BR')}
                  {process.endDate ? ` - ${new Date(process.endDate).toLocaleDateString('pt-BR')}` : ''}
                </div>
              </div>
              
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block text-primary-600">
                      Progresso: {process.progress}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-primary-200">
                  <div 
                    style={{ width: `${process.progress}%` }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
                  ></div>
                </div>
              </div>
              
              <div className="mt-2 text-right">
                <Link 
                  href={`/admin/processes/${process.id}`}
                  className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  Ver detalhes
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="px-6 py-4 border-t border-secondary-200">
        <Link 
          href="/admin/processes"
          className="text-primary-600 hover:text-primary-800 font-medium"
        >
          Ver todos os processos →
        </Link>
      </div>
    </div>
  );
};

export default ActiveProcesses;
