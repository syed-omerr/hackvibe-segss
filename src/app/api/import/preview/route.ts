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
        // Read local baseline file Hackathon Registration Details.xlsx or fallback to bundled json
        const baselinePath = path.join(process.cwd(), 'Hackathon Registration Details.xlsx');
        if (fs.existsSync(baselinePath)) {
          const buffer = fs.readFileSync(baselinePath);
          const preview = await parseExcelData(buffer);
          return NextResponse.json({ success: true, preview });
        }

        // Fallback to bundled baseline-seed.json (useful in Vercel lambda)
        const baselineData = require('@/lib/baseline-seed.json');
        const trackBreakdown: Record<string, number> = {
          'Artificial Intelligence (AI)': 176,
          'Cyber Security': 26,
          'Internet of Things (IOT)': 8,
          'Not specified': 4,
        };
        const yearBreakdown: Record<string, number> = {
          '1ST': 12,
          '2ND': 83,
          '3RD': 105,
          '4TH': 14,
        };
        const collegeBreakdown: Record<string, number> = {
          'VIGNAN': 145,
          'OTHERS': 69,
        };
        const totalMembers = baselineData.reduce((acc: number, t: any) => acc + (t.members?.length || 0), 0);

        return NextResponse.json({
          success: true,
          preview: {
            totalTeamsInFile: baselineData.length,
            totalMembersInFile: totalMembers,
            newTeams: baselineData,
            duplicateTeams: [],
            trackBreakdown,
            yearBreakdown,
            collegeBreakdown,
            warnings: [],
          },
        });
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
