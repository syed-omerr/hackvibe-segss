import { z } from 'zod';
import { TRACK_OPTIONS, YEAR_OPTIONS, BRANCH_OPTIONS } from './types';

// Clean text: trim and collapse internal whitespace
export function cleanText(val: string): string {
  return val.trim().replace(/\s+/g, ' ');
}

// Clean phone: strip +91, 0, spaces, dashes
export function cleanPhone(val: string | null | undefined): string | null {
  if (!val) return null;
  const digits = val.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return digits.substring(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return digits.substring(1);
  }
  return digits;
}

export const memberSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be at most 80 characters')
    .transform(cleanText),
  role: z.enum(['Leader', 'Member']),
  college: z
    .string()
    .min(2, 'College name is required')
    .max(120, 'College name too long')
    .transform(cleanText),
  branch: z.string().min(1, 'Branch is required'),
  year: z.enum(YEAR_OPTIONS as [string, ...string[]]),
  phoneUnavailable: z.boolean().optional().default(false),
  phone: z
    .string()
    .nullable()
    .optional()
    .transform((val, ctx) => {
      if (!val || val === 'Not provided') return null;
      const digits = cleanPhone(val);
      if (!digits) return null;
      if (!/^[6-9]\d{9}$/.test(digits)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Phone must be a valid 10-digit Indian mobile number (starting with 6-9)',
        });
        return z.NEVER;
      }
      return digits;
    }),
  attendance: z.enum(['UNMARKED', 'PRESENT', 'ABSENT']).optional().default('UNMARKED'),
});

export const teamRegistrationSchema = z
  .object({
    team_name: z
      .string()
      .min(2, 'Team name must be at least 2 characters')
      .max(80, 'Team name must be at most 80 characters')
      .transform(cleanText),
    track: z.enum(TRACK_OPTIONS as [string, ...string[]]),
    registration_id: z
      .string()
      .trim()
      .max(30)
      .optional()
      .nullable()
      .transform((val) => (val && val.length > 0 ? val.toUpperCase() : undefined)),
    members: z
      .array(memberSchema)
      .min(1, 'Team must have at least 1 member')
      .max(3, 'Team cannot exceed 3 members'),
    overrideDuplicatePhone: z.boolean().optional().default(false),
    overrideDuplicateName: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    // 1. Exactly one leader
    const leaders = data.members.filter((m) => m.role === 'Leader');
    if (leaders.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['members'],
        message: 'Exactly one team member must be designated as the Leader',
      });
    }

    // 2. Reject duplicate phones inside the same submission
    const phonesSeen = new Set<string>();
    data.members.forEach((m, idx) => {
      if (m.phone) {
        if (phonesSeen.has(m.phone)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['members', idx, 'phone'],
            message: `Duplicate phone number within this team (${m.phone})`,
          });
        }
        phonesSeen.add(m.phone);
      }
    });
  });

export type TeamRegistrationInput = z.infer<typeof teamRegistrationSchema>;
