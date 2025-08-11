import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { readFile } from 'fs/promises';
import { join } from 'path';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: documentId } = await params;

    // Get document from database
    const document = await prisma.kycDocument.findFirst({
      where: {
        id: documentId,
        userId: session.user.id, // Ensure user can only access their own documents
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    // Read file from filesystem
    try {
      const filePath = join(process.cwd(), 'uploads', document.filePath);
      const fileBuffer = await readFile(filePath);

      // Set appropriate headers
      const headers = new Headers();
      headers.set('Content-Type', document.mimeType);
      headers.set('Content-Length', document.fileSize.toString());
      headers.set('Content-Disposition', `inline; filename="${document.fileName}"`);
      
      // Add cache headers for better performance
      headers.set('Cache-Control', 'private, max-age=3600');
      headers.set('ETag', `"${document.id}"`);

      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers,
      });

    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return NextResponse.json(
        { error: 'Erro ao acessar o arquivo' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Document download API error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
