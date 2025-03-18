import type { NextPage } from 'next'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import AdminLayout from '../../components/admin/AdminLayout'

const AdminDashboard: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return <div>Carregando...</div>
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push('/admin/candidates')}
          >
            <h2 className="text-xl font-semibold mb-2">Candidatos</h2>
            <p className="text-gray-600">Gerencie candidatos, avaliações e testes</p>
          </div>

          <div 
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push('/admin/tests')}
          >
            <h2 className="text-xl font-semibold mb-2">Testes</h2>
            <p className="text-gray-600">Configure e gerencie testes de avaliação</p>
          </div>

          <div 
            className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push('/admin/processes')}
          >
            <h2 className="text-xl font-semibold mb-2">Processos</h2>
            <p className="text-gray-600">Acompanhe processos seletivos</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard
