# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Background Order Notifications

Browser-generated notifications only work while the dashboard page is running. Background notifications use Web Push through a Supabase Edge Function and require one-time project setup:

1. Run `supabase_schema.sql` in the Supabase SQL Editor. This creates the private subscription table and the RPC used by the app.
2. Generate a VAPID key pair with `npx web-push generate-vapid-keys --json`. Keep the private key secret. Add the public key as `VITE_VAPID_PUBLIC_KEY` in your local `.env` and frontend hosting environment, then rebuild and redeploy the app.
3. Install the Supabase CLI, then deploy the function and configure its secrets:

	```sh
	supabase functions deploy send-order-push
	supabase secrets set VAPID_PUBLIC_KEY="PASTE_PUBLIC_KEY" VAPID_PRIVATE_KEY="PASTE_PRIVATE_KEY" VAPID_SUBJECT="mailto:you@example.com" PUSH_WEBHOOK_SECRET="PASTE_RANDOM_SECRET"
	```

	Generate a webhook secret with `openssl rand -hex 32`. Use the same value in the function secret and webhook header. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.
4. In Supabase Database Webhooks, create a webhook for `public.drink_orders` on `INSERT`. Set its URL to `https://<project-ref>.supabase.co/functions/v1/send-order-push` and add the header `Authorization: Bearer <same-random-secret>`. Keep the default row payload.
5. Open the caretaker dashboard on each device and select **Enable Alerts**. Allow notifications. On iPhone/iPad, open the installed Home Screen app; Web Push requires iOS/iPadOS 16.4 or later.

The notification opens `/dashboard`. Push delivery requires HTTPS, browser notification permission, and the database webhook to be active.
