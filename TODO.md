# Cloud Files delivery checklist

## Authentication and account isolation

- [ ] Users can sign up with email and password, log in, and log out.
- [ ] Each user can only see their own file metadata and storage usage.
- [ ] Passwords are never stored in plaintext; protected procedures reject unauthenticated access and the UI shows a session-expired message when a session is no longer valid.

## Direct private file transfer

- [ ] Users can upload through drag-and-drop or a file picker.
- [ ] Each file is limited to 50 MB and common images, PDFs, documents, and ZIP files are accepted with clear validation errors.
- [ ] The backend issues temporary signed upload URLs and the browser sends file bytes directly to private object storage with a visible progress bar.
- [ ] After a successful upload, metadata records file name, size, type, owner user ID, upload date, and storage key.
- [ ] The backend verifies file ownership before issuing a temporary signed download URL; downloads do not stream through the backend.

## Dashboard operations

- [ ] The dashboard shows name, size, type, upload date, search, and sorting by name or date.
- [ ] Each row has a download action and a delete action with a confirmation prompt.
- [ ] Storage usage is calculated from the current user's owned, non-deleted metadata.
- [ ] Upload, download, delete, size, authorization, and session failures have clear user-facing messages.

## Delivery documentation and deployment

- [ ] The published application is online at a public URL.
- [ ] Source has a clear folder structure and uses environment variables for secrets.
- [ ] README covers architecture, setup, required variables, signed URL behavior, and the managed-storage deletion limitation.
- [ ] A short architecture diagram covers frontend, backend, signed URL, storage, and database.
- [ ] A PDF report contains aim, procedure, architecture, deployment details, and a dashboard screenshot attachment.
