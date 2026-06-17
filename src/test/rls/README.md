# RLS end-to-end suite

Dynamic counterpart of `src/test/security-invariants.test.ts`. Exercises
real Supabase RLS policies and `SECURITY DEFINER` RPCs with four ephemeral
users (owner, member, stranger, admin).

## Run

```bash
SUPABASE_URL=... \
SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run test:rls
```

The suite refuses to run against the production project ref unless
`RLS_TEST_ALLOW_PROD=1` is set explicitly.

## Coverage

- `invitations.e2e.ts` — token enumeration, invitee scoping, owner access
- `projects.e2e.ts` — owner / member / stranger / anon paths, RPC field redaction
- `admin.e2e.ts` — admin-only tables, self-promotion guard, user_roles scoping
- `finance.e2e.ts` — transactions are strictly owner-only

Setup/teardown lives in `setup.ts` + `fixtures.ts`. Users are deleted
through `auth.admin.deleteUser` which cascades to projects, transactions,
and invitations through existing FKs.
