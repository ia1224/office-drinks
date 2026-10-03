# Office Drinks deployment guide

This guide deploys the frontend, Supabase database, Edge Function, and Web Push notifications from a fresh clone.

## 1. Prerequisites

- Node.js 20 or later.
- A Supabase project and **Administrator** or **Owner** project access.
- A monitored email address for the VAPID contact.
- HTTPS for a deployed site. `localhost` works for development; plain HTTP LAN addresses do not.

```sh
git clone <repository-url>
cd office-drinks
npm install
```

## 2. Get Supabase values

In Supabase Dashboard, open the target project:

1. Copy its **Project ref** from **Settings → General** or the dashboard URL.
2. Copy the **Publishable key** from **Settings → API**. It starts with `sb_publishable_`.

Never place a service-role key, VAPID private key, or webhook secret in browser variables.

## 3. Generate VAPID credentials and deploy the function

From the repository root, run:

```sh
npm run setup-supabase-push -- \
  --project-ref your-project-ref \
  --publishable-key sb_publishable_your_key \
  --vapid-subject mailto:ops@example.com
```

The command signs into Supabase CLI. If `--project-ref` is omitted, it lists the projects available to that account before prompting for the project ref. It then creates a fresh VAPID P-256 key pair and webhook secret, writes the browser-safe values to `.env.local`, saves the private values as Supabase Function secrets, and deploys `send-order-push`.

For an already authenticated CLI, keep the webhook secret in an ignored file instead of printing it:

```sh
npm run setup-supabase-push -- \
  --project-ref your-project-ref \
  --publishable-key sb_publishable_your_key \
  --vapid-subject mailto:ops@example.com \
  --skip-login \
  --webhook-secret-file .push-webhook.local
```

Retrieve that header secret only when needed:

```sh
cat .push-webhook.local
```

The generated `.env.local` contains only:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_VAPID_PUBLIC_KEY=...
```

Do not commit `.env.local`, `.push-webhook.local`, VAPID private keys, or webhook secrets.

## 4. Create the database schema

1. In Supabase Dashboard, open **SQL Editor → New query**.
2. Copy all of [`supabase_schema.sql`](../supabase_schema.sql) into the editor.
3. Click **Run**.

This creates the orders table, Realtime publication, subscription table, and register/unregister RPCs.

## 5. Create the order webhook

In **Database → Webhooks**, choose **HTTP Request**. Do not use the Supabase Edge Function picker.

| Setting | Value |
| --- | --- |
| Name | `send-order-push` |
| Table | `public.drink_orders` |
| Event | `INSERT` only |
| Method | `POST` |
| URL | `https://your-project-ref.supabase.co/functions/v1/send-order-push` |
| Header name | `Authorization` |
| Header value | `Bearer <PUSH_WEBHOOK_SECRET>` |
| Content type | `application/json` |

Use the secret printed by the setup command or read from `.push-webhook.local`. Keep the default row payload. The custom Authorization value is required because the webhook function deliberately has JWT verification disabled.

## 6. Run and test locally

Restart Vite whenever any environment variable changes:

```sh
npm run dev
```

Open the displayed `localhost` URL, sign in as caretaker, and open the dashboard. It starts push setup automatically. If the browser suppresses its permission prompt, allow Notifications in browser site settings, then use **Retry Alerts**. Once subscribed, use **Test Alert**; a real order tests the complete webhook and delivery chain.

## 7. Deploy the frontend

Deploy to any HTTPS static host. This repository includes [`vercel.json`](../vercel.json) for Vercel.

Set these build-time variables in the hosting provider dashboard, then redeploy:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_VAPID_PUBLIC_KEY=the generated public VAPID key
```

Vite embeds `VITE_*` values into the browser bundle. Private keys and webhook secrets must never be hosting environment variables.

## 8. Verify production

1. Visit the deployed HTTPS site on a caretaker device.
2. Allow notifications and confirm **Test Alert** appears.
3. Submit a drink order from another device.
4. Confirm the notification arrives and opens `/dashboard`.
5. For failures, inspect **Database → Webhooks** delivery history and **Edge Functions → send-order-push → Logs**.

## Troubleshooting

### `Registration failed - push service error`

This fails in the browser's own push provider before Supabase receives anything.

- Use Chrome, Edge, Firefox, or Safari.
- In Brave, enable **Use Google services for push messaging** at `brave://settings/privacy`.
- Disable a VPN, proxy, firewall rule, or privacy extension that blocks browser push traffic.
- Use HTTPS in production or `localhost` in development.
- In DevTools → **Application**, unregister the service worker and clear site data once, then reload.
- Avoid repeatedly clearing and registering: push providers can rate-limit registrations.

### Function or webhook cannot be found

- Confirm the dashboard project ref matches the frontend URL.
- Verify the function:

  ```sh
  npx supabase@latest functions list --project-ref your-project-ref
  ```

- Create an **HTTP Request** webhook using the full function URL.

### `401 Unauthorized` in webhook history

The Authorization header does not match `PUSH_WEBHOOK_SECRET`. Update both the Supabase Function secret and the webhook header with the same value.

### Rotate VAPID keys

Run the setup command again. It deploys a new public/private pair; restart the frontend deployment and have caretakers open the dashboard to re-subscribe.

## Security before public release

The current schema supports a trusted office kiosk with public order access. Before exposing it publicly, replace the public policies with Supabase Auth and role-based RLS, especially for order modification and push-subscription registration.
