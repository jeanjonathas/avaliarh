import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AddCandidateModal from '../../candidates/modals/AddCandidateModal';
import { 
  DataGrid, 
  GridColDef, 
  GridRenderCellParams, 
  GridRowSelectionModel 
} from '@mui/x-data-grid';
import { Button, Chip } from '@mui/material';
import toast from 'react-hot-toast';

interface Candidate {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

interface CandidateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  processId: string;
  onSuccess: () => void;
  onAddNewCandidate?: () => void;
}

const CandidateSelectionModal: React.FC<CandidateSelectionModalProps> = ({
  isOpen,
  onClose,
  processId,
  onSuccess,
  onAddNewCandidate
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
  const router = useRouter();

  const fetchAvailableCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/candidates/available?processId=${processId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar candidatos disponíveis');
      }
      
      const data = await response.json();
      setCandidates(data);
    } catch (err) {
      console.error('Erro ao buscar candidatos:', err);
      setError('Erro ao carregar candidatos disponíveis. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, [processId]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableCandidates();
    }
  }, [isOpen, fetchAvailableCandidates]);

  const handleAddSelectedCandidates = async () => {
    if (selectionModel.length === 0) {
      toast.error('Selecione pelo menos um candidato para adicionar ao processo', {
        position: 'bottom-center',
      });
      return;
    }

    try {
      // Adicionar cada candidato selecionado ao processo
      for (const candidateId of selectionModel) {
        await addCandidateToProcess(candidateId.toString());
      }

      toast.success(`${selectionModel.length} candidato(s) adicionado(s) ao processo com sucesso!`, {
        position: 'bottom-center',
      });
      
      // Limpar seleção
      setSelectionModel([]);
      
      // Atualizar a lista de candidatos do processo
      onSuccess();
      
      // Fechar o modal após adicionar
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar candidatos ao processo:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao adicionar candidatos ao processo',
        {
          position: 'bottom-center',
        }
      );
    }
  };

  const addCandidateToProcess = async (candidateId: string) => {
    const response = await fetch('/api/admin/processes/candidates/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidateId,
        processId
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao adicionar candidato ao processo');
    }
    
    // Remover o candidato da lista
    setCandidates(candidates.filter(c => c.id !== candidateId));
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  const handleCreateNewCandidate = () => {
    // Se tiver um callback para adicionar novo candidato, use-o
    if (onAddNewCandidate) {
      onAddNewCandidate();
    } else {
      // Caso contrário, use o comportamento padrão
      // Fechar a modal atual antes de abrir a modal de cadastro
      onClose();
      // Abrir a modal de cadastro de candidato
      setIsAddCandidateModalOpen(true);
    }
  };

  const handleNewCandidateSuccess = () => {
    // Reabrir a modal de seleção após o cadastro bem-sucedido
    onSuccess();
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nome', flex: 1 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const status = params.value as string;
        return (
          <Chip 
            label={
              status === 'APPROVED' ? 'Aprovado' :
              status === 'REJECTED' ? 'Rejeitado' :
              'Pendente'
            }
            color={
              status === 'APPROVED' ? 'success' :
              status === 'REJECTED' ? 'error' :
              'warning'
            }
            size="small"
            variant="outlined"
          />
        );
      }
    },
    { 
      field: 'createdAt', 
      headerName: 'Data de Cadastro', 
      width: 180,
      renderCell: (params) => (
        <span>{formatDate(String(params.value))}</span>
      )
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Button
          variant="text"
          size="small"
          onClick={() => router.push(`/admin/candidates/${params.id}`)}
        >
          Ver Detalhes
        </Button>
      )
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[90%] max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-secondary-200">
          <div>
            <h3 className="text-xl font-semibold text-secondary-800">Adicionar Candidatos ao Processo</h3>
            <p className="mt-1 text-sm text-secondary-500">
              Selecione candidatos existentes ou crie um novo candidato para adicionar ao processo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-500"
          >
            <span className="sr-only">Fechar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <button
              onClick={fetchAvailableCandidates}
              className="mt-4 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4">
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddSelectedCandidates}
                disabled={selectionModel.length === 0}
                sx={{ 
                  opacity: selectionModel.length === 0 ? 0.7 : 1,
                  '&.Mui-disabled': {
                    color: 'white',
                    backgroundColor: 'rgba(25, 118, 210, 0.5)',
                  }
                }}
              >
                Adicionar Selecionados ({selectionModel.length})
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                onClick={handleCreateNewCandidate}
              >
                Cadastrar Novo Candidato
              </Button>
            </div>
            
            {candidates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Não há candidatos disponíveis para adicionar a este processo.</p>
              </div>
            ) : (
              <div style={{ height: 400, width: '100%' }}>
                <DataGrid
                  rows={candidates}
                  columns={columns}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 5 }
                    }
                  }}
                  pageSizeOptions={[5, 10, 20]}
                  checkboxSelection
                  disableRowSelectionOnClick
                  rowSelectionModel={selectionModel}
                  onRowSelectionModelChange={(newSelectionModel) => {
                    console.log('Seleção alterada:', newSelectionModel);
                    setSelectionModel(newSelectionModel);
                  }}
                  loading={loading}
                />
              </div>
            )}
          </>
        )}
      </div>

      {isAddCandidateModalOpen && (
        <AddCandidateModal
          isOpen={isAddCandidateModalOpen}
          onClose={() => setIsAddCandidateModalOpen(false)}
          onSuccess={handleNewCandidateSuccess}
        />
      )}
    </div>
  );
};

export default CandidateSelectionModal;
