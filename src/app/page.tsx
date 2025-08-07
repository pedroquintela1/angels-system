import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Angels System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button variant="outline">Entrar</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Cadastrar</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Sistema de{' '}
            <span className="text-blue-600">Renda Extra</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            Conecte-se a oportunidades de investimento coletivo e faça parte de uma comunidade
            engajada de investidores. Transparência, segurança e rentabilidade em primeiro lugar.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/auth/signup">
              <Button size="lg" className="px-8 py-3">
                Começar Agora
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="px-8 py-3">
                Saiba Mais
              </Button>
            </Link>
          </div>

          {/* Link para Admin - apenas para desenvolvimento */}
          <div className="mt-6 flex justify-center">
            <Link href="/admin/login">
              <Button variant="outline" size="sm" className="text-purple-600 border-purple-600 hover:bg-purple-50">
                🔐 Painel Administrativo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="mt-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Por que escolher o Angels System?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Uma plataforma completa para investimentos coletivos
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-bold">💰</span>
                  </div>
                  Investimentos Transparentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Todas as operações são auditáveis e transparentes.
                  Você acompanha cada etapa do seu investimento.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <span className="text-green-600 font-bold">🎯</span>
                  </div>
                  Oportunidades Selecionadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Nossa equipe analisa e seleciona as melhores oportunidades
                  de investimento para nossa comunidade.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                    <span className="text-purple-600 font-bold">👥</span>
                  </div>
                  Comunidade Engajada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Faça parte de uma comunidade de investidores,
                  participe de sorteios e ganhe com indicações.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">
                Pronto para começar?
              </CardTitle>
              <CardDescription>
                Junte-se a centenas de investidores que já fazem parte do Angels System
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>✅ Membership por apenas R$ 20/mês</p>
                <p>✅ Acesso a oportunidades exclusivas</p>
                <p>✅ Sistema de indicações e sorteios</p>
                <p>✅ Suporte especializado</p>
              </div>
              <Link href="/auth/signup">
                <Button size="lg" className="w-full">
                  Criar Conta Gratuita
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 Angels System. Todos os direitos reservados.</p>
            <p className="mt-2">
              ⚠️ Investimentos envolvem riscos. Consulte sempre um profissional qualificado.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
