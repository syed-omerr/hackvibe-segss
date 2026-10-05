import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  Team,
  Member,
  College,
  AuditLogEntry,
  DashboardStats,
  CANONICAL_VIGNAN,
  AttendanceStatus,
} from './types';
import { enrichTeam, getHighestYear, getCollegeGroup } from './segregation';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  let dbPath = process.env.SQLITE_PATH;
  if (!dbPath) {
    const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    let dataDir = '/tmp';
    if (!isVercel) {
      const localDataDir = path.join(process.cwd(), 'data');
      try {
        if (!fs.existsSync(/* turbopackIgnore: true */ localDataDir)) {
          fs.mkdirSync(localDataDir, { recursive: true });
        }
        dataDir = localDataDir;
      } catch {
        dataDir = '/tmp';
      }
    }
    dbPath = path.join(dataDir, 'hackvibe.db');
  }

  const db = new DatabaseSync(dbPath);

  // Pragmas
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // Initialize Schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      registration_id TEXT UNIQUE NOT NULL,
      team_name TEXT NOT NULL,
      track TEXT NOT NULL,
      source TEXT DEFAULT 'portal',
      version INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      college TEXT NOT NULL,
      branch TEXT NOT NULL,
      year TEXT NOT NULL,
      phone TEXT,
      attendance TEXT DEFAULT 'UNMARKED',
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS colleges (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      is_canonical_vignan INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      event TEXT NOT NULL,
      registration_id TEXT,
      actor TEXT NOT NULL DEFAULT 'Admin',
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS id_counter (
      key TEXT PRIMARY KEY,
      last_val INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_members_team_id ON members(team_id);
    CREATE INDEX IF NOT EXISTS idx_teams_reg_id ON teams(registration_id);
    CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON teams(deleted_at);
  `);

  // Ensure default canonical college
  try {
    const checkCollege = db.prepare('SELECT id FROM colleges WHERE name = ?').get(CANONICAL_VIGNAN);
    if (!checkCollege) {
      db.prepare('INSERT INTO colleges (id, name, is_canonical_vignan) VALUES (?, ?, 1)').run(
        crypto.randomUUID(),
        CANONICAL_VIGNAN
      );
    }
  } catch (e) {
    console.error('Error inserting canonical college:', e);
  }

  // Ensure id_counter initialized
  try {
    const counter = db.prepare('SELECT last_val FROM id_counter WHERE key = ?').get('hv2_seq');
    if (!counter) {
      db.prepare('INSERT INTO id_counter (key, last_val) VALUES (?, ?)').run('hv2_seq', 1000);
    }
  } catch (e) {
    console.error('Error initializing id_counter:', e);
  }

  // Auto-seed baseline data if database is fresh / empty (e.g. on Vercel)
  try {
    const teamCountRow = db.prepare('SELECT count(*) as count FROM teams WHERE deleted_at IS NULL').get() as { count: number } | undefined;
    if (!teamCountRow || teamCountRow.count === 0) {
      const baselineData = require('./baseline-seed.json');
      if (Array.isArray(baselineData) && baselineData.length > 0) {
        db.exec('BEGIN IMMEDIATE');
        const now = new Date().toISOString();
        for (const t of baselineData) {
          const teamId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO teams (id, registration_id, team_name, track, source, version, created_at, updated_at, deleted_at)
            VALUES (?, ?, ?, ?, 'import', 1, ?, ?, NULL)
          `).run(teamId, t.registration_id, t.team_name, t.track, now, now);

          t.members.forEach((m: any, idx: number) => {
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

            // Add college
            const isVignan = m.college.trim() === CANONICAL_VIGNAN ? 1 : 0;
            try {
              db.prepare('INSERT OR IGNORE INTO colleges (id, name, is_canonical_vignan) VALUES (?, ?, ?)').run(
                crypto.randomUUID(),
                m.college.trim(),
                isVignan
              );
            } catch {}
          });
        }
        db.prepare(
          'INSERT INTO audit_log (id, event, registration_id, actor, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(crypto.randomUUID(), 'IMPORT', null, 'System', `Auto-seeded ${baselineData.length} baseline teams`, now);
        db.exec('COMMIT');
      }
    }
  } catch (seedErr) {
    console.error('Auto-seed check error:', seedErr);
  }

  dbInstance = db;
  return dbInstance;
}

export function getNextRegistrationId(): string {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    // Look for max sequence or counter
    const row = db.prepare('SELECT last_val FROM id_counter WHERE key = ?').get('hv2_seq') as { last_val: number } | undefined;
    const currentVal = row ? row.last_val : 1000;
    const nextVal = currentVal + 1;

    db.prepare('UPDATE id_counter SET last_val = ? WHERE key = ?').run(nextVal, 'hv2_seq');
    db.exec('COMMIT');

    const padded = String(nextVal).padStart(4, '0');
    return `HV2-2026-OCT-${padded}`;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function logAudit(
  event: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'IMPORT' | 'EXPORT' | 'ATTENDANCE',
  registrationId: string | null,
  details: string | null,
  actor = 'Admin'
) {
  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO audit_log (id, event, registration_id, actor, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(crypto.randomUUID(), event, registrationId, actor, details, new Date().toISOString());
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

export function getAllTeams(
  includeDeleted = false,
  filters?: {
    search?: string;
    track?: string;
    year?: string;
    college?: string;
    attendance?: string;
  }
): Team[] {
  const db = getDb();

  let teamSql = 'SELECT * FROM teams';
  const params: unknown[] = [];

  if (!includeDeleted) {
    teamSql += ' WHERE deleted_at IS NULL';
  }

  teamSql += ' ORDER BY created_at DESC';

  const rawTeams = db.prepare(teamSql).all() as unknown as Team[];
  if (rawTeams.length === 0) return [];

  // Fetch all members for these teams
  const membersSql = 'SELECT * FROM members ORDER BY position ASC';
  const allMembers = db.prepare(membersSql).all() as unknown as Member[];

  const membersByTeam = new Map<string, Member[]>();
  for (const m of allMembers) {
    if (!membersByTeam.has(m.team_id)) {
      membersByTeam.set(m.team_id, []);
    }
    membersByTeam.get(m.team_id)!.push(m);
  }

  let enriched = rawTeams.map((t) => {
    const members = membersByTeam.get(t.id) || [];
    return enrichTeam({ ...t, members });
  });

  // Apply in-memory filters for derived fields
  if (filters) {
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      enriched = enriched.filter((t) => {
        const teamMatch =
          t.team_name.toLowerCase().includes(q) ||
          t.registration_id.toLowerCase().includes(q) ||
          t.track.toLowerCase().includes(q);
        const memberMatch = (t.members || []).some(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.college.toLowerCase().includes(q) ||
            (m.phone && m.phone.includes(q))
        );
        return teamMatch || memberMatch;
      });
    }

    if (filters.track && filters.track !== 'ALL') {
      enriched = enriched.filter((t) => t.track === filters.track);
    }

    if (filters.year && filters.year !== 'ALL') {
      enriched = enriched.filter((t) => t.highest_year === filters.year);
    }

    if (filters.college && filters.college !== 'ALL') {
      enriched = enriched.filter((t) => t.college_group === filters.college);
    }

    if (filters.attendance && filters.attendance !== 'ALL') {
      enriched = enriched.filter((t) => {
        const members = t.members || [];
        if (filters.attendance === 'PRESENT') {
          return members.some((m) => m.attendance === 'PRESENT');
        }
        if (filters.attendance === 'ABSENT') {
          return members.some((m) => m.attendance === 'ABSENT');
        }
        if (filters.attendance === 'UNMARKED') {
          return members.some((m) => m.attendance === 'UNMARKED');
        }
        return true;
      });
    }
  }

  return enriched;
}

export function getTeamById(id: string): Team | null {
  const db = getDb();
  const rawTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as unknown as Team | undefined;
  if (!rawTeam) return null;

  const members = db.prepare('SELECT * FROM members WHERE team_id = ? ORDER BY position ASC').all(id) as unknown as Member[];
  return enrichTeam({ ...rawTeam, members });
}

export function getTeamByRegistrationId(regId: string): Team | null {
  const db = getDb();
  const rawTeam = db.prepare('SELECT * FROM teams WHERE registration_id = ?').get(regId) as unknown as Team | undefined;
  if (!rawTeam) return null;

  const members = db.prepare('SELECT * FROM members WHERE team_id = ? ORDER BY position ASC').all(rawTeam.id) as unknown as Member[];
  return enrichTeam({ ...rawTeam, members });
}

export function findExistingPhone(phone: string, excludeTeamId?: string): { team_name: string; registration_id: string } | null {
  if (!phone) return null;
  const db = getDb();
  let sql = `
    SELECT t.team_name, t.registration_id 
    FROM members m 
    JOIN teams t ON m.team_id = t.id 
    WHERE m.phone = ? AND t.deleted_at IS NULL
  `;
  const params: any[] = [phone];
  if (excludeTeamId) {
    sql += ' AND t.id != ?';
    params.push(excludeTeamId);
  }
  const match = db.prepare(sql).get(...params) as { team_name: string; registration_id: string } | undefined;
  return match || null;
}

export function findExistingTeamName(name: string, excludeTeamId?: string): { registration_id: string } | null {
  if (!name) return null;
  const db = getDb();
  let sql = 'SELECT registration_id FROM teams WHERE LOWER(TRIM(team_name)) = LOWER(TRIM(?)) AND deleted_at IS NULL';
  const params: any[] = [name];
  if (excludeTeamId) {
    sql += ' AND id != ?';
    params.push(excludeTeamId);
  }
  const match = db.prepare(sql).get(...params) as { registration_id: string } | undefined;
  return match || null;
}

export function createTeam(
  teamData: {
    team_name: string;
    track: string;
    registration_id?: string;
    source?: 'portal' | 'import' | 'external';
  },
  membersData: Array<{
    name: string;
    role: 'Leader' | 'Member';
    college: string;
    branch: string;
    year: string;
    phone: string | null;
    attendance?: AttendanceStatus;
  }>
): Team {
  const db = getDb();
  const regId = teamData.registration_id?.trim() || getNextRegistrationId();
  const teamId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE');

  try {
    // Check duplicate reg ID
    const existing = db.prepare('SELECT id FROM teams WHERE registration_id = ?').get(regId);
    if (existing) {
      throw new Error(`Registration ID ${regId} already exists`);
    }

    db.prepare(`
      INSERT INTO teams (id, registration_id, team_name, track, source, version, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, NULL)
    `).run(
      teamId,
      regId,
      teamData.team_name.trim(),
      teamData.track,
      teamData.source || 'portal',
      now,
      now
    );

    const insertedMembers: Member[] = [];
    membersData.forEach((m, idx) => {
      const memberId = crypto.randomUUID();
      const attendance = m.attendance || 'UNMARKED';
      db.prepare(`
        INSERT INTO members (id, team_id, position, name, role, college, branch, year, phone, attendance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        memberId,
        teamId,
        idx + 1,
        m.name.trim(),
        m.role,
        m.college.trim(),
        m.branch.trim(),
        m.year.trim(),
        m.phone?.trim() || null,
        attendance
      );

      // Auto record college in reference table
      addCollegeIfNotExists(m.college.trim());

      insertedMembers.push({
        id: memberId,
        team_id: teamId,
        position: idx + 1,
        name: m.name.trim(),
        role: m.role,
        college: m.college.trim(),
        branch: m.branch.trim(),
        year: m.year as any,
        phone: m.phone?.trim() || null,
        attendance,
      });
    });

    logAudit('CREATE', regId, JSON.stringify({ team_name: teamData.team_name, memberCount: membersData.length }));

    db.exec('COMMIT');

    const createdTeam: Team = {
      id: teamId,
      registration_id: regId,
      team_name: teamData.team_name.trim(),
      track: teamData.track as any,
      source: teamData.source || 'portal',
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      members: insertedMembers,
    };

    return enrichTeam(createdTeam);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function updateTeam(
  teamId: string,
  teamData: {
    team_name: string;
    track: string;
  },
  membersData: Array<{
    id?: string;
    name: string;
    role: 'Leader' | 'Member';
    college: string;
    branch: string;
    year: string;
    phone: string | null;
    attendance?: AttendanceStatus;
  }>,
  expectedVersion?: number
): Team {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');

  try {
    const current = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as unknown as Team | undefined;
    if (!current) {
      throw new Error('Team not found');
    }

    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new Error('CONFLICT: This record has been updated by another user. Please reload and try again.');
    }

    const now = new Date().toISOString();
    const newVersion = current.version + 1;

    db.prepare(`
      UPDATE teams 
      SET team_name = ?, track = ?, version = ?, updated_at = ?
      WHERE id = ?
    `).run(teamData.team_name.trim(), teamData.track, newVersion, now, teamId);

    // Delete existing members and replace
    db.prepare('DELETE FROM members WHERE team_id = ?').run(teamId);

    const insertedMembers: Member[] = [];
    membersData.forEach((m, idx) => {
      const memberId = m.id || crypto.randomUUID();
      const attendance = m.attendance || 'UNMARKED';
      db.prepare(`
        INSERT INTO members (id, team_id, position, name, role, college, branch, year, phone, attendance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        memberId,
        teamId,
        idx + 1,
        m.name.trim(),
        m.role,
        m.college.trim(),
        m.branch.trim(),
        m.year.trim(),
        m.phone?.trim() || null,
        attendance
      );

      addCollegeIfNotExists(m.college.trim());

      insertedMembers.push({
        id: memberId,
        team_id: teamId,
        position: idx + 1,
        name: m.name.trim(),
        role: m.role,
        college: m.college.trim(),
        branch: m.branch.trim(),
        year: m.year as any,
        phone: m.phone?.trim() || null,
        attendance,
      });
    });

    logAudit('UPDATE', current.registration_id, JSON.stringify({ version: newVersion }));
    db.exec('COMMIT');

    const updatedTeam: Team = {
      ...current,
      team_name: teamData.team_name.trim(),
      track: teamData.track as any,
      version: newVersion,
      updated_at: now,
      members: insertedMembers,
    };

    return enrichTeam(updatedTeam);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function softDeleteTeam(id: string): boolean {
  const db = getDb();
  const current = db.prepare('SELECT registration_id FROM teams WHERE id = ? AND deleted_at IS NULL').get(id) as { registration_id: string } | undefined;
  if (!current) return false;

  const now = new Date().toISOString();
  db.prepare('UPDATE teams SET deleted_at = ? WHERE id = ?').run(now, id);
  logAudit('DELETE', current.registration_id, 'Soft deleted');
  return true;
}

export function restoreTeam(id: string): boolean {
  const db = getDb();
  const current = db.prepare('SELECT registration_id FROM teams WHERE id = ? AND deleted_at IS NOT NULL').get(id) as { registration_id: string } | undefined;
  if (!current) return false;

  db.prepare('UPDATE teams SET deleted_at = NULL WHERE id = ?').run(id);
  logAudit('RESTORE', current.registration_id, 'Restored');
  return true;
}

export function updateMemberAttendance(memberId: string, status: AttendanceStatus): boolean {
  const db = getDb();
  const member = db.prepare('SELECT m.name, t.registration_id FROM members m JOIN teams t ON m.team_id = t.id WHERE m.id = ?').get(memberId) as { name: string; registration_id: string } | undefined;
  if (!member) return false;

  db.prepare('UPDATE members SET attendance = ? WHERE id = ?').run(status, memberId);
  logAudit('ATTENDANCE', member.registration_id, `${member.name}: ${status}`);
  return true;
}

export function addCollegeIfNotExists(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const db = getDb();
  const isVignan = trimmed === CANONICAL_VIGNAN ? 1 : 0;
  try {
    db.prepare('INSERT OR IGNORE INTO colleges (id, name, is_canonical_vignan) VALUES (?, ?, ?)').run(
      crypto.randomUUID(),
      trimmed,
      isVignan
    );
  } catch {
    // Ignore duplicate
  }
}

export function getColleges(): College[] {
  const db = getDb();
  return db.prepare('SELECT * FROM colleges ORDER BY name ASC').all() as unknown as College[];
}

export function getAuditLogs(limit = 100): AuditLogEntry[] {
  const db = getDb();
  return db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?').all(limit) as unknown as AuditLogEntry[];
}

export function getDashboardStats(): DashboardStats {
  const activeTeams = getAllTeams(false);
  const totalTeams = activeTeams.length;

  let totalMembers = 0;
  let presentMembers = 0;
  let absentMembers = 0;
  let unmarkedMembers = 0;

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

  for (const t of activeTeams) {
    trackBreakdown[t.track] = (trackBreakdown[t.track] || 0) + 1;

    const highestYear = t.highest_year || '1ST';
    yearBreakdown[highestYear] = (yearBreakdown[highestYear] || 0) + 1;

    const colGroup = t.college_group || 'OTHERS';
    collegeBreakdown[colGroup] = (collegeBreakdown[colGroup] || 0) + 1;

    for (const m of t.members || []) {
      totalMembers++;
      if (m.attendance === 'PRESENT') presentMembers++;
      else if (m.attendance === 'ABSENT') absentMembers++;
      else unmarkedMembers++;
    }
  }

  const tracksSum = Object.values(trackBreakdown).reduce((a, b) => a + b, 0);
  const yearsSum = Object.values(yearBreakdown).reduce((a, b) => a + b, 0);
  const collegesSum = Object.values(collegeBreakdown).reduce((a, b) => a + b, 0);

  const recentTeams = activeTeams.slice(0, 5);
  const lastRegisteredAt = activeTeams.length > 0 ? activeTeams[0].created_at : null;

  return {
    totalTeams,
    totalMembers,
    presentMembers,
    absentMembers,
    unmarkedMembers,
    trackBreakdown,
    yearBreakdown,
    collegeBreakdown,
    recentTeams,
    lastRegisteredAt,
    invariants: {
      tracksMatch: tracksSum === totalTeams,
      yearsMatch: yearsSum === totalTeams,
      collegesMatch: collegesSum === totalTeams,
    },
  };
}
