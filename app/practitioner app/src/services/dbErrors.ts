import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Turn raw Postgres/PostgREST errors into messages a practitioner can act on.
 * The schema is constraint-heavy (CHECK/FK), so 23514 / 23503 show up often and
 * the default text ("new row violates check constraint ...") is useless to users.
 */

/** CHECK constraint violations. */
const CHECK_VIOLATION = '23514';
/** Foreign key violations. */
const FK_VIOLATION = '23503';
/** Unique / primary key violations. */
const UNIQUE_VIOLATION = '23505';
/** Not-null violations. */
const NOT_NULL = '23502';
/** Invalid text representation (e.g. bad uuid, bad date). */
const BAD_INPUT = '22P02';
/** Row-level-security "not authorised" reads come back as empty sets; writes surface as 42501. */
const RLS_DENIED = '42501';

/** Maps the constraint name (when Postgres reports it) to something human. */
const CONSTRAINT_HINTS: Record<string, string> = {
  posted_assessments_kind_check: '“Kind” must be diagnostic, quiz or practical.',
  posted_assessments_level_check: '“Level” must be Beginner, Intermediate or Advanced.',
  posted_assessments_competency_area_check: 'Pick one of the five listed competency areas.',
  posted_assessments_max_attempts_check: 'Max attempts must be between 1 and 999.',
  posted_assessments_title_check: 'The assessment title needs at least 3 characters.',
  module_assignments_title_check: 'The assignment title needs at least 3 characters.',
  module_assignments_instructions_check: 'Instructions need at least 5 characters.',
  module_assignments_module_id_fkey: 'That module does not exist yet — create it in the modules table first.',
  assignment_submissions_status_check: 'A submission can only be “submitted” or “reviewed”.',
  assignment_submissions_response_check: 'The learner response cannot be blank.',
  assignment_submissions_assignment_id_fkey: 'That assignment no longer exists.',
  check_in_logs_reasons_check: 'Check-in reasons must be saved as a list.',
  session_attendees_session_id_fkey: 'Save the session before adding attendees.',
  session_registers_session_date_check: 'The session date is not a valid calendar date.',
  users_role_check: 'Only learner, practitioner or admin roles are allowed.',
  users_status_check: 'Status must be active, pending, suspended or denied.',
  users_email_key: 'That email address is already registered.',
  users_hub_id_fkey: 'Choose an existing hub.',
  hubs_province_fkey: 'Use a province code that exists in the provinces table (e.g. GP, NC).',
  institutions_province_fkey: 'Use a province code that exists in the provinces table.',
  content_items_province_fkey: 'Use a province code that exists in the provinces table.',
  content_items_level_check: 'Content level must be Beginner, Intermediate or Advanced.',
  content_items_language_check: 'That language code is not one of the eleven supported codes.',
  content_items_status_check: 'Unexpected workflow status for this content item.',
  courses_difficulty_check: 'Course difficulty must be beginner, intermediate or advanced.',
  courses_tier_check: 'Course tier must be free or premium.',
  enrollments_progress_pct_check: 'Progress must be between 0 and 100.',
  feedback_rating_check: 'Ratings run from 1 to 5.',
  events_status_check: 'Event status must be upcoming, ongoing, completed or cancelled.',
  opportunities_type_check: 'Opportunity type must be job, learnership, internship or bursary.',
  opportunity_applications_status_check: 'Application status must be applied, reviewing, accepted or rejected.',
  sync_queue_entity_type_check: 'Unsupported offline entity type.',
  sync_queue_action_check: 'Sync action must be create, update or delete.',
  sync_queue_status_check: 'Sync status must be pending, synced or failed.',
  user_credentials_pin_hash_check: 'PINs must be stored as bcrypt hashes ($2…).',
  user_credentials_failed_pin_attempts_check: 'Failed PIN attempts cannot be negative.',
  provinces_code_check: 'Province codes are 2–3 capital letters (e.g. GP).',
  modules_order_num_check: 'Module order must be greater than 0.',
  modules_estimated_minutes_check: 'Estimated minutes must be greater than 0.',
  modules_blocks_check: 'Module blocks must be saved as a list.',
  modules_quiz_check: 'The module quiz must be saved as an object (or left empty).',
  forum_threads_title_check: 'Thread titles need at least 3 characters (max 200).',
  forum_threads_body_check: 'A thread post needs at least 5 characters.',
  forum_replies_body_check: 'Replies need at least 2 characters.',
  question_answers_correct_index_check: 'The correct answer index cannot be negative.',
  question_answers_explanation_check: 'Explanations need at least 5 characters.',
};

function guessFromMessage(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes('check constraint')) {
    const named = /"([^"]+)"$/.exec(message.trim());
    if (named && CONSTRAINT_HINTS[named[1]]) return CONSTRAINT_HINTS[named[1]];
    return 'One of the fields does not match what the database expects. Check the highlighted values.';
  }
  if (m.includes('foreign key')) return 'This record points at another record that does not exist. Pick a valid option from the lists.';
  if (m.includes('duplicate key') || m.includes('already exists')) return 'That entry already exists.';
  if (m.includes('not-null')) return 'A required field was left empty.';
  if (m.includes('invalid input syntax for type uuid')) return 'One of the linked records has an invalid id. Reload and try again.';
  if (m.includes('row-level security') || m.includes('permission denied')) {
    return 'You are not allowed to do this with your current account. Ask an admin to check your hub access.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) return 'Cannot reach Supabase right now. Check your connection and retry.';
  return null;
}

export function describeDbError(error: PostgrestError | Error | null | undefined, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;

  const pg = error as PostgrestError;
  if (pg.code) {
    switch (pg.code) {
      case CHECK_VIOLATION:
      case FK_VIOLATION:
      case UNIQUE_VIOLATION:
      case NOT_NULL:
      case BAD_INPUT:
      case RLS_DENIED: {
        const hint = guessFromMessage(pg.message ?? '');
        if (hint) return hint;
        break;
      }
      default:
        break;
    }
  }

  return error.message || fallback;
}

/** Throw `Error` with a friendly message instead of a bare PostgREST payload. */
export function throwIfDbError(error: PostgrestError | null, fallback: string): void {
  if (error) throw new Error(describeDbError(error, fallback));
}
