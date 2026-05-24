import asyncio
import asyncpg
import os
import ssl
from dotenv import load_dotenv

load_dotenv()

async def main():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    conn = await asyncpg.connect(os.getenv("DB_CON_STR"), ssl=ctx, server_settings={'search_path': 'rahul, public'})
    
    count = await conn.fetchval("SELECT count(*) FROM transactions;")
    print("Transactions count:", count)
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
