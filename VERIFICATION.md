# Verification

Verified on Windows with Python 3.12.10 and Node.js 24.20.0.

- Backend: `python -m pytest -q` — 16 passed. One upstream Starlette TestClient deprecation warning about httpx; no test failures.
- Frontend: `npm.cmd test` — 4 passed.
- Production: `npm.cmd run build` — TypeScript check and Vite build passed.
- npm dependency installation/audit after tooling updates — zero vulnerabilities reported.
- Uvicorn startup and real HTTP GET /health and GET /api/v1/providers succeeded without a key. OpenAI is listed as disabled with configurable default gpt-6-luna.
- No live LLM request was made: no user API key is configured. Automated analysis tests use mocks, not production sample output.

Dependencies were installed locally. Backend direct versions are pinned; frontend package-lock.json records the resolved dependency tree.
## GEP configuration update verification

- Backend: 33 tests passed, including real SDK calls with an offline MockTransport.
- Frontend: 4 tests passed; TypeScript/Vite production build passed.
- Tests disable loading the real backend/.env. No real key was read or changed and no live GEP request was made.
- Git check-ignore confirms backend/.env is ignored; git ls-files confirms it is not tracked.
- Existing Responses API operation and Analysis response schema preserved. GEP support and the enabled model ID remain unconfirmed because no company starter kit/slides are in the repository.
- Backend checks report the existing upstream Starlette/httpx deprecation warning. The first run also reported an inaccessible existing pytest cache; verification can run with `-p no:cacheprovider`.


## Document upload verification

- Backend: 90 tests passed (existing Starlette/httpx deprecation warning only).
- Frontend: 15 tests passed; TypeScript/Vite production build passed.
- PDF, encrypted/blank PDF, DOCX paragraph/table/nested-table extraction, invalid
  extensions/MIME types, corrupt/empty/oversized files, extracted text limits,
  early multipart limits and upload cleanup are covered by offline tests.
- UI checks cover file selection, loading, preview/editing, reviewed-text analysis,
  switching back to preserved manual input, errors and clearing stale previews.
- Extraction has no model calls; existing /api/v1/analyze workflow remains intact.
- No real .env values were opened/changed and no live GEP calls were made.
