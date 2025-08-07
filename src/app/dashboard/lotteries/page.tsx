'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Gift, Trophy, Calendar, Users, Star, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface LotteryData {
  currentLottery: {
    id: string;
    title: string;
    description: string;
    prize: number;
    drawDate: string;
    status: string;
    participantsCount: number;
    userNumbers: number[];
    ticketsRemaining: number;
    totalTickets: number;
  };
  userStats: {
    totalParticipations: number;
    totalWinnings: number;
    currentTickets: number;
    luckyNumbers: number[];
  };
  pastLotteries: Array<{
    id: string;
    title: string;
    prize: number;
    drawDate: string;
    winningNumbers: number[];
    userNumbers: number[];
    userWon: boolean;
    userPrize: number;
  }>;
  upcomingLotteries: Array<{
    id: string;
    title: string;
    prize: number;
    drawDate: string;
    description: string;
  }>;
}

export default function LotteriesPage() {
  const { data: session } = useSession();
  const [lotteryData, setLotteryData] = useState<LotteryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLotteryData = async () => {
      try {
        const response = await fetch('/api/user/lotteries');
        if (!response.ok) {
          throw new Error('Erro ao carregar dados dos sorteios');
        }
        const data = await response.json();
        setLotteryData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchLotteryData();
    }
  }, [session]);

  const handleParticipate = async () => {
    try {
      const response = await fetch('/api/user/lotteries/participate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lotteryId: lotteryData?.currentLottery.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao participar do sorteio');
      }

      // Recarregar dados
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao participar do sorteio');
    }
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <p>Erro: {error}</p>
        </div>
      </div>
    );
  }

  if (!lotteryData) {
    return <div className="p-6">Nenhum dado encontrado</div>;
  }

  const { currentLottery, userStats, pastLotteries, upcomingLotteries } = lotteryData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sorteios</h1>
          <p className="text-gray-600">Participe dos sorteios mensais e concorra a prêmios incríveis</p>
        </div>
      </div>

      {/* Estatísticas do Usuário */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Participações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {userStats.totalParticipations}
            </div>
            <p className="text-sm text-gray-600">
              {userStats.currentTickets} tickets ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Total Ganho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(userStats.totalWinnings)}
            </div>
            <p className="text-sm text-green-600">
              Em prêmios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Números da Sorte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {userStats.luckyNumbers.length}
            </div>
            <p className="text-sm text-gray-600">
              Números escolhidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Próximo Sorteio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatDate(currentLottery.drawDate)}
            </div>
            <p className="text-sm text-gray-600">
              {currentLottery.participantsCount} participantes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sorteio Atual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  {currentLottery.title}
                </CardTitle>
                <CardDescription>{currentLottery.description}</CardDescription>
              </div>
              <Badge variant={currentLottery.status === 'ACTIVE' ? 'success' : 'secondary'}>
                {currentLottery.status === 'ACTIVE' ? 'Ativo' : 'Encerrado'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-500">Prêmio</label>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(currentLottery.prize)}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Data do Sorteio</label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(currentLottery.drawDate)}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Participantes</label>
                <p className="text-lg font-semibold text-blue-600">
                  {currentLottery.participantsCount}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Tickets Restantes</label>
                <p className="text-lg font-semibold text-orange-600">
                  {currentLottery.ticketsRemaining}
                </p>
              </div>
            </div>

            {/* Números do Usuário */}
            {currentLottery.userNumbers.length > 0 && (
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Seus Números</label>
                <div className="flex flex-wrap gap-2">
                  {currentLottery.userNumbers.map((number, index) => (
                    <div
                      key={index}
                      className="w-10 h-10 bg-blue-100 border-2 border-blue-300 rounded-full flex items-center justify-center font-bold text-blue-700"
                    >
                      {number}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botão de Participação */}
            {currentLottery.status === 'ACTIVE' && (
              <div className="flex gap-4">
                <Button 
                  onClick={handleParticipate}
                  className="flex-1"
                  disabled={currentLottery.userNumbers.length > 0}
                >
                  <Gift className="h-4 w-4 mr-2" />
                  {currentLottery.userNumbers.length > 0 ? 'Já Participando' : 'Participar do Sorteio'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sorteios Passados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Sorteios
          </CardTitle>
          <CardDescription>Seus resultados em sorteios anteriores</CardDescription>
        </CardHeader>
        <CardContent>
          {pastLotteries.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum sorteio anterior
              </h3>
              <p className="text-gray-600">
                Participe do sorteio atual para começar seu histórico!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pastLotteries.map((lottery) => (
                <div
                  key={lottery.id}
                  className={`border rounded-lg p-4 ${
                    lottery.userWon ? 'border-green-200 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{lottery.title}</h4>
                      <p className="text-sm text-gray-600">
                        Sorteado em {formatDate(lottery.drawDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {formatCurrency(lottery.prize)}
                      </p>
                      {lottery.userWon && (
                        <Badge variant="success">
                          Ganhou {formatCurrency(lottery.userPrize)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Números Sorteados</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lottery.winningNumbers.map((number, index) => (
                          <div
                            key={index}
                            className="w-8 h-8 bg-yellow-100 border border-yellow-300 rounded-full flex items-center justify-center text-sm font-bold text-yellow-700"
                          >
                            {number}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Seus Números</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lottery.userNumbers.map((number, index) => {
                          const isWinning = lottery.winningNumbers.includes(number);
                          return (
                            <div
                              key={index}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                isWinning
                                  ? 'bg-green-100 border border-green-300 text-green-700'
                                  : 'bg-gray-100 border border-gray-300 text-gray-700'
                              }`}
                            >
                              {number}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximos Sorteios */}
      {upcomingLotteries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximos Sorteios
            </CardTitle>
            <CardDescription>Sorteios programados para os próximos meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingLotteries.map((lottery) => (
                <div key={lottery.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{lottery.title}</h4>
                    <Badge variant="outline">Em Breve</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{lottery.description}</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="text-sm text-gray-500">Prêmio</label>
                      <p className="font-bold text-green-600">
                        {formatCurrency(lottery.prize)}
                      </p>
                    </div>
                    <div className="text-right">
                      <label className="text-sm text-gray-500">Data</label>
                      <p className="font-semibold text-gray-900">
                        {formatDate(lottery.drawDate)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Como Funciona */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funcionam os Sorteios</CardTitle>
          <CardDescription>Entenda as regras e como participar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Regras de Participação</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Apenas membros ativos podem participar</li>
                <li>• Cada membro recebe números automáticos</li>
                <li>• Sorteios realizados mensalmente</li>
                <li>• Prêmios pagos em até 48 horas</li>
                <li>• Números são gerados aleatoriamente</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Critérios de Elegibilidade</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Membership ativo e em dia</li>
                <li>• KYC aprovado</li>
                <li>• Pelo menos 1 investimento ativo</li>
                <li>• Conta verificada</li>
                <li>• Sem pendências financeiras</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
