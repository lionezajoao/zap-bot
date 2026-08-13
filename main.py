import os
import asyncio
from neonize.aioze.client import NewAClient
from neonize.aioze.events import MessageEv, ConnectedEv
from neonize.utils import build_jid

from internal.bot import Bot

client = NewAClient(f"local_session/{os.getenv('BOT_NAME')}")
bot = Bot()

@client.event(MessageEv)
async def on_message(client: NewAClient, event: MessageEv):
    await bot.handle_commads(client, event)

async def connect():
    await client.connect()
    await client.idle()  # Keep receiving events

asyncio.run(connect())
