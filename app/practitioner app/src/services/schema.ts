/**
 * Single source of truth for the values the Postgres schema accepts.
 * Every CHECK constraint / enum in the public schema is mirrored here so the UI can
 * never submit a value Supabase will reject.
 */

export type UserRole = 'learner' | 'practitioner' | 'admin';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'denied';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

/** users.role CHECK (role IN ('learner','practitioner','admin')) */
export const USER_ROLES: readonly UserRole[] = ['learner', 'practitioner', 'admin'] as const;

/** users.current_level — free text in the schema, but the app keeps it aligned with content levels. */
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
export type Level = (typeof LEVELS)[number];

/** posted_assessments.kind CHECK (kind IN ('diagnostic','quiz','practical')) */
export const ASSESSMENT_KINDS = ['diagnostic', 'quiz', 'practical'] as const;
export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];

/** competency_area CHECK (…) on both practical_tasks and posted_assessments. */
export const COMPETENCY_AREAS = [
  'using_devices',
  'getting_online',
  'finding_judging_info',
  'staying_safe',
  'doing_things_online',
] as const;
export type CompetencyArea = (typeof COMPETENCY_AREAS)[number];

export const COMPETENCY_LABELS: Record<CompetencyArea, string> = {
  using_devices: 'Using devices',
  getting_online: 'Getting online',
  finding_judging_info: 'Finding & judging information',
  staying_safe: 'Staying safe',
  doing_things_online: 'Doing things online',
};

/** assignment_submissions.status CHECK (status IN ('submitted','reviewed')) */
export const SUBMISSION_STATUSES = ['submitted', 'reviewed'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** institutions.type CHECK (…) */
export const INSTITUTION_TYPES = [
  'school',
  'ngo',
  'library',
  'government',
  'corporate',
  'community_centre',
] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

/** institutions.license_tier CHECK (…) */
export const LICENSE_TIERS = ['free', 'pilot', 'institutional'] as const;

/** content_items.language CHECK (…) — the eleven official SA languages in the schema. */
export const CONTENT_LANGUAGES = ['en', 'zu', 'xh', 'af', 'st', 'tn', 'nso', 've', 'ts', 'ss', 'nr'] as const;

/** content_items.status CHECK (…) */
export const CONTENT_STATUSES = [
  'submitted',
  'in_review',
  'approved',
  'changes_requested',
  'published',
  'rejected',
] as const;

/** sync_queue.entity_type CHECK (…) */
export const SYNC_ENTITY_TYPES = [
  'assessment_attempt',
  'module_progress',
  'profile_update',
  'opportunity_application',
  'certificate',
] as const;

/** reports.type CHECK (…) */
export const REPORT_TYPES = [
  'province_summary',
  'hub_activity',
  'competency_gaps',
  'practitioner_register',
] as const;

/* ------------------------------------------------------------------ *
 * Length constraints lifted straight from the schema's CHECK clauses. *
 * ------------------------------------------------------------------ */

export const LIMITS = {
  /** modules.title: length(btrim(title)) >= 3 AND <= 255 */
  moduleTitleMin: 3,
  moduleTitleMax: 255,
  /** forum_threads.title: >= 3 AND <= 200 */
  threadTitleMin: 3,
  threadTitleMax: 200,
  /** forum_threads.body: >= 5 */
  threadBodyMin: 5,
  /** forum_replies.body: >= 2 */
  replyBodyMin: 2,
  /** content_items.title: >= 3 AND <= 255 */
  contentTitleMin: 3,
  contentTitleMax: 255,
  /** content_items.topic: >= 2 */
  contentTopicMin: 2,
  /** institutions.name: >= 2 */
  institutionNameMin: 2,
  /** provinces.name / capital: >= 2 AND <= 100 */
  provinceNameMin: 2,
  provinceNameMax: 100,
  /** module_assignments.title >= 3, instructions >= 5 */
  assignmentTitleMin: 3,
  assignmentInstructionsMin: 5,
  /** posted_assessments.title >= 3 */
  assessmentTitleMin: 3,
  /** question_answers.explanation >= 5 */
  explanationMin: 5,
  /** assignment_submissions.response >= 1 */
  submissionResponseMin: 1,
} as const;

/** check_in_logs.reasons — jsonb array; the schema only requires an array, these are the app's vocabulary. */
export const CHECK_IN_REASONS = [
  'Missing session',
  'Connectivity',
  'Device shortage',
  'Transport',
  'Care duties',
  'Low confidence',
  'Language barrier',
  'Health',
  'Other',
] as const;

/** Sanity helper: is this string one of the allowed enum values? */
export function isIn<T extends string>(value: T | string | null | undefined, allowed: readonly T[]): boolean {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/** Validate + normalise a btrim()-bounded text field against the schema's CHECK. Returns null when invalid. */
export function boundedText(value: string, min: number, max?: number): string | null {
  const trimmed = value.trim();
  if (trimmed.length < min) return null;
  if (max !== undefined && trimmed.length > max) return null;
  return trimmed;
}
