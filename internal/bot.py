from neonize.utils import build_jid
from neonize.aioze.client import NewAClient
from neonize.aioze.events import MessageEv

from internal.utils.utils import Utils

class Bot:
    def __init__(self):
        self.utils = Utils()
        return

    async def handle_commads(self, client: NewAClient, event: MessageEv):
        print(f"Message received: {event.Message.conversation}")
        if event.Message.conversation == "!hi":
            try:
                chat_jid = self.utils.create_chat_jid(event)
                await client.send_message(chat_jid, message="puta")
            except Exception as e:
                print(f"Error occurred while sending message: {e}")
        if event.Message.conversation == "!oi":
            await client.reply_message("puta", event)