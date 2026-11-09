# ProntoPerTe — starter PWA

Italian/English PWA starter for a Pitigliano local-services pilot.

## Requirements
- Node.js 20+
- A Supabase project

## Run locally
1. Install Node.js.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env`.
4. Add your Supabase project URL and anon key to `.env`.
5. In Supabase SQL Editor, run `supabase/schema.sql`.
6. Run `npm run dev` and open the local URL printed by Vite.

## Important setup notes
- New accounts are created as `customer` by default.
- Verify a provider manually in Supabase before changing that profile's role to `provider`.
- Create the first admin manually only after verifying the account. Example SQL (replace UUID):
  `update public.profiles set role='admin' where id='YOUR_AUTH_USER_UUID';`
- Configure Supabase Auth email confirmation and password policies.
- The current UI is a starter, not a production marketplace. Admin authorization, secure provider assignment, status transition checks, notifications, payments, privacy notices, terms, retention/deletion workflows, and monitoring are not yet implemented.
- Do not collect prescription details, health information, identity documents, or sensitive personal data in this prototype.
- Pharmacy and passenger transport services require separate legal review and appropriate licensed partners in Italy.
- No live payment processing is included.
