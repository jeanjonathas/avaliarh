import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface CompanyData {
  id: string;
  name: string;
  cnpj?: string;
  planType?: string;
  isActive: boolean;
  maxUsers?: number;
  maxCandidates?: number;
  lastPaymentDate?: string | Date | null;
  trialEndDate?: string | Date | null;
  [key: string]: any;
}

interface CompanySettingsProps {
  companyData: CompanyData | null;
  onUpdate?: (updatedData: CompanyData) => void;
}

const CompanySettings: React.FC<CompanySettingsProps> = ({ companyData, onUpdate }) => {
  const [formData, setFormData] = useState<CompanyData | null>(companyData);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fullCompanyData, setFullCompanyData] = useState<CompanyData | null>(null);

  // Buscar dados completos da empresa quando o componente montar
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await axios.get('/api/admin/company');
        setFullCompanyData(response.data);
        setFormData(response.data);
      } catch (error) {
        console.error('Erro ao buscar dados completos da empresa:', error);
        // Fallback para os dados da sessão se a API falhar
        setFullCompanyData(companyData);
        setFormData(companyData);
      }
    };

    fetchCompanyData();
  }, [companyData]);

  if (!formData && !fullCompanyData) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <p className="text-secondary-500">Dados da empresa não disponíveis</p>
      </div>
    );
  }

  // Usar os dados completos ou o formData, o que estiver disponível
  const displayData = fullCompanyData || formData;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      if (!prev) return null;
      
      if (type === 'checkbox') {
        return { ...prev, [name]: checked };
      } else if (type === 'number') {
        return { ...prev, [name]: value ? parseInt(value) : undefined };
      } else if (type === 'date') {
        return { ...prev, [name]: value ? new Date(value) : null };
      } else {
        return { ...prev, [name]: value };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    
    setIsLoading(true);
    try {
      // Chamar a API para atualizar os dados da empresa
      const response = await axios.put('/api/admin/company', formData);
      
      // Atualizar os dados locais com a resposta da API
      setFormData(response.data);
      setFullCompanyData(response.data);
      
      // Notificar o componente pai sobre a atualização
      if (onUpdate) {
        onUpdate(response.data);
      }
      
      setIsEditing(false);
      toast.success('Dados da empresa atualizados com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar dados da empresa:', error);
      toast.error('Erro ao atualizar dados da empresa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(fullCompanyData || companyData);
    setIsEditing(false);
  };

  // Formatar data para exibição no input date
  const formatDateForInput = (date: Date | string | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  };

  // Formatar CNPJ para exibição
  const formatCNPJ = (cnpj: string | undefined) => {
    if (!cnpj) return '';
    // Remove caracteres não numéricos
    const numbers = cnpj.replace(/\D/g, '');
    // Aplica a máscara de CNPJ: XX.XXX.XXX/XXXX-XX
    if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-secondary-800">Informações da Empresa</h3>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Editar
          </button>
        ) : (
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-md hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="company-form"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      <form id="company-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-6">
            <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
              Nome da Empresa
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="name"
                id="name"
                value={formData?.name || ''}
                onChange={handleChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                  !isEditing ? 'bg-secondary-50 text-secondary-500' : ''
                }`}
                required
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="cnpj" className="block text-sm font-medium text-secondary-700 mb-1">
              CNPJ
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="cnpj"
                id="cnpj"
                value={formatCNPJ(formData?.cnpj) || ''}
                onChange={handleChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                  !isEditing ? 'bg-secondary-50 text-secondary-500' : ''
                }`}
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="planType" className="block text-sm font-medium text-secondary-700 mb-1">
              Plano
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="planType"
                id="planType"
                value={displayData?.planType || ''}
                disabled={true}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md bg-secondary-50 text-secondary-500"
              />
              {isEditing && (
                <p className="mt-1 text-xs text-secondary-500">
                  O tipo de plano não pode ser alterado aqui. Entre em contato com o suporte para alterar seu plano.
                </p>
              )}
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="maxUsers" className="block text-sm font-medium text-secondary-700 mb-1">
              Máximo de Usuários
            </label>
            <div className="mt-1">
              <input
                type="number"
                name="maxUsers"
                id="maxUsers"
                value={displayData?.maxUsers || 0}
                disabled={true}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md bg-secondary-50 text-secondary-500"
              />
              {isEditing && (
                <p className="mt-1 text-xs text-secondary-500">
                  Este limite não pode ser alterado aqui. Entre em contato com o suporte para ajustar seu plano.
                </p>
              )}
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="maxCandidates" className="block text-sm font-medium text-secondary-700 mb-1">
              Máximo de Candidatos
            </label>
            <div className="mt-1">
              <input
                type="number"
                name="maxCandidates"
                id="maxCandidates"
                value={displayData?.maxCandidates || 0}
                disabled={true}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md bg-secondary-50 text-secondary-500"
              />
              {isEditing && (
                <p className="mt-1 text-xs text-secondary-500">
                  Este limite não pode ser alterado aqui. Entre em contato com o suporte para ajustar seu plano.
                </p>
              )}
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="lastPaymentDate" className="block text-sm font-medium text-secondary-700 mb-1">
              Data do Último Pagamento
            </label>
            <div className="mt-1">
              <input
                type="date"
                name="lastPaymentDate"
                id="lastPaymentDate"
                value={formatDateForInput(displayData?.lastPaymentDate)}
                disabled={true}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md bg-secondary-50 text-secondary-500"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="trialEndDate" className="block text-sm font-medium text-secondary-700 mb-1">
              Data de Término do Trial
            </label>
            <div className="mt-1">
              <input
                type="date"
                name="trialEndDate"
                id="trialEndDate"
                value={formatDateForInput(displayData?.trialEndDate)}
                disabled={true}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md bg-secondary-50 text-secondary-500"
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={displayData?.isActive || false}
                onChange={handleChange}
                disabled={true}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-secondary-700">
                Empresa Ativa
              </label>
              {isEditing && (
                <p className="ml-2 text-xs text-secondary-500">
                  O status de ativação não pode ser alterado aqui. Entre em contato com o suporte.
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CompanySettings;
