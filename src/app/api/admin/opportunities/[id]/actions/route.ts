import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para ações
const ActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'activate', 'close', 'cancel']),
  reason: z.string().optional(),
  notes: z.string().max(1000, 'Notas muito longas').optional(),
});

// POST - Executar ações específicas na oportunidade
export const POST = withAuth(
  async (request: NextRequest, user: AuthenticatedUser) => {
    try {
      // Extract ID from URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const opportunityId = pathSegments[pathSegments.length - 2]; // -2 porque o último é 'actions'

      const body = await request.json();
      const { action, reason, notes } = ActionSchema.parse(body);

      if (!opportunityId) {
        return NextResponse.json(
          { error: 'ID da oportunidade é obrigatório' },
          { status: 400 }
        );
      }

      // Buscar oportunidade atual
      const opportunity = await prisma.investmentOpportunity.findUnique({
        where: { id: opportunityId },
        include: {
          investments: true,
          _count: {
            select: {
              investments: true,
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

      let newStatus: string;
      let auditEventType: AuditEventType;
      let successMessage: string;

      // Determinar nova status e validações baseadas na ação
      switch (action) {
        case 'approve':
          if (opportunity.status !== 'DRAFT') {
            return NextResponse.json(
              { error: 'Apenas oportunidades em rascunho podem ser aprovadas' },
              { status: 400 }
            );
          }
          newStatus = 'ACTIVE';
          auditEventType = AuditEventType.OPPORTUNITY_APPROVE;
          successMessage = 'Oportunidade aprovada e ativada com sucesso';
          break;

        case 'reject':
          if (!['DRAFT', 'ACTIVE'].includes(opportunity.status)) {
            return NextResponse.json(
              { error: 'Apenas oportunidades em rascunho ou ativas podem ser rejeitadas' },
              { status: 400 }
            );
          }
          if (opportunity.investments.length > 0) {
            return NextResponse.json(
              { error: 'Não é possível rejeitar oportunidade com investimentos' },
              { status: 400 }
            );
          }
          if (!reason) {
            return NextResponse.json(
              { error: 'Motivo da rejeição é obrigatório' },
              { status: 400 }
            );
          }
          newStatus = 'CANCELLED';
          auditEventType = AuditEventType.OPPORTUNITY_REJECT;
          successMessage = 'Oportunidade rejeitada com sucesso';
          break;

        case 'activate':
          if (opportunity.status !== 'DRAFT') {
            return NextResponse.json(
              { error: 'Apenas oportunidades em rascunho podem ser ativadas' },
              { status: 400 }
            );
          }
          // Validar se a data de início é futura
          if (new Date(opportunity.startDate) <= new Date()) {
            return NextResponse.json(
              { error: 'Data de início deve ser futura para ativar a oportunidade' },
              { status: 400 }
            );
          }
          newStatus = 'ACTIVE';
          auditEventType = AuditEventType.OPPORTUNITY_APPROVE;
          successMessage = 'Oportunidade ativada com sucesso';
          break;

        case 'close':
          if (opportunity.status !== 'ACTIVE') {
            return NextResponse.json(
              { error: 'Apenas oportunidades ativas podem ser fechadas' },
              { status: 400 }
            );
          }
          newStatus = 'CLOSED';
          auditEventType = AuditEventType.OPPORTUNITY_UPDATE;
          successMessage = 'Oportunidade fechada para novos investimentos';
          break;

        case 'cancel':
          if (!['DRAFT', 'ACTIVE', 'CLOSED'].includes(opportunity.status)) {
            return NextResponse.json(
              { error: 'Oportunidade não pode ser cancelada no status atual' },
              { status: 400 }
            );
          }
          if (opportunity.investments.length > 0) {
            return NextResponse.json(
              { error: 'Não é possível cancelar oportunidade com investimentos. Use "close" para fechar.' },
              { status: 400 }
            );
          }
          if (!reason) {
            return NextResponse.json(
              { error: 'Motivo do cancelamento é obrigatório' },
              { status: 400 }
            );
          }
          newStatus = 'CANCELLED';
          auditEventType = AuditEventType.OPPORTUNITY_REJECT;
          successMessage = 'Oportunidade cancelada com sucesso';
          break;

        default:
          return NextResponse.json(
            { error: 'Ação inválida' },
            { status: 400 }
          );
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
        auditEventType,
        Resource.OPPORTUNITIES,
        Action.APPROVE, // Usar APPROVE como ação genérica para ações administrativas
        user.id,
        user.email,
        user.role,
        opportunityId,
        true,
        {
          opportunityTitle: opportunity.title,
          action,
          previousStatus: opportunity.status,
          newStatus,
          reason,
          notes,
          hasInvestments: opportunity.investments.length > 0,
          investorsCount: opportunity._count.investments,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        message: successMessage,
        opportunity: {
          id: updatedOpportunity.id,
          title: updatedOpportunity.title,
          status: updatedOpportunity.status,
          previousStatus: opportunity.status,
          targetAmount: updatedOpportunity.targetAmount,
          currentAmount: updatedOpportunity.currentAmount,
          investorsCount: updatedOpportunity._count.investments,
          documentsCount: updatedOpportunity._count.documents,
          completionPercentage: (updatedOpportunity.currentAmount / updatedOpportunity.targetAmount) * 100,
          updatedAt: updatedOpportunity.updatedAt,
        },
        action: {
          type: action,
          reason,
          notes,
          executedBy: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
          executedAt: new Date(),
        },
      });

    } catch (error) {
      console.error('Admin opportunity action error:', error);
      
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
    action: Action.APPROVE, // Requer permissão de aprovação
    requireAuth: true,
    ownershipCheck: false,
  }
);
