Supabase function deploy guide

Files to deploy: supabase/functions/store-gif/index.ts

Prerequisites:
- Install Supabase CLI: https://supabase.com/docs/guides/cli
- Ensure you have a Supabase project and the project ref (project-id)
- Do NOT commit service role keys to git. Use CI secrets or Supabase dashboard secrets.

Recommended flow (manual):

1. Authenticate CLI (interactive):
   supabase login

2. Set project ref env var (locally for this run):
   export SUPABASE_PROJECT_REF=your-project-ref

3. Deploy the function:
   supabase functions deploy store-gif --project-ref "$SUPABASE_PROJECT_REF"

4. Set secrets for the function (so it can use the service role key):
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>" --project-ref "$SUPABASE_PROJECT_REF"
   # OR set SUPABASE_SECRET_KEYS as JSON if your infra expects it

5. (Optional) If you need to set TENOR/GIPHY keys for the client, add to Expo/EAS env or CI as EXPO_PUBLIC_TENOR_API_KEY / EXPO_PUBLIC_GIPHY_API_KEY.

Testing the function (after deploy):
- If function is public, you can call via fetch from client. For admin uploads, call from server with service role key.

Example curl to invoke (edge function URL differs by region; using supabase CLI's invocation URL is easiest):

# Example using Supabase Functions url (replace with your deployed function URL)
curl -X POST "https://<project>.functions.supabase.co/store-gif" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://media.tenor.com/....gif"}'

If function requires secrets, set SUPABASE_SERVICE_ROLE_KEY in Supabase secrets (see step 4).

If you want, provide SUPABASE_SERVICE_ROLE_KEY and SUPABASE_PROJECT_REF and I can attempt a deploy from this environment, but secrets must be provided securely (do NOT paste into public channels).