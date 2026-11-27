OUR LITTLE STORY — DARK ACADEMIA EDITION

This is a visual redesign of the supplied Blue Hour website ZIP.

DESIGN
- Espresso and walnut backgrounds across the main website.
- Antique gold details, forest green and burgundy accents.
- Timeline, memory, profile and screenshot cards use dark leather-like surfaces.
- Journal entries use warm parchment styling with dark brown writing.
- Forms and dialogs use dark surfaces with readable cream text.

INSTALLATION
1. Extract this ZIP.
2. Replace index.html, style.css and script.js in your existing website folder.
3. Keep your existing Supabase project, database, storage bucket, and data.
4. Refresh the website. If the old styles remain cached, hard-refresh with Ctrl + F5.

IMPORTANT
- This is a CSS-only visual update. No database migration is required.
- Your supplied index.html, script.js and supabase-migration.sql are preserved.
- Keep your existing Supabase credentials and project settings unchanged.
- The screenshots page's existing password mechanism is preserved; it should not be treated as strong account-level security.


FORGOT PASSWORD FEATURE
- The login screen now has a "Forgot your password?" link.
- The user enters their registered email in the Email field, then taps the link.
- Supabase sends a password-reset email. The email link returns to this same website.
- The user enters and confirms a new password on the reset screen.
- No passwords are visible to the website owner.

SUPABASE SETUP REQUIRED
1. In Supabase, open Authentication -> URL Configuration.
2. Set Site URL to your published website URL (not localhost).
3. Add the same published URL to Redirect URLs. For example:
   https://YOUR-USERNAME.github.io/OurLittleStory/
   Also allow the reset redirect URL with ?reset-password=1 if your dashboard requires an exact path.
4. Password reset emails must be deliverable. Supabase's default email service is limited; configure Custom SMTP for real users if needed.
5. Make sure the Supabase Auth email template for Reset Password uses the provided confirmation link variable ({{ .ConfirmationURL }}).

No database migration is required.
