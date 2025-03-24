import React, { useState } from 'react';
import axios from 'axios';
import { UserIcon, KeyIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface StudentCredentialsManagerProps {
  studentId: string;
  userId: string;
  email: string;
  hasPassword: boolean;
}

// Função para gerar senha fácil de memorizar (4 letras + 4 números)
const generateEasyPassword = (): string => {
  // Consoantes fáceis de pronunciar
  const consonants = 'bcdfghjklmnpqrstvwxz';
  // Vogais
  const vowels = 'aeiou';
  // Números fáceis de memorizar (evitando confusões como 0/O, 1/I)
  const numbers = '23456789';
  
  let password = '';
  
  // Gerar 2 pares de consoante+vogal
  for (let i = 0; i < 2; i++) {
    const consonant = consonants.charAt(Math.floor(Math.random() * consonants.length));
    const vowel = vowels.charAt(Math.floor(Math.random() * vowels.length));
    password += consonant + vowel;
  }
  
  // Adicionar 4 números
  for (let i = 0; i < 4; i++) {
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return password;
};

const StudentCredentialsManager: React.FC<StudentCredentialsManagerProps> = ({ 
  studentId, 
  userId, 
  email, 
  hasPassword 
}) => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordGenerated, setPasswordGenerated] = useState(false);

  const handleGeneratePassword = () => {
    const newPassword = generateEasyPassword();
    setPassword(newPassword);
    setPasswordGenerated(true);
    setShowPassword(true);
  };

  const handleSavePassword = async () => {
    if (!password) {
      toast.error('Por favor, gere uma senha primeiro.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`/api/admin/training/students/${studentId}/credentials`, {
        userId,
        password
      });

      if (response.status === 200) {
        toast.success('Senha definida com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao definir senha:', error);
      toast.error('Erro ao definir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(password);
    toast.success('Senha copiada para a área de transferência!');
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
        <KeyIcon className="w-5 h-5 mr-2 text-primary-600" />
        Credenciais de Acesso
      </h3>
      
      <div className="mb-4">
        <p className="text-secondary-700 mb-2">
          <span className="font-medium">E-mail:</span> {email}
        </p>
        
        <div className="mt-4">
          <p className="text-secondary-700 mb-2">
            <span className="font-medium">Status da senha:</span>{' '}
            {hasPassword ? (
              <span className="text-green-500">Definida</span>
            ) : (
              <span className="text-yellow-500">Não definida</span>
            )}
          </p>
        </div>
      </div>

      <div className="border-t border-secondary-200 pt-4 mt-4">
        <h4 className="font-medium text-secondary-800 mb-3">Gerenciar Senha</h4>
        
        {passwordGenerated ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Senha gerada:
            </label>
            <div className="flex items-center">
              <div className="relative flex-grow">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  readOnly
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-secondary-500" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-secondary-500" />
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="ml-2 px-3 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200"
              >
                Copiar
              </button>
            </div>
            <p className="text-xs text-secondary-500 mt-1">
              Esta senha é fácil de memorizar: 4 letras + 4 números.
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-sm text-secondary-600 mb-2">
              Gere uma senha padrão para o aluno acessar o sistema de treinamento.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGeneratePassword}
            disabled={loading}
            className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 flex items-center"
          >
            <KeyIcon className="w-4 h-4 mr-1" />
            {passwordGenerated ? 'Gerar Nova Senha' : 'Gerar Senha'}
          </button>
          
          {passwordGenerated && (
            <button
              type="button"
              onClick={handleSavePassword}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
            >
              {loading ? 'Salvando...' : 'Salvar Senha'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentCredentialsManager;
