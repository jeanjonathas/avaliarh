import React, { useState, useEffect } from 'react';

// Definindo a interface Company localmente para evitar problemas de importação
interface Company {
  id: string;
  name: string;
  cnpj?: string | null;
  planId?: string | null;
  planType: string;
  isActive: boolean;
  maxUsers: number;
  maxCandidates: number;
  lastPaymentDate?: Date | null;
  trialEndDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CompanyFormProps {
  company?: Company | null;
  onSubmit: (companyData: Partial<Company>) => void;
  onCancel: () => void;
}

const CompanyForm: React.FC<CompanyFormProps> = ({ 
  company, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    cnpj: '',
    planType: 'Free',
    isActive: true,
    maxUsers: 10,
    maxCandidates: 100,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        cnpj: company.cnpj || '',
        planType: company.planType,
        isActive: company.isActive,
        maxUsers: company.maxUsers,
        maxCandidates: company.maxCandidates,
        lastPaymentDate: company.lastPaymentDate,
        trialEndDate: company.trialEndDate,
      });
    }
  }, [company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // Aplicar formatação de CNPJ quando o campo for cnpj
    if (name === 'cnpj') {
      // Remove todos os caracteres não numéricos para processar
      const numericValue = value.replace(/\D/g, '');
      // Aplica a máscara e atualiza o estado
      setFormData(prev => ({ ...prev, [name]: formatCNPJ(numericValue) }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : null }));
    } else if (type === 'date') {
      setFormData(prev => ({ ...prev, [name]: value ? new Date(value) : null }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Função para formatar CNPJ no padrão XX.XXX.XXX/XXXX-XX
  const formatCNPJ = (value: string): string => {
    // Remove todos os caracteres não numéricos
    const numericValue = value.replace(/\D/g, '');
    
    // Limita a 14 dígitos (tamanho do CNPJ)
    const limitedValue = numericValue.slice(0, 14);
    
    // Aplica a máscara de acordo com o tamanho da string
    if (limitedValue.length <= 2) {
      return limitedValue;
    } else if (limitedValue.length <= 5) {
      return `${limitedValue.slice(0, 2)}.${limitedValue.slice(2)}`;
    } else if (limitedValue.length <= 8) {
      return `${limitedValue.slice(0, 2)}.${limitedValue.slice(2, 5)}.${limitedValue.slice(5)}`;
    } else if (limitedValue.length <= 12) {
      return `${limitedValue.slice(0, 2)}.${limitedValue.slice(2, 5)}.${limitedValue.slice(5, 8)}/${limitedValue.slice(8)}`;
    } else {
      return `${limitedValue.slice(0, 2)}.${limitedValue.slice(2, 5)}.${limitedValue.slice(5, 8)}/${limitedValue.slice(8, 12)}-${limitedValue.slice(12)}`;
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'O nome da empresa é obrigatório';
    }
    
    if (formData.cnpj && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(formData.cnpj)) {
      newErrors.cnpj = 'CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX';
    }
    
    if (!formData.planType) {
      newErrors.planType = 'O plano é obrigatório';
    }
    
    if (formData.maxUsers !== undefined && (formData.maxUsers < 1 || formData.maxUsers > 1000)) {
      newErrors.maxUsers = 'O número de usuários deve estar entre 1 e 1000';
    }
    
    if (formData.maxCandidates !== undefined && (formData.maxCandidates < 1 || formData.maxCandidates > 10000)) {
      newErrors.maxCandidates = 'O número de candidatos deve estar entre 1 e 10000';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {company ? 'Editar Empresa' : 'Adicionar Nova Empresa'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Empresa *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CNPJ
            </label>
            <input
              type="text"
              name="cnpj"
              value={formData.cnpj}
              onChange={handleChange}
              placeholder="XX.XXX.XXX/XXXX-XX"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.cnpj ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.cnpj && (
              <p className="mt-1 text-sm text-red-500">{errors.cnpj}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plano *
            </label>
            <select
              name="planType"
              value={formData.planType}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.planType ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="Free">Free</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
            {errors.planType && (
              <p className="mt-1 text-sm text-red-500">{errors.planType}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite de Usuários
            </label>
            <input
              type="number"
              name="maxUsers"
              value={formData.maxUsers}
              onChange={handleChange}
              min="1"
              max="1000"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.maxUsers ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.maxUsers && (
              <p className="mt-1 text-sm text-red-500">{errors.maxUsers}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite de Candidatos
            </label>
            <input
              type="number"
              name="maxCandidates"
              value={formData.maxCandidates}
              onChange={handleChange}
              min="1"
              max="10000"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.maxCandidates ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.maxCandidates && (
              <p className="mt-1 text-sm text-red-500">{errors.maxCandidates}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data do Último Pagamento
            </label>
            <input
              type="date"
              name="lastPaymentDate"
              value={formData.lastPaymentDate ? new Date(formData.lastPaymentDate).toISOString().split('T')[0] : ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Término do Trial
            </label>
            <input
              type="date"
              name="trialEndDate"
              value={formData.trialEndDate ? new Date(formData.trialEndDate).toISOString().split('T')[0] : ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div className="col-span-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Empresa Ativa
              </label>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            {company ? 'Atualizar' : 'Adicionar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyForm;
