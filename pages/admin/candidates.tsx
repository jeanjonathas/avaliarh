import type { NextPage } from 'next'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import AdminLayout from '../../components/admin/AdminLayout'
import { CandidatesTable } from '../../components/candidates'
import { Candidate } from '../../components/candidates/types'

const CandidatesPage: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await fetch('/api/admin/candidates', {
          credentials: 'include'
        })
        if (!response.ok) {
          throw new Error('Erro ao carregar candidatos')
        }
        const data = await response.json()
        setCandidates(data)
      } catch (error) {
        console.error('Erro ao carregar candidatos:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchCandidates()
    }
  }, [session])

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <p className="text-gray-500">Carregando...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Gerenciar Candidatos</h1>
        <CandidatesTable
          initialCandidates={candidates}
          showAddButton={true}
          showDeleteButton={true}
          showRatingFilter={true}
          showScoreFilter={true}
          showStatusFilter={true}
        />
      </div>
    </AdminLayout>
  )
}

export default CandidatesPage
