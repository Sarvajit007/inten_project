# Cloud Files implementation plan

## Product approach

Cloud Files is a private, account-scoped file vault. The React client owns the interaction layer while the Express/tRPC server owns authentication, metadata, authorization, and signed URL issuance. File bytes do not pass through the app server: the server returns a short-lived platform storage presigned PUT URL, the browser uploads directly with XMLHttpRequest progress reporting, and the server records metadata only after the upload succeeds. Downloads follow the same trust boundary: the server verifies the authenticated owner before returning a temporary signed GET URL.

The managed Webdev database is the MySQL-compatible metadata store. The managed object-storage capability is the private S3-backed equivalent requested by the brief, so no AWS credentials are required for the deployed project. Because the runtime storage contract exposes presign and stable-address operations but not physical object deletion, Delete removes the user-visible metadata record and marks it deleted; the object is no longer reachable from the app index or UI. This behavior is documented in the README.

## Implementation decisions

- React + Vite frontend with the initialized Express/tRPC backend.
- Email/password auth using the starter's signed `webdev_app_session` cookie, `MANUS_JWT_SECRET`, and database-backed local users. Passwords are salted and hashed with Node's built-in `scryptSync`; plaintext passwords never enter the database.
- `users` stores local credentials, and `files` stores file name, size, MIME type, owner ID, storage key, status, and timestamps.
- The 50 MB limit is enforced in the browser for fast feedback and again on the server before presigning.
- Storage keys are generated server-side as `users/{ownerId}/{uuid}-{safeFileName}`. The browser cannot choose a different owner's key.
- Search and name/date sorting are scoped to the current user's complete file rows.
- All protected tRPC procedures use the starter's `protectedProcedure`, so unauthenticated and cross-user access fails closed.

## Project structure

- `client/src/pages/Home.tsx`: login/sign-up screen and authenticated dashboard, including dropzone, progress, search, sort, usage, download, and delete interactions.
- `client/src/index.css`: responsive Cloud Files visual system.
- `server/routers.ts`: auth and file procedures, ownership checks, and signed URL issuance.
- `server/db.ts`: database connection plus user/file metadata queries.
- `server/storage.ts`: server-side calls to the managed storage presign API.
- `drizzle/schema.ts` and `drizzle/`: users/password and file metadata schema plus migration history.
- `public/manus-routes.json`: route manifest for the deployed web app.
- `README.md` and `docs/architecture.mmd`: setup, security model, environment variables, and architecture diagram.

## Design direction

Three possible directions were considered: Quiet utility / editorial workspace (0.06), Soft glass productivity (0.04), and Dark command center (0.02). The chosen direction is **Quiet utility / editorial workspace**.

- **Design movement:** Swiss editorial utility with warm paper tones and crisp cobalt actions.
- **Core principles:** calm hierarchy, visible system status, generous breathing room, and compact high-signal controls.
- **Color philosophy:** warm off-white surfaces reduce dashboard fatigue; ink navy gives trust and contrast; cobalt marks actions and links; a restrained mint accent signals healthy storage state.
- **Layout paradigm:** a narrow utility rail on desktop opens into an asymmetric dashboard canvas: a broad upload/work area paired with a compact usage card, then a full-width file ledger.
- **Signature elements:** a cobalt vertical brand mark, oversized numerals for storage usage, and fine ruled dividers that make the file list feel like a modern register.
- **Interaction philosophy:** direct manipulation first; drop files where the upload surface is visible, show progress in-place, and keep destructive actions explicit.
- **Animation:** short ease-out fades and 150ms progress transitions; no decorative motion that competes with upload status.
- **Typography system:** system sans for the interface, with strong weight contrast between compact labels and large usage numerals.
- **Brand essence:** a private file shelf that feels dependable and lightweight; calm, clear, trustworthy.
- **Brand voice:** concise and reassuring. Example lines: “Your files, in one quiet place.” and “Upload once. Find it fast.”
- **Wordmark & logo:** a compact cobalt square with two offset paper-tabs beside a bold Cloud Files wordmark.
- **Signature brand color:** Cobalt `#3156D8`.
