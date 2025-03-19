// Implementação da fórmula de normalização
function calculateWeight(position, totalTraits) {
  const W_max = 5;
  const W_min = 1;
  const N_g = totalTraits || 1;
  
  if (N_g === 1) return W_max;
  
  const weight = W_max - ((position - 1) * (W_max - W_min)) / (N_g - 1);
  return Math.max(W_min, Math.min(W_max, weight));
}

// Testar para um grupo com 5 alternativas
console.log('Grupo com 5 alternativas:');
for (let i = 1; i <= 5; i++) {
  console.log(`Posição ${i}: Peso = ${calculateWeight(i, 5).toFixed(2)}`);
}

// Testar para um grupo com 3 alternativas
console.log('\nGrupo com 3 alternativas:');
for (let i = 1; i <= 3; i++) {
  console.log(`Posição ${i}: Peso = ${calculateWeight(i, 3).toFixed(2)}`);
}

// Testar para um grupo com 2 alternativas
console.log('\nGrupo com 2 alternativas:');
for (let i = 1; i <= 2; i++) {
  console.log(`Posição ${i}: Peso = ${calculateWeight(i, 2).toFixed(2)}`);
}
