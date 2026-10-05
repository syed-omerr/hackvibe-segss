import { NextRequest, NextResponse } from 'next/server';
import { getAllTeams, logAudit } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generateHackVibeWorkbook } from '@/lib/excel-generator';

function getISTDateString(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const yyyy = istDate.getUTCFullYear();
  const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getUTCDate()).padStart(2, '0');
  const hh = String(istDate.getUTCHours()).padStart(2, '0');
  const min = String(istDate.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}`;
}

export async function GET(req: NextRequest) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const track = searchParams.get('track') || undefined;
    const year = searchParams.get('year') || undefined;
    const college = searchParams.get('college') || undefined;

    // Fetch active teams with optional filter
    const teams = getAllTeams(false, { track, year, college });

    const buffer = await generateHackVibeWorkbook(teams);
    const filename = `HackVibe_Registration_Details_${getISTDateString()}.xlsx`;

    logAudit('EXPORT', null, `Exported ${teams.length} teams to Excel`);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    console.error('Export failed:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
