import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test if kycDocument model is available
    console.log('Testing Prisma KycDocument model...');
    
    // Try to count documents (should work even if table is empty)
    const count = await prisma.kycDocument.count();
    
    console.log('KycDocument count:', count);
    
    return NextResponse.json({
      success: true,
      message: 'Prisma KycDocument model is working!',
      count,
      models: {
        kycDocument: typeof prisma.kycDocument,
        kycReview: typeof prisma.kycReview,
        notification: typeof prisma.notification,
      }
    });

  } catch (error) {
    console.error('Prisma test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        models: {
          kycDocument: typeof prisma.kycDocument,
          kycReview: typeof prisma.kycReview,
          notification: typeof prisma.notification,
        }
      },
      { status: 500 }
    );
  }
}
