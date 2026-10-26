from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.core.config import Settings
from app.providers.base import ProviderError
from app.services.documents import UploadLimitMiddleware

app = FastAPI(title="Requirement Analysis Agent")
app.add_middleware(UploadLimitMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=[Settings().cors_origin], allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
app.include_router(router)

@app.exception_handler(ProviderError)
async def provider_error(request: Request, exc: ProviderError):
    return JSONResponse(status_code=exc.status, content={"error": {"code": exc.code, "message": exc.message}})

@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    if request.url.path == '/api/v1/extract-file':
        return JSONResponse(status_code=422, content={"error": {"code": "invalid_upload", "message": "Choose a PDF or DOCX file and upload it in the multipart field named file."}})
    # Never echo source text from Pydantic errors into logs or responses.
    return JSONResponse(status_code=422, content={"error": {"code": "invalid_input", "message": "Check the story and field length limits (12,000 characters per text field)."}})

@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": {"code": "internal_error", "message": "Analysis failed unexpectedly. Please retry."}})