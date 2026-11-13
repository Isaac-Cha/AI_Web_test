"""Plain-text submission contract and a bounded request body.

Validation is defense in depth. All consumers must still render stored values
as text; in particular, never HTML-decode a value before displaying it.
"""
import json
import re
from html import unescape
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from starlette.responses import JSONResponse

MAX_SUBMISSION_BYTES = 32 * 1024
MARKUP = re.compile(r"<(?:[a-z/!?])", re.IGNORECASE)
CONTROLS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def validate_plain_text(value: str) -> str:
    if CONTROLS.search(value):
        raise ValueError("control characters are not allowed")
    # Inspect entity-encoded probes without changing legitimate stored text.
    decoded = value
    for _ in range(8):
        if MARKUP.search(decoded):
            raise ValueError("HTML markup is not allowed; please use plain text")
        next_value = unescape(decoded)
        if next_value == decoded:
            return value
        decoded = next_value
    raise ValueError("excessively encoded text is not allowed")


class SubmissionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["contact", "join", "account_open"]
    name: str = Field(min_length=1, max_length=100, strict=True)
    contact: str = Field(min_length=1, max_length=200, strict=True)
    email: Optional[EmailStr] = Field(default=None, max_length=254)
    message: Optional[str] = Field(default=None, max_length=5000, strict=True)
    meta: Optional[dict] = None

    @field_validator("name", "contact", "email", "message", mode="before")
    @classmethod
    def normalize_text(cls, value, info):
        if not isinstance(value, str):
            return value
        validate_plain_text(value)
        if info.field_name != "message":
            if any(c in value for c in "\r\n\t"):
                raise ValueError("this field must be a single line")
            value = value.strip()
        if info.field_name == "email" and not value:
            return None
        return value

    @field_validator("meta")
    @classmethod
    def validate_meta(cls, value):
        if value is None:
            return value
        if len(json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8")) > 4096:
            raise ValueError("meta must be at most 4096 bytes")

        def inspect(item, depth=0):
            if depth > 4:
                raise ValueError("meta is too deeply nested")
            if isinstance(item, str):
                validate_plain_text(item)
            elif isinstance(item, dict):
                for key, child in item.items():
                    validate_plain_text(key)
                    if key.startswith("$") or "." in key:
                        raise ValueError("invalid meta key")
                    inspect(child, depth + 1)
            elif isinstance(item, list):
                for child in item:
                    inspect(child, depth + 1)

        inspect(value)
        return value


class SubmissionBodyLimitMiddleware:
    """Bound only the public form, including chunked requests, before JSON parsing."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if (scope["type"] != "http" or scope["method"] != "POST"
                or scope["path"].rstrip("/") != "/api/submissions"):
            return await self.app(scope, receive, send)
        chunks = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            size += len(chunk)
            if size > MAX_SUBMISSION_BYTES:
                response = JSONResponse({"detail": "submission body is too large"}, status_code=413)
                return await response(scope, receive, send)
            chunks.append(chunk)
            if not message.get("more_body", False):
                break

        async def replay():
            nonlocal chunks
            if chunks is not None:
                body = b"".join(chunks)
                chunks = None
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        return await self.app(scope, replay, send)
