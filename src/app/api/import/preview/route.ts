import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { getSession } from '@/lib/auth';
import { parseExcelData } from '@/lib/excel-importer';

export async function POST(req: NextRequest) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (body.useBaseline) {
        // Read local baseline file Hackathon Registration Details.xlsx
        const baselinePath = path.join(process.cwd(), 'Hackathon Registration Details.xlsx');
        if (!fs.existsSync(baselinePath)) {
          return NextResponse.json({ error: 'Baseline file not found on server' }, { status: 404 });
        }
        const buffer = fs.readFileSync(baselinePath);
        const preview = await parseExcelData(buffer);
        return NextResponse.json({ success: true, preview });
      }
    }

    // Form data upload
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const preview = await parseExcelData(buffer);

    return NextResponse.json({ success: true, preview });
  } catch (err: any) {
    console.error('Import preview failed:', err);
    return NextResponse.json({ error: err.message || 'Import preview failed' }, { status: 500 });
  }
}
