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
  FormControlLabel
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

interface Question {
  id: string;
  text: string;
  type: string;
}

interface Stage {
  id: string;
  title: string;
  description?: string;
  order: number;
  questions: Question[];
}

interface Test {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
  active: boolean;
  stages?: Stage[];
  sectionsCount?: number;
  questionsCount?: number;
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
  
  return (
    <>
      <TableRow 
        sx={{ '& > *': { borderBottom: 'unset' } }}
        hover
      >
        <TableCell padding="checkbox">
          <Radio
            checked={isSelected}
            onChange={() => onSelect(test.id)}
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
              setOpen(!open);
            }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {test.title}
        </TableCell>
        <TableCell align="right">
          {test.sectionsCount || (test.stages?.length || 0)}
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
              
              {test.stages && test.stages.length > 0 ? (
                test.stages.map((stage) => (
                  <StageDetail key={stage.id} stage={stage} />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma etapa disponível
                </Typography>
              )}
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
          ({stage.questions?.length || 0} perguntas)
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
          
          {stage.questions && stage.questions.length > 0 ? (
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
              Nenhuma pergunta disponível
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
