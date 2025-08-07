import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'application/pdf',
];

const DOCUMENT_TYPES = [
  'IDENTITY_FRONT',
  'IDENTITY_BACK',
  'CPF_DOCUMENT',
  'PROOF_OF_ADDRESS',
  'SELFIE_WITH_DOCUMENT',
  'INCOME_PROOF',
  'BANK_STATEMENT',
  'OTHER',
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
        { status: 400 }
      );
    }

    if (!documentType || !DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json(
        { error: 'Tipo de documento inválido' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 10MB.' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou PDF.' },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads', 'kyc', session.user.id);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${documentType}_${timestamp}.${extension}`;
    const filePath = join(uploadDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Check if user already has this document type
    const existingDocument = await prisma.kycDocument.findFirst({
      where: {
        userId: session.user.id,
        type: documentType,
        status: {
          in: ['PENDING', 'APPROVED'],
        },
      },
    });

    // If exists and is approved, don't allow reupload
    if (existingDocument && existingDocument.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Este documento já foi aprovado' },
        { status: 400 }
      );
    }

    // If exists and is pending, update it
    if (existingDocument && existingDocument.status === 'PENDING') {
      const updatedDocument = await prisma.kycDocument.update({
        where: { id: existingDocument.id },
        data: {
          fileName: file.name,
          filePath: `/uploads/kyc/${session.user.id}/${fileName}`,
          fileSize: file.size,
          mimeType: file.type,
          status: 'PENDING',
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
          notes: null,
        },
      });

      return NextResponse.json({
        message: 'Documento atualizado com sucesso',
        document: updatedDocument,
      });
    }

    // Create new document record
    const document = await prisma.kycDocument.create({
      data: {
        userId: session.user.id,
        type: documentType,
        fileName: file.name,
        filePath: `/uploads/kyc/${session.user.id}/${fileName}`,
        fileSize: file.size,
        mimeType: file.type,
        status: 'PENDING',
      },
    });

    // Update user KYC submitted timestamp
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        kycSubmittedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Documento enviado com sucesso',
      document,
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Upload KYC document API error:', error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Get user's KYC documents
    console.log('Testing prisma.kycDocument:', typeof prisma.kycDocument);

    if (!prisma.kycDocument) {
      console.error('prisma.kycDocument is undefined!');
      return NextResponse.json(
        { error: 'Prisma KycDocument model not available' },
        { status: 500 }
      );
    }

    const documents = await prisma.kycDocument.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get user's KYC reviews
    const reviews = await prisma.kycReview.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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
    });

    // Calculate progress
    const requiredDocuments = [
      'IDENTITY_FRONT',
      'IDENTITY_BACK',
      'PROOF_OF_ADDRESS',
      'SELFIE_WITH_DOCUMENT',
    ];

    const documentsByType = documents.reduce((acc, doc) => {
      if (!acc[doc.type]) {
        acc[doc.type] = [];
      }
      acc[doc.type].push(doc);
      return acc;
    }, {} as Record<string, any[]>);

    const completedDocuments = requiredDocuments.filter(type => 
      documentsByType[type]?.some(doc => doc.status === 'APPROVED')
    );

    const progress = {
      completed: completedDocuments.length,
      total: requiredDocuments.length,
      percentage: Math.round((completedDocuments.length / requiredDocuments.length) * 100),
      isComplete: completedDocuments.length === requiredDocuments.length,
    };

    return NextResponse.json({
      documents,
      documentsByType,
      reviews,
      progress,
      requiredDocuments,
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
