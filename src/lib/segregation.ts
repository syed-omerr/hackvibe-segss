import { Member, Team, CANONICAL_VIGNAN, Year } from './types';

// Highest member year rank: 1st < 2nd < 3rd < 4th / PG
const YEAR_RANK: Record<Year, number> = {
  '1st Year': 1,
  '2nd Year': 2,
  '3rd Year': 3,
  '4th Year': 4,
  'Postgraduate': 4,
};

export function getHighestYear(members: Member[]): '1ST' | '2ND' | '3RD' | '4TH' {
  if (!members || members.length === 0) return '1ST';
  let maxRank = 1;
  for (const m of members) {
    const rank = YEAR_RANK[m.year] || 1;
    if (rank > maxRank) {
      maxRank = rank;
    }
  }
  if (maxRank === 1) return '1ST';
  if (maxRank === 2) return '2ND';
  if (maxRank === 3) return '3RD';
  return '4TH';
}

export function getCollegeGroup(members: Member[]): 'VIGNAN' | 'OTHERS' {
  if (!members || members.length === 0) return 'OTHERS';
  // VIGNAN vs OTHERS: decided by the team LEADER's college
  const leader = members.find((m) => m.role === 'Leader') || members[0];
  const collegeName = (leader.college || '').trim();
  return collegeName === CANONICAL_VIGNAN ? 'VIGNAN' : 'OTHERS';
}

export function getTrackSheetName(track: string): 'AI' | 'CS' | 'IOT' | 'NA' {
  const t = (track || '').trim();
  if (t === 'Artificial Intelligence (AI)' || t.toLowerCase() === 'ai') return 'AI';
  if (t === 'Cyber Security' || t.toLowerCase() === 'cs') return 'CS';
  if (t === 'Internet of Things (IOT)' || t.toLowerCase() === 'iot') return 'IOT';
  return 'NA';
}

export function isMixedYear(members: Member[]): boolean {
  if (!members || members.length <= 1) return false;
  const first = members[0].year;
  return members.some((m) => m.year !== first);
}

export function isMixedCollege(members: Member[]): boolean {
  if (!members || members.length <= 1) return false;
  const first = (members[0].college || '').trim().toLowerCase();
  return members.some((m) => (m.college || '').trim().toLowerCase() !== first);
}

export function enrichTeam(team: Team): Team {
  const members = team.members || [];
  return {
    ...team,
    highest_year: getHighestYear(members),
    college_group: getCollegeGroup(members),
    is_mixed_year: isMixedYear(members),
    is_mixed_college: isMixedCollege(members),
  };
}
