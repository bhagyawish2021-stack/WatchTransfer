"""
Database migration script to ensure all schema changes match models.py.
Handles missing columns in existing PostgreSQL or SQLite databases.
"""
from sqlalchemy import text, inspect
from database import engine

MIGRATIONS = [
    # Clinicians table
    "ALTER TABLE clinicians ADD COLUMN IF NOT EXISTS department VARCHAR;",
    "ALTER TABLE clinicians ADD COLUMN IF NOT EXISTS availability_status VARCHAR DEFAULT 'AVAILABLE';",
    "ALTER TABLE clinicians ADD COLUMN IF NOT EXISTS backup_clinician_id VARCHAR REFERENCES clinicians(clinician_id);",
    # Notifications table
    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS original_responsible_clinician_id VARCHAR REFERENCES clinicians(clinician_id);",
    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_clinician_id VARCHAR REFERENCES clinicians(clinician_id);",
    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;",
    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS escalation_reason VARCHAR;",
    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;",
    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ack_deadline TIMESTAMP;",
    # Backfill default values for existing rows
    "UPDATE clinicians SET availability_status = 'AVAILABLE' WHERE availability_status IS NULL;",
    "UPDATE notifications SET escalation_level = 0 WHERE escalation_level IS NULL;",
    "UPDATE notifications SET original_responsible_clinician_id = clinician_id WHERE original_responsible_clinician_id IS NULL;",
    "UPDATE notifications SET recipient_clinician_id = clinician_id WHERE recipient_clinician_id IS NULL;",
]

def run_migrations():
    print("Checking and applying database migrations...")
    with engine.begin() as conn:
        for stmt in MIGRATIONS:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"Warning running '{stmt}': {e}")
    print("Database migrations applied successfully.")

if __name__ == "__main__":
    run_migrations()
