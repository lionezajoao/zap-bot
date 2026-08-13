from neonize.utils import build_jid
from neonize.aioze.client import NewAClient
from neonize.aioze.events import MessageEv

class Utils:
    def __init__(self):
        return

    def create_chat_jid(self, event: MessageEv):
        return build_jid(
            event.Info.MessageSource.SenderAlt.User,
            event.Info.MessageSource.SenderAlt.Server)