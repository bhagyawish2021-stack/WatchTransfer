from database import engine
from sqlalchemy import text

def test_connection():
    with engine.connect() as conn:
        db = conn.execute(text("SELECT current_database();")).scalar()
        print("Current Database:", db)

        timestamp = conn.execute(text("SELECT current_timestamp;")).scalar()
        print("Current Timestamp:", timestamp)

        res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")).fetchall()
        print("Tables:")
        for row in res:
            print(f"- {row[0]}")

if __name__ == "__main__":
    test_connection()
