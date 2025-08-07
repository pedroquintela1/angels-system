'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertTriangle, Download, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentViewer } from '@/components/kyc/document-viewer';

interface KycDocument {
  id: string;
  type: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMIT';
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface KycReview {
  id: string;
  action: string;
  comment?: string;
  createdAt: string;
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
  };
  document?: {
    id: string;
    type: string;
    fileName: string;
  };
}

interface KycProgress {
  completed: number;
  total: number;
  percentage: number;
  isComplete: boolean;
}

interface KycData {
  documents: KycDocument[];
  documentsByType: Record<string, KycDocument[]>;
  reviews: KycReview[];
  progress: KycProgress;
  requiredDocuments: string[];
}

export default function KycPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Load KYC data
  useEffect(() => {
    if (session?.user?.id) {
      loadKycData();
    }
  }, [session]);

  const loadKycData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/kyc/upload');
      
      if (response.ok) {
        const data = await response.json();
        setKycData(data);
      } else {
        throw new Error('Erro ao carregar dados KYC');
      }
    } catch (error) {
      console.error('Erro ao carregar KYC:', error);
      setError('Erro ao carregar dados de verificação');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const response = await fetch('/api/kyc/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess('Documento enviado com sucesso!');
        await loadKycData(); // Reload data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar documento');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      setError(error instanceof Error ? error.message : 'Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  const getDocumentTypeName = (type: string) => {
    const typeNames = {
      IDENTITY_FRONT: 'RG/CNH (Frente)',
      IDENTITY_BACK: 'RG/CNH (Verso)',
      CPF_DOCUMENT: 'Documento CPF',
      PROOF_OF_ADDRESS: 'Comprovante de Residência',
      SELFIE_WITH_DOCUMENT: 'Selfie com Documento',
      INCOME_PROOF: 'Comprovante de Renda',
      BANK_STATEMENT: 'Extrato Bancário',
      OTHER: 'Outros Documentos',
    };
    return typeNames[type as keyof typeof typeNames] || type;
  };

  const getDocumentStatusName = (status: string) => {
    const statusNames = {
      PENDING: 'Pendente',
      APPROVED: 'Aprovado',
      REJECTED: 'Rejeitado',
      RESUBMIT: 'Reenviar',
    };
    return statusNames[status as keyof typeof statusNames] || status;
  };

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'RESUBMIT': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'REJECTED': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'RESUBMIT': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (status === 'loading' || loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Verificação de Identidade (KYC)</h1>
        <p className="text-gray-600">
          Complete sua verificação de identidade para acessar todas as funcionalidades da plataforma
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {kycData && (
        <>
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Progresso da Verificação
              </CardTitle>
              <CardDescription>
                {kycData.progress.completed} de {kycData.progress.total} documentos obrigatórios aprovados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progresso</span>
                    <span className="text-sm text-gray-600">{kycData.progress.percentage}%</span>
                  </div>
                  <Progress value={kycData.progress.percentage} className="h-2" />
                </div>
                
                {kycData.progress.isComplete ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      🎉 Parabéns! Sua verificação KYC foi concluída com sucesso.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Envie todos os documentos obrigatórios para completar sua verificação.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList>
              <TabsTrigger value="upload">Enviar Documentos</TabsTrigger>
              <TabsTrigger value="status">Status dos Documentos</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              {/* Required Documents */}
              <Card>
                <CardHeader>
                  <CardTitle>Documentos Obrigatórios</CardTitle>
                  <CardDescription>
                    Envie os documentos abaixo para completar sua verificação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {kycData.requiredDocuments.map((docType) => {
                      const existingDoc = kycData.documentsByType[docType]?.[0];
                      const canUpload = !existingDoc || existingDoc.status === 'REJECTED' || existingDoc.status === 'RESUBMIT';

                      return (
                        <div key={docType} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{getDocumentTypeName(docType)}</h4>
                            {existingDoc && (
                              <Badge className={getDocumentStatusColor(existingDoc.status)}>
                                {getDocumentStatusName(existingDoc.status)}
                              </Badge>
                            )}
                          </div>

                          {existingDoc && (
                            <div className="text-sm text-gray-600 mb-2">
                              <p>Arquivo: {existingDoc.fileName}</p>
                              <p>Enviado em: {formatDate(existingDoc.createdAt)}</p>
                              {existingDoc.rejectionReason && (
                                <p className="text-red-600 mt-1">
                                  Motivo: {existingDoc.rejectionReason}
                                </p>
                              )}

                              {/* Document Actions */}
                              <div className="mt-2 flex gap-2">
                                <DocumentViewer
                                  documentUrl={`/api/kyc/documents/${existingDoc.id}/download`}
                                  documentName={existingDoc.fileName}
                                  documentType={getDocumentTypeName(existingDoc.type)}
                                />

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/kyc/documents/${existingDoc.id}/download`, '_blank')}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          )}

                          {canUpload && (
                            <div className="mt-3">
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(file, docType);
                                  }
                                }}
                                className="hidden"
                                id={`upload-${docType}`}
                                disabled={uploading}
                              />
                              <label
                                htmlFor={`upload-${docType}`}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 cursor-pointer disabled:opacity-50"
                              >
                                <Upload className="h-4 w-4" />
                                {existingDoc ? 'Reenviar' : 'Enviar'} Documento
                              </label>
                            </div>
                          )}

                          {existingDoc && existingDoc.status === 'APPROVED' && (
                            <div className="mt-3 text-sm text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Documento aprovado
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Optional Documents */}
              <Card>
                <CardHeader>
                  <CardTitle>Documentos Opcionais</CardTitle>
                  <CardDescription>
                    Documentos adicionais que podem acelerar sua verificação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['INCOME_PROOF', 'BANK_STATEMENT', 'OTHER'].map((docType) => {
                      const existingDoc = kycData.documentsByType[docType]?.[0];
                      const canUpload = !existingDoc || existingDoc.status === 'REJECTED' || existingDoc.status === 'RESUBMIT';

                      return (
                        <div key={docType} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{getDocumentTypeName(docType)}</h4>
                            {existingDoc && (
                              <Badge className={getDocumentStatusColor(existingDoc.status)}>
                                {getDocumentStatusName(existingDoc.status)}
                              </Badge>
                            )}
                          </div>

                          {existingDoc && (
                            <div className="text-sm text-gray-600 mb-2">
                              <p>Arquivo: {existingDoc.fileName}</p>
                              <p>Enviado em: {formatDate(existingDoc.createdAt)}</p>

                              {/* Document Actions */}
                              <div className="mt-2 flex gap-2">
                                <DocumentViewer
                                  documentUrl={`/api/kyc/documents/${existingDoc.id}/download`}
                                  documentName={existingDoc.fileName}
                                  documentType={getDocumentTypeName(existingDoc.type)}
                                />

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/kyc/documents/${existingDoc.id}/download`, '_blank')}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          )}

                          {canUpload && (
                            <div className="mt-3">
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(file, docType);
                                  }
                                }}
                                className="hidden"
                                id={`upload-${docType}`}
                                disabled={uploading}
                              />
                              <label
                                htmlFor={`upload-${docType}`}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 cursor-pointer disabled:opacity-50"
                              >
                                <Upload className="h-4 w-4" />
                                {existingDoc ? 'Reenviar' : 'Enviar'} Documento
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status dos Documentos</CardTitle>
                  <CardDescription>
                    Acompanhe o status de todos os seus documentos enviados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {kycData.documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhum documento enviado ainda</p>
                      <p className="text-sm text-gray-400">
                        Vá para a aba "Enviar Documentos" para começar
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {kycData.documents.map((doc) => (
                        <div key={doc.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getDocumentStatusIcon(doc.status)}
                              <h4 className="font-medium">{getDocumentTypeName(doc.type)}</h4>
                            </div>
                            <Badge className={getDocumentStatusColor(doc.status)}>
                              {getDocumentStatusName(doc.status)}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <p><strong>Arquivo:</strong> {doc.fileName}</p>
                              <p><strong>Tamanho:</strong> {formatFileSize(doc.fileSize)}</p>
                              <p><strong>Enviado em:</strong> {formatDate(doc.createdAt)}</p>
                            </div>
                            <div>
                              {doc.reviewedAt && (
                                <p><strong>Revisado em:</strong> {formatDate(doc.reviewedAt)}</p>
                              )}
                              {doc.reviewer && (
                                <p><strong>Revisado por:</strong> {doc.reviewer.firstName} {doc.reviewer.lastName}</p>
                              )}
                            </div>
                          </div>

                          {doc.rejectionReason && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                              <p className="text-sm text-red-800">
                                <strong>Motivo da rejeição:</strong> {doc.rejectionReason}
                              </p>
                            </div>
                          )}

                          {doc.notes && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                              <p className="text-sm text-blue-800">
                                <strong>Observações:</strong> {doc.notes}
                              </p>
                            </div>
                          )}

                          {/* Document Actions */}
                          <div className="mt-4 flex gap-2">
                            <DocumentViewer
                              documentUrl={`/api/kyc/documents/${doc.id}/download`}
                              documentName={doc.fileName}
                              documentType={getDocumentTypeName(doc.type)}
                              className="flex-1"
                            />

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/api/kyc/documents/${doc.id}/download`, '_blank')}
                              className="flex-1"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Revisões</CardTitle>
                  <CardDescription>
                    Timeline de todas as ações realizadas em seus documentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {kycData.reviews.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhuma revisão realizada ainda</p>
                      <p className="text-sm text-gray-400">
                        As revisões aparecerão aqui quando os documentos forem analisados
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {kycData.reviews.map((review) => (
                        <div key={review.id} className="border-l-4 border-blue-200 pl-4 py-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {getDocumentStatusIcon(review.action)}
                              <span className="font-medium">
                                {review.document ? getDocumentTypeName(review.document.type) : 'KYC Geral'}
                              </span>
                            </div>
                            <Badge className={getDocumentStatusColor(review.action)}>
                              {getDocumentStatusName(review.action)}
                            </Badge>
                          </div>

                          <div className="text-sm text-gray-600">
                            <p>Por: {review.reviewer.firstName} {review.reviewer.lastName}</p>
                            <p>Em: {formatDate(review.createdAt)}</p>
                            {review.comment && (
                              <p className="mt-1 italic">"{review.comment}"</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
