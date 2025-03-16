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

interface PlanFeature {
  id: string;
  name: string;
  description: string;
  isIncluded: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: PlanFeature[];
  isActive: boolean;
  companiesCount: number;
}

interface Company {
  id: string;
  name: string;
  plan: string;
  planId: string;
  isActive: boolean;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Nome do plano é obrigatório'),
  description: Yup.string(),
  price: Yup.number().min(0, 'O preço não pode ser negativo').required('Preço é obrigatório'),
  isActive: Yup.boolean(),
})

const Plans: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const notify = useNotificationSystem();
  const [plans, setPlans] = useState<Plan[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [features, setFeatures] = useState<PlanFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null)
  const [openFeaturesDialog, setOpenFeaturesDialog] = useState(false)
  const [featuresPlanId, setFeaturesPlanId] = useState<string | null>(null)
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([])
  const [openCompaniesDialog, setOpenCompaniesDialog] = useState(false)
  const [companiesPlanId, setCompaniesPlanId] = useState<string | null>(null)
  const [planCompanies, setPlanCompanies] = useState<Company[]>([])
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/superadmin/login')
    }
  }, [status, router])
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Buscar planos
        const plansResponse = await fetch('/api/superadmin/plans')
        if (!plansResponse.ok) {
          throw new Error('Erro ao carregar planos')
        }
        const plansData = await plansResponse.json()
        setPlans(plansData)
        
        // Buscar empresas
        const companiesResponse = await fetch('/api/superadmin/companies')
        if (!companiesResponse.ok) {
          throw new Error('Erro ao carregar empresas')
        }
        const companiesData = await companiesResponse.json()
        setCompanies(companiesData)
        
        // Buscar recursos disponíveis
        const featuresResponse = await fetch('/api/superadmin/plan-features')
        if (!featuresResponse.ok) {
          throw new Error('Erro ao carregar recursos')
        }
        const featuresData = await featuresResponse.json()
        setFeatures(featuresData)
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
  
  const handleAddPlan = async (values: any, { resetForm }: any) => {
    try {
      const planData = {
        name: values.name,
        description: values.description,
        price: parseFloat(values.price),
        isActive: values.isActive,
      }
      
      const response = await fetch('/api/superadmin/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao adicionar plano')
      }
      
      const newPlan = await response.json()
      setPlans([...plans, newPlan])
      resetForm()
      notify.success('Plano adicionado com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.error('Falha ao adicionar plano')
    }
  }
  
  const handleUpdatePlan = async (values: any, { resetForm }: any) => {
    if (!currentPlan) return
    
    try {
      const planData = {
        name: values.name,
        description: values.description,
        price: parseFloat(values.price),
        isActive: values.isActive,
      }
      
      const response = await fetch(`/api/superadmin/plans/${currentPlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar plano')
      }
      
      const updatedPlan = await response.json()
      setPlans(
        plans.map((p) =>
          p.id === updatedPlan.id ? updatedPlan : p
        )
      )
      
      setIsEditing(false)
      setCurrentPlan(null)
      resetForm()
      notify.success('Plano atualizado com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.error('Falha ao atualizar plano')
    }
  }
  
  const confirmDeletePlan = (id: string) => {
    setDeletePlanId(id)
    setOpenDeleteDialog(true)
  }
  
  const handleDeletePlan = async () => {
    if (!deletePlanId) return
    
    try {
      const response = await fetch(`/api/superadmin/plans/${deletePlanId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Erro ao excluir plano')
      }
      
      setPlans(plans.filter((p) => p.id !== deletePlanId))
      notify.success('Plano excluído com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.error('Falha ao excluir plano')
    } finally {
      setOpenDeleteDialog(false)
      setDeletePlanId(null)
    }
  }
  
  const handleEditPlan = (plan: Plan) => {
    setCurrentPlan(plan)
    setIsEditing(true)
  }
  
  const handleCancelEdit = () => {
    setIsEditing(false)
    setCurrentPlan(null)
  }
  
  const openPlanFeatures = async (planId: string) => {
    try {
      // Buscar recursos do plano
      const response = await fetch(`/api/superadmin/plans/${planId}/features`)
      if (!response.ok) {
        throw new Error('Erro ao carregar recursos do plano')
      }
      
      const featuresData = await response.json()
      setPlanFeatures(featuresData)
      setFeaturesPlanId(planId)
      setOpenFeaturesDialog(true)
    } catch (error) {
      console.error('Erro:', error)
      notify.error('Falha ao carregar recursos do plano')
    }
  }
  
  const handleFeatureToggle = (featureId: string) => {
    setPlanFeatures(prev => 
      prev.map(feature => 
        feature.id === featureId 
          ? { ...feature, isIncluded: !feature.isIncluded } 
          : feature
      )
    )
  }
  
  const savePlanFeatures = async () => {
    if (!featuresPlanId) return
    
    try {
      const featureIds = planFeatures
        .filter(feature => feature.isIncluded)
        .map(feature => feature.id)
      
      const response = await fetch(`/api/superadmin/plans/${featuresPlanId}/features`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featureIds }),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar recursos do plano')
      }
      
      notify.success('Recursos do plano atualizados com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.error('Falha ao atualizar recursos do plano')
    } finally {
      setOpenFeaturesDialog(false)
      setFeaturesPlanId(null)
    }
  }
  
  const openPlanCompanies = async (planId: string) => {
    try {
      // Buscar empresas do plano
      const response = await fetch(`/api/superadmin/plans/${planId}/companies`)
      if (!response.ok) {
        throw new Error('Erro ao carregar empresas do plano')
      }
      
      const companiesData = await response.json()
      setPlanCompanies(companiesData)
      setCompaniesPlanId(planId)
      setOpenCompaniesDialog(true)
    } catch (error) {
      console.error('Erro:', error)
      notify.error('Falha ao carregar empresas do plano')
    }
  }
  
  const updateCompanySubscription = async (companyId: string, data: any) => {
    try {
      const response = await fetch(`/api/superadmin/companies/${companyId}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar assinatura')
      }
      
      const updatedCompany = await response.json()
      
      // Atualizar a lista de empresas do plano
      setPlanCompanies(prev => 
        prev.map(company => 
          company.id === updatedCompany.id ? updatedCompany : company
        )
      )
      
      notify.success('Assinatura atualizada com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      notify.error('Falha ao atualizar assinatura')
    }
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    
    return new Date(dateString).toLocaleDateString('pt-BR')
  }
  
  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Gerenciar Planos e Assinaturas</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {isEditing ? 'Editar Plano' : 'Adicionar Novo Plano'}
              </h2>
              
              <Formik
                initialValues={
                  isEditing && currentPlan
                    ? {
                        name: currentPlan.name,
                        description: currentPlan.description || '',
                        price: currentPlan.price,
                        isActive: currentPlan.isActive,
                      }
                    : {
                        name: '',
                        description: '',
                        price: 0,
                        isActive: true,
                      }
                }
                validationSchema={validationSchema}
                onSubmit={isEditing ? handleUpdatePlan : handleAddPlan}
                enableReinitialize
              >
                {({ values, isSubmitting }) => (
                  <Form>
                    <div className="mb-4">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Plano
                      </label>
                      <Field
                        type="text"
                        name="name"
                        id="name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="name" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição
                      </label>
                      <Field
                        as="textarea"
                        name="description"
                        id="description"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="description" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                        Preço (R$)
                      </label>
                      <Field
                        type="number"
                        name="price"
                        id="price"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <ErrorMessage name="price" component="div" className="mt-1 text-sm text-red-600" />
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center">
                        <Field
                          type="checkbox"
                          name="isActive"
                          id="isActive"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                          Plano Ativo
                        </label>
                      </div>
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
                        {isEditing ? 'Atualizar' : 'Adicionar'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Planos Existentes</h2>
              
              {loading ? (
                <p className="text-center py-4">Carregando planos...</p>
              ) : error ? (
                <p className="text-center text-red-600 py-4">{error}</p>
              ) : plans.length === 0 ? (
                <p className="text-center py-4">Nenhum plano encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Preço
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Empresas
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {plans.map((plan) => (
                        <tr key={plan.id}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                            <div className="text-xs text-gray-500">{plan.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatCurrency(plan.price)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              plan.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {plan.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{plan.companiesCount}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditPlan(plan)}
                              className="text-indigo-600 hover:text-indigo-900 mr-2"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => openPlanFeatures(plan.id)}
                              className="text-green-600 hover:text-green-900 mr-2"
                            >
                              Recursos
                            </button>
                            <button
                              onClick={() => openPlanCompanies(plan.id)}
                              className="text-blue-600 hover:text-blue-900 mr-2"
                            >
                              Empresas
                            </button>
                            <button
                              onClick={() => confirmDeletePlan(plan.id)}
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
            Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeletePlan} color="primary" autoFocus>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de gerenciamento de recursos */}
      <Dialog
        open={openFeaturesDialog}
        onClose={() => setOpenFeaturesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Gerenciar Recursos do Plano</DialogTitle>
        <DialogContent>
          <DialogContentText className="mb-4">
            Selecione os recursos que estarão disponíveis neste plano:
          </DialogContentText>
          
          <div className="max-h-96 overflow-y-auto">
            {planFeatures.length === 0 ? (
              <p className="text-center py-4">Nenhum recurso disponível</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {planFeatures.map((feature) => (
                  <div key={feature.id} className="flex items-center p-2 border rounded">
                    <input
                      type="checkbox"
                      id={`feature-${feature.id}`}
                      checked={feature.isIncluded}
                      onChange={() => handleFeatureToggle(feature.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`feature-${feature.id}`} className="ml-2 block">
                      <span className="text-sm font-medium text-gray-700">{feature.name}</span>
                      <span className="block text-xs text-gray-500">
                        {feature.description}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFeaturesDialog(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={savePlanFeatures} color="primary" autoFocus>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de gerenciamento de empresas */}
      <Dialog
        open={openCompaniesDialog}
        onClose={() => setOpenCompaniesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Empresas com este Plano</DialogTitle>
        <DialogContent>
          <div className="max-h-96 overflow-y-auto">
            {planCompanies.length === 0 ? (
              <p className="text-center py-4">Nenhuma empresa com este plano</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assinatura
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Validade
                      </th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {planCompanies.map((company) => (
                      <tr key={company.id}>
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {company.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            company.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                            company.subscriptionStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {company.subscriptionStatus === 'ACTIVE' ? 'Ativa' : 
                             company.subscriptionStatus === 'PENDING' ? 'Pendente' : 'Expirada'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(company.subscriptionEndDate)}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => updateCompanySubscription(company.id, {
                              status: 'ACTIVE',
                              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                            })}
                            className="text-green-600 hover:text-green-900 mr-2"
                          >
                            Ativar
                          </button>
                          <button
                            onClick={() => updateCompanySubscription(company.id, {
                              status: 'EXPIRED',
                              endDate: null
                            })}
                            className="text-red-600 hover:text-red-900"
                          >
                            Expirar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCompaniesDialog(false)} color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </SuperAdminLayout>
  )
}

export default Plans
