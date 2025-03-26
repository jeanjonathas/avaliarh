/**
 * Gera um código aleatório de caracteres alfanuméricos
 * @param length Comprimento do código a ser gerado
 * @returns String contendo o código aleatório
 */
export function generateRandomCode(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  
  return result;
}
