# Manual de Cálculos de Análise de Personalidade - AvaliaRH

## Introdução

Este manual documenta os cálculos utilizados na análise de personalidade do AvaliaRH. Estes cálculos são fundamentais para a tela de estatísticas e para a calculadora de compatibilidade.

## Estrutura de Dados

### Grupos de Traços

Os traços de personalidade são organizados em grupos distintos, como:

- **Categorias** (ID: `group-cate`): Traços com nomes como "cate1", "cate2", etc.
- **Traços Nomeados** (ID: `group-nome`): Traços com nomes como "nome do traço 1", "nome do traço 2", etc.

Cada grupo possui:
- **ID**: Identificador único do grupo (ex: "group-cate")
- **Nome**: Nome amigável do grupo (ex: "Categorias")
- **Traços**: Lista de traços pertencentes ao grupo

### Traços de Personalidade

Cada traço possui:
- **Nome**: Nome do traço (ex: "cate5")
- **Peso**: Valor numérico que representa a importância do traço (geralmente de 1 a 5)
- **UUID**: Identificador único do traço

## Cálculos Principais

### 1. Porcentagem por Grupo

A porcentagem de um traço dentro de seu grupo é calculada como:

```
porcentagemGrupo = (contagem do traço / total de respostas no grupo) * 100
```

**Exemplo**:
- Se um candidato respondeu 2 perguntas no grupo "Categorias"
- E 1 dessas respostas foi associada ao traço "cate5"
- Então a porcentagem do traço "cate5" no grupo "Categorias" é (1/2) * 100 = 50%

### 2. Porcentagem Global

A porcentagem global de um traço é calculada como:

```
porcentagemGlobal = (contagem do traço / total de respostas opinativas) * 100
```

**Exemplo**:
- Se um candidato respondeu 4 perguntas opinativas no total
- E 1 dessas respostas foi associada ao traço "cate5"
- Então a porcentagem global do traço "cate5" é (1/4) * 100 = 25%

### 3. Pontuação Ponderada (weightedScore)

A pontuação ponderada representa a porcentagem do peso máximo:

```
pontuaçãoPonderada = (peso do traço / peso máximo no grupo) * 100
```

**Exemplo**:
- Se o traço "cate5" tem peso 5
- E o peso máximo no grupo "Categorias" é 5
- Então a pontuação ponderada é (5/5) * 100 = 100%

### 4. Traço Dominante

O traço dominante em um grupo é aquele com a maior porcentagem dentro do grupo.

**Exemplo**:
- Se no grupo "Categorias", o traço "cate5" tem 60% e o traço "cate3" tem 40%
- Então "cate5" é o traço dominante do grupo "Categorias"

### 5. Pontuação Geral (weightedScore geral)

A pontuação geral é calculada como a média das pontuações ponderadas de todos os traços:

```
pontuaçãoGeral = soma(pontuaçõesPonderadas) / número de traços
```

## Perfil Esperado

O perfil esperado de um grupo representa os valores ideais para cada traço, baseados nos pesos:

```
perfilEsperado[traço] = (peso do traço / peso máximo no grupo) * 100
```

**Exemplo**:
- Se o grupo "Categorias" tem os traços:
  - "cate5" com peso 5
  - "cate4" com peso 4
  - "cate3" com peso 3
- E o peso máximo é 5
- Então o perfil esperado é:
  - "cate5": (5/5) * 100 = 100%
  - "cate4": (4/5) * 100 = 80%
  - "cate3": (3/5) * 100 = 60%

## Cálculo de Compatibilidade

A compatibilidade entre o perfil do candidato e o perfil esperado é calculada como:

```
compatibilidade = 100 - média(|perfil candidato - perfil esperado|)
```

Onde:
- `perfil candidato` é a porcentagem de cada traço nas respostas do candidato
- `perfil esperado` é o valor esperado para cada traço baseado no peso

## Estrutura de Resposta da API

A API `/api/admin/candidates/[id]/performance` retorna a seguinte estrutura para análise de personalidade:

```json
{
  "personalityAnalysis": {
    "dominantPersonality": {
      "trait": "cate5",
      "count": 1,
      "percentage": 100,
      "globalPercentage": 50,
      "weight": 5,
      "weightedScore": 100,
      "categoryNameUuid": "20beca37-0783-4865-8525-9e5f7f6256df",
      "groupId": "group-cate",
      "groupName": "Categorias"
    },
    "dominantPersonalitiesByGroup": {
      "group-cate": { /* Traço dominante do grupo Categorias */ },
      "group-nome": { /* Traço dominante do grupo Traços Nomeados */ }
    },
    "allPersonalities": [ /* Lista de todos os traços com suas estatísticas */ ],
    "totalResponses": 2,
    "hasTraitWeights": true,
    "weightedScore": 100
  },
  "processPersonalityData": {
    "groups": [ /* Dados dos grupos de traços do processo */ ]
  }
}
```

## Implementação

A implementação destes cálculos está no arquivo `/lib/personality-analysis.ts`, que contém as funções:

1. `analyzePersonalitiesWithProcessData`: Analisa as respostas usando os dados do processo
2. `analyzePersonalitiesWithWeights`: Versão de compatibilidade que não depende dos dados do processo

## Uso na Tela de Estatísticas

Na tela de estatísticas, você pode usar estes dados para mostrar:

1. **Gráficos de radar** comparando o perfil do candidato com o perfil esperado
2. **Gráficos de barras** mostrando a distribuição de traços por grupo
3. **Indicadores** destacando os traços dominantes em cada grupo
4. **Pontuação de compatibilidade** geral e por grupo

## Exemplos de Visualização

### Exemplo 1: Gráfico de Radar para o Grupo "Categorias"

```
            cate5 (100%)
               /\
              /  \
             /    \
cate1 (20%) /______\ cate4 (80%)
           /\      /\
          /  \    /  \
         /    \  /    \
        /______\/______\
       cate2 (40%)  cate3 (60%)

--- Perfil Esperado
--- Perfil do Candidato
```

### Exemplo 2: Tabela de Compatibilidade

| Grupo | Traço Dominante | Compatibilidade |
|-------|-----------------|-----------------|
| Categorias | cate5 (100%) | 85% |
| Traços Nomeados | nome do traço 5 (100%) | 92% |
| **Geral** | | **88%** |
