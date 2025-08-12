import {
  PrismaClient,
  UserRole,
  KycStatus,
  MembershipStatus,
  InvestmentStatus,
  TransactionType,
  TransactionStatus,
  TicketStatus,
  TicketPriority,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.document.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.investmentReturn.deleteMany();
  await prisma.userInvestment.deleteMany();
  await prisma.investmentOpportunity.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️ Dados existentes removidos');

  // Create users
  const hashedPassword = await bcrypt.hash('123456', 12);

  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@angelssystem.com',
      password: hashedPassword,
      phone: '11999999999',
      cpf: '11111111111',
      birthDate: new Date('1990-01-01'),
      referralCode: 'SUPERADM',
      role: UserRole.SUPER_ADMIN,
      kycStatus: KycStatus.APPROVED,
      kycSubmittedAt: new Date('2025-01-01T10:00:00Z'),
      kycApprovedAt: new Date('2025-01-01T14:00:00Z'),
      isActive: true,
    },
  });

  // Admin
  const admin = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'Sistema',
      email: 'admin2@angelssystem.com',
      password: hashedPassword,
      phone: '11888888888',
      cpf: '22222222222',
      birthDate: new Date('1985-05-15'),
      referralCode: 'ADMIN001',
      role: UserRole.ADMIN,
      kycStatus: KycStatus.APPROVED,
      kycSubmittedAt: new Date('2025-01-02T09:00:00Z'),
      kycApprovedAt: new Date('2025-01-02T16:00:00Z'),
      isActive: true,
    },
  });

  // Support Agent
  const support = await prisma.user.create({
    data: {
      firstName: 'Agente',
      lastName: 'Suporte',
      email: 'suporte@angelssystem.com',
      password: hashedPassword,
      phone: '11777777777',
      cpf: '33333333333',
      birthDate: new Date('1992-03-20'),
      referralCode: 'SUPPORT1',
      role: UserRole.SUPPORT,
      kycStatus: KycStatus.APPROVED,
      kycSubmittedAt: new Date('2025-01-03T11:00:00Z'),
      kycApprovedAt: new Date('2025-01-03T15:00:00Z'),
      isActive: true,
    },
  });

  // Financial Analyst
  const financial = await prisma.user.create({
    data: {
      firstName: 'Analista',
      lastName: 'Financeiro',
      email: 'financeiro@angelssystem.com',
      password: hashedPassword,
      phone: '11666666666',
      cpf: '44444444444',
      birthDate: new Date('1988-07-10'),
      referralCode: 'FINANCE1',
      role: UserRole.FINANCIAL,
      kycStatus: KycStatus.APPROVED,
      kycSubmittedAt: new Date('2025-01-04T08:00:00Z'),
      kycApprovedAt: new Date('2025-01-04T12:00:00Z'),
      isActive: true,
    },
  });

  // Regular Users
  const user1 = await prisma.user.create({
    data: {
      firstName: 'João',
      lastName: 'Silva',
      email: 'joao@email.com',
      password: hashedPassword,
      phone: '11555555555',
      cpf: '55555555555',
      birthDate: new Date('1995-12-25'),
      referralCode: 'JOAO2025',
      role: UserRole.USER,
      kycStatus: KycStatus.APPROVED,
      kycSubmittedAt: new Date('2025-01-05T14:00:00Z'),
      kycApprovedAt: new Date('2025-01-06T10:00:00Z'),
      isActive: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria@email.com',
      password: hashedPassword,
      phone: '11444444444',
      cpf: '66666666666',
      birthDate: new Date('1990-08-15'),
      referralCode: 'MARIA123',
      role: UserRole.USER,
      kycStatus: KycStatus.APPROVED,
      kycSubmittedAt: new Date('2025-01-07T16:00:00Z'),
      kycApprovedAt: new Date('2025-01-08T09:00:00Z'),
      isActive: true,
      referredBy: user1.id,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      firstName: 'Pedro',
      lastName: 'Costa',
      email: 'pedro@email.com',
      password: hashedPassword,
      phone: '11333333333',
      cpf: '77777777777',
      birthDate: new Date('1987-04-30'),
      referralCode: 'PEDRO456',
      role: UserRole.USER,
      kycStatus: KycStatus.PENDING,
      kycSubmittedAt: new Date('2025-01-10T13:00:00Z'), // Enviou documentos mas ainda não foi aprovado
      isActive: true,
    },
  });

  console.log('👥 Usuários criados');

  // Create memberships
  const currentDate = new Date();
  const nextMonth = new Date(currentDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const memberships = [
    { userId: superAdmin.id, status: MembershipStatus.ACTIVE },
    { userId: admin.id, status: MembershipStatus.ACTIVE },
    { userId: support.id, status: MembershipStatus.ACTIVE },
    { userId: financial.id, status: MembershipStatus.ACTIVE },
    { userId: user1.id, status: MembershipStatus.ACTIVE },
    { userId: user2.id, status: MembershipStatus.ACTIVE },
    { userId: user3.id, status: MembershipStatus.INACTIVE },
  ];

  for (const membership of memberships) {
    await prisma.membership.create({
      data: {
        userId: membership.userId,
        status: membership.status,
        monthlyFee: 20.0,
        currentPeriodStart: currentDate,
        currentPeriodEnd: nextMonth,
        nextPaymentDate: nextMonth,
      },
    });
  }

  console.log('💳 Memberships criados');

  // Create investment opportunities
  const opportunity1 = await prisma.investmentOpportunity.create({
    data: {
      title: 'Shopping Center São Paulo',
      description:
        'Oportunidade de investimento em shopping center na região central de São Paulo. Projeto com alta rentabilidade e baixo risco.',
      targetAmount: 500000,
      currentAmount: 350000,
      minInvestment: 1000,
      maxInvestment: 50000,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-09-30'),
      status: InvestmentStatus.ACTIVE,
      expectedReturn: 12.5,
    },
  });

  const opportunity2 = await prisma.investmentOpportunity.create({
    data: {
      title: 'Desenvolvimento Residencial RJ',
      description:
        'Projeto residencial de alto padrão no Rio de Janeiro. Localização privilegiada com vista para o mar.',
      targetAmount: 300000,
      currentAmount: 300000,
      minInvestment: 500,
      maxInvestment: 30000,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-12-31'),
      status: InvestmentStatus.COMPLETED,
      expectedReturn: 15.8,
    },
  });

  const opportunity3 = await prisma.investmentOpportunity.create({
    data: {
      title: 'Centro Comercial Campinas',
      description:
        'Investimento em centro comercial estrategicamente localizado em Campinas, com grande potencial de valorização.',
      targetAmount: 750000,
      currentAmount: 125000,
      minInvestment: 2000,
      maxInvestment: 75000,
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-11-30'),
      status: InvestmentStatus.ACTIVE,
      expectedReturn: 18.3,
    },
  });

  console.log('🎯 Oportunidades de investimento criadas');

  // Create user investments
  await prisma.userInvestment.create({
    data: {
      userId: user1.id,
      opportunityId: opportunity1.id,
      amount: 5000,
    },
  });

  await prisma.userInvestment.create({
    data: {
      userId: user1.id,
      opportunityId: opportunity2.id,
      amount: 10000,
    },
  });

  await prisma.userInvestment.create({
    data: {
      userId: user2.id,
      opportunityId: opportunity1.id,
      amount: 3000,
    },
  });

  await prisma.userInvestment.create({
    data: {
      userId: user2.id,
      opportunityId: opportunity3.id,
      amount: 2000,
    },
  });

  console.log('💰 Investimentos de usuários criados');

  // Create investment returns for completed opportunity
  await prisma.investmentReturn.create({
    data: {
      opportunityId: opportunity2.id,
      investmentId: (await prisma.userInvestment.findFirst({
        where: { userId: user1.id, opportunityId: opportunity2.id },
      }))!.id,
      totalSaleAmount: 360000,
      platformFee: 18000,
      netProfit: 42000,
      userReturnAmount: 1400,
      returnPercentage: 14.0,
    },
  });

  console.log('📈 Retornos de investimento criados');

  // Create transactions
  const transactions = [
    {
      userId: user1.id,
      type: TransactionType.MEMBERSHIP_PAYMENT,
      status: TransactionStatus.COMPLETED,
      amount: 20,
      description: 'Pagamento mensalidade Janeiro 2025',
    },
    {
      userId: user1.id,
      type: TransactionType.INVESTMENT,
      status: TransactionStatus.COMPLETED,
      amount: 5000,
      description: 'Investimento em Shopping Center SP',
    },
    {
      userId: user1.id,
      type: TransactionType.RETURN,
      status: TransactionStatus.COMPLETED,
      amount: 1400,
      description: 'Retorno do investimento Residencial RJ',
    },
    {
      userId: user2.id,
      type: TransactionType.MEMBERSHIP_PAYMENT,
      status: TransactionStatus.COMPLETED,
      amount: 20,
      description: 'Pagamento mensalidade Janeiro 2025',
    },
    {
      userId: user2.id,
      type: TransactionType.REFERRAL_BONUS,
      status: TransactionStatus.COMPLETED,
      amount: 50,
      description: 'Bônus por indicação de Maria Santos',
    },
  ];

  for (const transaction of transactions) {
    await prisma.transaction.create({ data: transaction });
  }

  console.log('💳 Transações criadas');

  // Create support tickets
  const ticket1 = await prisma.supportTicket.create({
    data: {
      userId: user1.id,
      subject: 'Problema com pagamento',
      description:
        'Não consegui efetuar o pagamento da mensalidade. O cartão foi recusado.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
    },
  });

  const ticket2 = await prisma.supportTicket.create({
    data: {
      userId: user2.id,
      subject: 'Dúvida sobre investimento',
      description:
        'Gostaria de saber mais detalhes sobre a oportunidade do Shopping Center.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.MEDIUM,
      assignedTo: support.id,
    },
  });

  const ticket3 = await prisma.supportTicket.create({
    data: {
      userId: user3.id,
      subject: 'Documentos KYC',
      description: 'Preciso de ajuda para enviar os documentos de verificação.',
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.LOW,
      assignedTo: support.id,
    },
  });

  console.log('🎫 Tickets de suporte criados');

  // Create ticket messages
  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket1.id,
      message: 'Olá! Estou com problema no pagamento da mensalidade.',
      isFromUser: true,
      authorId: user1.id,
    },
  });

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket2.id,
      message: 'Gostaria de mais informações sobre os riscos do investimento.',
      isFromUser: true,
      authorId: user2.id,
    },
  });

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket2.id,
      message: 'Olá Maria! Vou te enviar todas as informações por email.',
      isFromUser: false,
      authorId: support.id,
    },
  });

  console.log('💬 Mensagens de tickets criadas');

  // Create notifications
  const notifications = [
    {
      userId: user1.id,
      title: 'Pagamento processado',
      message: 'Seu pagamento de R$ 20,00 foi processado com sucesso.',
      type: 'payment',
    },
    {
      userId: user1.id,
      title: 'Novo retorno disponível',
      message:
        'Você recebeu R$ 1.400,00 de retorno do investimento Residencial RJ.',
      type: 'return',
    },
    {
      userId: user2.id,
      title: 'Bônus de indicação',
      message: 'Você ganhou R$ 50,00 de bônus por indicar um amigo!',
      type: 'bonus',
    },
    {
      userId: user2.id,
      title: 'Ticket respondido',
      message: 'Sua dúvida sobre investimento foi respondida.',
      type: 'support',
    },
    {
      userId: user3.id,
      title: 'Documentos pendentes',
      message:
        'Você ainda precisa enviar seus documentos para verificação KYC.',
      type: 'kyc',
    },
  ];

  for (const notification of notifications) {
    await prisma.notification.create({ data: notification });
  }

  console.log('🔔 Notificações criadas');

  console.log('✅ Seed concluído com sucesso!');
  console.log('');
  console.log('📊 Dados criados:');
  console.log(
    '- 7 usuários (1 Super Admin, 1 Admin, 1 Suporte, 1 Financeiro, 3 Usuários)'
  );
  console.log('- 7 memberships');
  console.log('- 3 oportunidades de investimento');
  console.log('- 4 investimentos de usuários');
  console.log('- 1 retorno de investimento');
  console.log('- 5 transações');
  console.log('- 3 tickets de suporte');
  console.log('- 3 mensagens de tickets');
  console.log('- 5 notificações');
  console.log('');
  console.log('🔑 Credenciais de acesso:');
  console.log('Super Admin: admin@angelssystem.com / 123456');
  console.log('Admin: admin2@angelssystem.com / 123456');
  console.log('Suporte: suporte@angelssystem.com / 123456');
  console.log('Financeiro: financeiro@angelssystem.com / 123456');
  console.log('Usuário 1: joao@email.com / 123456');
  console.log('Usuário 2: maria@email.com / 123456');
  console.log('Usuário 3: pedro@email.com / 123456');
}

main()
  .catch(e => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
