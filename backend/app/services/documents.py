"""In-memory document extraction. No model calls or document-content logging."""
from io import BytesIO
from pathlib import PurePath
from zipfile import ZipFile
from docx import Document
from docx.text.paragraph import Paragraph
from pypdf import PdfReader
from app.providers.base import ProviderError

MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_TEXT_LENGTH = 12000
DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'


def extract_text(data: bytes, filename: str, content_type: str) -> str:
    suffix = PurePath(filename).suffix.lower()
    if suffix == '.doc':
        raise ProviderError('unsupported_file', 'Legacy .doc files are not supported. Save the file as .docx, use a text-based PDF, or paste the story manually.', 415)
    expected = {'.pdf': 'application/pdf', '.docx': DOCX_TYPE}
    if suffix not in expected:
        raise ProviderError('unsupported_file', 'Upload a text-based PDF (.pdf) or Word document (.docx).', 415)
    if content_type.split(';')[0].strip().lower() != expected[suffix]:
        raise ProviderError('invalid_content_type', 'The file content type does not match its extension. Export a valid PDF or DOCX and try again.', 415)
    if len(data) > MAX_FILE_BYTES:
        raise ProviderError('file_too_large', 'The file exceeds the 10 MB upload limit.', 413)
    if not data:
        raise ProviderError('empty_file', 'The uploaded file is empty. Choose a document containing text.', 422)
    if data.startswith(bytes.fromhex('D0CF11E0A1B11AE1')) and suffix == '.docx':
        raise ProviderError('protected_or_legacy', 'This file is password-protected or uses the legacy Word format. Save an unprotected .docx and try again.', 422)
    parts, length = [], 0

    def append(text):
        nonlocal length
        text = text.strip()
        if not text:
            return
        length += len(text) + (1 if parts else 0)
        if length > MAX_TEXT_LENGTH:
            raise ProviderError('text_too_long', 'Extracted text exceeds 12,000 characters. Upload a shorter excerpt or paste the relevant story manually. No text was truncated.', 422)
        parts.append(text)

    def walk(container):
        for block in container.iter_inner_content():
            if isinstance(block, Paragraph):
                append(block.text)
            else:
                for row in block.rows:
                    seen = set()
                    for cell in row.cells:
                        # Avoid repeating merged cells within a row; include nested tables.
                        if cell._tc not in seen:
                            seen.add(cell._tc)
                            walk(cell)
    try:
        if suffix == '.pdf':
            if not data.startswith(b'%PDF-'):
                raise ValueError('invalid PDF signature')
            reader = PdfReader(BytesIO(data))
            if reader.is_encrypted:
                raise ProviderError('password_protected', 'Password-protected PDFs are not supported. Upload an unprotected copy.', 422)
            if len(reader.pages) > 200:
                raise ProviderError('document_too_complex', 'This PDF has too many pages. Upload an excerpt of at most 200 pages.', 422)
            for page in reader.pages:
                append(page.extract_text() or '')
        else:
            # DOCX is a ZIP package. Bound decompressed package size before XML parsing.
            with ZipFile(BytesIO(data)) as archive:
                entries = archive.infolist()
                if any(item.flag_bits & 1 for item in entries):
                    raise ProviderError('password_protected', 'Password-protected documents are not supported. Upload an unprotected copy.', 422)
                if len(entries) > 2000 or sum(item.file_size for item in entries) > 32 * 1024 * 1024:
                    raise ProviderError('document_too_complex', 'The expanded DOCX package is too large. Upload a smaller excerpt.', 422)
                if 'word/document.xml' not in archive.namelist():
                    raise ValueError('not a Word document')
            walk(Document(BytesIO(data)))
    except ProviderError:
        raise
    except Exception:
        # Parser exception messages can contain document content; do not expose/log them.
        raise ProviderError('corrupt_document', 'The document could not be read. It may be corrupt or unsupported. Export a new PDF/DOCX or paste the story manually.', 422) from None
    if not parts:
        message = ('No selectable text was found. Scanned/image-only PDFs need OCR, which is not supported. Use a text-based PDF or paste the story manually.'
                   if suffix == '.pdf' else 'No text was found in document paragraphs or tables. Use a document containing text or paste the story manually.')
        raise ProviderError('no_extractable_text', message, 422)
    return '\n'.join(parts)
class UploadLimitMiddleware:
    """Bound multipart body before Starlette can spool an arbitrarily large upload."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope.get('path') != '/api/v1/extract-file' or scope.get('method') != 'POST':
            return await self.app(scope, receive, send)
        from starlette.responses import JSONResponse
        # File limit is 10 MiB; allow a small bounded multipart envelope on top.
        limit = MAX_FILE_BYTES + 64 * 1024
        body = bytearray()
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            body.extend(message.get('body', b''))
            if len(body) > limit:
                response = JSONResponse(status_code=413, content={'error': {'code': 'file_too_large', 'message': 'Upload exceeds the 10 MB file limit or allowed multipart overhead. Choose a smaller PDF or DOCX.'}})
                return await response(scope, receive, send)
            if not message.get('more_body', False):
                break
        delivered = False
        async def replay():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {'type': 'http.request', 'body': bytes(body), 'more_body': False}
        return await self.app(scope, replay, send)