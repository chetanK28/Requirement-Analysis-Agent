# Requirement Analysis Agent

A React + FastAPI proof of concept that turns a story into five editable analysis sections using Capgemini GEP with the OpenAI-compatible SDK. Every response is a **draft for human review**. No database or fake LLM output is used.

## Prerequisites

Windows PowerShell, Python 3.12+ and Node.js 22.12+ (Node 24 LTS recommended) with npm. Install Python from python.org and Node LTS from nodejs.org, then reopen PowerShell. Check `py -3.12 --version` and `node --version`.

## Setup (PowerShell)

From the workspace:

```powershell
cd C:\Users\CHETAN\Desktop\POC\requirement-agent\backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

In the existing `backend/.env`, set these backend-only settings (do not overwrite an existing file with `.env.example`):

```text
GENERATIVE_ENGINE_API_KEY=<your-company-gateway-key>
GENERATIVE_ENGINE_BASE_URL=replace_with_OpenAI_API_reference_server_URL
GENERATIVE_ENGINE_MODEL=<exact-enabled-model-id-from-GEP-Studio>
LLM_TIMEOUT_SECONDS=60
```

The model intentionally has no default. `openai.gpt-5-nano` appeared only as an example in the slides described by the user; use it only if enabled for your GEP Studio. Old `OPENAI_API_KEY`/`OPENAI_MODEL` settings are ignored. No automatic model, endpoint or provider fallback occurs. Never put the gateway key in frontend settings, source, logs or Git. Restart the backend after changing settings. Without a key or model, startup still works and Analyze reports a configuration error.

The existing operation remains **Responses API**: `client.responses.parse`, sending `POST <OpenAI-reference-server-URL>/responses`, the existing Pydantic `Analysis` JSON schema and `store=False`. No GEP starter-kit configuration or company setup slides were present in the repository, so gateway operation support and account-specific model availability are **unconfirmed**. The supplied base URL alone does not confirm Responses support. Before using the app, check your GEP Studio starter-kit sample/API documentation for:

- The exact model ID enabled for your Studio and the key's access permissions.
- Support for Responses API (`POST /v1/responses`), strict structured JSON-schema output, and `store=False` for that model.
- Whether the starter kit instead documents only Chat Completions (`POST /v1/chat/completions`). If Responses is unsupported, provide that non-secret sample so the adapter can be changed explicitly while preserving the analysis schema. The app does not silently switch.
- Key activation, quota/budget, and required corporate network/VPN access.

No live GEP calls were made during this update. No real `.env` values were read or changed. Tests use synthetic configuration and mocked HTTP transports.

In a second PowerShell terminal:

```powershell
cd C:\Users\CHETAN\Desktop\POC\requirement-agent\frontend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
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

The GEP adapter uses the supported Python SDK `AsyncOpenAI.responses.parse` with a Pydantic schema, as documented in the [official structured outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses). The backend validates the response again, repairs invalid/duplicate IDs deterministically, checks exact evidence substrings against story/acceptance criteria, and downgrades unsupported explicit claims to inferred. Context-only evidence cannot make a claim explicit. Supported quotes do not prove semantic correctness; human review remains essential.

The versioned system prompt treats story text as untrusted data and prohibits invented business rules and numeric NFR thresholds. Prompt injection and hallucinations cannot be eliminated by prompting or substring checks. Validate meaning, missing constraints, and numbers yourself. Edits are reviewer annotations; evidence and classification remain those of the original analysis. Stable IDs are deterministic for the same ordered response; separate LLM runs can vary.

No persistence, authentication, cross-user collaboration, automatic approval, or production deployment is included. The backend does not log stories or keys. Submitted text is sent to Capgemini GEP; `store=False` is used, but applicable provider data policies still apply. Live analysis requires a valid key, quota, network connectivity, and model access. The model must be explicitly configured and is never silently substituted.

## Diagnose AI Passport Gateway authentication/access

No Gateway screenshots or OpenAI API reference were available in the repository/attachments for this update. The earlier server URL is no longer a built-in default. Do not infer a server URL from the REST API reference or use `/v2/llm/invoke` with this adapter.

In AI Passport Gateway, open **OpenAI API reference** (not REST API reference). Copy the selected **Servers** URL exactly into `GENERATIVE_ENGINE_BASE_URL`. Copy the authentication header name and scheme from its **Authorize / Security** section or generated OpenAI-compatible example. Do not share a credential-bearing example. This adapter currently uses the OpenAI SDK's `Authorization: Bearer <key>` behavior. That behavior is not verified against your GEP reference; if the reference specifies something else, provide only the non-secret header name/scheme and server URL so the adapter can be adjusted without guessing.

Open **GEP Models Catalog**, select the intended Studio, and copy the exact enabled model identifier into `GENERATIVE_ENGINE_MODEL`. No model is assumed. Verify the model supports the Responses endpoint and structured output. No operation fallback is implemented; if the company reference documents only Chat Completions, the adapter needs an explicit change after that reference is available.

401 and 403 are distinct: 401 prompts checks of server/authentication/key validity; 403 prompts checks of Studio access, key permissions, model entitlements and network policy. These statuses alone do not establish the root cause. Logs contain numeric status, allowlisted upstream codes and fixed safe descriptions; arbitrary upstream messages, request headers and keys are never copied into diagnostics.

The backend accepts only HTTPS server URLs on Capgemini subdomains, without embedded credentials/query strings, and rejects known REST invoke and operation URLs. If the documented OpenAI server uses another company-approved domain, adjust the host policy only after verifying that reference.

## Story Assessment and reviewer feedback

The analyze response adds complexity_score, complexity_label, complexity_reasons,
readiness_score, readiness_label and readiness_gaps at the top level. The five
analysis sections keep their shape. Scores are AI estimates of the original
story, acceptance criteria and context, not counts of generated findings.
They are not objective or approval. Missing/invalid fields return invalid_output.

Complexity: 1 one simple action; 2 simple workflow/few rules; 3 several steps or
moderate rules; 4 multiple rules/roles/integrations/error cases; 5 broad workflow
with dependencies/conditional paths/security or compliance concerns.
Labels: 1/2 Low, 3 Moderate, 4 High, 5 Very high.
Readiness: 1 unclear user/goal; 2 major details missing; 3 important questions
remain; 4 mostly clear/testable with minor gaps; 5 clear, specific and testable.
Labels: 1 Needs work, 2/3 Needs clarification, 4 Mostly clear, 5 Ready for review.

Below the generated sections, Story Assessment shows scores, reasons and gaps.
Usefulness feedback accepts 1-5 and an optional comment. Submit to see the saved
rating. Feedback stays in page memory; refresh or a new analysis clears it.
Download JSON/Markdown AFTER submitting feedback to save it alongside assessment
and finding decisions. Finding edits do not recalculate the original assessment.

Restart FastAPI and Vite, load the sample story, analyze, scroll below the five
sections, submit feedback and export. Offline tests use synthetic configuration;
no live gateway call or real key is needed for tests.
## PDF and Word upload

Choose Upload document beside Enter manually. Select a text-based PDF (.pdf) or
Word DOCX (.docx), at most 10 MB (10 MiB), then click Extract text. The selected
filename and extraction loading state are shown. Extraction alone never calls
GEP. Review/correct the extracted-text preview, optionally add acceptance criteria
and context, then click Analyze. This sends the reviewed text as user_story to
the existing /api/v1/analyze service. Assessment, review decisions, feedback and
JSON/Markdown exports behave as before. Manual drafts are retained when switching
input methods. Selecting another file clears its previous extracted preview.

The separate POST /api/v1/extract-file accepts multipart field file and returns
text and character_count. It validates extension, MIME type, file size and parsed
content. It uses pypdf for selectable PDF text and python-docx for DOCX body
paragraphs/tables, including nested tables. Parsing occurs in a worker thread.
The request body is bounded before multipart parsing; temporary upload handles
are closed after processing. No files are retained and no database/OCR is added.

Extracted text is limited to the existing 12,000-character story field; longer
content is rejected rather than truncated. Use a shorter document or paste the
relevant excerpt manually. Legacy .doc, encrypted/password-protected documents,
corrupt/empty documents and mismatched types produce safe errors. Scanned or
image-only PDFs with no selectable text explain that OCR is unsupported.
PDF table layout/reading order may be imperfect. Headers, footers, text boxes,
images, tracked changes and advanced Word layouts are not guaranteed to extract.
Always review the preview. A mixed scanned/text PDF may omit image-only content.
For resource limits, PDFs are capped at 200 pages and expanded DOCX packages at
32 MiB/2,000 ZIP entries. Extracted text remains untrusted user input under the
existing system prompt; it cannot intentionally change the analysis instructions.

To try locally, update backend dependencies and restart FastAPI:

```powershell
cd C:\Users\CHETAN\OneDrive\Desktop\POC\requirement-agent\backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host localhost --port 8000
```

In another terminal:

```powershell
cd C:\Users\CHETAN\OneDrive\Desktop\POC\requirement-agent\frontend
.\start.cmd
```

Stop an existing server with Ctrl+C before restarting. At http://localhost:5173,
try a DOCX with a paragraph/table and a text-based PDF; edit the preview before
Analyze. Try a scan-only PDF to see the no-OCR guidance. Extraction works without
a GEP key; Analyze still requires your existing private GEP configuration.