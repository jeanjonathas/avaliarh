import React from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Candidate {
  id: string;
  name: string;
}

interface Test {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  planType: string;
  plan?: string;
  isActive: boolean;
  maxUsers: number;
  maxCandidates: number;
  lastPaymentDate: Date | null;
  trialEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CompanyWithRelations extends Company {
  users?: User[];
  candidates?: Candidate[];
  tests?: Test[];
  _count?: {
    users: number;
    candidates: number;
    tests: number;
    processes: number;
  };
  userCount?: number;
  candidateCount?: number;
  testCount?: number;
  processCount?: number;
}

interface CompanyDetailsProps {
  company: CompanyWithRelations;
  onClose: () => void;
}

const CompanyDetails: React.FC<CompanyDetailsProps> = ({ company, onClose }) => {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">{company.name}</h2>
          <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
            company.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {company.isActive ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        {company.cnpj && (
          <p className="mt-2 text-sm text-gray-600">CNPJ: {company.cnpj}</p>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Informações Gerais</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Plano</p>
              <p className="mt-1 text-sm text-gray-900">{company.plan}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Data de Criação</p>
              <p className="mt-1 text-sm text-gray-900">{new Date(company.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Última Atualização</p>
              <p className="mt-1 text-sm text-gray-900">{new Date(company.updatedAt).toLocaleDateString()}</p>
            </div>
            {company.lastPaymentDate && (
              <div>
                <p className="text-sm font-medium text-gray-500">Último Pagamento</p>
                <p className="mt-1 text-sm text-gray-900">{new Date(company.lastPaymentDate).toLocaleDateString()}</p>
              </div>
            )}
            {company.trialEndDate && (
              <div>
                <p className="text-sm font-medium text-gray-500">Fim do Período de Teste</p>
                <p className="mt-1 text-sm text-gray-900">{new Date(company.trialEndDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Limites e Uso</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium text-gray-500">Usuários</p>
                <p className="text-sm font-medium text-gray-900">
                  {company.userCount || company._count?.users || company.users?.length || 0} / {company.maxUsers}
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ 
                    width: `${Math.min(100, ((company.userCount || company._count?.users || company.users?.length || 0) / company.maxUsers) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium text-gray-500">Candidatos</p>
                <p className="text-sm font-medium text-gray-900">
                  {company.candidateCount || company._count?.candidates || company.candidates?.length || 0} / {company.maxCandidates}
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ 
                    width: `${Math.min(100, ((company.candidateCount || company._count?.candidates || company.candidates?.length || 0) / company.maxCandidates) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-700 mt-6 mb-4">Estatísticas</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-500">Testes</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{company.testCount || company._count?.tests || company.tests?.length || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-500">Processos</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{company.processCount || company._count?.processes || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

export default CompanyDetails;
