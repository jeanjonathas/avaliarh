import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '../../../components/admin/AdminLayout';
import toast from 'react-hot-toast';
import CandidateSelectionModal from '../../../components/admin/processes/CandidateSelectionModal';
import GenerateInviteButton from '../../../components/admin/processes/GenerateInviteButton';
import AddCandidateModal from '../../../components/candidates/modals/AddCandidateModal';
import { 
  DataGrid, 
  GridColDef, 
  GridRenderCellParams,
  GridRowSelectionModel
} from '@mui/x-data-grid';
import { 
  Button, 
  Chip, 
  IconButton, 
  Tooltip, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle 
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface ProcessStage {
  id: string;
  name: string;
  description?: string;
  order: number;
  type: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  status: string;
  overallStatus: string;
  createdAt: string;
  inviteCode?: string;
  testId?: string;
  progresses: Array<{
    id: string;
    status: string;
    stageId: string;
    stage: ProcessStage;
  }>;
}

interface SelectionProcess {
  id: string;
  name: string;
  description?: string;
  cutoffScore?: number;
  evaluationType: string;
  createdAt: string;
  updatedAt: string;
  stages: ProcessStage[];
  candidates: Candidate[];
  test?: {
    id: string;
    title: string;
  };
}

const ProcessDetails: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [process, setProcess] = useState<SelectionProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [isNewCandidateModalOpen, setIsNewCandidateModalOpen] = useState(false);
  const [candidateInviteCodes, setCandidateInviteCodes] = useState<Record<string, string>>({});
  const [confirmRemoveDialogOpen, setConfirmRemoveDialogOpen] = useState(false);
  const [candidateToRemove, setCandidateToRemove] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProcessDetails();
    }
  }, [id]);

  const fetchProcessDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/processes/${id}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar detalhes do processo seletivo');
      }
      
      const data = await response.json();
      setProcess(data);
      
      // Inicializar o estado dos códigos de convite
      const inviteCodes: Record<string, string> = {};
      data.candidates.forEach((candidate: Candidate) => {
        if (candidate.inviteCode) {
          inviteCodes[candidate.id] = candidate.inviteCode;
        }
      });
      setCandidateInviteCodes(inviteCodes);
    } catch (err) {
      console.error('Erro ao buscar detalhes do processo seletivo:', err);
      setError('Erro ao carregar detalhes do processo seletivo. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSuccess = (candidateId: string, inviteCode: string) => {
    setCandidateInviteCodes(prev => ({
      ...prev,
      [candidateId]: inviteCode
    }));
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800';
      case 'APPROVED_FOR_HIRING':
        return 'bg-green-100 text-green-800';
      case 'ON_HOLD':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStageTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'TEST': 'Teste',
      'INTERVIEW': 'Entrevista',
      'TECHNICAL': 'Avaliação Técnica',
      'GROUP_DYNAMIC': 'Dinâmica em Grupo',
      'REFERENCE_CHECK': 'Verificação de Referências',
      'BACKGROUND_CHECK': 'Verificação de Antecedentes',
      'OFFER': 'Proposta',
      'OTHER': 'Outro'
    };
    
    return typeMap[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDING': 'Pendente',
      'APPROVED': 'Aprovado',
      'REJECTED': 'Reprovado',
      'IN_PROGRESS': 'Em Andamento',
      'COMPLETED': 'Concluído',
      'APPROVED_FOR_HIRING': 'Aprovado para Contratação',
      'ON_HOLD': 'Em Espera',
      'PENDING_EVALUATION': 'Aguardando Avaliação'
    };
    
    return statusMap[status] || status;
  };

  const handleRemoveCandidate = async () => {
    if (!candidateToRemove) return;
    
    try {
      const response = await fetch(`/api/admin/processes/candidates/remove`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateId: candidateToRemove,
          processId: process?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao remover candidato do processo');
      }

      toast.success('Candidato removido do processo com sucesso!', {
        position: 'bottom-center',
      });
      
      // Atualizar a lista de candidatos
      fetchProcessDetails();
      
      // Fechar o diálogo de confirmação
      setConfirmRemoveDialogOpen(false);
      setCandidateToRemove(null);
    } catch (error) {
      console.error('Erro ao remover candidato:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao remover candidato do processo',
        {
          position: 'bottom-center',
        }
      );
    }
  };

  const openRemoveConfirmDialog = (candidateId: string) => {
    setCandidateToRemove(candidateId);
    setConfirmRemoveDialogOpen(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchProcessDetails}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!process) {
    return (
      <AdminLayout>
        <div className="bg-white shadow-md rounded-lg p-6">
          <p className="text-center text-gray-500">Processo seletivo não encontrado.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{process.name}</h1>
            {process.description && (
              <p className="text-gray-600 mt-1">{process.description}</p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setIsAddCandidateModalOpen(true)}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Adicionar Candidato
            </button>
            <Link href={`/admin/processes/edit/${process.id}`}>
              <button className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">
                Editar Processo
              </button>
            </Link>
            <Link href="/admin/processes">
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                Voltar
              </button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Tipo de Avaliação</h3>
            <p className="mt-1 text-lg font-semibold">
              {process.evaluationType === 'SCORE_BASED' ? 'Baseado em Pontuação' : 'Personalizado'}
            </p>
          </div>
          {process.cutoffScore && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Pontuação de Corte</h3>
              <p className="mt-1 text-lg font-semibold">{process.cutoffScore}%</p>
            </div>
          )}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Data de Criação</h3>
            <p className="mt-1 text-lg font-semibold">{formatDate(process.createdAt)}</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Etapas do Processo</h2>
          
          {process.stages.length === 0 ? (
            <p className="text-gray-500">Nenhuma etapa definida para este processo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordem
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {process.stages.map((stage) => (
                    <tr key={stage.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stage.order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stage.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {getStageTypeLabel(stage.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {stage.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Candidatos</h2>
            <Link href={`/admin/candidates?processId=${process.id}`}>
              <Button 
                variant="contained" 
                color="primary" 
                size="small" 
                startIcon={<PersonAddIcon />}
              >
                Gerenciar Candidatos
              </Button>
            </Link>
          </div>
          
          {process.candidates.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-md">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum candidato neste processo</h3>
              <p className="mt-1 text-sm text-gray-500">
                Adicione candidatos a este processo seletivo para começar a avaliação.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsAddCandidateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Adicionar Candidato
                </button>
              </div>
            </div>
          ) : (
            <div style={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={process.candidates.map(candidate => ({
                  ...candidate,
                  progress: Math.round((candidate.progresses.filter(p => p.status === 'COMPLETED').length / process.stages.length) * 100)
                }))}
                columns={[
                  { field: 'name', headerName: 'Nome', flex: 1 },
                  { field: 'email', headerName: 'Email', flex: 1 },
                  { 
                    field: 'overallStatus', 
                    headerName: 'Status', 
                    width: 150,
                    renderCell: (params: GridRenderCellParams) => {
                      const status = params.value as string;
                      return (
                        <Chip 
                          label={getStatusLabel(status)}
                          color={
                            status === 'APPROVED' ? 'success' :
                            status === 'REJECTED' ? 'error' :
                            status === 'IN_PROGRESS' ? 'info' :
                            'warning'
                          }
                          size="small"
                          variant="outlined"
                        />
                      );
                    }
                  },
                  { 
                    field: 'progress', 
                    headerName: 'Progresso', 
                    width: 150,
                    renderCell: (params: GridRenderCellParams) => (
                      <div className="w-full">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-primary-500 h-2.5 rounded-full" 
                            style={{ width: `${params.value}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {params.row.progresses.filter((p: any) => p.status === 'COMPLETED').length} de {process.stages.length} etapas
                        </span>
                      </div>
                    )
                  },
                  { 
                    field: 'createdAt', 
                    headerName: 'Data de Cadastro', 
                    width: 150,
                    renderCell: (params) => (
                      <span>{formatDate(String(params.value))}</span>
                    )
                  },
                  { 
                    field: 'inviteCode', 
                    headerName: 'Convite', 
                    width: 200,
                    renderCell: (params: GridRenderCellParams) => {
                      const candidateId = params.row.id;
                      const inviteCode = candidateInviteCodes[candidateId];
                      
                      return inviteCode ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{inviteCode}</span>
                          <Tooltip title="Copiar código">
                            <IconButton
                              size="small"
                              onClick={() => {
                                navigator.clipboard.writeText(inviteCode);
                                toast.success('Código copiado para a área de transferência!');
                              }}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </div>
                      ) : (
                        <GenerateInviteButton
                          candidateId={candidateId}
                          processId={process.id}
                          testId={process.test?.id || ''}
                          onSuccess={(inviteCode) => handleInviteSuccess(candidateId, inviteCode)}
                        />
                      );
                    }
                  },
                  {
                    field: 'actions',
                    headerName: 'Ações',
                    width: 120,
                    sortable: false,
                    renderCell: (params: GridRenderCellParams) => (
                      <div className="flex space-x-1">
                        <Tooltip title="Ver detalhes">
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/admin/candidates/${params.id}?returnTo=/admin/processes/${process.id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remover do processo">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openRemoveConfirmDialog(params.id.toString())}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    )
                  }
                ]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 5 }
                  }
                }}
                pageSizeOptions={[5, 10, 20]}
                disableRowSelectionOnClick
              />
            </div>
          )}
        </div>

        {isAddCandidateModalOpen && (
          <CandidateSelectionModal
            isOpen={isAddCandidateModalOpen}
            onClose={() => setIsAddCandidateModalOpen(false)}
            processId={process.id}
            onSuccess={fetchProcessDetails}
            onAddNewCandidate={() => {
              setIsAddCandidateModalOpen(false);
              setIsNewCandidateModalOpen(true);
            }}
          />
        )}

        {isNewCandidateModalOpen && (
          <AddCandidateModal
            isOpen={isNewCandidateModalOpen}
            onClose={() => setIsNewCandidateModalOpen(false)}
            onSuccess={() => {
              fetchProcessDetails();
              setIsNewCandidateModalOpen(false);
              setIsAddCandidateModalOpen(true);
            }}
            processId={process.id}
          />
        )}

        {/* Diálogo de confirmação para remover candidato */}
        <Dialog
          open={confirmRemoveDialogOpen}
          onClose={() => setConfirmRemoveDialogOpen(false)}
        >
          <DialogTitle>Remover candidato</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Tem certeza que deseja remover este candidato do processo seletivo? 
              Esta ação não pode ser desfeita.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmRemoveDialogOpen(false)} color="primary">
              Cancelar
            </Button>
            <Button onClick={handleRemoveCandidate} color="error" variant="contained">
              Remover
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ProcessDetails;
