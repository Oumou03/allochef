# Manage Profile Page

## Goal Description

Update the profile page (tab5) to display the logged‑in user's name and profile picture, and provide a modal that lets the user edit their name and upload a new avatar. Changes must be persisted in the Supabase `users` table and the avatar stored in Supabase storage.

## User Review Required

> [!IMPORTANT]
> This will add a new storage bucket (`profile-avatars`). Ensure the Supabase project has the bucket created and the RLS policy allows the authenticated user to upload/delete only their own files.

> [!WARNING]
> Updating the avatar will replace the previous image URL in the `users` record. Old files will remain in storage unless you implement cleanup.

## Open Questions

- Do you want the avatar upload to support image preview before saving?
- Should we limit the file size (e.g., 2 MB) for avatars?
- Do you prefer a dedicated service method for avatar handling, or keep the logic in the component?

## Proposed Changes

---
### Profile Component (tab5.page.ts)
- Extend `currentUser` model to include `avatar` fetched from the `users` table.
- Add methods `openEditModal()`, `saveProfile()`, `onAvatarSelected(event)`.
- Use `SupabaseService.uploadVideo` (rename to `uploadAvatar`) to store the image in a new bucket `profile-avatars`.
- Call `SupabaseService.updateUser` with `{ name, avatar }` after upload.

---
### Profile Template (tab5.page.html)
- Add an `<ion-img>` bound to `currentUser.avatar` inside the avatar wrapper.
- In the edit modal, include an `<input type="file" accept="image/*">` for avatar selection and a text input for name.
- Show a preview of the selected image.

---
### Supabase Service (supabase.service.ts)
- Add a helper method `static async uploadAvatar(file: File): Promise<string>` that uploads to `profile-avatars` bucket and returns the public URL.
- Ensure `environment.supabase` config includes `url` and `anonKey` (already present).

---
### Environment
- No changes needed if bucket URL pattern is standard (`https://<project>.supabase.co/storage/v1/object/public/profile-avatars/<path>`).

---
### Styles (tab5.page.css)
- Adjust avatar wrapper to display the image as a circle and centre it.
- Add styles for the edit modal layout.

## Verification Plan

### Automated Tests
- Run the app and log in as a test user.
- Verify the profile page shows the correct name and avatar.
- Open the edit modal, change the name, upload a new image, save, and confirm the updates reflect on the page and in Supabase (via console).

### Manual Verification
- Check that the avatar URL stored in `users.avatar` matches the uploaded file.
- Ensure the file appears publicly reachable.
- Confirm that logout/login cycles preserve the updated profile.
