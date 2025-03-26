import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import Link from 'next/link';

type FormData = {
  name: string;
  email: string;
  birthDate: string;
  gender: string;
  phone: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { inviteCode } = router.query;
  const [loading, setLoading] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<any>(null);
  const [error, setError] = useState('');
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    const checkInvite = async () => {
      if (!inviteCode) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/candidates/check-invite?code=${inviteCode}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Convite inválido ou expirado');
          return;
        }
        
        const data = await response.json();
        
        // Se o convite não requer preenchimento de perfil, redirecionar para o teste
        if (!data.requiresProfileCompletion) {
          router.push(`/test/${inviteCode}`);
          return;
        }
        
        setInviteDetails(data);
      } catch (err) {
        console.error('Erro ao verificar convite:', err);
        setError('Erro ao verificar convite. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    checkInvite();
  }, [inviteCode, router]);

  const onSubmit = async (data: FormData) => {
    if (!inviteCode) return;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/candidates/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          inviteCode,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erro ao registrar. Tente novamente.');
        return;
      }
      
      toast.success('Registro concluído com sucesso!');
      
      // Redirecionar para a página do teste
      router.push(`/test/${inviteCode}`);
    } catch (err) {
      console.error('Erro ao registrar:', err);
      toast.error('Erro ao registrar. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !inviteDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-700">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Convite Inválido</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/">
              <a className="inline-block bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors">
                Voltar para o início
              </a>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Registro de Candidato | AvaliaRH</title>
      </Head>
      
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Complete seu cadastro</h2>
              <p className="mt-2 text-gray-600">
                Preencha seus dados para continuar com o teste
              </p>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome completo *
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name', { required: 'Nome é obrigatório' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-mail *
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email', { 
                    required: 'E-mail é obrigatório',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'E-mail inválido'
                    }
                  })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                  Data de nascimento *
                </label>
                <input
                  id="birthDate"
                  type="date"
                  {...register('birthDate', { required: 'Data de nascimento é obrigatória' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.birthDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.birthDate.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                  Gênero *
                </label>
                <select
                  id="gender"
                  {...register('gender', { required: 'Gênero é obrigatório' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                  <option value="other">Outro</option>
                  <option value="prefer_not_to_say">Prefiro não informar</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Telefone *
                </label>
                <input
                  id="phone"
                  type="tel"
                  {...register('phone', { required: 'Telefone é obrigatório' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(00) 00000-0000"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Continuar para o teste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
