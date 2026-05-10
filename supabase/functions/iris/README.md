# Iris Supabase Edge Function

This function backs the portal AI widget at:

`https://eymqvzjwbolgmywpwhgi.supabase.co/functions/v1/iris`

Required secrets:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIREBASE_PROJECT_ID` defaults to `zatech-portal`

Optional secrets:

- `IRIS_MODEL_FAST` defaults to `gpt-5.4-mini`
- `IRIS_MODEL_SMART` defaults to `gpt-5.4`
- `IRIS_MAX_OUTPUT_TOKENS` defaults to `650`
- `IRIS_MAX_HISTORY_MESSAGES` defaults to `8`
- `IRIS_ALLOWED_EMAILS` comma-separated allow list
- `IRIS_REQUIRE_AUTH=false` disables Firebase bearer-token auth for local testing only

Deploy:

```powershell
supabase functions deploy iris --project-ref eymqvzjwbolgmywpwhgi --no-verify-jwt --use-api
```

`--no-verify-jwt` is required because the function verifies Firebase ID tokens itself.

Set secrets:

```powershell
supabase secrets set OPENAI_API_KEY="..." FIREBASE_PROJECT_ID="zatech-portal" --project-ref eymqvzjwbolgmywpwhgi
supabase secrets set IRIS_MODEL_FAST="gpt-5.4-mini" IRIS_MODEL_SMART="gpt-5.4" --project-ref eymqvzjwbolgmywpwhgi
```

The function is read-only. It answers portal questions through targeted tools for invoices, expenses, projects, clients, subcontractors, opportunities, tasks, and project file metadata.
