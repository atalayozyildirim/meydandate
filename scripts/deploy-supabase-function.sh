#!/usr/bin/env bash
set -euo pipefail

# Simple helper script to deploy the store-gif Supabase function.
# Requires: supabase CLI installed and SUPABASE_PROJECT_REF env var set (or pass as first arg).

PROJECT_REF="${1:-${SUPABASE_PROJECT_REF:-}}"
if [ -z "$PROJECT_REF" ]; then
  echo "Usage: $0 <project-ref>   (or set SUPABASE_PROJECT_REF env)"
  exit 2
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
  exit 3
fi

echo "Deploying store-gif function to project $PROJECT_REF..."

supabase functions deploy store-gif --project-ref "$PROJECT_REF"

echo "If the function needs SUPABASE_SERVICE_ROLE_KEY, set it as a secret in the project:"
echo "  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=\"<service-role-key>\" --project-ref $PROJECT_REF"

echo "Done."