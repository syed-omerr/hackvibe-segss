import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { commitImportTeams, ParsedTeam } from '@/lib/excel-importer';

export async function POST(req: NextRequest) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { teams } = (await req.json()) as { teams: ParsedTeam[] };
    if (!teams || !Array.isArray(teams) || teams.length === 0) {
      return NextResponse.json({ error: 'No teams to import' }, { status: 400 });
    }

    const result = commitImportTeams(teams);
    return NextResponse.json({
      success: true,
      importedCount: result.importedCount,
      membersCount: result.membersCount,
      message: `Successfully imported ${result.importedCount} teams with ${result.membersCount} participants.`,
    });
  } catch (err: any) {
    console.error('Import commit failed:', err);
    return NextResponse.json({ error: err.message || 'Import commit failed' }, { status: 500 });
  }
}
