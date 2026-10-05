import ExcelJS from 'exceljs';
import { Team, Member, CANONICAL_VIGNAN } from './types';
import { getTrackSheetName } from './segregation';

// Spreadsheet injection protection (NFR-SEC-6)
function sanitizeText(val: string | null | undefined): string {
  if (!val) return '';
  const str = String(val).trim();
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
    return `'${str}`;
  }
  return str;
}

interface TeamWiseRowMapping {
  teamId: string;
  startRow: number;
  endRow: number;
}

export async function generateHackVibeWorkbook(teams: Team[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HackVibe Registration Portal';
  wb.lastModifiedBy = 'HackVibe Admin';
  wb.created = new Date();
  wb.modified = new Date();

  // 1. Group teams by Track for Team Wise and Team Evaluation
  // Preferred track order
  const trackOrder: Record<string, number> = {
    'Artificial Intelligence (AI)': 1,
    'Cyber Security': 2,
    'Internet of Things (IOT)': 3,
    'Not specified': 4,
  };

  const sortedTeams = [...teams].sort((a, b) => {
    const orderA = trackOrder[a.track] || 99;
    const orderB = trackOrder[b.track] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.registration_id.localeCompare(b.registration_id);
  });

  const teamWiseMappings: TeamWiseRowMapping[] = [];

  // ==========================================
  // SHEET 1: Team Wise
  // ==========================================
  const wsTeamWise = wb.addWorksheet('Team Wise', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  // Title & Instructions
  wsTeamWise.mergeCells('A1:K1');
  const titleCell1 = wsTeamWise.getCell('A1');
  titleCell1.value = 'Hackathon – Team-wise Participant List (Attendance & Evaluation)';
  titleCell1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1F4E79' } };
  titleCell1.alignment = { vertical: 'middle', horizontal: 'left' };
  wsTeamWise.getRow(1).height = 28;

  wsTeamWise.mergeCells('A2:K2');
  const subCell1 = wsTeamWise.getCell('A2');
  subCell1.value =
    'Each team appears once (merged S.No / ID / Team Name / Track, and College/Branch/Year where identical). Teams are grouped by Track (alternate shading per team, thick line between teams). Fill the yellow Attendance column using the dropdown (Present / Absent).';
  subCell1.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF595959' } };
  subCell1.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  wsTeamWise.getRow(2).height = 26;

  // Header at Row 4
  const twHeaders = [
    'S.No',
    'Registration ID',
    'Team Name',
    'Team Member Name',
    'Role',
    'College',
    'Branch',
    'Year',
    'Track',
    'Phone No.',
    'Attendance',
  ];
  const twHeaderRow = wsTeamWise.getRow(4);
  twHeaderRow.height = 26;

  twHeaders.forEach((h, idx) => {
    const cell = twHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2F5597' }, // Deep slate blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'medium' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  wsTeamWise.autoFilter = 'A4:K4';

  let currentRow = 5;
  let teamSno = 1;

  for (const team of sortedTeams) {
    const members = team.members && team.members.length > 0 ? team.members : [
      {
        id: 'placeholder',
        team_id: team.id,
        position: 1,
        name: 'Unassigned',
        role: 'Leader',
        college: 'Not specified',
        branch: 'Not specified',
        year: '1st Year',
        phone: null,
        attendance: 'UNMARKED',
      } as Member,
    ];

    const startRow = currentRow;
    const endRow = startRow + members.length - 1;
    teamWiseMappings.push({ teamId: team.id, startRow, endRow });

    const isIdenticalCollege = members.every((m) => (m.college || '').trim() === (members[0].college || '').trim());
    const isIdenticalBranch = members.every((m) => (m.branch || '').trim() === (members[0].branch || '').trim());
    const isIdenticalYear = members.every((m) => (m.year || '').trim() === (members[0].year || '').trim());

    const isEvenTeam = teamSno % 2 === 0;
    const teamBgColor = isEvenTeam ? 'FFF8F9FA' : 'FFFFFFFF';

    members.forEach((m, mIdx) => {
      const rowNum = startRow + mIdx;
      const row = wsTeamWise.getRow(rowNum);
      row.height = 22;

      // Values
      row.getCell(1).value = teamSno;
      row.getCell(2).value = sanitizeText(team.registration_id);
      row.getCell(3).value = sanitizeText(team.team_name);
      row.getCell(4).value = sanitizeText(m.name);
      row.getCell(5).value = sanitizeText(m.role);
      row.getCell(6).value = sanitizeText(m.college);
      row.getCell(7).value = sanitizeText(m.branch);
      row.getCell(8).value = sanitizeText(m.year);
      row.getCell(9).value = sanitizeText(team.track);
      row.getCell(10).value = m.phone ? sanitizeText(m.phone) : 'Not provided';
      row.getCell(10).numFmt = '@'; // Store phone as text

      const attVal = m.attendance === 'PRESENT' ? 'Present' : m.attendance === 'ABSENT' ? 'Absent' : null;
      row.getCell(11).value = attVal;

      // Styling
      for (let c = 1; c <= 11; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Calibri', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: c === 1 || c === 5 || c === 8 || c === 10 || c === 11 ? 'center' : 'left' };

        // Shading
        if (c === 11) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF2CC' }, // Yellow highlight for attendance
          };
        } else {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: teamBgColor },
          };
        }

        // Borders
        const isLastRowOfTeam = mIdx === members.length - 1;
        cell.border = {
          top: { style: mIdx === 0 ? 'thin' : 'hair' },
          bottom: { style: isLastRowOfTeam ? 'medium' : 'hair' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      }

      // Add Data Validation dropdown for Attendance
      row.getCell(11).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Present,Absent"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Attendance',
        error: 'Please select Present or Absent',
      };
    });

    // Merging for team-level cells
    if (members.length > 1) {
      wsTeamWise.mergeCells(`A${startRow}:A${endRow}`); // S.No
      wsTeamWise.mergeCells(`B${startRow}:B${endRow}`); // Registration ID
      wsTeamWise.mergeCells(`C${startRow}:C${endRow}`); // Team Name
      wsTeamWise.mergeCells(`I${startRow}:I${endRow}`); // Track

      if (isIdenticalCollege) {
        wsTeamWise.mergeCells(`F${startRow}:F${endRow}`);
      }
      if (isIdenticalBranch) {
        wsTeamWise.mergeCells(`G${startRow}:G${endRow}`);
      }
      if (isIdenticalYear) {
        wsTeamWise.mergeCells(`H${startRow}:H${endRow}`);
      }
    }

    currentRow += members.length;
    teamSno++;
  }

  // Adjust column widths for Team Wise
  wsTeamWise.getColumn(1).width = 8;
  wsTeamWise.getColumn(2).width = 22;
  wsTeamWise.getColumn(3).width = 24;
  wsTeamWise.getColumn(4).width = 28;
  wsTeamWise.getColumn(5).width = 12;
  wsTeamWise.getColumn(6).width = 36;
  wsTeamWise.getColumn(7).width = 16;
  wsTeamWise.getColumn(8).width = 14;
  wsTeamWise.getColumn(9).width = 24;
  wsTeamWise.getColumn(10).width = 16;
  wsTeamWise.getColumn(11).width = 16;

  // ==========================================
  // SHEET 2: Team Evaluation
  // ==========================================
  const wsTeamEval = wb.addWorksheet('Team Evaluation', {
    views: [{ state: 'frozen', ySplit: 5 }],
  });

  // Title & Subtitle
  wsTeamEval.mergeCells('A1:S1');
  const titleCell2 = wsTeamEval.getCell('A1');
  titleCell2.value = 'Hackathon – Team Evaluation Sheet';
  titleCell2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1F4E79' } };
  titleCell2.alignment = { vertical: 'middle', horizontal: 'left' };
  wsTeamEval.getRow(1).height = 28;

  wsTeamEval.mergeCells('A2:S2');
  const subCell2 = wsTeamEval.getCell('A2');
  subCell2.value =
    'Enter marks in the yellow cells (max marks shown in row 4; criteria names & max marks are placeholders – edit as needed). Total, Percentage and Track Rank calculate automatically. Members Present comes from the Attendance column on Team Wise. College/Branch/Year are shown once if the whole team is the same, otherwise one line per member in the same order as the names; Phone has one line per member.';
  subCell2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF595959' } };
  subCell2.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  wsTeamEval.getRow(2).height = 30;

  // Row 4: Max marks row
  const r4 = wsTeamEval.getRow(4);
  r4.getCell(11).value = 'Max marks →';
  r4.getCell(11).font = { name: 'Calibri', size: 10, bold: true };
  r4.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
  r4.getCell(12).value = 10;
  r4.getCell(13).value = 10;
  r4.getCell(14).value = 10;
  r4.getCell(15).value = 10;
  r4.getCell(16).value = { formula: 'SUM(L4:O4)', result: 40 };

  for (let c = 12; c <= 16; c++) {
    const cell = r4.getCell(c);
    cell.font = { name: 'Calibri', size: 10, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFCE4D6' },
    };
  }

  // Row 5: Headers
  const evalHeaders = [
    'Team No.',
    'Registration ID',
    'Team Name',
    'Track',
    'Team Member Names',
    'College',
    'Branch',
    'Year',
    'Phone No.',
    'Members',
    'Members Present',
    'Innovation / Idea',
    'Technical Implementation',
    'Feasibility / Impact',
    'Presentation & Demo',
    'Total',
    'Percentage',
    'Rank in Track',
    'Remarks',
  ];

  const evalHeaderRow = wsTeamEval.getRow(5);
  evalHeaderRow.height = 28;
  evalHeaders.forEach((h, idx) => {
    const cell = evalHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'medium' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  wsTeamEval.autoFilter = 'A5:S5';

  const totalTeamsCount = sortedTeams.length;
  const lastEvalRow = 5 + totalTeamsCount;

  sortedTeams.forEach((team, idx) => {
    const evalRowNum = 6 + idx;
    const row = wsTeamEval.getRow(evalRowNum);
    row.height = 36;

    const mapping = teamWiseMappings[idx] || { startRow: 5, endRow: 5 };
    const members = team.members || [];

    const memberNames = members.map((m) => m.name).join('\n');
    const memberPhones = members.map((m) => m.phone || 'Not provided').join('\n');

    const isIdenticalCollege = members.every((m) => (m.college || '').trim() === (members[0]?.college || '').trim());
    const isIdenticalBranch = members.every((m) => (m.branch || '').trim() === (members[0]?.branch || '').trim());
    const isIdenticalYear = members.every((m) => (m.year || '').trim() === (members[0]?.year || '').trim());

    const collegeStr = isIdenticalCollege ? (members[0]?.college || '') : members.map((m) => m.college).join('\n');
    const branchStr = isIdenticalBranch ? (members[0]?.branch || '') : members.map((m) => m.branch).join('\n');
    const yearStr = isIdenticalYear ? (members[0]?.year || '') : members.map((m) => m.year).join('\n');

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = sanitizeText(team.registration_id);
    row.getCell(3).value = sanitizeText(team.team_name);
    row.getCell(4).value = sanitizeText(team.track);
    row.getCell(5).value = memberNames;
    row.getCell(6).value = collegeStr;
    row.getCell(7).value = branchStr;
    row.getCell(8).value = yearStr;
    row.getCell(9).value = memberPhones;

    // Excel Formulas
    row.getCell(10).value = { formula: `COUNTA('Team Wise'!D${mapping.startRow}:D${mapping.endRow})` };
    row.getCell(11).value = { formula: `COUNTIF('Team Wise'!K${mapping.startRow}:K${mapping.endRow},"Present")` };

    // Scoring columns L, M, N, O (blank for manual evaluation during event)
    row.getCell(12).value = null;
    row.getCell(13).value = null;
    row.getCell(14).value = null;
    row.getCell(15).value = null;

    // Total = IF(COUNT(L:O)=0,"",SUM(L:O))
    row.getCell(16).value = { formula: `IF(COUNT(L${evalRowNum}:O${evalRowNum})=0,"",SUM(L${evalRowNum}:O${evalRowNum}))` };

    // Percentage = IF(P="","",P/$P$4)
    row.getCell(17).value = { formula: `IF(P${evalRowNum}="","",P${evalRowNum}/$P$4)` };
    row.getCell(17).numFmt = '0.0%';

    // Rank in Track = IF(P="","",COUNTIFS($D$6:$D${lastEvalRow},D${evalRowNum},$P$6:$P${lastEvalRow},">"&P${evalRowNum})+1)
    row.getCell(18).value = {
      formula: `IF(P${evalRowNum}="","",COUNTIFS($D$6:$D$${lastEvalRow},D${evalRowNum},$P$6:$P$${lastEvalRow},">"&P${evalRowNum})+1)`,
    };

    row.getCell(19).value = null; // Remarks

    // Styling
    for (let c = 1; c <= 19; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 9 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: c === 1 || c === 10 || c === 11 || (c >= 16 && c <= 18) ? 'center' : 'left',
        wrapText: true,
      };

      // Evaluation input cells fill yellow
      if (c >= 12 && c <= 15) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF2CC' },
        };
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      };
    }
  });

  // Widths for Team Evaluation
  wsTeamEval.getColumn(1).width = 8;
  wsTeamEval.getColumn(2).width = 20;
  wsTeamEval.getColumn(3).width = 22;
  wsTeamEval.getColumn(4).width = 24;
  wsTeamEval.getColumn(5).width = 28;
  wsTeamEval.getColumn(6).width = 32;
  wsTeamEval.getColumn(7).width = 16;
  wsTeamEval.getColumn(8).width = 14;
  wsTeamEval.getColumn(9).width = 18;
  wsTeamEval.getColumn(10).width = 10;
  wsTeamEval.getColumn(11).width = 15;
  wsTeamEval.getColumn(12).width = 14;
  wsTeamEval.getColumn(13).width = 16;
  wsTeamEval.getColumn(14).width = 14;
  wsTeamEval.getColumn(15).width = 16;
  wsTeamEval.getColumn(16).width = 10;
  wsTeamEval.getColumn(17).width = 12;
  wsTeamEval.getColumn(18).width = 14;
  wsTeamEval.getColumn(19).width = 20;

  // ==========================================
  // HELPER FOR SEGREGATED SHEETS (Row 5 header, Row 6+ team rows)
  // ==========================================
  const buildSegregatedSheet = (sheetName: string, filteredTeams: Team[]) => {
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 5 }],
    });

    const segHeaders = [
      'Team No.',
      'Registration ID',
      'Team Name',
      'Track',
      'Team Member Names',
      'College',
      'Branch',
      'Year',
      'Phone No.',
      'Members',
    ];

    const hRow = ws.getRow(5);
    hRow.height = 28;
    segHeaders.forEach((h, idx) => {
      const cell = hRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E79' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    ws.autoFilter = 'A5:J5';

    filteredTeams.forEach((team, idx) => {
      const rowNum = 6 + idx;
      const row = ws.getRow(rowNum);
      row.height = 34;

      const members = team.members || [];
      const memberNames = members.map((m) => m.name).join('\n');
      const memberPhones = members.map((m) => m.phone || 'Not provided').join('\n');

      const isIdenticalCollege = members.every((m) => (m.college || '').trim() === (members[0]?.college || '').trim());
      const isIdenticalBranch = members.every((m) => (m.branch || '').trim() === (members[0]?.branch || '').trim());
      const isIdenticalYear = members.every((m) => (m.year || '').trim() === (members[0]?.year || '').trim());

      const collegeStr = isIdenticalCollege ? (members[0]?.college || '') : members.map((m) => m.college).join('\n');
      const branchStr = isIdenticalBranch ? (members[0]?.branch || '') : members.map((m) => m.branch).join('\n');
      const yearStr = isIdenticalYear ? (members[0]?.year || '') : members.map((m) => m.year).join('\n');

      row.getCell(1).value = idx + 1;
      row.getCell(2).value = sanitizeText(team.registration_id);
      row.getCell(3).value = sanitizeText(team.team_name);
      row.getCell(4).value = sanitizeText(team.track);
      row.getCell(5).value = memberNames;
      row.getCell(6).value = collegeStr;
      row.getCell(7).value = branchStr;
      row.getCell(8).value = yearStr;
      row.getCell(9).value = memberPhones;
      row.getCell(10).value = members.length;

      for (let c = 1; c <= 10; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Calibri', size: 9 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: c === 1 || c === 10 ? 'center' : 'left',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        };
      }
    });

    ws.getColumn(1).width = 8;
    ws.getColumn(2).width = 20;
    ws.getColumn(3).width = 22;
    ws.getColumn(4).width = 24;
    ws.getColumn(5).width = 28;
    ws.getColumn(6).width = 34;
    ws.getColumn(7).width = 16;
    ws.getColumn(8).width = 14;
    ws.getColumn(9).width = 18;
    ws.getColumn(10).width = 10;
  };

  // 3. Track Sheets: AI, CS, IOT, NA
  const aiTeams = sortedTeams.filter((t) => getTrackSheetName(t.track) === 'AI');
  const csTeams = sortedTeams.filter((t) => getTrackSheetName(t.track) === 'CS');
  const iotTeams = sortedTeams.filter((t) => getTrackSheetName(t.track) === 'IOT');
  const naTeams = sortedTeams.filter((t) => getTrackSheetName(t.track) === 'NA');

  buildSegregatedSheet('AI', aiTeams);
  buildSegregatedSheet('CS', csTeams);
  buildSegregatedSheet('IOT', iotTeams);
  buildSegregatedSheet('NA', naTeams);

  // 4. Year Sheets: 1ST, 2ND, 3RD, 4TH
  const y1Teams = sortedTeams.filter((t) => t.highest_year === '1ST');
  const y2Teams = sortedTeams.filter((t) => t.highest_year === '2ND');
  const y3Teams = sortedTeams.filter((t) => t.highest_year === '3RD');
  const y4Teams = sortedTeams.filter((t) => t.highest_year === '4TH');

  buildSegregatedSheet('1ST', y1Teams);
  buildSegregatedSheet('2ND', y2Teams);
  buildSegregatedSheet('3RD', y3Teams);
  buildSegregatedSheet('4TH', y4Teams);

  // 5. College Sheets: VIGNAN, OTHERS
  const vignanTeams = sortedTeams.filter((t) => t.college_group === 'VIGNAN');
  const otherTeams = sortedTeams.filter((t) => t.college_group === 'OTHERS');

  buildSegregatedSheet('VIGNAN', vignanTeams);
  buildSegregatedSheet('OTHERS', otherTeams);

  // Return workbook as Buffer
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
