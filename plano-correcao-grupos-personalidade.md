# Plano de Correção para Grupos de Personalidade

## Problema Identificado

Atualmente, o sistema está mesclando todos os grupos de personalidade em um único conjunto quando calcula a compatibilidade. Isso é incorreto conceitualmente, pois:

1. Cada grupo de personalidade deve ser tratado separadamente
2. A compatibilidade deve ser calculada para cada grupo individualmente
3. A média das compatibilidades dos grupos deve ser usada como compatibilidade final das perguntas opinativas
4. Essa média de compatibilidade das opinativas deve então ser combinada com a pontuação das perguntas de múltipla escolha

Além disso, a visualização dos traços de personalidade deve permitir ver cada grupo separadamente, através de um sistema de abas.

## Plano de Implementação

### 1. Modificação do Backend (Cálculo de Compatibilidade)

#### 1.1. Identificar Grupos de Personalidade
- [ ] Modificar a função `analyzePersonalitiesWithWeights` para identificar a qual grupo pertence cada traço
- [ ] Agrupar os traços por grupo de personalidade
- [ ] Manter a estrutura de dados atual, mas adicionar informação de grupo

#### 1.2. Calcular Compatibilidade por Grupo
- [ ] Modificar o algoritmo para calcular a compatibilidade separadamente para cada grupo
- [ ] Implementar o cálculo da média de compatibilidade entre os grupos
- [ ] Combinar essa média com a pontuação das perguntas de múltipla escolha

### 2. Modificação da Interface (Visualização por Grupos)

#### 2.1. Componente de Abas para Grupos de Personalidade
- [ ] Criar um componente de abas reutilizável para grupos de personalidade
- [ ] Implementar lógica para alternar entre grupos
- [ ] Estilizar conforme o design do AvaliaRH

#### 2.2. Implementar Abas no Gráfico "Perfil de Personalidade"
- [ ] Adicionar sistema de abas (todos os grupos, grupo 1, grupo 2, etc.)
- [ ] Modificar o componente para exibir apenas os traços do grupo selecionado
- [ ] Atualizar a lógica de renderização do gráfico

#### 2.3. Implementar Abas em "Detalhamento de Traços de Personalidade"
- [ ] Adicionar sistema de abas (todos os grupos, grupo 1, grupo 2, etc.)
- [ ] Filtrar os traços exibidos na tabela com base na aba selecionada
- [ ] Manter a formatação e estilo atuais

#### 2.4. Implementar Abas em "Compatibilidade com o Perfil Esperado"
- [ ] Adicionar sistema de abas (todos os grupos, grupo 1, grupo 2, etc.)
- [ ] Modificar o componente para calcular e exibir a compatibilidade do grupo selecionado
- [ ] Atualizar a exibição do gráfico de compatibilidade

#### 2.5. Implementar Abas em "Análise de Personalidade (Perguntas Opinativas)"
- [ ] Adicionar sistema de abas (todos os grupos, grupo 1, grupo 2, etc.)
- [ ] Filtrar os dados exibidos com base na aba selecionada
- [ ] Atualizar os gráficos e visualizações

### 3. Testes e Validação

#### 3.1. Testes de Backend
- [ ] Verificar se os cálculos de compatibilidade estão corretos para cada grupo
- [ ] Validar se a média entre grupos está sendo calculada corretamente
- [ ] Confirmar que a combinação com perguntas de múltipla escolha funciona como esperado

#### 3.2. Testes de Interface
- [ ] Testar a navegação entre abas em todos os componentes
- [ ] Verificar se os dados exibidos correspondem ao grupo selecionado
- [ ] Validar a experiência do usuário em diferentes tamanhos de tela

## Arquivos a Modificar

### Backend
1. `/pages/api/admin/candidates/[id]/performance.ts` - Função `analyzePersonalitiesWithWeights`
2. `/lib/personality-analysis.ts` (se existir) - Funções de análise de personalidade

### Frontend
1. `/components/candidates/tabs/CandidateResultsTab.tsx` - Componente principal que exibe os resultados
2. `/components/candidates/compatibility/CandidateCompatibilityChart.tsx` - Gráfico de compatibilidade
3. `/components/common/TabGroup.tsx` (criar se não existir) - Componente reutilizável de abas

## Priorização

1. Primeiro, corrigir o cálculo de compatibilidade no backend
2. Em seguida, implementar o componente de abas reutilizável
3. Depois, implementar as abas em cada seção da interface
4. Por fim, realizar testes e ajustes finais
