import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
}

const CandidateProfilePage: NextPage = () => {
  const router = useRouter();
  const { code } = router.query;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidateData, setCandidateData] = useState<any | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: ''
  });

  useEffect(() => {
    if (!code) return;

    const validateInviteCode = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/candidates/validate-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inviteCode: code }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Código de convite inválido');
          return;
        }

        // Verificar se o candidato já completou o perfil
        if (data.candidate && data.candidate.name && data.candidate.email) {
          // Perfil já está completo, redirecionar para a introdução do teste
          router.push(`/teste/introducao?code=${code}`);
          return;
        }

        setCandidateData(data.candidate || {});
      } catch (error) {
        console.error('Erro ao validar código:', error);
        setError('Ocorreu um erro ao validar o código de convite');
      } finally {
        setLoading(false);
      }
    };

    validateInviteCode();
  }, [code, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    if (!formData.name.trim()) {
      setError('O nome é obrigatório');
      return;
    }
    
    if (!formData.email.trim()) {
      setError('O email é obrigatório');
      return;
    }
    
    if (!formData.birthDate) {
      setError('A data de nascimento é obrigatória');
      return;
    }
    
    if (!formData.gender) {
      setError('O sexo é obrigatório');
      return;
    }
    
    if (!formData.phone.trim()) {
      setError('O telefone é obrigatório');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/candidates/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCode: code,
          ...formData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar perfil');
      }

      // Redirecionar para a página de introdução do teste
      router.push(`/teste/introducao?code=${code}`);
    } catch (error) {
      console.error('Erro:', error);
      setError(error instanceof Error ? error.message : 'Erro ao atualizar perfil');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-lg text-secondary-700">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-secondary-800 mb-2">Erro</h2>
          <p className="text-secondary-600 mb-4">{error}</p>
          <Link href="/" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 inline-block">
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Complete seu Perfil | Admitto</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <header className="flex justify-between items-center mb-12">
            <Link href="/" className="text-2xl font-bold text-primary-700">
              <Image 
                src="/images/logo_horizontal.png"
                alt="Admitto Logo"
                width={180}
                height={54}
                priority
              />
            </Link>
          </header>

          <main className="max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-center text-secondary-800 mb-2">Complete seu Perfil</h1>
              <p className="text-center text-secondary-600 mb-6">
                Antes de iniciar o teste, precisamos de algumas informações sobre você.
              </p>
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Digite seu email"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 mb-1">
                    Telefone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="birthDate" className="block text-sm font-medium text-secondary-700 mb-1">
                    Data de Nascimento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="birthDate"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-secondary-700 mb-1">
                    Sexo <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="MALE">Masculino</option>
                    <option value="FEMALE">Feminino</option>
                    <option value="OTHER">Outro</option>
                    <option value="PREFER_NOT_TO_SAY">Prefiro não informar</option>
                  </select>
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full px-4 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center justify-center"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Salvando...
                      </>
                    ) : (
                      'Continuar para o Teste'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default CandidateProfilePage;
