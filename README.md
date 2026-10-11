# Requirement Analysis Agent

A React + FastAPI proof of concept that turns a story into five editable analysis sections using OpenAI structured outputs. Every response is a **draft for human review**. No database or fake LLM output is used.

## Prerequisites

Windows PowerShell, Python 3.12+ and Node.js 22.12+ (Node 24 LTS recommended) with npm. Install Python from python.org and Node LTS from nodejs.org, then reopen PowerShell. Check `py -3.12 --version` and `node --version`.

## Setup (PowerShell)

From the workspace:

```powershell
cd C:\Users\CHETAN\Desktop\POC\requirement-agent\backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

In the local `.env`, set `OPENAI_API_KEY` to your own API key. Leave `OPENAI_MODEL=gpt-6-luna`, or explicitly set another structured-output-capable model available to your account. Model access and billing depend on your account. No automatic model/provider fallback occurs. Never put keys in frontend variables, source files, or screenshots. No real secret is provided or committed. The app starts without a key and reports a configuration error when analysis is requested. Restart the backend after changing settings.

In a second PowerShell terminal:

```powershell
cd C:\Users\CHETAN\Desktop\POC\requirement-agent\frontend
Copy-Item .env.example .env
npm.cmd install
```

## Start (two terminals)

Backend:

```powershell
cd C:\Users\CHETAN\Desktop\POC\requirement-agent\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host localhost --port 8000
```

Frontend:

```powershell
cd C:\Users\CHETAN\Desktop\POC\requirement-agent\frontend
.\start.cmd
```

Open http://localhost:5173. API documentation: http://localhost:8000/docs. Health: http://localhost:8000/health. `npm.cmd` avoids PowerShell script execution-policy restrictions; virtual environment activation is unnecessary.

If `npm.cmd` is not recognized in an existing VS Code terminal, use `start.cmd` as above. It adds the installed Node.js directory to its own PATH before starting Vite. Alternatively, close all VS Code windows and reopen VS Code after installing Node.js.

Click **Load example**, or enter:

> As a registered customer, I want to reset my password using my verified email address so that I can regain access to my account.

Select the configured provider and click Analyze. Review all five sections, source evidence, and explicit/inferred labels. Edit titles and descriptions and choose pending, accepted, or rejected. Download JSON or Markdown to preserve decisions. Refreshing loses results and edits. New analysis replaces the prior draft, so export it first.

## Checks (no API key needed)

```powershell
cd C:\Users\CHETAN\Desktop\POC\requirement-agent\backend
.\.venv\Scripts\python.exe -m pytest -q
cd ..\frontend
npm.cmd test
npm.cmd run build
```

Tests mock provider/SDK calls, covering validation, ID repair, evidence, empty sections, provider errors, CORS, timeout, form loading/errors, review editing, and exports. Tests never use real LLM output.

## API and configuration

- `GET /health`: process health; does not check the provider.
- `GET /api/v1/providers`: IDs, configured models, and enabled flags; no keys.
- `POST /api/v1/analyze`: `user_story`, optional `acceptance_criteria` and `context`, and `provider` (default `openai`). Each source field is limited to 12,000 characters.
- Response: provider/model metadata, `status: draft`, validation warnings, and `analysis` with all five sections. Every finding has ID, title, description, evidence array, and explicit/inferred classification.
- `LLM_TIMEOUT_SECONDS` defaults to 60 (maximum 180). No automatic retries or provider switching.
- `CORS_ORIGIN` defaults to exactly `http://localhost:5173`. For production, set it to the actual HTTPS frontend origin and rebuild with `VITE_API_URL` pointing to your deployed backend. CORS is not authentication. Add authentication, authorization, TLS, request limits, and operational controls before public deployment.

## Add a provider

Implement `Provider` in `backend/app/providers/base.py`: `name`, `model`, `enabled`, and async `analyze(request) -> Analysis`. Read its secrets/model from backend Settings. Validate output and translate errors to `ProviderError`. Register the instance in `get_providers` in `app/api/routes.py`. The UI discovers providers automatically; the request/response API stays unchanged. Add mocked adapter tests. Gemini is deliberately deferred until its adapter can be tested.

## Design and limitations

The OpenAI adapter uses the supported Python SDK `AsyncOpenAI.responses.parse` with a Pydantic schema, as documented in the [official structured outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses). The backend validates the response again, repairs invalid/duplicate IDs deterministically, checks exact evidence substrings against story/acceptance criteria, and downgrades unsupported explicit claims to inferred. Context-only evidence cannot make a claim explicit. Supported quotes do not prove semantic correctness; human review remains essential.

The versioned system prompt treats story text as untrusted data and prohibits invented business rules and numeric NFR thresholds. Prompt injection and hallucinations cannot be eliminated by prompting or substring checks. Validate meaning, missing constraints, and numbers yourself. Edits are reviewer annotations; evidence and classification remain those of the original analysis. Stable IDs are deterministic for the same ordered response; separate LLM runs can vary.

No persistence, authentication, cross-user collaboration, automatic approval, or production deployment is included. The backend does not log stories or keys. Submitted text is sent to OpenAI; `store=False` is used, but applicable provider data policies still apply. Live analysis requires a valid key, quota, network connectivity, and model access. The default model is configurable and never silently substituted.
