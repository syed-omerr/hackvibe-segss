export type Track = 'Artificial Intelligence (AI)' | 'Cyber Security' | 'Internet of Things (IOT)' | 'Not specified';

export type Year = '1st Year' | '2nd Year' | '3rd Year' | '4th Year' | 'Postgraduate';

export type Role = 'Leader' | 'Member';

export type AttendanceStatus = 'UNMARKED' | 'PRESENT' | 'ABSENT';

export interface Member {
  id: string;
  team_id: string;
  position: number;
  name: string;
  role: Role;
  college: string;
  branch: string;
  year: Year;
  phone: string | null;
  attendance: AttendanceStatus;
}

export interface Team {
  id: string;
  registration_id: string;
  team_name: string;
  track: Track;
  source: 'portal' | 'import' | 'external';
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  members?: Member[];
  highest_year?: '1ST' | '2ND' | '3RD' | '4TH';
  college_group?: 'VIGNAN' | 'OTHERS';
  is_mixed_year?: boolean;
  is_mixed_college?: boolean;
}

export interface College {
  id: string;
  name: string;
  is_canonical_vignan: number;
}

export interface AuditLogEntry {
  id: string;
  event: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'IMPORT' | 'EXPORT' | 'ATTENDANCE';
  registration_id: string | null;
  actor: string;
  details: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalTeams: number;
  totalMembers: number;
  presentMembers: number;
  absentMembers: number;
  unmarkedMembers: number;
  trackBreakdown: Record<string, number>;
  yearBreakdown: Record<string, number>;
  collegeBreakdown: Record<string, number>;
  recentTeams: Team[];
  lastRegisteredAt: string | null;
  invariants: {
    tracksMatch: boolean;
    yearsMatch: boolean;
    collegesMatch: boolean;
  };
}

export const CANONICAL_VIGNAN = 'Vignan Institute of Technology and Science';

export const TRACK_OPTIONS: Track[] = [
  'Artificial Intelligence (AI)',
  'Cyber Security',
  'Internet of Things (IOT)',
  'Not specified',
];

export const YEAR_OPTIONS: Year[] = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Postgraduate',
];

export const BRANCH_OPTIONS = [
  'CSE',
  'CSE (DS)',
  'CSE (AI&ML)',
  'AIDS',
  'AI&ML',
  'IT',
  'ECE',
  'EEE',
  'EIE',
  'MECH',
  'CIVIL',
  'BCA',
  'Other',
];
