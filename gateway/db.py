"""
Database layer for job persistence.
"""
import sqlite3
import json
from typing import List, Optional
from datetime import datetime
from pathlib import Path

from .schemas import Job, JobStatus, PipelineType


def datetime_serializer(obj):
    """Custom JSON serializer for datetime objects."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


class JobDB:
    """Simple SQLite database for job storage."""
    
    def __init__(self, db_path: str = "/data/jobs.db"):
        """Initialize database connection."""
        self.db_path = db_path
        # Ensure directory exists
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """Create tables if they don't exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                pipeline TEXT NOT NULL,
                inputs TEXT NOT NULL,
                options TEXT NOT NULL,
                status TEXT NOT NULL,
                outputs TEXT NOT NULL,
                metadata TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        
        # Index for faster queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_status ON jobs(status)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_created_at ON jobs(created_at)
        """)
        
        conn.commit()
        conn.close()
    
    def create_job(self, job: Job) -> Job:
        """Store a new job."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO jobs (job_id, pipeline, inputs, options, status, outputs, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            job.job_id,
            job.pipeline.value if hasattr(job.pipeline, 'value') else job.pipeline,
            json.dumps(job.inputs.dict()),
            json.dumps(job.options.dict()),
            job.status.value if hasattr(job.status, 'value') else job.status,
            json.dumps(job.outputs.dict()),
            json.dumps(job.metadata.dict(), default=datetime_serializer),
            job.metadata.created_at.isoformat()
        ))
        
        conn.commit()
        conn.close()
        return job
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Retrieve a job by ID."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        return self._row_to_job(row)
    
    def update_job(self, job: Job) -> Job:
        """Update an existing job."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE jobs
            SET pipeline = ?, inputs = ?, options = ?, status = ?, 
                outputs = ?, metadata = ?, created_at = ?
            WHERE job_id = ?
        """, (
            job.pipeline.value if hasattr(job.pipeline, 'value') else job.pipeline,
            json.dumps(job.inputs.dict()),
            json.dumps(job.options.dict()),
            job.status.value if hasattr(job.status, 'value') else job.status,
            json.dumps(job.outputs.dict()),
            json.dumps(job.metadata.dict(), default=datetime_serializer),
            job.metadata.created_at.isoformat(),
            job.job_id
        ))
        
        conn.commit()
        conn.close()
        return job
    
    def list_jobs(self, limit: int = 100, offset: int = 0) -> List[Job]:
        """List jobs ordered by creation time (newest first)."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM jobs
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [self._row_to_job(row) for row in rows]
    
    def _row_to_job(self, row: sqlite3.Row) -> Job:
        """Convert database row to Job model."""
        return Job(
            job_id=row['job_id'],
            pipeline=PipelineType(row['pipeline']),
            inputs=json.loads(row['inputs']),
            options=json.loads(row['options']),
            status=JobStatus(row['status']),
            outputs=json.loads(row['outputs']),
            metadata=json.loads(row['metadata'])
        )
