import { NextRequest, NextResponse } from 'next/server';
import { getAllTeams } from '@/lib/db';
import { getSession } from '@/lib/auth';

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const teams = getAllTeams(false);
    const headers = [
      'Registration ID',
      'Team Name',
      'Track',
      'Member Name',
      'Role',
      'College',
      'Branch',
      'Year',
      'Phone No.',
      'Attendance',
      'Highest Year',
      'College Group',
    ];

    const rows: string[] = [headers.join(',')];

    for (const team of teams) {
      for (const m of team.members || []) {
        rows.push(
          [
            escapeCsv(team.registration_id),
            escapeCsv(team.team_name),
            escapeCsv(team.track),
            escapeCsv(m.name),
            escapeCsv(m.role),
            escapeCsv(m.college),
            escapeCsv(m.branch),
            escapeCsv(m.year),
            escapeCsv(m.phone || 'Not provided'),
            escapeCsv(m.attendance),
            escapeCsv(team.highest_year),
            escapeCsv(team.college_group),
          ].join(',')
        );
      }
    }

    const csvContent = rows.join('\n');
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="HackVibe_Members.csv"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'CSV export failed' }, { status: 500 });
  }
}
