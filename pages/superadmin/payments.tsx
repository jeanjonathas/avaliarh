import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import SuperAdminLayout from '../../components/SuperAdminLayout'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import { useNotificationSystem } from '../../hooks/useNotificationSystem';

interface Company {
  id: string;
  name: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
}

interface Subscription {
  id: string;
  status: string;
  plan: Plan;
}

interface Payment {
  id: string;
  companyId: string;
  subscriptionId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  transactionId?: string;
  invoiceUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  company: Company;
  subscription: Subscription;
}

const validationSchema = Yup.object({
  companyId: Yup.string().required('Empresa é obrigatória'),
  subscriptionId: Yup.string().required('Assinatura é obrigatória'),
  amount: Yup.number().min(0, 'O valor não pode ser negativo').required('Valor é obrigatório'),
  paymentDate: Yup.date().required('Data de pagamento é obrigatória'),
  paymentMethod: Yup.string().required('Método de pagamento é obrigatório'),
  status: Yup.string().required('Status é obrigatório'),
  transactionId: Yup.string(),
  invoiceUrl: Yup.string().url('URL inválida'),
  notes: Yup.string(),
})

const Payments: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const notify = useNotificationSystem();
  const [payments, setPayments] = useState<Payment[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [subscriptions, setSubscriptions] = useState<{ [key: string]: Subscription[] }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/superadmin/login')
    }
  }, [status, router])
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Buscar pagamentos
        const paymentsResponse = await fetch('/api/superadmin/payments')
        if (!paymentsResponse.ok) {
          throw new Error('Erro ao carregar pagamentos')
        }
        const paymentsData = await paymentsResponse.json()
        setPayments(paymentsData)
        
        // Buscar empresas
        const companiesResponse = await fetch('/api/superadmin/companies')
        if (!companiesResponse.ok) {
          throw new Error('Erro ao carregar empresas')
        }
        const companiesData = await companiesResponse.json()
        setCompanies(companiesData)
        
        // Inicializar o objeto de assinaturas
        const subsObj: { [key: string]: Subscription[] } = {}
        
        // Para cada empresa, buscar suas assinaturas
        for (const company of companiesData) {
          if (company.subscription) {
            const subscriptionResponse = await fetch(`/api/superadmin/companies/${company.id}/subscription`)
            if (subscriptionResponse.ok) {
              const subscriptionData = await subscriptionResponse.json()
              subsObj[company.id] = [subscriptionData]
            }
          }
        }
        
        setSubscriptions(subsObj)
      } catch (error) {
        console.error('Erro:', error)
        setError('Falha ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    
    if (session) {
      fetchData()
    }
  }, [session])
  
  const handleAddPayment = async (values: any, { resetForm }: any) => {
    try {
      const paymentData = {
        companyId: values.companyId,
        subscriptionId: values.subscriptionId,
        amount: parseFloat(values.amount),
        paymentDate: values.paymentDate,
        paymentMethod: values.paymentMethod,
        status: values.status,
        transactionId: values.transactionId,
        invoiceUrl: values.invoiceUrl,
        notes: values.notes,
      }
      
      const response = await fetch('/api/superadmin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao adicionar pagamento')
      }
      
      const newPayment = await response.json()
      
      // Buscar os detalhes completos do pagamento
      const paymentResponse = await fetch(`/api/superadmin/payments/${newPayment.id}`)
      if (!paymentResponse.ok) {
        throw new Error('Erro ao carregar detalhes do pagamento')
      }
      const paymentDetails = await paymentResponse.json()
      
      setPayments([paymentDetails, ...payments])
      resetForm()
      notify.showSuccess('Pagamento registrado com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao registrar pagamento')
    }
  }
  
  const handleUpdatePayment = async (values: any, { resetForm }: any) => {
    if (!currentPayment) return
    
    try {
      const paymentData = {
        amount: parseFloat(values.amount),
        paymentDate: values.paymentDate,
        paymentMethod: values.paymentMethod,
        status: values.status,
        transactionId: values.transactionId,
        invoiceUrl: values.invoiceUrl,
        notes: values.notes,
      }
      
      const response = await fetch(`/api/superadmin/payments/${currentPayment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar pagamento')
      }
      
      // Buscar os detalhes atualizados do pagamento
      const paymentResponse = await fetch(`/api/superadmin/payments/${currentPayment.id}`)
      if (!paymentResponse.ok) {
        throw new Error('Erro ao carregar detalhes do pagamento')
      }
      const updatedPayment = await paymentResponse.json()
      
      setPayments(
        payments.map((p) =>
          p.id === updatedPayment.id ? updatedPayment : p
        )
      )
      
      setIsEditing(false)
      setCurrentPayment(null)
      resetForm()
      notify.showSuccess('Pagamento atualizado com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao atualizar pagamento')
    }
  }
  
  const confirmDeletePayment = (id: string) => {
    setDeletePaymentId(id)
    setOpenDeleteDialog(true)
  }
  
  const handleDeletePayment = async () => {
    if (!deletePaymentId) return
    
    try {
      const response = await fetch(`/api/superadmin/payments/${deletePaymentId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Erro ao excluir pagamento')
      }
      
      setPayments(payments.filter((p) => p.id !== deletePaymentId))
      notify.showSuccess('Pagamento excluído com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.showError('Falha ao excluir pagamento')
    } finally {
      setOpenDeleteDialog(false)
      setDeletePaymentId(null)
    }
  }
  
  const handleEditPayment = (payment: Payment) => {
    setCurrentPayment(payment)
    setIsEditing(true)
    setSelectedCompanyId(payment.companyId)
  }
  
  const handleCancelEdit = () => {
    setIsEditing(false)
    setCurrentPayment(null)
  }
  
  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCompanyId(e.target.value)
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }
  
  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CREDIT_CARD':
        return 'Cartão de Crédito';
      case 'BANK_SLIP':
        return 'Boleto Bancário';
      case 'BANK_TRANSFER':
        return 'Transferência Bancária';
      case 'PIX':
        return 'PIX';
      case 'MANUAL':
        return 'Manual';
      default:
        return method;
    }
  }
  
  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'PAID':
        return 'Pago';
      case 'FAILED':
        return 'Falhou';
      case 'REFUNDED':
        return 'Reembolsado';
      default:
        return status;
    }
  }
  
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Gerenciar Histórico de Pagamentos</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {isEditing ? 'Editar Pagamento' : 'Registrar Novo Pagamento'}
              </h2>
              
              <Formik
                initialValues={
                  isEditing && currentPayment
                    ? {
                        companyId: currentPayment.companyId,
                        subscriptionId: currentPayment.subscriptionId,
                        amount: currentPayment.amount,
                        paymentDate: new Date(currentPayment.paymentDate).toISOString().split('T')[0],
                        paymentMethod: currentPayment.paymentMethod,
                        status: currentPayment.status,
                        transactionId: currentPayment.transactionId || '',
                        invoiceUrl: currentPayment.invoiceUrl || '',
                        notes: currentPayment.notes || '',
                      }
                    : {
                        companyId: '',
                        subscriptionId: '',
                        amount: 0,
                        paymentDate: new Date().toISOString().split('T')[0],
                        paymentMethod: 'MANUAL',
                        status: 'PAID',
                        transactionId: '',
                        invoiceUrl: '',
                        notes: '',
                      }
                }
                validationSchema={validationSchema}
                onSubmit={isEditing ? handleUpdatePayment : handleAddPayment}
                enableReinitialize
              >
                {({ values, isSubmitting, setFieldValue }) => (
                  <Form>
                    {!isEditing && (
                      <div className="mb-4">
                        <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-1">
                          Empresa
                        </label>
                        <Field
                          as="select"
                          name="companyId"
                          id="companyId"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            handleCompanyChange(e);
                            setFieldValue('companyId', e.target.value);
                            setFieldValue('subscriptionId', '');
                          }}
                        >
                          <option value="">Selecione uma empresa</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage name="companyId" component="div" className="mt-1 text-sm text-red-600" />
                      </div>
                    )}
                    
                    {!isEditing && (
                      <div className="mb-4">
                        <label htmlFor="subscriptionId" className="block text-sm font-medium text-gray-700 mb-1">
                          Assinatura
                        </label>
                        <Field
                          as="select"
                          name="subscriptionId"
                          id="subscriptionId"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          disabled={!selectedCompanyId}
                        >
                          <option value="">Selecione uma assinatura</option>
                          {selectedCompanyId && subscriptions[selectedCompanyId]?.map((subscription) => (
                            <option key={subscription.id} value={subscription.id}>
                              {subscription.plan.name} - {formatCurrency(subscription.plan.price)}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage name="subscriptionId" component="div" className="mt-1 text-sm text-red-600" />
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                        Valor (R$)
                      </label>
                      <Field
                        type="number"
                        name="amount"
                        id="amount"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="amount" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Pagamento
                      </label>
                      <Field
                        type="date"
                        name="paymentDate"
                        id="paymentDate"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="paymentDate" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                        Método de Pagamento
                      </label>
                      <Field
                        as="select"
                        name="paymentMethod"
                        id="paymentMethod"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="CREDIT_CARD">Cartão de Crédito</option>
                        <option value="BANK_SLIP">Boleto Bancário</option>
                        <option value="BANK_TRANSFER">Transferência Bancária</option>
                        <option value="PIX">PIX</option>
                        <option value="MANUAL">Manual</option>
                      </Field>
                      <ErrorMessage name="paymentMethod" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <Field
                        as="select"
                        name="status"
                        id="status"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="PENDING">Pendente</option>
                        <option value="PAID">Pago</option>
                        <option value="FAILED">Falhou</option>
                        <option value="REFUNDED">Reembolsado</option>
                      </Field>
                      <ErrorMessage name="status" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="transactionId" className="block text-sm font-medium text-gray-700 mb-1">
                        ID da Transação (opcional)
                      </label>
                      <Field
                        type="text"
                        name="transactionId"
                        id="transactionId"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="transactionId" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="invoiceUrl" className="block text-sm font-medium text-gray-700 mb-1">
                        URL da Fatura (opcional)
                      </label>
                      <Field
                        type="text"
                        name="invoiceUrl"
                        id="invoiceUrl"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="invoiceUrl" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Observações (opcional)
                      </label>
                      <Field
                        as="textarea"
                        name="notes"
                        id="notes"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="notes" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-6">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {isEditing ? 'Atualizar' : 'Registrar'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Histórico de Pagamentos</h2>
              
              {loading ? (
                <p className="text-center py-4">Carregando pagamentos...</p>
              ) : error ? (
                <p className="text-center text-red-600 py-4">{error}</p>
              ) : payments.length === 0 ? (
                <p className="text-center py-4">Nenhum pagamento encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Empresa
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plano
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Método
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{payment.company.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{payment.subscription.plan.name}</div>
                            <div className="text-xs text-gray-500">{formatCurrency(payment.subscription.plan.price)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatCurrency(payment.amount)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(payment.paymentDate)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{getPaymentMethodLabel(payment.paymentMethod)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              getPaymentStatusColor(payment.status)
                            }`}>
                              {getPaymentStatusLabel(payment.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditPayment(payment)}
                              className="text-indigo-600 hover:text-indigo-900 mr-2"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => confirmDeletePayment(payment.id)}
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
            </div>
          </div>
        </div>
      </div>
      
      {/* Diálogo de confirmação de exclusão */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeletePayment} color="primary" autoFocus>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </SuperAdminLayout>
  )
}

export default Payments
