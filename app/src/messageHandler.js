import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const { Client, LocalAuth, RemoteAuth, MessageMedia } = pkg;

import Utils from './utils.js';
import SessionHandler from './sessionHandler.js';

export default class Messages extends Utils {
    constructor(botDB) {
        super();
        this.botDB = botDB;
    }

    async connect(local = false) {

        await this.botDB.connectDB();

        const puppeteer_args = {
            headless: true,
            args: [
                '--aggressive-cache-discard',
                '--disable-accelerated-2d-canvas',
                '--disable-application-cache',
                '--disable-background-networking',
                '--disable-cache',
                '--disable-client-side-phishing-detection',
                '--disable-component-update',
                '--disable-default-apps',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--disable-gpu',
                '--disable-offer-store-unmasked-wallet-cards',
                '--disable-offline-load-stale-cache',
                '--disable-popup-blocking',
                '--disable-setuid-sandbox',
                '--disable-speech-api',
                '--disable-sync',
                '--disable-translate',
                '--disable-web-security',
                '--disk-cache-size=0',
                '--hide-scrollbars',
                '--ignore-certificate-errors',
                '--ignore-ssl-errors',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-default-browser-check',
                '--no-first-run',
                '--no-pings',
                '--no-sandbox',
                '--no-zygote',
                '--password-store=basic',
                '--safebrowsing-disable-auto-update',
                '--use-mock-keychain',
            ]
        };

        try {
            if (local) {
                this.client = new Client({
                    authStrategy: new LocalAuth(),
                    puppeteer: {
                        ...puppeteer_args,
                        executablePath: process.env.EXECUTABLE_PATH
                    }
                });
            } else {
                const sessionHandler = new SessionHandler();
                await sessionHandler.setStore()
    
                console.log("Store set");
    
                this.client = new Client({
                    authStrategy: new RemoteAuth({
                        clientId: process.env.CLIENT_ID ||'Bot',
                        dataPath: '../wwebjs-auth',
                        store: sessionHandler.store,
                        backupSyncIntervalMs: 600000
                    }),
                    puppeteer: {
                        ...puppeteer_args,
                        executablePath: process.env.EXECUTABLE_PATH
                    }
                });
            }
        } catch(err) {
            throw new Error(err);
        }

        this.client.on("remote_session_saved", () => {
            console.log("remote session exist");
          });

        this.client.on('loading_screen', (percent, message) => {
            console.log('', percent, message);
        });

        this.client.on('qr', (qr) => {
            console.log('[!] Scan QR Code Bellow');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('authenticated', () => {
            console.log(`✓ Authenticated!`)
          });
        
        this.client.on('auth_failure', (msg) => {
            console.error('Authentication Failure!', msg);
          });

        this.client.on('ready', () => {
            console.log('Client is ready!');
            this.client.sendPresenceUnavailable();
        });
        
        this.client.initialize();
    }

    runCommands() {
        this.client.on("message", async (message) => {
            await this.handleCommands(message)
        });
    }

    async handleCommands(message) {
        const command = message.body;
        const chat = await message.getChat();

        if (!command.startsWith("!")) return;

        if (command === "!all") {
            console.log(`Command ${ command } called from ${ message.from }`);
            return await this.mentionAll(message);
        }

        if (command === "!help" || command === "!ajuda") {
            console.log(`Command ${ command } called from ${ message.from }`);
            let text = `*Comandos disponíveis:*\n\n`;
            const commands = await this.botDB.listCommands();
            if (commands && commands.length > 0) {
                commands.forEach(cmd => {
                    text += `*${ cmd.trigger }* 🠒 ${ cmd.description }\n`;
                });
            }
            return chat.sendMessage(this.removeIdentation(text));
        }

        const commandData = await this.botDB.handleCommand(message);
        if (commandData) {
            console.log(`Command ${ command } called from ${ message.from }`);
            await this.handleSendMessage(message, commandData);
        } else {
            console.log(`Command ${ command } not found`);
            return chat.sendMessage(`Comando ${ command } não encontrado. Use !help ou !ajuda para ver os comandos disponíveis.`);
        }
    }

    async handleSendMessage(message, commandData) {
        let newMedia;
        const messageData = {};
        if (commandData.response.type == "text") {
            await this.client.sendMessage(message.from, commandData.response.content);
        } else if (commandData.response.type == "media") {
            const mediaPath = this.getMediaFromMessage(commandData.response.path);
            console.log(mediaPath);
            if (mediaPath) {
                newMedia = MessageMedia.fromFilePath(mediaPath);
                await this.client.sendMessage(message.from, newMedia, {
                    caption: commandData.caption || ''
                });
            } else {
                console.error(`Media file not found: ${commandData.response.path}`);
                await this.client.sendMessage(message.from, "Arquivo de mídia não encontrado.");
            }
        } else if (commandData.response.type == "sticker") {
            const mediaPath = this.getMediaFromMessage(commandData.response.path);
            if (mediaPath) {
                newMedia = MessageMedia.fromFilePath(mediaPath);
                await this.client.sendMessage(message.from, newMedia, { sendMediaAsSticker: true });
            } else {
                console.error(`Sticker file not found: ${commandData.response.path}`);
                await this.client.sendMessage(message.from, "Arquivo de sticker não encontrado.");
            }
        }
    }

    async handleQuotedMessage(message, commandData) {
        if (message.hasQuotedMsg) {
            try {
                const quotedMessage = await message.getQuotedMessage();
                await chat.sendMessage(text, { mentions, quotedMessageId: quotedMessage.id._serialized, ignoreQuoteErrors: true });
            } catch (error) {
                console.error('Error sending quoted message:', error);
            }
        } else {
            await chat.sendMessage(text, { mentions });
        }
    }

    async mentionAll(message) {
        const chat = await message.getChat();
        if (!chat.isGroup) return message.reply('Esse comando só funciona em grupos!');
        
        let text = '';
        let mentions = [];

        for (let participant of chat.participants) {
            mentions.push(`${participant.id.user}@c.us`);
            text += `@${participant.id.user} `;
        };
    }
}