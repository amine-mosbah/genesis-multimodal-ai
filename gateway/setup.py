"""Setup file for gateway package (optional, for local development)."""
from setuptools import setup, find_packages

setup(
    name="multimodal-gateway",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.104.1",
        "uvicorn[standard]==0.24.0",
        "pydantic==2.5.0",
        "httpx==0.25.1",
        "python-multipart==0.0.6",
    ],
)
