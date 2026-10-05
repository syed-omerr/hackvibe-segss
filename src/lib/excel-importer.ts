import ExcelJS from 'exceljs';
import crypto from 'node:crypto';
import { getDb, addCollegeIfNotExists, logAudit } from './db';
import { Track, Year, Role, AttendanceStatus } from './types';
import { enrichTeam, getHighestYear, getCollegeGroup } from './segregation';

export interface ParsedMember {
  name: string;
  role: Role;
  college: string;
  branch: string;
  year: Year;
  phone: string | null;
  attendance: AttendanceStatus;
}

export interface ParsedTeam {
  registration_id: string;
  team_name: string;
  track: Track;
  members: ParsedMember[];
  highest_year?: string;
  college_group?: string;
}

export interface ImportPreviewResult {
  totalTeamsInFile: number;
  totalMembersInFile: number;
  newTeams: ParsedTeam[];
  duplicateTeams: { registration_id: string; team_name: string; reason: string }[];
  trackBreakdown: Record<string, number>;
  yearBreakdown: Record<string, number>;
  collegeBreakdown: Record<string, number>;
  warnings: string[];
}

export async function parseExcelData(workbookOrBuffer: ExcelJS.Workbook | Buffer): Promise<ImportPreviewResult> {
  let wb: ExcelJS.Workbook;
  if (Buffer.isBuffer(workbookOrBuffer)) {
    wb = new ExcelJS.Workbook();
    // @ts-expect-error ExcelJS supports Buffer
    await wb.xlsx.load(workbookOrBuffer);
  } else {
    wb = workbookOrBuffer;
  }

  const ws = wb.getWorksheet('Team Wise');
  if (!ws) {
    throw new Error('Sheet "Team Wise" not found in the uploaded workbook.');
  }

  const teamsMap = new Map<string, ParsedTeam>();
  let currentRegId: string | null = null;
  let currentTeamName: string | null = null;
  let currentTrack: string | null = null;
  let lastCollege = '';
  let lastBranch = '';
  let lastYear = '1st Year';
  const warnings: string[] = [];

  for (let r = 5; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const regIdVal = row.getCell(2).value;
    const teamNameVal = row.getCell(3).value;
    const memberName = row.getCell(4).value;
    const roleVal = row.getCell(5).value;
    const collegeVal = row.getCell(6).value;
    const branchVal = row.getCell(7).value;
    const yearVal = row.getCell(8).value;
    const trackVal = row.getCell(9).value;
    const phoneVal = row.getCell(10).value;
    const attVal = row.getCell(11).value;

    if (!memberName && !regIdVal) continue;

    if (regIdVal) currentRegId = String(regIdVal).trim();
    if (teamNameVal) currentTeamName = String(teamNameVal).trim();
    if (trackVal) currentTrack = String(trackVal).trim();
    if (collegeVal) lastCollege = String(collegeVal).trim();
    if (branchVal) lastBranch = String(branchVal).trim();
    if (yearVal) lastYear = String(yearVal).trim();

    if (!currentRegId) continue;

    if (!teamsMap.has(currentRegId)) {
      teamsMap.set(currentRegId, {
        registration_id: currentRegId,
        team_name: currentTeamName || 'Untitled Team',
        track: (currentTrack as Track) || 'Not specified',
        members: [],
      });
    }

    const team = teamsMap.get(currentRegId)!;
    let cleanPhone = phoneVal ? String(phoneVal).replace(/\D/g, '') : null;
    if (cleanPhone === 'Not provided' || !cleanPhone || cleanPhone.length === 0) {
      cleanPhone = null;
    } else if (cleanPhone.length > 10) {
      // Flag 11-digit or non-standard phone numbers
      warnings.push(`Team ${currentRegId}: Member ${memberName} has non-standard ${cleanPhone.length}-digit phone (${cleanPhone})`);
    }

    let attendance: AttendanceStatus = 'UNMARKED';
    if (attVal) {
      const a = String(attVal).trim().toLowerCase();
      if (a === 'present') attendance = 'PRESENT';
      else if (a === 'absent') attendance = 'ABSENT';
    }

    const rawRole = String(roleVal || '').trim().toLowerCase();
    const role: Role = rawRole === 'leader' ? 'Leader' : 'Member';

    team.members.push({
      name: String(memberName || '').trim(),
      role,
      college: String(collegeVal || lastCollege).trim(),
      branch: String(branchVal || lastBranch).trim(),
      year: (String(yearVal || lastYear).trim() as Year) || '1st Year',
      phone: cleanPhone,
      attendance,
    });
  }

  // Ensure exactly one leader per team
  for (const [id, team] of teamsMap.entries()) {
    const leaderCount = team.members.filter((m) => m.role === 'Leader').length;
    if (leaderCount === 0 && team.members.length > 0) {
      team.members[0].role = 'Leader';
      warnings.push(`Team ${id} had no leader assigned; first member "${team.members[0].name}" was designated as Leader.`);
    } else if (leaderCount > 1) {
      // Keep only first as leader
      let foundFirst = false;
      for (const m of team.members) {
        if (m.role === 'Leader') {
          if (!foundFirst) {
            foundFirst = true;
          } else {
            m.role = 'Member';
          }
        }
      }
    }
  }

  const db = getDb();
  const existingTeams = db.prepare('SELECT registration_id, team_name FROM teams WHERE deleted_at IS NULL').all() as { registration_id: string; team_name: string }[];
  const existingMap = new Map<string, string>();
  for (const e of existingTeams) {
    existingMap.set(e.registration_id, e.team_name);
  }

  const newTeams: ParsedTeam[] = [];
  const duplicateTeams: { registration_id: string; team_name: string; reason: string }[] = [];

  const trackBreakdown: Record<string, number> = {
    'Artificial Intelligence (AI)': 0,
    'Cyber Security': 0,
    'Internet of Things (IOT)': 0,
    'Not specified': 0,
  };
  const yearBreakdown: Record<string, number> = {
    '1ST': 0,
    '2ND': 0,
    '3RD': 0,
    '4TH': 0,
  };
  const collegeBreakdown: Record<string, number> = {
    'VIGNAN': 0,
    'OTHERS': 0,
  };

  let totalMembersInFile = 0;

  for (const team of teamsMap.values()) {
    totalMembersInFile += team.members.length;
    // Derive fields
    team.highest_year = getHighestYear(team.members as any);
    team.college_group = getCollegeGroup(team.members as any);

    trackBreakdown[team.track] = (trackBreakdown[team.track] || 0) + 1;
    yearBreakdown[team.highest_year] = (yearBreakdown[team.highest_year] || 0) + 1;
    collegeBreakdown[team.college_group] = (collegeBreakdown[team.college_group] || 0) + 1;

    if (existingMap.has(team.registration_id)) {
      duplicateTeams.push({
        registration_id: team.registration_id,
        team_name: team.team_name,
        reason: `Registration ID already exists in database (Team: "${existingMap.get(team.registration_id)}")`,
      });
    } else {
      newTeams.push(team);
    }
  }

  return {
    totalTeamsInFile: teamsMap.size,
    totalMembersInFile,
    newTeams,
    duplicateTeams,
    trackBreakdown,
    yearBreakdown,
    collegeBreakdown,
    warnings,
  };
}

export function commitImportTeams(teamsToImport: ParsedTeam[]): { importedCount: number; membersCount: number } {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');

  try {
    const now = new Date().toISOString();
    let importedCount = 0;
    let membersCount = 0;

    for (const t of teamsToImport) {
      const teamId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO teams (id, registration_id, team_name, track, source, version, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, 'import', 1, ?, ?, NULL)
      `).run(teamId, t.registration_id, t.team_name, t.track, now, now);

      t.members.forEach((m, idx) => {
        const memberId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO members (id, team_id, position, name, role, college, branch, year, phone, attendance)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          memberId,
          teamId,
          idx + 1,
          m.name,
          m.role,
          m.college,
          m.branch,
          m.year,
          m.phone,
          m.attendance || 'UNMARKED'
        );

        addCollegeIfNotExists(m.college);
        membersCount++;
      });

      importedCount++;
    }

    logAudit('IMPORT', null, JSON.stringify({ importedTeams: importedCount, importedMembers: membersCount }));
    db.exec('COMMIT');

    return { importedCount, membersCount };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
