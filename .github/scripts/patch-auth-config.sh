#!/usr/bin/env bash
# Sends one auth config payload (JSON file) to the Supabase Management API, then deletes it.
# Prints the HTTP status and the non-secret fields named in the payload, never secret values.
set -euo pipefail

payload="$1"
response="$RUNNER_TEMP/auth-response.json"

status=$(curl -sS -o "$response" -w '%{http_code}' -X PATCH \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data @"$payload")
keys=$(jq -c '[keys[] | select(test("secret|pass|user|client_id|admin_email|_content$") | not)]' "$payload")
rm "$payload"
echo "HTTP $status"

jq --argjson keys "$keys" '(with_entries(select(.key as $k | $keys | index($k)))) + {message}' "$response" 2>/dev/null \
  || echo "::warning::Response was not JSON."
rm -f "$response"
[ "$status" -ge 200 ] && [ "$status" -lt 300 ]
