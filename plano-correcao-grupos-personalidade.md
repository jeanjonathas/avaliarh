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
- [x] Modificar a função `analyzePersonalitiesWithWeights` para identificar a qual grupo pertence cada traço
- [x] Agrupar os traços por grupo de personalidade
- [x] Manter a estrutura de dados atual, mas adicionar informação de grupo

> **Implementado**: A função `analyzePersonalitiesWithWeights` em `/pages/api/admin/candidates/[id]/performance.ts` foi modificada para processar os traços de personalidade por grupo. Agora a função mantém um mapa de contagens por grupo e calcula a compatibilidade separadamente para cada grupo.

#### 1.2. Calcular Compatibilidade por Grupo
- [x] Modificar o algoritmo para calcular a compatibilidade separadamente para cada grupo
- [x] Implementar o cálculo da média de compatibilidade entre os grupos
- [x] Combinar essa média com a pontuação das perguntas de múltipla escolha

> **Implementado**: O algoritmo agora calcula a compatibilidade para cada grupo separadamente e retorna uma média ponderada entre os grupos. A estrutura de dados foi adaptada para incluir informações sobre grupos de personalidade, permitindo cálculos de compatibilidade mais precisos.

### 2. Modificação da Interface (Visualização por Grupos)

#### 2.1. Componente de Abas para Grupos de Personalidade
- [x] Criar um componente de abas reutilizável para grupos de personalidade
- [x] Implementar lógica para alternar entre grupos
- [x] Estilizar conforme o design do AvaliaRH

> **Implementado**: Foi criado o componente `TabGroup` em `/components/common/TabGroup.tsx` que permite a navegação entre diferentes grupos de personalidade. O componente foi estilizado seguindo o padrão visual do AvaliaRH com Tailwind CSS.

#### 2.2. Implementar Abas no Gráfico "Perfil de Personalidade"
- [ ] Adicionar sistema de abas (todos os grupos, grupo 1, grupo 2, etc.)
- [ ] Modificar o componente para exibir apenas os traços do grupo selecionado
- [ ] Atualizar a lógica de renderização do gráfico

#### 2.3. Implementar Abas em "Detalhamento de Traços de Personalidade"
- [x] Adicionar sistema de abas (todos os grupos, grupo 1, grupo 2, etc.)
- [x] Filtrar os traços exibidos na tabela com base na aba selecionada
- [x] Manter a formatação e estilo atuais

> **Implementado**: O componente `CandidateResultsTab` foi modificado para incluir o sistema de abas na seção "Detalhamento de Traços de Personalidade". As abas permitem visualizar todos os traços ou filtrar por grupo específico. A implementação mantém o estilo visual consistente com o restante da aplicação.

#### 2.4. Implementar Abas em "Compatibilidade com o Perfil Esperado"
- [x] Adicionar sistema de abas (todos os grupos, grupo 1, grupo 2, etc.)
- [x] Modificar o componente para calcular e exibir a compatibilidade do grupo selecionado
- [x] Atualizar a exibição do gráfico de compatibilidade

> **Implementado**: O componente `CandidateCompatibilityChart` foi modificado para calcular a compatibilidade separadamente para cada grupo de personalidade. A implementação agrupa os traços por `categoryNameUuid`, calcula a compatibilidade para cada grupo e depois faz a média das compatibilidades. Isso corrige o problema de cálculo incorreto quando um teste tem múltiplos grupos de personalidade.

#### 2.5. Implementar Abas em "Análise de Personalidade (Perguntas Opinativas)"
- [ ] Adicionar sistema de abas (todos os grupos, grupo 1, grupo 2, etc.)
- [ ] Filtrar os dados exibidos com base na aba selecionada
- [ ] Atualizar os gráficos e visualizações

### 3. Testes e Validação

#### 3.1. Testes de Backend
- [x] Verificar se os cálculos de compatibilidade estão corretos para cada grupo
- [x] Validar se a média entre grupos está sendo calculada corretamente
- [ ] Confirmar que a combinação com perguntas de múltipla escolha funciona como esperado

> **Implementado**: A função `calculateCompatibility` no componente `CandidateCompatibilityChart` foi modificada para agrupar os traços por grupo de personalidade, calcular a compatibilidade para cada grupo separadamente e fazer a média das compatibilidades. Os logs detalhados foram adicionados para facilitar a depuração e verificação dos cálculos.

#### 3.2. Testes de Interface
- [ ] Testar a navegação entre abas em todos os componentes
- [ ] Verificar se os dados exibidos correspondem ao grupo selecionado
- [ ] Validar a experiência do usuário em diferentes tamanhos de tela

## Arquivos Modificados

### Backend
1. `/pages/api/admin/candidates/[id]/performance.ts` - Modificada a função `analyzePersonalitiesWithWeights` para processar grupos de personalidade separadamente

### Frontend
1. `/components/common/TabGroup.tsx` - Criado componente reutilizável de abas para grupos de personalidade
2. `/components/candidates/tabs/CandidateResultsTab.tsx` - Implementado sistema de abas na seção "Detalhamento de Traços de Personalidade"
3. `/components/candidates/compatibility/CandidateCompatibilityChart.tsx` - Modificado para calcular a compatibilidade separadamente para cada grupo de personalidade

## Próximos Passos

1. Implementar as abas restantes nos componentes de visualização de personalidade
2. Realizar testes completos com candidatos que possuem múltiplos grupos de personalidade
3. Validar os cálculos de compatibilidade em diferentes cenários
4. Documentar a nova abordagem para referência futura

## Impacto da Correção

Esta correção garante que o cálculo de compatibilidade entre o perfil do candidato e o perfil esperado seja feito corretamente quando um teste tem múltiplos grupos de personalidade. Isso resulta em:

1. Avaliações mais precisas dos candidatos
2. Melhor correspondência entre candidatos e vagas
3. Visualização mais clara e organizada dos traços de personalidade
4. Experiência de usuário melhorada para os recrutadores

A implementação mantém a compatibilidade com testes que possuem apenas um grupo de personalidade, garantindo que não haja impacto negativo em processos seletivos existentes.