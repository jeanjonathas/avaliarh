// Adicionar extensões do Jest para testes de DOM se necessário
require('@testing-library/jest-dom');

// Mock para o objeto global do Next.js
global.fetch = jest.fn();

// Mock para variáveis de ambiente
process.env = {
  ...process.env,
  NODE_ENV: 'test',
};
