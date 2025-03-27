import React, { useState, useEffect } from 'react';

// Definindo a interface Company localmente para evitar problemas de importação
interface Company {
  id: string;
  name: string;
  cnpj?: string | null;
  planType?: string;
  isActive: boolean;
  maxUsers: number;
  maxCandidates: number;
  lastPaymentDate?: Date | null;
  trialEndDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  userCount?: number;
  candidateCount?: number;
  testCount?: number;
  processCount?: number;
  _userCount?: number;
  _candidateCount?: number;
}

interface CompanyListProps {
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
  onView: (companyId: string) => void;
  onCompaniesUpdate?: (companies: Company[]) => void;
}

const CompanyList: React.FC<CompanyListProps> = ({ 
  companies, 
  onEdit, 
  onDelete,
  onView,
  onCompaniesUpdate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // Verificar se há empresas duplicadas no array de empresas
    if (companies && companies.length > 0) {
      console.log(`[FRONTEND] Verificando duplicatas em ${companies.length} empresas`);
      
      // Mapear IDs para detectar duplicatas
      const idMap = new Map();
      const duplicates = [];
      
      companies.forEach(company => {
        if (idMap.has(company.id)) {
          console.warn(`[FRONTEND] Empresa duplicada detectada: ${company.name} (ID: ${company.id})`);
          duplicates.push(company);
        } else {
          idMap.set(company.id, company);
        }
      });
      
      if (duplicates.length > 0) {
        console.error(`[FRONTEND] Total de empresas duplicadas: ${duplicates.length}`);
        
        // Remover duplicatas e atualizar o estado
        const uniqueCompanies = Array.from(idMap.values());
        console.log(`[FRONTEND] Removendo duplicatas. Total original: ${companies.length}, Total após remoção: ${uniqueCompanies.length}`);
        
        // Se o componente tiver uma função para atualizar empresas, chamar aqui
        if (onCompaniesUpdate) {
          onCompaniesUpdate(uniqueCompanies);
        }
      } else {
        console.log(`[FRONTEND] Nenhuma empresa duplicada encontrada`);
      }
    }
  }, [companies, onCompaniesUpdate]);
  
  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.planType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-800">Empresas Cadastradas</h2>
        <div className="mt-2">
          <input
            type="text"
            placeholder="Buscar empresas..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CNPJ
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plano
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuários
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Candidatos
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criado em
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{company.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{company.cnpj || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{company.planType}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      company.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {company.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company._userCount !== undefined 
                      ? company._userCount 
                      : (company.userCount !== undefined 
                          ? company.userCount 
                          : 0)
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company._candidateCount !== undefined 
                      ? company._candidateCount 
                      : (company.candidateCount !== undefined 
                          ? company.candidateCount 
                          : 0)
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onView(company.id)}
                      className="text-indigo-600 hover:text-indigo-900 mr-2"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => onEdit(company)}
                      className="text-purple-600 hover:text-purple-900 mr-2"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(company)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhuma empresa encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompanyList;
