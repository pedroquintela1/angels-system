'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function AdminLoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔄 Iniciando processo de login...');
    setLoading(true);
    setError('');

    try {
      // Mostrar feedback imediato
      console.log('📧 Fazendo login com:', formData.email);
      
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      console.log('✅ Resultado do signIn:', result);

      if (result?.error) {
        console.log('❌ Erro no signIn:', result.error);
        setError('Credenciais inválidas');
        return;
      }

      // Verificar se o usuário tem permissão de admin
      console.log('🔍 Verificando permissões de admin...');
      const sessionResponse = await fetch('/api/auth/session');
      const session = await sessionResponse.json();

      console.log('👤 Sessão obtida:', session);

      if (!session?.user) {
        console.log('❌ Sessão inválida');
        setError('Erro ao verificar sessão');
        return;
      }

      // Verificar se tem role de admin
      const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'FINANCIAL'];
      if (!allowedRoles.includes(session.user.role)) {
        console.log('❌ Role não permitido:', session.user.role);
        setError('Acesso negado. Você não tem permissões administrativas.');
        return;
      }

      // Feedback de sucesso antes do redirecionamento
      console.log('🎉 Login bem-sucedido! Redirecionando para /admin');
      
      // Redirecionar para o painel admin
      router.push('/admin');
      
    } catch (error) {
      console.error('💥 Erro crítico no login:', error);
      setError('Erro interno. Tente novamente.');
    } finally {
      console.log('🏁 Finalizando processo de login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-purple-600 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Painel Administrativo</h1>
          <p className="mt-2 text-purple-200">Angels System</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-center">Acesso Administrativo</CardTitle>
            <CardDescription className="text-purple-200 text-center">
              Digite suas credenciais de administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {loading && (
                <div className="bg-blue-500/20 border border-blue-500/50 text-blue-200 px-4 py-3 rounded-md text-sm flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-transparent"></div>
                  Processando login, aguarde...
                </div>
              )}

              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="admin@angelssystem.com"
                className="bg-white/10 border-white/30 text-white placeholder:text-purple-200"
              />

              <Input
                label="Senha"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Sua senha de administrador"
                className="bg-white/10 border-white/30 text-white placeholder:text-purple-200"
              />

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                loading={loading}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Verificando credenciais...
                  </div>
                ) : (
                  'Acessar Painel'
                )}
              </Button>
            </form>

            {/* Credenciais de Teste */}
            <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-md">
              <h3 className="text-blue-200 font-medium mb-2">Credenciais de Teste:</h3>
              <div className="space-y-1 text-sm text-blue-100">
                <p><strong>Super Admin:</strong> admin@angelssystem.com / 123456</p>
                <p><strong>Admin:</strong> admin2@angelssystem.com / 123456</p>
                <p><strong>Suporte:</strong> suporte@angelssystem.com / 123456</p>
                <p><strong>Financeiro:</strong> financeiro@angelssystem.com / 123456</p>
              </div>
            </div>

            {/* Links */}
            <div className="mt-6 text-center space-y-2">
              <Link 
                href="/" 
                className="text-purple-200 hover:text-white text-sm transition-colors"
              >
                ← Voltar para página inicial
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-purple-300">
          <p>
            ⚠️ Acesso restrito apenas para administradores autorizados
          </p>
        </div>
      </div>
    </div>
  );
}
