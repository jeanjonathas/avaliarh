import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Candidate } from '../types'

export interface CandidateInfoTabProps {
  candidate: Candidate
  onUpdate?: () => void
}

export const CandidateInfoTab = ({ candidate, onUpdate }: CandidateInfoTabProps) => {
  return (
    <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:space-x-8">
                    <div className="md:w-2/3 space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Nome Completo
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Cargo Pretendido
                        </label>
                        <input
                          type="text"
                          name="position"
                          value={formData.position}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Status
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        >
                          <option value="PENDING">Pendente</option>
                          <option value="APPROVED">Aprovado</option>
                          <option value="REJECTED">Rejeitado</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Observações
                        </label>
                        <textarea
                          name="observations"
                          value={formData.observations}
                          onChange={handleChange}
                          rows={5}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        ></textarea>
                      </div>
                    </div>
                    
                    <div className="md:w-1/3 space-y-6 mt-6 md:mt-0">
                      {/* Foto do Candidato */}
                      {candidate.photoUrl && (
                        <div className="bg-white border border-secondary-200 rounded-lg p-4 mb-4">
                          <h3 className="text-lg font-semibold text-secondary-800 mb-3">Foto do Candidato</h3>
                          <div className="flex flex-col items-center">
                            <div 
                              className="relative w-48 h-auto rounded-lg overflow-hidden border border-secondary-200 cursor-pointer"
                              onClick={() => setShowPhotoModal(true)}
                            >
                              <img 
                                src={candidate.photoUrl} 
                                alt={`Foto de ${candidate.name}`}
                                className="max-w-full w-full object-contain rounded-lg"
                              />
                            </div>
                            <p className="text-sm text-secondary-600 mt-2">Clique na foto para visualizar em tamanho completo</p>
                          </div>
                        </div>
                      )}
                      <div className="bg-white border border-secondary-200 rounded-lg p-4 mb-4">
                        <h3 className="text-lg font-semibold text-secondary-800 mb-3">Informações do Convite</h3>
                        <div className="space-y-3">
                          {/* Seleção de Teste */}
                          <div className="bg-white p-3 rounded-md border border-secondary-200">
                            <label className="block text-sm text-secondary-600 mb-1">
                              Selecione o Teste:
                            </label>
                            <div className="relative">
                              <select
                                name="testId"
                                value={formData.testId}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-secondary-300 rounded-md appearance-none"
                                disabled={isLoadingTests}
                              >
                                <option value="">Selecione um teste</option>
                                {availableTests.map(test => (
                                  <option key={test.id} value={test.id}>
                                    {test.title}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                {isLoadingTests ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-primary-500 rounded-full border-t-transparent"></div>
                                ) : (
                                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            {formData.testId && (
                              <div className="mt-2 text-xs text-green-600">
                                <div className="flex items-center">
                                  <svg className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Teste selecionado
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-white p-3 rounded-md border border-secondary-200">
                            <span className="text-sm text-secondary-600">Código do Convite:</span>
                            <div className="flex items-center justify-between mt-1">
                              <p className="font-medium text-lg text-primary-600">{candidate?.inviteCode}</p>
                              <button
                                onClick={generateNewInvite}
                                disabled={isGeneratingInvite}
                                className={`px-3 py-1 text-sm ${
                                  isGeneratingInvite 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                                } rounded`}
                              >
                                {isGeneratingInvite 
                                  ? 'Gerando...' 
                                  : candidate?.inviteCode 
                                    ? 'Gerar Novo' 
                                    : 'Gerar Código'
                                }
                              </button>
                            </div>
                            {candidate.inviteCode && (
                              <div className="mt-2">
                                <button
                                  onClick={handleShare}
                                  className="w-full px-3 py-1 text-sm bg-green-50 text-green-600 hover:bg-green-100 rounded flex items-center justify-center"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                                  </svg>
                                  Compartilhar
                                </button>
                              </div>
                            )}
                            {candidate.inviteExpires && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-secondary-500 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Expira em: {format(new Date(candidate.inviteExpires), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                                <p className="text-xs text-secondary-500 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Status: {candidate.inviteSent ? 'Enviado' : 'Não enviado'}
                                </p>
                                <p className="text-xs text-secondary-500 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                  </svg>
                                  Tentativas: {candidate.inviteAttempts} de 5
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <span className="text-sm text-secondary-600">Data do Teste:</span>
                            <p className="font-medium">{format(new Date(candidate.testDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                          </div>
                          
                          {candidate.interviewDate && (
                            <div>
                              <span className="text-sm text-secondary-600">Data da Entrevista:</span>
                              <p className="font-medium">{format(new Date(candidate.interviewDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                            </div>
                          )}
                          
                          <div>
                            <span className="text-sm text-secondary-600">Status do Teste:</span>
                            <p className="font-medium">{candidate.completed ? 'Completo' : 'Incompleto'}</p>
                          </div>
                          
                          {candidate.completed && candidate.stageScores && candidate.stageScores.length > 0 && (
                            <div>
                              <span className="text-sm text-secondary-600">Pontuação Geral:</span>
                              <p className="font-medium">
                                {typeof candidate.score === 'object' 
                                  ? candidate.score.percentage 
                                  : parseFloat((candidate.score || 0).toFixed(1))}%</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Avaliação
                        </label>
                        <div className="flex items-center">
                          <Rating
                            name="candidate-rating"
                            value={parseFloat(formData.rating) || 0}
                            precision={0.5}
                            onChange={(_, newValue) => {
                              setFormData(prev => ({ 
                                ...prev, 
                                rating: newValue ? newValue.toString() : '0' 
                              }));
                            }}
                            size="large"
                          />
                          <div className="ml-2 text-sm text-secondary-700">
                            {formData.rating === '0' ? 'Sem avaliação' : 
                             `${formData.rating} ${formData.rating === '1' ? 'estrela' : 'estrelas'}`}
                          </div>
                        </div>
                      </div>
                      
                      {candidate.infoJobsLink && (
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Perfil InfoJobs
                          </label>
                          <Link 
                            href={candidate.infoJobsLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            <span>Ver perfil</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            </svg>
                          </Link>
                        </div>
                      )}
                      
                      {candidate.resumeFile && (
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Currículo
                          </label>
                          <Link 
                            href={candidate.resumeFile} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            <span>Ver currículo</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-1H4a1 1 0 00-1 1v1H0a2 2 0 000 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2V7a1 1 0 10-2 0v3a1 1 0 10-2 0V7a1 1 0 10-2 0v3a2 2 0 002 2h3z" />
                            </svg>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-4 mt-6 justify-end">
                    <button
                      onClick={handleSave}
                      className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium shadow-sm"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
  )
}
