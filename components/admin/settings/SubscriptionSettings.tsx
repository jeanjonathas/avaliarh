import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionData {
  planName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  lastPaymentDate: string | null;
  nextPaymentDate?: string | null;
  usedCandidates?: number;
  totalCandidates?: number;
  usedUsers?: number;
  totalUsers?: number;
  paymentHistory?: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    status: string;
  }>;
}

interface SubscriptionSettingsProps {
  subscriptionData: SubscriptionData | null;
}

const SubscriptionSettings: React.FC<SubscriptionSettingsProps> = ({ subscriptionData }) => {
  if (!subscriptionData) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <p className="text-gray-500">Dados da assinatura não disponíveis</p>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não disponível';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
      case 'PAID':
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800';
      case 'INACTIVE':
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'Ativo';
      case 'INACTIVE':
        return 'Inativo';
      case 'PENDING':
        return 'Pendente';
      case 'PAID':
        return 'Pago';
      case 'FAILED':
        return 'Falhou';
      case 'CANCELLED':
        return 'Cancelado';
      case 'PROCESSING':
        return 'Processando';
      case 'COMPLETED':
        return 'Concluído';
      default:
        return status;
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Assinatura</h3>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 mb-8">
        <div className="sm:col-span-3">
          <p className="text-sm font-medium text-gray-500">Plano</p>
          <p className="mt-1 text-sm text-gray-900">{subscriptionData.planName}</p>
        </div>
        <div className="sm:col-span-3">
          <p className="text-sm font-medium text-gray-500">Status</p>
          <p className="mt-1 text-sm">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              getStatusBadgeClass(subscriptionData.status)
            }`}>
              {getStatusLabel(subscriptionData.status)}
            </span>
          </p>
        </div>
        <div className="sm:col-span-3">
          <p className="text-sm font-medium text-gray-500">Data de Início</p>
          <p className="mt-1 text-sm text-gray-900">{formatDate(subscriptionData.startDate)}</p>
        </div>
        <div className="sm:col-span-3">
          <p className="text-sm font-medium text-gray-500">Data de Término</p>
          <p className="mt-1 text-sm text-gray-900">{formatDate(subscriptionData.endDate)}</p>
        </div>
        <div className="sm:col-span-3">
          <p className="text-sm font-medium text-gray-500">Último Pagamento</p>
          <p className="mt-1 text-sm text-gray-900">{formatDate(subscriptionData.lastPaymentDate)}</p>
        </div>
        <div className="sm:col-span-3">
          <p className="text-sm font-medium text-gray-500">Próximo Pagamento</p>
          <p className="mt-1 text-sm text-gray-900">{formatDate(subscriptionData.nextPaymentDate)}</p>
        </div>
      </div>

      <h4 className="text-md font-medium text-gray-900 mb-4">Uso</h4>
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2 mb-8">
        {subscriptionData.usedCandidates !== undefined && subscriptionData.totalCandidates !== undefined && (
          <div className="sm:col-span-1">
            <p className="text-sm font-medium text-gray-500 mb-1">Candidatos</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary-600 h-2.5 rounded-full" 
                style={{ width: `${Math.min(100, (subscriptionData.usedCandidates / subscriptionData.totalCandidates) * 100)}%` }}
              ></div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {subscriptionData.usedCandidates} de {subscriptionData.totalCandidates} ({Math.round((subscriptionData.usedCandidates / subscriptionData.totalCandidates) * 100)}%)
            </p>
          </div>
        )}
        
        {subscriptionData.usedUsers !== undefined && subscriptionData.totalUsers !== undefined && (
          <div className="sm:col-span-1">
            <p className="text-sm font-medium text-gray-500 mb-1">Usuários</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary-600 h-2.5 rounded-full" 
                style={{ width: `${Math.min(100, (subscriptionData.usedUsers / subscriptionData.totalUsers) * 100)}%` }}
              ></div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {subscriptionData.usedUsers} de {subscriptionData.totalUsers} ({Math.round((subscriptionData.usedUsers / subscriptionData.totalUsers) * 100)}%)
            </p>
          </div>
        )}
      </div>

      {subscriptionData.paymentHistory && subscriptionData.paymentHistory.length > 0 && (
        <>
          <h4 className="text-md font-medium text-gray-900 mb-4">Histórico de Pagamentos</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Data
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Valor
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subscriptionData.paymentHistory.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getStatusBadgeClass(payment.status)
                        }`}
                      >
                        {getStatusLabel(payment.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default SubscriptionSettings;
