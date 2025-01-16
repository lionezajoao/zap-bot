import { MongoStore } from "wwebjs-mongo";
import mongoose from "mongoose";
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const { Client, LocalAuth, RemoteAuth, MessageMedia, Poll, GroupChat } = pkg;

import Utils from '../utils.js';
import SessionHandler from './sessionHandler.js';

export default class Messages extends Utils {
    constructor(){
        super();
    }

    static async connect(local = false) {

        const puppeteer_args = {
            headless: true,
            executablePath: "/usr/bin/chromium",
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
                    puppeteer: puppeteer_args
                });
            } else {
                const sessionHandler = new SessionHandler();
                await sessionHandler.setStore()
    
                console.log("Store set");
    
                this.client = new Client({
                    authStrategy: new RemoteAuth({
                        clientId: 'Bot',
                        dataPath: '../wwebjs-auth',
                        store: sessionHandler.store,
                        backupSyncIntervalMs: 600000
                    }),
                    puppeteer: puppeteer_args
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

    static runCommands() {
        this.client.on("message", async (message) => {
            await this.handleCommands(message)
        });
    }

    static async handleCommands(message) {
        let newMedia;
        const command = message.body;
        
        switch (command) {

            case "!help":
                console.log(`Command ${ command } called from ${ message.from }`);
                message.reply(this.removeIdentation(`
                *!querida* -> Uma mensagem fofa
                *!teste* -> Outra mensagem fofa
                *!duvido* -> Uma ajuda fofa
                *!vampeta* -> Uma foto fofa
                *!vampetasso* -> Uma foto mais fofa
                *!gatinho* -> Um gatinho fofo
                *!vasco* -> Um time fofo
                `));
                break;

            case "!ajuda":
                console.log(`Command ${ command } called from ${ message.from }`);

                message.reply(this.removeIndentation(`
                Bem-vinde ao Sarraiálcool! Aqui está o menu de opções do bot:
                
                *!curreio* -> Envie um correio amoroso de forma anônima para ser lido no microfone!
                Exemplo !curreio 'sua mensagem aqui'
                
                *!karaoke* -> Receba nossa lista de músicas aqui pelo WhatsApp!

                Qualquer dúvida fale com Gabriel, João Pedro ou alguém sóbrio.
                Aproveite a festa!
                `));
                break;
            
            case "!querida":
                console.log(`Command ${ command } called from ${ message.from }`);
                message.reply("QUERIDA É MINHA XERECA");
                break;
            
                case "!duvido":
                console.log(`Command ${ command } called from ${ message.from }`);
                message.reply("MEU PAU NO SEU OUVIDO");
                break;
            
            case "!teste":
                console.log(`Command ${ command } called from ${ message.from }`);
                message.reply("VAI TOMAR NO CU PIRANHA");
                break;
            
            case "!vampeta":
                console.log(`Command ${ command } called from ${ message.from }`);
                newMedia = MessageMedia.fromFilePath("./media/vampeta.jpg");
                    message.reply(newMedia);
                break;
            
            case "!vampetasso":
                console.log(`Command ${ command } called from ${ message.from }`);
                newMedia = MessageMedia.fromFilePath("./media/vampetasso.jpeg");
                    message.reply(newMedia);
                break;
            
            case "!gatinho":
                newMedia = MessageMedia.fromFilePath("./media/miau.mp3");
                console.log(`Command ${ command } called from ${ message.from }`);
                    message.reply(newMedia);
                break;
            
            case "!vasco":
                newMedia = MessageMedia.fromFilePath("./media/vascao.jpeg");
                console.log(`Command ${ command } called from ${ message.from }`);
                    message.reply(newMedia);
                break;
            
            case "!karaoke":
                console.log(`Command ${ command } called from ${ message.from }`);
                newMedia = MessageMedia.fromFilePath("./media/nacionais.pdf");
                message.reply(newMedia);
                newMedia = MessageMedia.fromFilePath("./media/internacionais.pdf");
                message.reply(newMedia);
                break;
            
            case "!all":
                console.log(`Command ${ command } called from ${ message.from }`);
                await this.mentionAll(message);
            
            default:
                if (command.startsWith("!curreio")) {
                    console.log(`Command ${command} called from ${message.from}`);
                    this.loveMail(message);
                  }
                break;
        }

    }
    
    static async mentionAll(message) {
        const chat = await message.getChat();
        if (!chat.isGroup) return message.reply('Esse comando só funciona em grupos!');
        
        let text = '';
        let mentions = [];

        for (let participant of chat.participants) {
            mentions.push(`${participant.id.user}@c.us`);
            text += `@${participant.id.user} `;
        }

        await chat.sendMessage(text, { mentions });
    }

    static loveMail(message) {
        const responses = [
            "Ta precisando fuder hein...\nTomara que consiga!",
            "Que esse curreio te dê sorte!\nCurta o Sarraiálcool!",
        ]

        const meanResponses = [
            "Você precisa mandar alguma mensagem né coisa burra",
            "Sabe chegar em ninguém não, arrombade? Tu esqueceu da mensagem!"
        ]

        if(message.body.startsWith("!curreio")) {
            const reply = message.body.split("!curreio");
            if(reply[1] == "") {
                message.reply(meanResponses[Math.floor(Math.random()*responses.length)]);
            } else {
                message.reply(`${ responses[Math.floor(Math.random()*responses.length)] }\n\nAgora, beba essa quantidade de shots: ${ Math.floor(Math.random()*5 + 1) }`);
                this.client.sendMessage("120363143055632545@g.us", `*NOVO CORREIO!*\n\n${ reply[1] }`);
            }
            
        }
    }

}