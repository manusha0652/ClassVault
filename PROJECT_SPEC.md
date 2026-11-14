# ClassVault

ClassVault is an offline-first Expo and React Native app for managing tuition classes, students, fee collection, and arrears.

## Main app flow

- First launch: Welcome → teacher setup → Collect.
- Returning launch: Collect. If App Lock is enabled, unlock first, then continue to Collect.
- Choose a location and grade from the selectors in Collect. These controls stay within the tabbed app.
- The bottom tabs provide Collect, Dashboard, Students, and Settings.
- Open a student profile from Students to view payment history and edit the record.

Location and grade selection are part of the main workflow; there is no separate location landing screen.

## Technology

- Expo SDK 58, Expo Router, React Native, and TypeScript
- React Native `StyleSheet` and shared theme colors
- SQLite for local persistence and Zustand for shared app state
- FlashList for student lists
- Expo Haptics, FileSystem, and Sharing for payment feedback and exports

## Code map

- `app/`: welcome/setup/lock routes, the four tab screens, and student profiles
- `src/components/`: reusable collection controls and forms
- `src/db/`: database setup and queries
- `src/security/`: local PIN and security state
- `src/store/`: shared class, student, session, and payment state
- `src/types/`: shared TypeScript types
- `src/utils/`: formatting and export helpers

The authoritative database schema and indexes are in `src/db/schema.ts`.
