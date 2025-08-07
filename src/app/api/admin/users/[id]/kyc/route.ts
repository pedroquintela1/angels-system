import { UserRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email';
import { notificationService } from '@/lib/notifications';

// Helper function to get document type name
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Check if user has admin access
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const userId = await params.id;

    // Get user with KYC documents
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        kycDocuments: {
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        kycReviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            document: {
              select: {
                id: true,
                type: true,
                fileName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Group documents by type for easier management
    const documentsByType = user.kycDocuments.reduce((acc, doc) => {
      if (!acc[doc.type]) {
        acc[doc.type] = [];
      }
      acc[doc.type].push(doc);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate KYC completion status
    const requiredDocuments = [
      'IDENTITY_FRONT',
      'IDENTITY_BACK',
      'PROOF_OF_ADDRESS',
      'SELFIE_WITH_DOCUMENT',
    ];

    const completedDocuments = requiredDocuments.filter(type => 
      documentsByType[type]?.some(doc => doc.status === 'APPROVED')
    );

    const kycProgress = {
      completed: completedDocuments.length,
      total: requiredDocuments.length,
      percentage: Math.round((completedDocuments.length / requiredDocuments.length) * 100),
      isComplete: completedDocuments.length === requiredDocuments.length,
    };

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        kycStatus: user.kycStatus,
        kycSubmittedAt: user.kycSubmittedAt,
        kycApprovedAt: user.kycApprovedAt,
        kycRejectedAt: user.kycRejectedAt,
        kycRejectionReason: user.kycRejectionReason,
      },
      documents: user.kycDocuments,
      documentsByType,
      reviews: user.kycReviews,
      progress: kycProgress,
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get KYC documents API error:', error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Check if user has admin access
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const userId = await params.id;
    const body = await request.json();
    const { documentId, action, comment } = body;

    if (!documentId || !action) {
      return NextResponse.json(
        { error: 'ID do documento e ação são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['APPROVED', 'REJECTED', 'RESUBMIT'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Ação inválida' },
        { status: 400 }
      );
    }

    // Check if document exists and belongs to the user
    const document = await prisma.kycDocument.findFirst({
      where: {
        id: documentId,
        userId: userId,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    // Update document status
    const updatedDocument = await prisma.kycDocument.update({
      where: { id: documentId },
      data: {
        status: action,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        rejectionReason: action === 'REJECTED' || action === 'RESUBMIT' ? comment : null,
        notes: comment,
      },
    });

    // Create review record
    await prisma.kycReview.create({
      data: {
        userId: userId,
        documentId: documentId,
        reviewerId: session.user.id,
        action: action,
        comment: comment,
      },
    });

    // Check if all required documents are approved to update user KYC status
    const userDocuments = await prisma.kycDocument.findMany({
      where: { userId: userId },
    });

    const requiredDocuments = [
      'IDENTITY_FRONT',
      'IDENTITY_BACK', 
      'PROOF_OF_ADDRESS',
      'SELFIE_WITH_DOCUMENT',
    ];

    const approvedRequiredDocs = requiredDocuments.filter(type =>
      userDocuments.some(doc => doc.type === type && doc.status === 'APPROVED')
    );

    let newKycStatus = 'PENDING';
    let kycApprovedAt = null;
    let kycRejectedAt = null;

    if (approvedRequiredDocs.length === requiredDocuments.length) {
      newKycStatus = 'APPROVED';
      kycApprovedAt = new Date();
    } else if (userDocuments.some(doc => doc.status === 'REJECTED')) {
      newKycStatus = 'REJECTED';
      kycRejectedAt = new Date();
    }

    // Get user information for notifications
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        kycStatus: true
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Update user KYC status if changed
    if (user.kycStatus !== newKycStatus) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: newKycStatus,
          kycApprovedAt,
          kycRejectedAt,
        },
      });
    }

    // Send notifications
    const documentTypeName = getDocumentTypeName(document.type);
    const userName = `${user.firstName} ${user.lastName}`;

    try {
      // Send email notification
      if (action === 'APPROVED') {
        await emailService.sendKycDocumentApproved(user.email, userName, documentTypeName);
        await notificationService.createKycNotification(userId, 'APPROVED', documentTypeName);
      } else if (action === 'REJECTED') {
        await emailService.sendKycDocumentRejected(user.email, userName, documentTypeName, comment || 'Documento não atende aos requisitos');
        await notificationService.createKycNotification(userId, 'REJECTED', documentTypeName, comment);
      } else if (action === 'RESUBMIT') {
        await emailService.sendKycDocumentResubmit(user.email, userName, documentTypeName, comment || 'Por favor, reenvie o documento');
        await notificationService.createKycNotification(userId, 'RESUBMIT', documentTypeName, undefined, comment);
      }

      // Send KYC complete notification if all documents are approved
      if (newKycStatus === 'APPROVED' && user.kycStatus !== 'APPROVED') {
        await emailService.sendKycCompleteApproval(user.email, userName);
        await notificationService.createKycNotification(userId, 'COMPLETE');
      }
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      message: 'Documento revisado com sucesso',
      document: updatedDocument,
      userKycStatus: newKycStatus,
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Review KYC document API error:', error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
