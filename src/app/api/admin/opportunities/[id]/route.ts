import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para atualização de oportunidade
const UpdateOpportunitySchema = z.object({
  title: z
    .string()
    .min(5, 'Título deve ter pelo menos 5 caracteres')
    .max(200, 'Título muito longo')
    .optional(),
  description: z
    .string()
    .min(20, 'Descrição deve ter pelo menos 20 caracteres')
    .max(2000, 'Descrição muito longa')
    .optional(),
  targetAmount: z
    .number()
    .min(1000, 'Valor alvo mínimo é R$ 1.000')
    .max(10000000, 'Valor alvo máximo é R$ 10.000.000')
    .optional(),
  minInvestment: z
    .number()
    .min(100, 'Investimento mínimo é R$ 100')
    .max(1000000, 'Investimento mínimo muito alto')
    .optional(),
  maxInvestment: z
    .number()
    .min(1000, 'Investimento máximo mínimo é R$ 1.000')
    .max(5000000, 'Investimento máximo muito alto')
    .optional(),
  startDate: z.string().datetime('Data de início inválida').optional(),
  endDate: z.string().datetime('Data de fim inválida').optional(),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'CLOSED', 'COMPLETED', 'CANCELLED'])
    .optional(),
  expectedReturn: z
    .number()
    .min(0, 'Retorno esperado deve ser positivo')
    .max(100, 'Retorno esperado máximo é 100%')
    .optional(),
});

// GET - Buscar oportunidade específica (Admin)
export const GET = withAuth(
  async (request: NextRequest, user: AuthenticatedUser) => {
    try {
      // Extrair ID da URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const opportunityId = pathSegments[pathSegments.length - 1];

      if (!opportunityId) {
        return NextResponse.json(
          { error: 'ID da oportunidade é obrigatório' },
          { status: 400 }
        );
      }

      // Buscar oportunidade com todos os dados
      const opportunity = await prisma.investmentOpportunity.findUnique({
        where: { id: opportunityId },
        include: {
          documents: {
            select: {
              id: true,
              name: true,
              type: true,
              size: true,
              url: true,
              createdAt: true,
            },
          },
          investments: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              returns: {
                select: {
                  id: true,
                  userReturnAmount: true,
                  returnPercentage: true,
                  distributedAt: true,
                },
              },
            },
            orderBy: {
              investedAt: 'desc',
            },
          },
          returns: {
            select: {
              id: true,
              userReturnAmount: true,
              returnPercentage: true,
              distributedAt: true,
              investment: {
                select: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              distributedAt: 'desc',
            },
          },
          _count: {
            select: {
              investments: true,
              documents: true,
              returns: true,
            },
          },
        },
      });

      if (!opportunity) {
        return NextResponse.json(
          { error: 'Oportunidade não encontrada' },
          { status: 404 }
        );
      }

      // Calcular estatísticas
      const totalInvested = opportunity.investments.reduce(
        (sum: number, inv: any) => sum + inv.amount,
        0
      );
      const totalReturns = opportunity.returns.reduce(
        (sum: number, ret: any) => sum + ret.userReturnAmount,
        0
      );
      const completionPercentage =
        (totalInvested / opportunity.targetAmount) * 100;

      // Processar dados dos investimentos
      const processedInvestments = opportunity.investments.map(
        (investment: any) => ({
          id: investment.id,
          amount: investment.amount,
          investedAt: investment.investedAt,
          investor: {
            id: investment.user.id,
            name: `${investment.user.firstName} ${investment.user.lastName}`,
            email: investment.user.email,
          },
          returns: investment.returns.map((ret: any) => ({
            id: ret.id,
            amount: ret.userReturnAmount,
            returnPercentage: ret.returnPercentage,
            distributedAt: ret.distributedAt,
          })),
          totalReturns: investment.returns.reduce(
            (sum: number, ret: any) => sum + ret.userReturnAmount,
            0
          ),
        })
      );

      // Log de auditoria
      await logResourceEvent(
        AuditEventType.RESOURCE_READ,
        Resource.OPPORTUNITIES,
        Action.READ,
        user.id,
        user.email,
        user.role,
        opportunityId,
        true,
        {
          opportunityTitle: opportunity.title,
          opportunityStatus: opportunity.status,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        opportunity: {
          id: opportunity.id,
          title: opportunity.title,
          description: opportunity.description,
          status: opportunity.status,
          targetAmount: opportunity.targetAmount,
          currentAmount: totalInvested,
          minInvestment: opportunity.minInvestment,
          maxInvestment: opportunity.maxInvestment,
          startDate: opportunity.startDate,
          endDate: opportunity.endDate,
          expectedReturn: opportunity.expectedReturn,
          createdAt: opportunity.createdAt,
          updatedAt: opportunity.updatedAt,

          // Estatísticas
          statistics: {
            investorsCount: opportunity._count?.investments || 0,
            documentsCount: opportunity._count?.documents || 0,
            returnsCount: opportunity._count?.returns || 0,
            totalInvested,
            totalReturns,
            completionPercentage,
            averageInvestment:
              (opportunity._count?.investments || 0) > 0
                ? totalInvested / (opportunity._count?.investments || 1)
                : 0,
          },

          // Dados detalhados
          investments: processedInvestments,
          documents: opportunity.documents || [],
          returns: (opportunity.returns || []).map((ret: any) => ({
            id: ret.id,
            amount: ret.userReturnAmount,
            returnPercentage: ret.returnPercentage,
            distributedAt: ret.distributedAt,
            investor: ret.investment
              ? {
                  name: `${ret.investment.user.firstName} ${ret.investment.user.lastName}`,
                  email: ret.investment.user.email,
                }
              : null,
          })),
        },
      });
    } catch (error) {
      console.error('Admin opportunity detail error:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    resource: Resource.OPPORTUNITIES,
    action: Action.READ,
    requireAuth: true,
    ownershipCheck: false,
  }
);

// PUT - Atualizar oportunidade (Admin)
export const PUT = withAuth(
  async (request: NextRequest, user: AuthenticatedUser) => {
    try {
      // Extrair ID da URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const opportunityId = pathSegments[pathSegments.length - 1];

      const body = await request.json();
      const validatedData = UpdateOpportunitySchema.parse(body);

      console.log('🔄 Dados recebidos para atualização:', validatedData);

      if (!opportunityId) {
        return NextResponse.json(
          { error: 'ID da oportunidade é obrigatório' },
          { status: 400 }
        );
      }

      // Buscar oportunidade atual
      const existingOpportunity = await prisma.investmentOpportunity.findUnique(
        {
          where: { id: opportunityId },
          include: {
            investments: true,
          },
        }
      );

      if (!existingOpportunity) {
        return NextResponse.json(
          { error: 'Oportunidade não encontrada' },
          { status: 404 }
        );
      }

      // Validações de negócio
      const hasInvestments = existingOpportunity.investments.length > 0;

      // Se já tem investimentos, algumas alterações são restritas
      if (hasInvestments) {
        if (
          validatedData.targetAmount &&
          validatedData.targetAmount < existingOpportunity.currentAmount
        ) {
          return NextResponse.json(
            { error: 'Valor alvo não pode ser menor que o valor já captado' },
            { status: 400 }
          );
        }

        if (
          validatedData.minInvestment &&
          validatedData.minInvestment >
            Math.min(
              ...existingOpportunity.investments.map((i: any) => i.amount)
            )
        ) {
          return NextResponse.json(
            {
              error:
                'Investimento mínimo não pode ser maior que investimentos já realizados',
            },
            { status: 400 }
          );
        }
      }

      // Validações de datas
      if (validatedData.startDate && validatedData.endDate) {
        const startDate = new Date(validatedData.startDate);
        const endDate = new Date(validatedData.endDate);

        if (endDate <= startDate) {
          return NextResponse.json(
            { error: 'Data de fim deve ser posterior à data de início' },
            { status: 400 }
          );
        }
      }

      // Validações de valores
      if (validatedData.minInvestment && validatedData.maxInvestment) {
        if (validatedData.minInvestment >= validatedData.maxInvestment) {
          return NextResponse.json(
            { error: 'Investimento mínimo deve ser menor que o máximo' },
            { status: 400 }
          );
        }
      }

      // Preparar dados para atualização
      const updateData: any = {};

      if (validatedData.title) updateData.title = validatedData.title;
      if (validatedData.description)
        updateData.description = validatedData.description;
      if (validatedData.targetAmount)
        updateData.targetAmount = validatedData.targetAmount;
      if (validatedData.minInvestment)
        updateData.minInvestment = validatedData.minInvestment;
      if (validatedData.maxInvestment)
        updateData.maxInvestment = validatedData.maxInvestment;
      if (validatedData.startDate)
        updateData.startDate = new Date(validatedData.startDate);
      if (validatedData.endDate)
        updateData.endDate = new Date(validatedData.endDate);
      if (validatedData.status) updateData.status = validatedData.status;
      if (typeof validatedData.expectedReturn === 'number')
        updateData.expectedReturn = validatedData.expectedReturn;

      console.log('📝 UpdateData preparado:', updateData);

      // Atualizar oportunidade
      const updatedOpportunity = await prisma.investmentOpportunity.update({
        where: { id: opportunityId },
        data: updateData,
        include: {
          _count: {
            select: {
              investments: true,
              documents: true,
            },
          },
        },
      });

      // Log de auditoria
      await logResourceEvent(
        AuditEventType.OPPORTUNITY_UPDATE,
        Resource.OPPORTUNITIES,
        Action.UPDATE,
        user.id,
        user.email,
        user.role,
        opportunityId,
        true,
        {
          opportunityTitle: updatedOpportunity.title,
          changedFields: Object.keys(updateData),
          previousStatus: existingOpportunity.status,
          newStatus: updatedOpportunity.status,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        opportunity: {
          id: updatedOpportunity.id,
          title: updatedOpportunity.title,
          description: updatedOpportunity.description,
          status: updatedOpportunity.status,
          targetAmount: updatedOpportunity.targetAmount,
          currentAmount: updatedOpportunity.currentAmount,
          minInvestment: updatedOpportunity.minInvestment,
          maxInvestment: updatedOpportunity.maxInvestment,
          startDate: updatedOpportunity.startDate,
          endDate: updatedOpportunity.endDate,
          createdAt: updatedOpportunity.createdAt,
          updatedAt: updatedOpportunity.updatedAt,
          investorsCount: updatedOpportunity._count.investments,
          documentsCount: updatedOpportunity._count.documents,
          completionPercentage:
            (updatedOpportunity.currentAmount /
              updatedOpportunity.targetAmount) *
            100,
        },
      });
    } catch (error) {
      console.error('Admin opportunity update error:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    resource: Resource.OPPORTUNITIES,
    action: Action.UPDATE,
    requireAuth: true,
    ownershipCheck: false,
  }
);

// PATCH - Executar ações na oportunidade (Admin)
export const PATCH = withAuth(
  async (request: NextRequest, user: AuthenticatedUser) => {
    try {
      // Extrair ID da URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const opportunityId = pathSegments[pathSegments.length - 1];

      if (!opportunityId) {
        return NextResponse.json(
          { error: 'ID da oportunidade é obrigatório' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const { action } = body;

      if (!action) {
        return NextResponse.json(
          { error: 'Ação é obrigatória' },
          { status: 400 }
        );
      }

      // Buscar oportunidade atual
      const existingOpportunity = await prisma.investmentOpportunity.findUnique(
        {
          where: { id: opportunityId },
          include: {
            investments: true,
          },
        }
      );

      if (!existingOpportunity) {
        return NextResponse.json(
          { error: 'Oportunidade não encontrada' },
          { status: 404 }
        );
      }

      let newStatus: string;
      let actionDescription: string;

      // Definir nova situação baseada na ação
      switch (action) {
        case 'approve':
          if (existingOpportunity.status !== 'DRAFT') {
            return NextResponse.json(
              { error: 'Apenas oportunidades em rascunho podem ser aprovadas' },
              { status: 400 }
            );
          }
          newStatus = 'ACTIVE';
          actionDescription = 'aprovada';
          break;

        case 'reject':
          if (existingOpportunity.status !== 'DRAFT') {
            return NextResponse.json(
              {
                error: 'Apenas oportunidades em rascunho podem ser rejeitadas',
              },
              { status: 400 }
            );
          }
          newStatus = 'CANCELLED';
          actionDescription = 'rejeitada';
          break;

        case 'close':
          if (!['ACTIVE', 'DRAFT'].includes(existingOpportunity.status)) {
            return NextResponse.json(
              {
                error:
                  'Apenas oportunidades ativas ou em rascunho podem ser fechadas',
              },
              { status: 400 }
            );
          }
          newStatus = 'CLOSED';
          actionDescription = 'fechada';
          break;

        case 'reopen':
          if (existingOpportunity.status !== 'CLOSED') {
            return NextResponse.json(
              { error: 'Apenas oportunidades fechadas podem ser reabertas' },
              { status: 400 }
            );
          }
          newStatus = 'ACTIVE';
          actionDescription = 'reaberta';
          break;

        case 'complete':
          if (existingOpportunity.status !== 'ACTIVE') {
            return NextResponse.json(
              {
                error:
                  'Apenas oportunidades ativas podem ser marcadas como concluídas',
              },
              { status: 400 }
            );
          }
          newStatus = 'COMPLETED';
          actionDescription = 'marcada como concluída';
          break;

        default:
          return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
      }

      // Atualizar status da oportunidade
      const updatedOpportunity = await prisma.investmentOpportunity.update({
        where: { id: opportunityId },
        data: { status: newStatus as any },
        include: {
          _count: {
            select: {
              investments: true,
              documents: true,
            },
          },
        },
      });

      // Log de auditoria
      await logResourceEvent(
        AuditEventType.OPPORTUNITY_UPDATE,
        Resource.OPPORTUNITIES,
        Action.UPDATE,
        user.id,
        user.email,
        user.role,
        opportunityId,
        true,
        {
          opportunityTitle: updatedOpportunity.title,
          action: action,
          previousStatus: existingOpportunity.status,
          newStatus: updatedOpportunity.status,
          actionDescription: actionDescription,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        message: `Oportunidade ${actionDescription} com sucesso`,
        opportunity: {
          id: updatedOpportunity.id,
          title: updatedOpportunity.title,
          status: updatedOpportunity.status,
          targetAmount: updatedOpportunity.targetAmount,
          currentAmount: updatedOpportunity.currentAmount,
          completionPercentage:
            (updatedOpportunity.currentAmount /
              updatedOpportunity.targetAmount) *
            100,
        },
      });
    } catch (error) {
      console.error('Admin opportunity action error:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    resource: Resource.OPPORTUNITIES,
    action: Action.UPDATE,
    requireAuth: true,
    ownershipCheck: false,
  }
);

// DELETE - Excluir oportunidade (Admin)
export const DELETE = withAuth(
  async (request: NextRequest, user: AuthenticatedUser) => {
    try {
      // Extrair ID da URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const opportunityId = pathSegments[pathSegments.length - 1];

      if (!opportunityId) {
        return NextResponse.json(
          { error: 'ID da oportunidade é obrigatório' },
          { status: 400 }
        );
      }

      // Buscar oportunidade atual
      const existingOpportunity = await prisma.investmentOpportunity.findUnique(
        {
          where: { id: opportunityId },
          include: {
            investments: true,
            documents: true,
            returns: true,
          },
        }
      );

      if (!existingOpportunity) {
        return NextResponse.json(
          { error: 'Oportunidade não encontrada' },
          { status: 404 }
        );
      }

      // Validações de negócio - não permitir exclusão se:
      // 1. Tem investimentos ativos
      // 2. Tem retornos pagos
      // 3. Status é ACTIVE ou COMPLETED
      if (existingOpportunity.investments.length > 0) {
        return NextResponse.json(
          { error: 'Não é possível excluir oportunidade com investimentos' },
          { status: 400 }
        );
      }

      if (existingOpportunity.returns.length > 0) {
        return NextResponse.json(
          { error: 'Não é possível excluir oportunidade com retornos pagos' },
          { status: 400 }
        );
      }

      if (['ACTIVE', 'COMPLETED'].includes(existingOpportunity.status)) {
        return NextResponse.json(
          { error: 'Não é possível excluir oportunidade ativa ou concluída' },
          { status: 400 }
        );
      }

      // Excluir documentos associados primeiro (se houver)
      if (existingOpportunity.documents.length > 0) {
        await prisma.document.deleteMany({
          where: { opportunityId },
        });
      }

      // Excluir oportunidade
      await prisma.investmentOpportunity.delete({
        where: { id: opportunityId },
      });

      // Log de auditoria
      await logResourceEvent(
        AuditEventType.OPPORTUNITY_DELETE,
        Resource.OPPORTUNITIES,
        Action.DELETE,
        user.id,
        user.email,
        user.role,
        opportunityId,
        true,
        {
          opportunityTitle: existingOpportunity.title,
          opportunityStatus: existingOpportunity.status,
          documentsDeleted: existingOpportunity.documents.length,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        message: 'Oportunidade excluída com sucesso',
        deletedOpportunity: {
          id: existingOpportunity.id,
          title: existingOpportunity.title,
          status: existingOpportunity.status,
        },
      });
    } catch (error) {
      console.error('Admin opportunity deletion error:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    resource: Resource.OPPORTUNITIES,
    action: Action.DELETE,
    requireAuth: true,
    ownershipCheck: false,
  }
);
