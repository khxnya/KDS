# Add the developer workspace without replacing the working project

The update contains layout corrections plus the new team workflow. Broader backend hardening is deferred. No script has been run on your live Supabase project.

## 1. Preserve your working connection

Keep your existing configured **config.js**. The v5 ZIP contains only config.example.js, so extracting it will not overwrite your connection. All four pages use the same public project URL and publishable/anon key. Do not generate a new project or paste a secret/service-role key into the frontend.

Replace index.html, admin.html, client.html and kinetic.js; add developer.html and team.js in the same folder. Deploy them together. On a fresh installation, copy config.example.js to config.js and enter your public settings. Your account passwords and owner MFA remain unchanged.

## 2. What to run in Supabase

For your working v4 project, run **team.sql**, not database.sql again:

1. Make a Supabase backup and test on a staging copy with representative records.
2. Open the intended project → SQL Editor → New query.
3. Open the supplied team.sql locally, copy the complete script into the query and review it.
4. Run the complete query, including BEGIN through COMMIT. Keep its final read-only verification results.
5. Confirm four new tables have SELECT policies and the kds-job-files bucket has public = false and file_size_limit = 52428800. Verify the access tests below before using real customer files.
6. Open admin.html#team and click Refresh team. An API schema-cache delay can require waiting briefly and refreshing again.

This script does the following:

| Change | Purpose |
| --- | --- |
| Adds kds_team | Maps confirmed Auth accounts to active colleagues and disciplines |
| Adds kds_jobs | Stores the assignment, internal brief, status and optional due date |
| Adds kds_job_updates | Keeps append-only checkpoints with explicit visibility |
| Adds kds_job_assets | Tracks private files/HTTPS links and upload completion |
| Adds guarded database functions | Allows owner assignment/review and assigned-developer updates without granting arbitrary table writes |
| Adds private kds-job-files bucket and its policies | Allows private uploads and permission-checked, five-minute signed URLs |
| Narrows client_read/client_message policies on kds_records | Ensures a developer account is not mistakenly treated as a customer |

It does **not** delete existing projects, leads or messages; replace your Auth project; reset passwords; change existing project columns; or remove unrelated Storage policies. It adds a foreign key that prevents deleting a project while its team jobs still reference it. Existing role changes happen only when you explicitly add a colleague through the owner form.

The migration runs in a transaction and is repeatable for its own objects. If it reports **Existing Storage policies found**, it stops and rolls back the feature changes. This guard exists because an older broad Storage policy could otherwise expose the new bucket. Do not disable RLS or delete existing policies blindly. Have their bucket conditions reviewed and limited before rerunning. It also stops if it finds an unexpected policy on the new Team tables. If it reports that client_read/client_message or kds_records is missing, stop and check the current schema: this upgrade expects the supplied v4 foundation. For a brand-new empty project only, apply database.sql first, then team.sql.

The v5 base file is only needed for a fresh setup. Older base scripts may treat every non-admin as a client; do not reapply an old script that would widen those policies. When both current files are needed, use base then team.

## 3. Add your colleagues

1. Supabase → Authentication → Users: create a separate work account or send an invite through your normal trusted admin process. The email must be confirmed. Do not convert a customer's account into a staff account.
2. The colleague sets their own password through the provider's trusted account/recovery process. Never share your owner password or authenticator.
3. Sign in to admin.html with your owner account and MFA. Open **Team & jobs → Colleagues & disciplines**.
4. Enter the confirmed work email, display name and discipline, then choose Add colleague. The confirmation makes clear that the account receives developer access and stops using the client portal.
5. This guarded function sets trusted Auth app_metadata.role = developer and creates the active team record. It refuses to convert an owner account. There is no public role selector or public colleague signup.
6. Have the colleague sign out of any prior portal session, then sign in at **your-domain/developer.html**. They use their own email/password. Share this route directly with colleagues.

Disciplines include website development, 3D animation, application development and automation. Application/automation labels here support internal/planned work; the public website continues to show those services as coming soon.

Provider invites and password recovery must use your exact allowed domain and client.html recovery route. Test email delivery and redirects in your Supabase settings. No invitation emails are automatically sent by the Team form.

## 4. Assign and follow work

In Team & jobs → Assign a new job, select an existing client project, colleague, title, brief and optional due date. One project can have several jobs assigned to different specialists. A colleague sees only jobs currently assigned to them.

The developer can post a checkpoint and status, and upload a file or share an HTTPS link. Visibility defaults to **Owner & assigned developer only**. Choosing **Also share with client** publishes that specific update/file/link to the client's project Overview. There is no automatic public portfolio publishing. Check the visibility before posting; the UI has no edit/delete or unpublish action for published history in this revision.

The owner can review all relevant updates/files, reassign the job, return it to work, accept completion or archive it. Owner review notes stay internal. Checkpoints are retained rather than rewritten by the owner. The overall client project stage stays under the existing owner project controls.

Files: up to 50 MiB each; images, MP4/WebM, PDF, ZIP, GLB/GLTF and .blend. Larger video renders can use an HTTPS link with appropriate sharing permissions on that external service. Do not post links with embedded credentials. Existing uploaded files remain private; signed viewing links expire after five minutes, although anyone given an unexpired link can use it until expiry.

## 5. Verify in staging before live use

Use two colleagues, two separate clients and your owner account:

- Client credentials cannot enter developer.html or admin.html; developer credentials cannot enter client/owner routes.
- A colleague sees their assigned job and cannot read another colleague's job through direct REST requests or call owner assignment/review functions.
- An internal checkpoint/file is visible to the assigned developer and owner only. An explicitly shared, completed upload is visible to the correct client only.
- A pending/failed upload stays absent from client views. Test image/video preview and file/link opening on your devices.
- Reassign a job and confirm the previous assignee cannot fetch new signed links or post checkpoints. Already downloaded files and unexpired signed URLs cannot be recalled.
- Refresh a developer job URL, confirm restoration, sign out and test invalid credentials. Test recovery emails through your real domain.
- Existing client messages, owner projects, new-project Back navigation and owner MFA still work.

The supplied automated tests run the shipped migration and RLS in embedded PostgreSQL with mock Auth/Storage, plus DOM/provider fixtures. They are not live Supabase tests. Actual browser rendering, real Storage limits, provider email delivery and your project's other existing policies require the staging check above. No broad backend hardening or security certification is claimed.

## Removing access and backups

For immediate staff removal, use trusted Supabase administration to revoke the colleague's provider sessions and set their kds_team.active = false (target the exact user UUID). Active membership is checked by database functions/policies. A cached JWT can remain valid until expiry unless revoked/enforced by your provider setup; the inactive team record prevents new team reads/actions. The owner can reassign their jobs. Do not delete a worker's Auth row to remove access; retained work history references it.

The existing owner JSON export covers legacy records only, not the new team tables, Storage objects or Auth. Use provider database backups plus a private Storage backup/export for the complete workspace. Do not drop team tables/bucket when reverting only the UI. Pending uploads from interrupted sessions may require trusted administrative cleanup; no broad storage delete policy is granted to workers.
