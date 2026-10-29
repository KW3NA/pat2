# E-Literacy Practitioner App (Expo)

Practitioner companion app wired to the same Supabase project as the learner app.

## Run with Expo Go
1. `npm install`
2. Make sure `.env` sits next to `package.json` (it contains EXPO_PUBLIC_SUPABASE_URL / ANON_KEY).
3. `npx expo start -c` then scan the QR code with Expo Go.

## Auth
Email + password via Supabase Auth (`signInWithPassword`). New practitioners can sign up;
their row is mirrored into `public.users` (role = practitioner) so sessions, check-ins and
assessments link correctly.

## Data (existing schema)
- `hubs`, `session_registers`, `session_attendees` – session registration & attendance
- `check_in_logs` – learner check-ins (resolve supported)
- `posted_assessments` – create/list hub assessments
- `module_assignments`, `assignment_submissions` – assignments & review feedback
- `users` – profiles & hub learner lists
