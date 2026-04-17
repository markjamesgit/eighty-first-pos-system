# Firestore Security Setup

This project now uses `firestore.rules` with admin-only access for POS data.
It also includes `storage.rules` for admin-only product image uploads.

## What these rules do

- Require sign-in for all access.
- Use `users/{uid}.role == "admin"` to authorize admin operations.
- Allow first-time profile creation for the signed-in user in `users/{uid}`.
- Restrict POS collections (`products`, `orders_*`, `sales_summary`, `stock_history`) to admins.
- Restrict new admin module collections (`maintenance_categories`, `audit_trail`, `alerts`, `alert_emails`) to admins.

## Deploy rules

1. Install Firebase CLI if needed:
   - `npm i -g firebase-tools`
2. Login:
   - `firebase login`
3. Initialize project alias (first time only):
   - `firebase use --add`
4. Deploy Firestore rules:
   - `firebase deploy --only firestore:rules`
5. Deploy Storage rules:
   - `firebase deploy --only storage`
6. Or deploy both at once:
   - `firebase deploy --only firestore:rules,storage`

## Important note about first admin account

The rules allow a signed-in user to create their own profile at `users/{uid}` one time.
That is needed so app login can create/update user profile docs.

If you want stricter production hardening, use Firebase custom claims (`request.auth.token.admin == true`) and remove profile self-bootstrap.

## Storage rule behavior

- Only signed-in admins can read/write `products/*`.
- Uploads are limited to image MIME types.
- Max upload size is 5MB per file.
- All other storage paths are denied by default.
