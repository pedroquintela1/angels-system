import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface BankStatement {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance: number;
  reference?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 400 }
      );
    }

    const fileContent = await file.text();
    const statements = await parseStatementFile(file.name, fileContent);

    return NextResponse.json({
      message: 'Extrato processado com sucesso',
      statements,
      count: statements.length,
    });
  } catch (error) {
    console.error('Upload statement error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function parseStatementFile(
  filename: string,
  content: string
): Promise<BankStatement[]> {
  const extension = filename.toLowerCase().split('.').pop();

  switch (extension) {
    case 'csv':
      return parseCSV(content);
    case 'ofx':
      return parseOFX(content);
    default:
      throw new Error('Formato de arquivo não suportado');
  }
}

function parseCSV(content: string): BankStatement[] {
  const lines = content.split('\n').filter(line => line.trim());
  const statements: BankStatement[] = [];

  // Skip header if present
  const startIndex =
    lines[0].toLowerCase().includes('data') ||
    lines[0].toLowerCase().includes('date')
      ? 1
      : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));

    if (columns.length >= 4) {
      // Assume format: Date, Description, Amount, Balance
      // You may need to adjust this based on your bank's CSV format
      const date = parseDate(columns[0]);
      const description = columns[1] || 'Transação bancária';
      const amount = parseFloat(columns[2].replace(/[^\d.-]/g, ''));
      const balance = parseFloat(columns[3]?.replace(/[^\d.-]/g, '') || '0');

      if (!isNaN(amount) && date) {
        statements.push({
          id: `csv-${i}-${Date.now()}`,
          date: date.toISOString(),
          description,
          amount,
          type: amount >= 0 ? 'credit' : 'debit',
          balance,
          reference: `CSV-${i}`,
        });
      }
    }
  }

  return statements;
}

function parseOFX(content: string): BankStatement[] {
  const statements: BankStatement[] = [];

  // Simple OFX parsing - this is a basic implementation
  // In production, you'd want to use a proper OFX parser library
  const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  const matches = content.match(transactionRegex);

  if (matches) {
    matches.forEach((match, index) => {
      const trnType = extractOFXValue(match, 'TRNTYPE');
      const dtPosted = extractOFXValue(match, 'DTPOSTED');
      const trnAmt = extractOFXValue(match, 'TRNAMT');
      const fitId = extractOFXValue(match, 'FITID');
      const memo =
        extractOFXValue(match, 'MEMO') ||
        extractOFXValue(match, 'NAME') ||
        'Transação bancária';

      if (dtPosted && trnAmt) {
        const date = parseOFXDate(dtPosted);
        const amount = parseFloat(trnAmt);

        if (date && !isNaN(amount)) {
          statements.push({
            id: fitId || `ofx-${index}-${Date.now()}`,
            date: date.toISOString(),
            description: memo,
            amount,
            type: amount >= 0 ? 'credit' : 'debit',
            balance: 0, // OFX doesn't always include running balance
            reference: fitId || undefined,
          });
        }
      }
    });
  }

  return statements;
}

function extractOFXValue(content: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<]*)`);
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

function parseOFXDate(dateStr: string): Date | null {
  // OFX dates are typically in YYYYMMDD or YYYYMMDDHHMMSS format
  const cleanDate = dateStr.replace(/[^\d]/g, '');

  if (cleanDate.length >= 8) {
    const year = parseInt(cleanDate.substring(0, 4));
    const month = parseInt(cleanDate.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(cleanDate.substring(6, 8));

    return new Date(year, month, day);
  }

  return null;
}

function parseDate(dateStr: string): Date | null {
  // Try common date formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // YYYY-MM-DD
        return new Date(
          parseInt(match[1]),
          parseInt(match[2]) - 1,
          parseInt(match[3])
        );
      } else {
        // Assume DD/MM/YYYY format for Brazilian dates
        return new Date(
          parseInt(match[3]),
          parseInt(match[2]) - 1,
          parseInt(match[1])
        );
      }
    }
  }

  // Fallback to built-in Date parsing
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}
