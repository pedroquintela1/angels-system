'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Search, 
  MoreHorizontal, 
  UserCheck, 
  UserX, 
  Edit, 
  Eye, 
  Shield,
  Users,
  UserPlus,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  kycStatus: string;
  createdAt: string;
  updatedAt: string;
  roleInfo: {
    name: string;
    level: number;
    permissions: number;
    resources: number;
  };
  stats: {
    investments: number;
  };
}

interface UserFilters {
  search: string;
  role: string;
  status: string;
  kycStatus: string;
  membershipStatus: string;
}

export default function UsersManagementPage() {
  const { data: session } = useSession();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Filtros
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    kycStatus: 'all',
    membershipStatus: 'all'
  });

  // Estados para modais
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [kycUser, setKycUser] = useState<User | null>(null);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  // Estados para o formulário de edição
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    isActive: true,
  });

  // Estados para KYC
  const [kycData, setKycData] = useState<any>(null);
  const [loadingKyc, setLoadingKyc] = useState(false);

  // Carregar dados iniciais apenas uma vez
  useEffect(() => {
    if (session?.user) {
      fetchUsers();
    }
  }, [session]);

  // Aplicar filtros localmente sem recarregar da API
  useEffect(() => {
    if (!allUsers.length) return;

    let filtered = [...allUsers];

    if (filters.search) {
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.lastName.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.role && filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'active') {
        filtered = filtered.filter(user => user.isActive);
      } else if (filters.status === 'inactive') {
        filtered = filtered.filter(user => !user.isActive);
      }
    }

    if (filters.kycStatus && filters.kycStatus !== 'all') {
      filtered = filtered.filter(user => user.kycStatus === filters.kycStatus);
    }

    setUsers(filtered);
  }, [allUsers, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Carregar todos os usuários sem filtros para cache local
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Erro ao carregar usuários');
      }

      const data = await response.json();

      // Armazenar todos os usuários para filtragem local
      if (data.users) {
        setAllUsers(data.users);
        setUsers(data.users); // Inicialmente mostrar todos
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          role: editForm.role,
          isActive: editForm.isActive,
        }),
      });

      if (response.ok) {
        // Atualizar usuário localmente
        const updatedUsers = allUsers.map(user => {
          if (user.id === editingUser.id) {
            return {
              ...user,
              firstName: editForm.firstName,
              lastName: editForm.lastName,
              email: editForm.email,
              role: editForm.role,
              isActive: editForm.isActive,
              roleInfo: {
                ...user.roleInfo,
                name: getRoleName(editForm.role),
              },
            };
          }
          return user;
        });
        setAllUsers(updatedUsers);

        setShowEditModal(false);
        setEditingUser(null);
        console.log('Usuário atualizado com sucesso');

      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar usuário');
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      setError(error instanceof Error ? error.message : 'Erro ao atualizar usuário');
    } finally {
      setProcessing(false);
    }
  };

  const getRoleName = (role: string) => {
    const roleNames = {
      USER: 'Usuário',
      ADMIN: 'Administrador',
      SUPER_ADMIN: 'Super Administrador',
      SUPPORT: 'Suporte',
      FINANCIAL: 'Financeiro',
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const handleViewKyc = async (user: User) => {
    setKycUser(user);
    setLoadingKyc(true);
    setShowKycModal(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/kyc`);
      if (response.ok) {
        const data = await response.json();
        setKycData(data);
      } else {
        throw new Error('Erro ao carregar dados KYC');
      }
    } catch (error) {
      console.error('Erro ao carregar KYC:', error);
      setError('Erro ao carregar dados de verificação KYC');
    } finally {
      setLoadingKyc(false);
    }
  };

  const handleKycAction = async (documentId: string, action: string, comment?: string) => {
    if (!kycUser) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/users/${kycUser.id}/kyc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          action,
          comment,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Atualizar dados KYC localmente
        await handleViewKyc(kycUser);

        // Atualizar usuário na lista se o status KYC mudou
        if (result.userKycStatus !== kycUser.kycStatus) {
          const updatedUsers = allUsers.map(u =>
            u.id === kycUser.id ? { ...u, kycStatus: result.userKycStatus } : u
          );
          setAllUsers(updatedUsers);
        }

        console.log('Ação KYC executada com sucesso');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao executar ação KYC');
      }
    } catch (error) {
      console.error('Erro ao executar ação KYC:', error);
      setError(error instanceof Error ? error.message : 'Erro ao executar ação KYC');
    } finally {
      setProcessing(false);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        // Atualizar usuário localmente
        const updatedUsers = allUsers.map(user => {
          if (user.id === userId) {
            switch (action) {
              case 'activate':
                return { ...user, isActive: true };
              case 'deactivate':
                return { ...user, isActive: false };
              case 'verify_kyc':
                return { ...user, kycStatus: 'APPROVED' };
              case 'reject_kyc':
                return { ...user, kycStatus: 'REJECTED' };
              case 'reset_kyc':
                return { ...user, kycStatus: 'PENDING' };
              default:
                return user;
            }
          }
          return user;
        });
        setAllUsers(updatedUsers);

        // Mostrar mensagem de sucesso
        const actionMessages = {
          activate: 'Usuário ativado com sucesso',
          deactivate: 'Usuário desativado com sucesso',
          verify_kyc: 'KYC aprovado com sucesso',
          reject_kyc: 'KYC rejeitado com sucesso',
          reset_kyc: 'KYC resetado com sucesso',
        };

        // Aqui você pode adicionar um toast de sucesso se tiver implementado
        console.log(actionMessages[action as keyof typeof actionMessages] || 'Ação executada com sucesso');

      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao executar ação');
      }
    } catch (error) {
      console.error('Erro ao executar ação:', error);
      setError(error instanceof Error ? error.message : 'Erro ao executar ação no usuário');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedUsers.length === 0 || !bulkAction) return;

    try {
      setProcessing(true);
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          action: bulkAction,
        }),
      });

      if (response.ok) {
        // Atualizar usuários localmente
        const updatedUsers = allUsers.map(user => {
          if (selectedUsers.includes(user.id)) {
            switch (bulkAction) {
              case 'activate':
                return { ...user, isActive: true };
              case 'deactivate':
                return { ...user, isActive: false };
              case 'verify_kyc':
                return { ...user, kycStatus: 'APPROVED' };
              case 'reject_kyc':
                return { ...user, kycStatus: 'REJECTED' };
              case 'reset_kyc':
                return { ...user, kycStatus: 'PENDING' };
              default:
                return user;
            }
          }
          return user;
        });
        setAllUsers(updatedUsers);

        setSelectedUsers([]);
        setShowBulkActionModal(false);
        setBulkAction('');

        // Mostrar mensagem de sucesso
        console.log(`Ação em lote executada com sucesso em ${selectedUsers.length} usuário(s)`);

      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao executar ação em lote');
      }
    } catch (error) {
      console.error('Erro ao executar ação em lote:', error);
      setError(error instanceof Error ? error.message : 'Erro ao executar ação em lote');
    } finally {
      setProcessing(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-800';
      case 'ADMIN': return 'bg-purple-100 text-purple-800';
      case 'SUPPORT': return 'bg-blue-100 text-blue-800';
      case 'FINANCIAL': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getMembershipColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-red-600">Erro: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-600">Gerencie usuários, permissões e verificações KYC</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchUsers()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {users.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Usuários Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              KYC Aprovados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.kycStatus === 'APPROVED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Investimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {users.reduce((sum, u) => sum + u.stats.investments, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            Lista completa de usuários do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuários..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filters.role} onValueChange={(value) => setFilters(prev => ({ ...prev, role: value === 'all' ? '' : value }))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="USER">Usuário</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="SUPPORT">Suporte</SelectItem>
                <SelectItem value="FINANCIAL">Financeiro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.kycStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, kycStatus: value === 'all' ? '' : value }))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="KYC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="APPROVED">Aprovado</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="REJECTED">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">
                {selectedUsers.length} usuário(s) selecionado(s)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkActionModal(true)}
              >
                Ações em Lote
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUsers([])}
              >
                Limpar Seleção
              </Button>
            </div>
          )}

          {/* Users Table */}
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg font-medium text-sm text-gray-600">
              <div className="col-span-1">
                <Checkbox
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedUsers(users.map(u => u.id));
                    } else {
                      setSelectedUsers([]);
                    }
                  }}
                />
              </div>
              <div className="col-span-3">Usuário</div>
              <div className="col-span-2">Função</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">KYC</div>
              <div className="col-span-2">Investimentos</div>
              <div className="col-span-1">Atualizado</div>
              <div className="col-span-1">Ações</div>
            </div>

            {/* Table Rows */}
            {users.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-12 gap-4 p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="col-span-1">
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUsers(prev => [...prev, user.id]);
                      } else {
                        setSelectedUsers(prev => prev.filter(id => id !== user.id));
                      }
                    }}
                  />
                </div>
                
                <div className="col-span-3">
                  <div>
                    <h3 className="font-medium">{user.firstName} {user.lastName}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      Criado em {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="col-span-2">
                  <Badge className={getRoleColor(user.role)}>
                    {user.roleInfo.name}
                  </Badge>
                </div>

                <div className="col-span-1">
                  <Badge className={getStatusColor(user.isActive)}>
                    {user.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                <div className="col-span-1">
                  <Badge className={
                    user.kycStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    user.kycStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {user.kycStatus === 'APPROVED' ? 'Aprovado' :
                     user.kycStatus === 'REJECTED' ? 'Rejeitado' : 'Pendente'}
                  </Badge>
                </div>

                <div className="col-span-2">
                  <span className="text-sm font-medium">
                    {user.stats.investments} investimento(s)
                  </span>
                </div>

                <div className="col-span-1">
                  <span className="text-sm text-gray-600">
                    {formatDate(user.updatedAt)}
                  </span>
                </div>

                <div className="col-span-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setSelectedUser(user);
                        setShowUserModal(true);
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditUser(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleUserAction(user.id, user.isActive ? 'deactivate' : 'activate')}>
                        {user.isActive ? (
                          <>
                            <UserX className="mr-2 h-4 w-4" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewKyc(user)}>
                        <Shield className="mr-2 h-4 w-4" />
                        Verificar KYC
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum usuário encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Tente ajustar os filtros ou criar um novo usuário.
              </p>
            </div>
          )}

          {/* Informações dos resultados */}
          {users.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-600">
                Mostrando {users.length} de {allUsers.length} usuários
              </p>
              <Button variant="outline" onClick={fetchUsers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar Dados
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Visualização de Usuário */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas do usuário selecionado
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nome Completo</label>
                  <p className="text-sm">{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Função</label>
                  <Badge className={getRoleColor(selectedUser.role)}>
                    {selectedUser.roleInfo.name}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <Badge className={getStatusColor(selectedUser.isActive)}>
                    {selectedUser.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status KYC</label>
                  <Badge className={
                    selectedUser.kycStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    selectedUser.kycStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {selectedUser.kycStatus === 'APPROVED' ? 'Aprovado' :
                     selectedUser.kycStatus === 'REJECTED' ? 'Rejeitado' : 'Pendente'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Investimentos</label>
                  <p className="text-sm">{selectedUser.stats.investments} investimento(s)</p>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Criado em</label>
                  <p className="text-sm">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Última atualização</label>
                  <p className="text-sm">{formatDate(selectedUser.updatedAt)}</p>
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleUserAction(selectedUser.id, selectedUser.isActive ? 'deactivate' : 'activate');
                    setShowUserModal(false);
                  }}
                  disabled={processing}
                >
                  {selectedUser.isActive ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Ativar
                    </>
                  )}
                </Button>

                {selectedUser.kycStatus !== 'APPROVED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleUserAction(selectedUser.id, 'verify_kyc');
                      setShowUserModal(false);
                    }}
                    disabled={processing}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Aprovar KYC
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(null);
                    setShowUserModal(false);
                  }}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Usuário */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere as informações do usuário selecionado
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nome</label>
                  <Input
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    placeholder="Nome"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Sobrenome</label>
                  <Input
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    placeholder="Sobrenome"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Email"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Função</label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Usuário</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Administrador</SelectItem>
                    <SelectItem value="SUPPORT">Suporte</SelectItem>
                    <SelectItem value="FINANCIAL">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={editForm.isActive}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: !!checked })}
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-600">
                  Usuário ativo
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditingUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={processing || !editForm.firstName || !editForm.lastName || !editForm.email}
            >
              {processing ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Ações em Lote */}
      <Dialog open={showBulkActionModal} onOpenChange={setShowBulkActionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ações em Lote</DialogTitle>
            <DialogDescription>
              Executar ação em {selectedUsers.length} usuário(s) selecionado(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Selecione a ação</label>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activate">Ativar usuários</SelectItem>
                  <SelectItem value="deactivate">Desativar usuários</SelectItem>
                  <SelectItem value="verify_kyc">Aprovar KYC</SelectItem>
                  <SelectItem value="reject_kyc">Rejeitar KYC</SelectItem>
                  <SelectItem value="reset_kyc">Resetar KYC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkActionModal(false);
                setBulkAction('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkAction}
              disabled={!bulkAction || processing}
            >
              {processing ? 'Executando...' : 'Executar Ação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Verificação KYC */}
      <Dialog open={showKycModal} onOpenChange={setShowKycModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verificação KYC - {kycUser?.firstName} {kycUser?.lastName}</DialogTitle>
            <DialogDescription>
              Analise e aprove os documentos de verificação de identidade
            </DialogDescription>
          </DialogHeader>

          {loadingKyc ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Carregando documentos...</span>
            </div>
          ) : kycData ? (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso da Verificação</span>
                  <span className="text-sm text-gray-600">
                    {kycData.progress.completed}/{kycData.progress.total} documentos aprovados
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${kycData.progress.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {kycData.progress.percentage}% completo
                </p>
              </div>

              {/* Document Types */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(kycData.documentsByType).map(([type, documents]) => (
                  <div key={type} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">
                      {getDocumentTypeName(type)}
                    </h4>

                    {(documents as any[]).map((doc: any) => (
                      <div key={doc.id} className="border rounded p-3 mb-2 last:mb-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{doc.fileName}</span>
                          <Badge className={getDocumentStatusColor(doc.status)}>
                            {getDocumentStatusName(doc.status)}
                          </Badge>
                        </div>

                        <div className="text-xs text-gray-500 mb-2">
                          Enviado em: {formatDate(doc.createdAt)}
                          {doc.reviewedAt && (
                            <span className="block">
                              Revisado em: {formatDate(doc.reviewedAt)}
                            </span>
                          )}
                        </div>

                        {doc.rejectionReason && (
                          <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded">
                            <strong>Motivo da rejeição:</strong> {doc.rejectionReason}
                          </div>
                        )}

                        {doc.status === 'PENDING' && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => handleKycAction(doc.id, 'APPROVED')}
                              disabled={processing}
                            >
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => {
                                const comment = prompt('Motivo da rejeição:');
                                if (comment) {
                                  handleKycAction(doc.id, 'REJECTED', comment);
                                }
                              }}
                              disabled={processing}
                            >
                              Rejeitar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                              onClick={() => {
                                const comment = prompt('Instruções para reenvio:');
                                if (comment) {
                                  handleKycAction(doc.id, 'RESUBMIT', comment);
                                }
                              }}
                              disabled={processing}
                            >
                              Solicitar Reenvio
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}

                    {(documents as any[]).length === 0 && (
                      <p className="text-sm text-gray-500 italic">
                        Nenhum documento enviado
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Recent Reviews */}
              {kycData.reviews.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Histórico de Revisões</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {kycData.reviews.slice(0, 5).map((review: any) => (
                      <div key={review.id} className="text-sm border-l-2 border-gray-200 pl-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {review.document ? getDocumentTypeName(review.document.type) : 'KYC Geral'}
                          </span>
                          <Badge className={getDocumentStatusColor(review.action)}>
                            {getDocumentStatusName(review.action)}
                          </Badge>
                        </div>
                        <p className="text-gray-600">
                          Por: {review.reviewer.firstName} {review.reviewer.lastName}
                        </p>
                        <p className="text-gray-500">
                          {formatDate(review.createdAt)}
                        </p>
                        {review.comment && (
                          <p className="text-gray-700 italic">"{review.comment}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Erro ao carregar dados KYC</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowKycModal(false);
                setKycData(null);
                setKycUser(null);
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
