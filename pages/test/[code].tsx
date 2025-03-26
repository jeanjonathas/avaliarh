import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function TestInviteRedirect() {
  const router = useRouter();
  const { code } = router.query;
  const [status, setStatus] = useState<'validando' | 'sucesso' | 'erro'>('validando');
  const [message, setMessage] = useState('Validando código de convite...');

  useEffect(() => {
    // Só executa a validação quando o código estiver disponível
    if (!code) return;

    const validateInviteCode = async () => {
      try {
        setStatus('validando');
        setMessage('Validando código de convite...');

        // Fazer a mesma chamada de API que é feita na página inicial
        const response = await fetch('/api/candidates/validate-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inviteCode: code }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          setStatus('erro');
          setMessage(data.message || 'Erro ao validar código de convite');
          return;
        }

        // Verificar se o teste já foi concluído
        if (data.message && data.message.includes('já completou a avaliação')) {
          console.log('Teste já concluído, redirecionando para página de respostas anteriores');
          sessionStorage.setItem('completedResponses', JSON.stringify(data));
          setStatus('sucesso');
          setMessage('Código válido! Redirecionando...');
          
          // Redirecionar para a página de respostas anteriores
          setTimeout(() => {
            router.push(`/teste/respostas-anteriores?code=${code}`);
          }, 800);
          return;
        }

        // Armazenar os dados do candidato na sessão
        sessionStorage.setItem('candidateData', JSON.stringify(data.candidate));
        
        // Armazenar o token de segurança na sessão
        if (data.securityToken) {
          sessionStorage.setItem('securityToken', data.securityToken);
        }
        
        // Armazenar os dados do teste na sessão, se disponíveis
        if (data.test) {
          sessionStorage.setItem('testData', JSON.stringify(data.test));
        }
        
        // Definir o estado de sucesso
        setStatus('sucesso');
        setMessage('Código válido! Redirecionando...');
        
        // Redirecionar para a página de introdução após um breve delay
        setTimeout(() => {
          router.push(`/teste/introducao?code=${code}`);
        }, 800);
      } catch (error: any) {
        setStatus('erro');
        setMessage(error.message || 'Erro ao validar código de convite');
      }
    };

    validateInviteCode();
  }, [code, router]);

  return (
    <>
      <Head>
        <title>Validando Código de Convite | Admitto</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              {status === 'validando' && 'Validando Código de Convite'}
              {status === 'sucesso' && 'Código Válido'}
              {status === 'erro' && 'Erro na Validação'}
            </h1>
            
            <div className="mb-6">
              {status === 'validando' && (
                <div className="flex justify-center mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
                </div>
              )}
              
              {status === 'sucesso' && (
                <div className="flex justify-center mb-4">
                  <div className="bg-green-100 text-green-700 rounded-full p-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
              )}
              
              {status === 'erro' && (
                <div className="flex justify-center mb-4">
                  <div className="bg-red-100 text-red-700 rounded-full p-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                </div>
              )}
              
              <p className={`text-lg ${
                status === 'validando' ? 'text-gray-600' : 
                status === 'sucesso' ? 'text-green-600' : 'text-red-600'
              }`}>
                {message}
              </p>
            </div>
            
            {status === 'erro' && (
              <div className="mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md transition-colors"
                >
                  Voltar para a Página Inicial
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
