FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (for better caching)
COPY gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only gateway code
COPY gateway/ ./gateway/

# Create data directory
RUN mkdir -p /data

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "gateway.main:app", "--host", "0.0.0.0", "--port", "8000"]
