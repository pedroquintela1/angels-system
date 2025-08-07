'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Upload, User, FileText, Shield, CheckCircle, AlertCircle, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { translateKycStatus, UI_TEXTS } from '@/lib/translations';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cpf: string;
  kycStatus: string;
  kycSubmittedAt?: string;
  kycApprovedAt?: string;
  membershipStatus: string;
  createdAt: string;
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    uploadedAt: string;
    status: string;
  }>;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error(UI_TEXTS.ERROR_LOADING);
      }
      const data = await response.json();
      setProfile(data);
      setFormData({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : UI_TEXTS.ERROR_UNKNOWN);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(UI_TEXTS.ERROR_SAVING);
      }

      await fetchProfile();
      setEditMode(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : UI_TEXTS.ERROR_UNKNOWN);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', documentType);

    try {
      const response = await fetch('/api/user/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload do documento');
      }

      await fetchProfile();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao fazer upload');
    }
  };

  const getKycStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'UNDER_REVIEW':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'REJECTED':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <User className="h-5 w-5 text-gray-500" />;
    }
  };

  const getKycStatusDescription = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Sua identidade foi verificada com sucesso. Você tem acesso completo à plataforma.';
      case 'PENDING':
        return 'Envie seus documentos para verificação de identidade e acesso completo.';
      case 'UNDER_REVIEW':
        return 'Seus documentos estão sendo analisados. Aguarde a aprovação.';
      case 'REJECTED':
        return 'Seus documentos foram rejeitados. Envie novos documentos para análise.';
      default:
        return 'Status de verificação desconhecido.';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Perfil</h1>
          <p className="text-red-600">Erro: {error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-600">Gerencie suas informações pessoais e documentos</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>
                  Seus dados cadastrais na plataforma
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => editMode ? handleSave() : setEditMode(true)}
                loading={saving}
                disabled={saving}
              >
                {editMode ? (saving ? 'Salvando...' : 'Salvar') : 'Editar'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome</label>
                {editMode ? (
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Seu nome"
                  />
                ) : (
                  <p className="text-gray-900">{profile.firstName}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Sobrenome</label>
                {editMode ? (
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Seu sobrenome"
                  />
                ) : (
                  <p className="text-gray-900">{profile.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{profile.email}</p>
              <p className="text-xs text-gray-500">O email não pode ser alterado</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Telefone</label>
              {editMode ? (
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              ) : (
                <p className="text-gray-900">{profile.phone}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">CPF</label>
              <p className="text-gray-900">{profile.cpf}</p>
              <p className="text-xs text-gray-500">O CPF não pode ser alterado</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Membro desde</label>
              <p className="text-gray-900">{formatDate(profile.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Status KYC */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verificação de Identidade (KYC)
            </CardTitle>
            <CardDescription>
              Status da verificação dos seus documentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {getKycStatusIcon(profile.kycStatus)}
              <div>
                <Badge variant={profile.kycStatus === 'APPROVED' ? 'success' : 'warning'}>
                  {translateKycStatus(profile.kycStatus)}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              {getKycStatusDescription(profile.kycStatus)}
            </p>

            {profile.kycSubmittedAt && (
              <div>
                <label className="text-sm font-medium text-gray-700">Enviado em</label>
                <p className="text-gray-900">{formatDate(profile.kycSubmittedAt)}</p>
              </div>
            )}

            {profile.kycApprovedAt && (
              <div>
                <label className="text-sm font-medium text-gray-700">Aprovado em</label>
                <p className="text-gray-900">{formatDate(profile.kycApprovedAt)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
