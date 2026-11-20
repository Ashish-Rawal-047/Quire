"""S3-compatible object storage client. The bucket only ever holds ciphertext (see docs §5.1)."""

from __future__ import annotations

from functools import lru_cache

import boto3
from botocore.client import BaseClient
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import get_settings


@lru_cache
def get_s3() -> BaseClient:
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=s.s3_endpoint,
        aws_access_key_id=s.s3_access_key,
        aws_secret_access_key=s.s3_secret_key,
        region_name=s.s3_region,
        config=Config(signature_version="s3v4", retries={"max_attempts": 2}, connect_timeout=3),
    )


def ensure_bucket() -> None:
    """Create the private documents bucket if it does not exist (local development convenience)."""
    s3 = get_s3()
    bucket = get_settings().s3_bucket
    try:
        s3.head_bucket(Bucket=bucket)
    except ClientError:
        s3.create_bucket(Bucket=bucket)
