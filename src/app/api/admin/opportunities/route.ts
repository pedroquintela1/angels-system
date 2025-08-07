import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para criação de oportunidade
const CreateOpportunitySchema = z.object({
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(200, 'Título muito longo'),
  description: z.string().min(20, 'Descrição deve ter pelo menos 20 caracteres').max(2000, 'Descrição muito longa'),
  targetAmount: z.number().min(1000, 'Valor alvo mínimo é R$ 1.000').max(10000000, 'Valor alvo máximo é R$ 10.000.000'),
  minInvestment: z.number().min(100, 'Investimento mínimo é R$ 100').max(1000000, 'Investimento mínimo muito alto'),
  maxInvestment: z.number().min(1000, 'Investimento máximo mínimo é R$ 1.000').max(5000000, 'Investimento máximo muito alto'),
  startDate: z.string().datetime('Data de início inválida'),
  endDate: z.string().datetime('Data de fim inválida'),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
});

// Schema de validação para filtros de listagem
const ListOpportunitiesSchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val)),
  limit: z.string().optional().default('20').transform(val => parseInt(val)),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'COMPLETED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'title', 'targetAmount', 'currentAmount', 'endDate']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// GET - Listar oportunidades (Admin)
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url);
      // Usar valores padrão simples para debug
      const filters = {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
        status: searchParams.get('status') as any,
        search: searchParams.get('search'),
        sortBy: (searchParams.get('sortBy') || 'createdAt') as any,
        sortOrder: (searchParams.get('sortOrder') || 'desc') as any,
      };

      // Construir filtros do Prisma
      const where: any = {};
      
      if (filters.status) {
        where.status = filters.status;
      }
      
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Calcular paginação
      const skip = (filters.page - 1) * filters.limit;

      // Buscar oportunidades
      const [opportunities, total] = await Promise.all([
        prisma.investmentOpportunity.findMany({
          where,
          include: {
            documents: {
              select: {
                id: true,
                name: true,
                type: true,
                size: true,
                createdAt: true,
              },
            },
            investments: {
              select: {
                id: true,
                amount: true,
                investedAt: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            _count: {
              select: {
                investments: true,
                documents: true,
              },
            },
          },
          orderBy: {
            [filters.sortBy]: filters.sortOrder,
          },
          skip,
          take: filters.limit,
        }),
        prisma.investmentOpportunity.count({ where }),
      ]);

      // Processar dados das oportunidades
      const processedOpportunities = opportunities.map(opportunity => ({
        id: opportunity.id,
        title: opportunity.title,
        description: opportunity.description,
        status: opportunity.status,
        targetAmount: opportunity.targetAmount,
        currentAmount: opportunity.currentAmount,
        minInvestment: opportunity.minInvestment,
        maxInvestment: opportunity.maxInvestment,
        startDate: opportunity.startDate,
        endDate: opportunity.endDate,
        createdAt: opportunity.createdAt,
        updatedAt: opportunity.updatedAt,
        
        // Estatísticas
        investorsCount: opportunity._count.investments,
        documentsCount: opportunity._count.documents,
        completionPercentage: (opportunity.currentAmount / opportunity.targetAmount) * 100,
        
        // Dados dos investidores (resumido)
        recentInvestments: opportunity.investments
          .sort((a, b) => new Date(b.investedAt).getTime() - new Date(a.investedAt).getTime())
          .slice(0, 5)
          .map(inv => ({
            id: inv.id,
            amount: inv.amount,
            investedAt: inv.investedAt,
            investor: {
              name: `${inv.user.firstName} ${inv.user.lastName}`,
              email: inv.user.email,
            },
          })),
        
        // Documentos
        documents: opportunity.documents,
      }));

      // Log de auditoria
      await logResourceEvent(
        AuditEventType.RESOURCE_READ,
        Resource.OPPORTUNITIES,
        Action.READ,
        user.id,
        user.email,
        user.role,
        undefined,
        true,
        {
          filters,
          resultCount: opportunities.length,
          totalCount: total,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        opportunities: processedOpportunities,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit),
          hasNext: filters.page * filters.limit < total,
          hasPrev: filters.page > 1,
        },
        filters: {
          status: filters.status,
          search: filters.search,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        },
      });

    } catch (error) {
      console.error('Admin opportunities list error:', error);
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Parâmetros inválidos', details: error.issues },
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
    action: Action.READ,
    requireAuth: true,
    ownershipCheck: false,
  }
);

// POST - Criar nova oportunidade (Admin)
export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      const body = await request.json();
      const validatedData = CreateOpportunitySchema.parse(body);

      // Validações de negócio
      const startDate = new Date(validatedData.startDate);
      const endDate = new Date(validatedData.endDate);
      const now = new Date();

      if (startDate <= now) {
        return NextResponse.json(
          { error: 'Data de início deve ser futura' },
          { status: 400 }
        );
      }

      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'Data de fim deve ser posterior à data de início' },
          { status: 400 }
        );
      }

      if (validatedData.minInvestment >= validatedData.maxInvestment) {
        return NextResponse.json(
          { error: 'Investimento mínimo deve ser menor que o máximo' },
          { status: 400 }
        );
      }

      if (validatedData.maxInvestment > validatedData.targetAmount) {
        return NextResponse.json(
          { error: 'Investimento máximo não pode ser maior que o valor alvo' },
          { status: 400 }
        );
      }

      // Criar oportunidade
      const opportunity = await prisma.investmentOpportunity.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          targetAmount: validatedData.targetAmount,
          minInvestment: validatedData.minInvestment,
          maxInvestment: validatedData.maxInvestment,
          startDate: startDate,
          endDate: endDate,
          status: validatedData.status,
        },
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
        AuditEventType.OPPORTUNITY_CREATE,
        Resource.OPPORTUNITIES,
        Action.CREATE,
        user.id,
        user.email,
        user.role,
        opportunity.id,
        true,
        {
          opportunityTitle: opportunity.title,
          targetAmount: opportunity.targetAmount,
          status: opportunity.status,
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
          currentAmount: opportunity.currentAmount,
          minInvestment: opportunity.minInvestment,
          maxInvestment: opportunity.maxInvestment,
          startDate: opportunity.startDate,
          endDate: opportunity.endDate,
          createdAt: opportunity.createdAt,
          updatedAt: opportunity.updatedAt,
          investorsCount: opportunity._count.investments,
          documentsCount: opportunity._count.documents,
          completionPercentage: 0,
        },
      }, { status: 201 });

    } catch (error) {
      console.error('Admin opportunity creation error:', error);
      
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
    action: Action.CREATE,
    requireAuth: true,
    ownershipCheck: false,
  }
);
