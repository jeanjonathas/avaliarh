import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Box,
  Typography,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
  CircularProgress
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Interfaces para os tipos de dados
interface Question {
  id: string;
  text: string;
  type: string;
  difficulty?: string;
  categories?: { id: string; name: string }[];
}

interface Stage {
  id: string;
  title: string;
  description?: string;
  order: number;
  questions?: Question[];
}

interface Test {
  id: string;
  title: string;
  description?: string;
  active: boolean;
  timeLimit?: number;
  stages?: Stage[];
  sectionsCount?: number;
  questionsCount?: number;
  stagesCount?: number;
}

interface CollapsibleTestTableProps {
  tests: Test[];
  selectedTestId: string;
  onTestSelect: (testId: string) => void;
}

// Componente para uma linha de teste expansível
const TestRow = ({ test, isSelected, onSelect }: { 
  test: Test; 
  isSelected: boolean;
  onSelect: (testId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stagesLoaded, setStagesLoaded] = useState(false);
  
  // Função para verificar se o teste tem etapas e perguntas válidas
  const hasValidStages = () => {
    // Verificar se o teste tem etapas em diferentes formatos possíveis
    const stages = test.stages || [];
    
    console.log("Verificando etapas do teste:", test.id);
    console.log("Etapas disponíveis:", stages);
    
    return stages.length > 0;
  };

  // Função para carregar detalhes do teste quando expandir
  const loadTestDetails = async () => {
    if (stagesLoaded || hasValidStages()) {
      return;
    }

    setLoading(true);
    
    try {
      console.log(`Carregando detalhes do teste ${test.id}...`);
      
      // Primeiro, buscar informações básicas do teste
      const response = await fetch(`/api/admin/tests/${test.id}`);
      if (!response.ok) {
        throw new Error(`Erro ao buscar detalhes do teste: ${response.statusText}`);
      }
      
      const testData = await response.json();
      
      // Verificar se o teste já tem etapas
      if (!testData.stages || testData.stages.length === 0) {
        // Buscar etapas separadamente
        try {
          const stagesResponse = await fetch(`/api/admin/tests/${test.id}/stages`);
          if (stagesResponse.ok) {
            const stagesData = await stagesResponse.json();
            
            // Processar as etapas retornadas
            if (stagesData.stages && stagesData.stages.length > 0) {
              // Atualizar o objeto de teste com as etapas carregadas
              test.stages = stagesData.stages.map(item => {
                const stageData = item.stage || item;
                return {
                  id: stageData.id,
                  title: stageData.title,
                  description: stageData.description,
                  order: item.order || stageData.order || 0,
                  questions: []
                };
              });
            }
          }
        } catch (error) {
          console.error(`Erro ao buscar etapas:`, error);
        }
      } else {
        test.stages = testData.stages;
      }
      
      setStagesLoaded(true);
    } catch (error) {
      console.error(`Erro ao carregar detalhes do teste:`, error);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para renderizar as etapas do teste
  const renderStages = () => {
    // Se estamos carregando, mostrar indicador de carregamento
    if (loading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
          <CircularProgress size={20} sx={{ mr: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Carregando etapas do teste...
          </Typography>
        </Box>
      );
    }
    
    // Se temos etapas, renderizá-las
    if (test.stages && test.stages.length > 0) {
      return test.stages.map((stage) => (
        <StageDetail key={stage.id} stage={stage} />
      ));
    }
    
    // Caso contrário, mostrar mensagem de que não há etapas
    return (
      <Typography variant="body2" color="text.secondary">
        Nenhuma etapa disponível. Por favor, carregue os detalhes completos do teste.
      </Typography>
    );
  };
  
  return (
    <>
      <TableRow 
        sx={{ '& > *': { borderBottom: 'unset' } }}
        hover
      >
        <TableCell padding="checkbox">
          <Radio
            checked={isSelected}
            onChange={() => {
              setLoading(true);
              onSelect(test.id);
              // Simular um tempo de carregamento para garantir que os dados sejam atualizados
              setTimeout(() => setLoading(false), 1000);
            }}
            value={test.id}
            name="test-radio-button"
            inputProps={{ 'aria-label': `Selecionar teste ${test.title}` }}
          />
        </TableCell>
        <TableCell>
          <IconButton
            aria-label="expandir linha"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              const newOpenState = !open;
              setOpen(newOpenState);
              
              // Carregar detalhes do teste quando expandir
              if (newOpenState) {
                loadTestDetails();
              }
            }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {test.title}
        </TableCell>
        <TableCell align="right">
          {test.sectionsCount || test.stagesCount || (test.stages?.length || 0)}
        </TableCell>
        <TableCell align="right">
          {test.questionsCount || test.stages?.reduce((total, stage) => total + (stage.questions?.length || 0), 0) || 0}
        </TableCell>
        <TableCell align="right">
          {test.timeLimit ? `${test.timeLimit} min` : 'Sem limite'}
        </TableCell>
        <TableCell align="right">
          <Chip 
            label={test.active ? 'Ativo' : 'Inativo'} 
            color={test.active ? 'success' : 'default'}
            size="small"
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Detalhes do Teste
              </Typography>
              
              {test.description && (
                <Typography variant="body2" gutterBottom component="div" sx={{ mb: 2 }}>
                  {test.description}
                </Typography>
              )}
              
              <Typography variant="subtitle1" gutterBottom component="div">
                Etapas
              </Typography>
              
              {renderStages()}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// Componente para detalhes de uma etapa
const StageDetail = ({ stage }: { stage: Stage }) => {
  const [open, setOpen] = useState(false);
  
  // Função para verificar se a etapa tem perguntas válidas
  const hasValidQuestions = () => {
    return stage.questions && 
           Array.isArray(stage.questions) && 
           stage.questions.length > 0;
  };
  
  // Função para obter o número de perguntas
  const getQuestionsCount = () => {
    if (hasValidQuestions()) {
      return stage.questions.length;
    }
    return 0;
  };
  
  return (
    <Box sx={{ mb: 2, pl: 2 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          cursor: 'pointer',
          py: 1
        }}
        onClick={() => setOpen(!open)}
      >
        <IconButton size="small" sx={{ mr: 1 }}>
          {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
        <Typography variant="subtitle2">
          {stage.order + 1}. {stage.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          ({getQuestionsCount()} perguntas)
        </Typography>
      </Box>
      
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 4, pt: 1, pb: 2 }}>
          {stage.description && (
            <Typography variant="body2" paragraph>
              {stage.description}
            </Typography>
          )}
          
          <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
            Perguntas:
          </Typography>
          
          {hasValidQuestions() ? (
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {stage.questions.map((question) => (
                <Box component="li" key={question.id} sx={{ mb: 0.5 }}>
                  <Typography variant="body2">
                    {question.text}
                    <Chip 
                      label={question.type} 
                      size="small" 
                      sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                    />
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nenhuma pergunta disponível para esta etapa.
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

// Componente principal da tabela
const CollapsibleTestTable = ({ tests, selectedTestId, onTestSelect }: CollapsibleTestTableProps) => {
  return (
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <RadioGroup
        name="test-selection-radio-group"
        value={selectedTestId}
        onChange={(e) => onTestSelect(e.target.value)}
      >
        <Table aria-label="tabela de testes expansível">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">Selecionar</TableCell>
              <TableCell />
              <TableCell>Nome do Teste</TableCell>
              <TableCell align="right">Etapas</TableCell>
              <TableCell align="right">Perguntas</TableCell>
              <TableCell align="right">Tempo</TableCell>
              <TableCell align="right">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tests.map((test) => (
              <TestRow 
                key={test.id} 
                test={test} 
                isSelected={test.id === selectedTestId}
                onSelect={onTestSelect}
              />
            ))}
            {tests.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    Nenhum teste disponível
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </RadioGroup>
    </TableContainer>
  );
};

export default CollapsibleTestTable;
