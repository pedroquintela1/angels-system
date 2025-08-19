import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Users,
  Trophy,
  Star,
  CheckCircle,
  Crown,
  Zap,
  Award,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-600/20 via-transparent to-transparent"></div>

      {/* Header */}
      <header className="relative bg-slate-900/40 backdrop-blur-xl shadow-2xl border-b border-blue-500/20 overflow-visible">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-2xl border border-blue-400/30">
                  <Crown className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold leading-[1.3] pb-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Angels System
                  </h1>
                  <p className="text-xs leading-[1.2] text-blue-300/80 font-medium">
                    Premium Platform
                  </p>
                </div>
              </div>
            </div>

            <nav className="hidden md:flex space-x-8">
              <a
                href="#features"
                className="text-blue-200 hover:text-blue-100 transition-colors duration-200 font-medium"
              >
                Recursos
              </a>
              <a
                href="#benefits"
                className="text-blue-200 hover:text-blue-100 transition-colors duration-200 font-medium"
              >
                Benefícios
              </a>
              <a
                href="#membership"
                className="text-blue-200 hover:text-blue-100 transition-colors duration-200 font-medium"
              >
                Membership
              </a>
            </nav>

            <div className="flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button
                  variant="ghost"
                  className="text-blue-300 hover:text-blue-100 hover:bg-blue-800/30 border border-blue-600/30 backdrop-blur-sm"
                >
                  Entrar
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-2xl border border-blue-400/30 font-medium">
                  Começar Agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 overflow-visible">
        <div className="text-center">
          {/* Premium Badge */}
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm rounded-full text-blue-200 text-sm font-medium mb-12 border border-blue-500/30 shadow-xl">
            <Star className="w-5 h-5 mr-2 text-blue-400" />
            Plataforma Premium Exclusiva
          </div>

          {/* Main Heading */}
          <div className="space-y-8">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-[1.35] py-6 md:py-8 overflow-visible">
              <span className="block text-white mb-6 pb-2">Bem-vindo ao</span>
              <span className="block bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent drop-shadow-2xl pb-6 pt-2">
                Angels System
              </span>
            </h1>

            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 backdrop-blur-sm px-6 py-2 rounded-full border border-blue-500/20">
              <Crown className="w-5 h-5 text-blue-400" />
              <span className="text-blue-200 font-medium">
                Membership Premium
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="mt-8 text-xl leading-8 text-blue-100/90 max-w-4xl mx-auto font-light">
            Uma plataforma exclusiva que conecta membros premium a oportunidades
            únicas. Junte-se à nossa comunidade de elite e tenha acesso a
            benefícios extraordinários.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="group px-10 py-6 text-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-2xl border border-blue-400/30 font-medium transform hover:scale-105 transition-all duration-300"
              >
                Começar Jornada Premium
                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="#features">
              <Button
                variant="outline"
                size="lg"
                className="px-10 py-6 text-lg border-blue-200/60 text-blue-900 hover:bg-blue-50/90 hover:text-blue-800 hover:border-blue-300/80 backdrop-blur-sm font-medium transition-all duration-200 shadow-lg"
              >
                Descobrir Mais
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="mt-40">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold tracking-tight text-white mb-6">
              Por que Angels System?
            </h2>
            <p className="text-xl text-blue-200/80 max-w-3xl mx-auto font-light">
              Experiência premium com benefícios exclusivos para nossa
              comunidade de elite
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Security Card */}
            <Card className="bg-slate-800/40 backdrop-blur-sm border-blue-500/30 shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105 group">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-4 shadow-xl group-hover:shadow-blue-500/50 transition-all duration-300">
                    <Shield className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-white text-xl">Segurança Máxima</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-blue-200/80 text-base leading-relaxed">
                  Proteção de nível militar com criptografia avançada e
                  auditorias constantes para garantir total segurança dos seus
                  dados.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Community Card */}
            <Card className="bg-slate-800/40 backdrop-blur-sm border-blue-500/30 shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105 group">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-4 shadow-xl group-hover:shadow-indigo-500/50 transition-all duration-300">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-white text-xl">Comunidade Elite</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-blue-200/80 text-base leading-relaxed">
                  Conecte-se com membros premium cuidadosamente selecionados e
                  construa relacionamentos valiosos.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Excellence Card */}
            <Card className="bg-slate-800/40 backdrop-blur-sm border-blue-500/30 shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105 group">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mr-4 shadow-xl group-hover:shadow-purple-500/50 transition-all duration-300">
                    <Award className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-white text-xl">Excelência</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-blue-200/80 text-base leading-relaxed">
                  Padrão de qualidade incomparável com suporte dedicado e
                  experiência personalizada para cada membro.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Benefits Section */}
        <div id="benefits" className="mt-40">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold tracking-tight text-white mb-6">
              Benefícios Premium
            </h2>
            <p className="text-xl text-blue-200/80 max-w-3xl mx-auto font-light">
              Vantagens exclusivas para membros da nossa plataforma de elite
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-slate-800/40 backdrop-blur-sm border-blue-500/30 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center">
                  <Zap className="w-6 h-6 mr-3 text-blue-400" />
                  Acesso Prioritário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-blue-200/80">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-green-400" />
                    Lançamentos exclusivos
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-green-400" />
                    Suporte 24/7 premium
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-green-400" />
                    Eventos privados
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/40 backdrop-blur-sm border-blue-500/30 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center">
                  <Crown className="w-6 h-6 mr-3 text-purple-400" />
                  Status VIP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-blue-200/80">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-green-400" />
                    Badge exclusivo de membro
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-green-400" />
                    Networking premium
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-green-400" />
                    Consultoria personalizada
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div id="membership" className="mt-40">
          <Card className="bg-gradient-to-r from-slate-800/60 to-blue-900/60 backdrop-blur-sm border-blue-500/30 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Crown className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-white mb-4">
                Pronto para se tornar um Angel?
              </CardTitle>
              <CardDescription className="text-xl text-blue-200/80 max-w-2xl mx-auto">
                Junte-se à nossa comunidade exclusiva e experimente o que há de
                melhor em plataformas premium de membership.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl font-medium"
                  >
                    Iniciar Membership Premium
                    <Crown className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/auth/signin">
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-8 py-4 text-lg border-blue-200/60 text-blue-900 hover:bg-blue-50/90 hover:text-blue-800 hover:border-blue-300/80 backdrop-blur-sm font-medium transition-all duration-200 shadow-lg"
                  >
                    Já sou membro
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative bg-slate-900/60 backdrop-blur-sm border-t border-blue-500/20 mt-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold leading-[1.3] pb-1 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Angels System
              </span>
            </div>
            <p className="text-blue-300/60 text-sm">
              © 2024 Angels System. Todos os direitos reservados.
            </p>
            <p className="text-blue-400/40 text-xs mt-2">
              Plataforma Premium de Membership
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
