const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrisma() {
  try {
    console.log('Testing Prisma models...');
    
    // Test if models exist
    console.log('kycDocument:', typeof prisma.kycDocument);
    console.log('kycReview:', typeof prisma.kycReview);
    console.log('notification:', typeof prisma.notification);
    
    if (prisma.kycDocument) {
      console.log('✅ kycDocument model is available');
      
      // Try to count documents
      const count = await prisma.kycDocument.count();
      console.log('KycDocument count:', count);
    } else {
      console.log('❌ kycDocument model is NOT available');
    }
    
    if (prisma.notification) {
      console.log('✅ notification model is available');
      
      // Try to count notifications
      const count = await prisma.notification.count();
      console.log('Notification count:', count);
    } else {
      console.log('❌ notification model is NOT available');
    }
    
    console.log('✅ Prisma test completed successfully!');
    
  } catch (error) {
    console.error('❌ Prisma test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();
