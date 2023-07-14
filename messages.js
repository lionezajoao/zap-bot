import fs from "fs";
import qrcode from 'qrcode-terminal';
import wpp from 'whatsapp-web.js';


export default class Messages {
    constructor(){}

    static connect() {
        this.client = new wpp.Client({
            authStrategy: new wpp.LocalAuth(),
            puppeteer: {
                args: ['--no-sandbox'],
            }
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

    static handleCommand(command, response) {
        this.client.on('message', message => {
            if(message.body === command) {
                console.log(`Command ${ command } called from ${ message.from }`);
                message.reply(response);
            }
        });
    }

    static sendMediaMessage(command, mediaPath) {
        const newMedia = wpp.MessageMedia.fromFilePath(mediaPath)
        this.client.on('message', message => {
            if(message.body === command) {
                console.log(`Command ${ command } called from ${ message.from }`);
                message.reply(newMedia);
            }
        });
    }

    static sendVideoMessage(command, mediaPath) {
        const newMedia = wpp.MessageMedia.fromFilePath(mediaPath);
        this.client.on("message", message => {
            if(message.body === command) {
                this.client.sendMessage(message.from, newMedia);
            }
        });
    }

    static loveMail() {
        const responses = [
            "Ta precisando fuder hein...\nTomara que consiga!",
            "Que esse curreio te dê sorte!\nCurta o Sarraiálcool!",
        ]

        const meanResponses = [
            "Você precisa mandar alguma mensagem né coisa burra",
            "Sabe chegar em ninguém não, arrombade? Tu esqueceu da mensagem!"
        ]
        this.client.on('message', message => {
            console.log(`Command !curreio called from ${ message.from }`);
            if(message.body.startsWith("!curreio")) {
                const reply = message.body.split("!curreio");
                if(reply[1] == "") {
                    message.reply(meanResponses[Math.floor(Math.random()*responses.length)]);
                } else {
                    message.reply(`${ responses[Math.floor(Math.random()*responses.length)] }\n\nAgora, beba essa quantidade de shots: ${ Math.floor(Math.random()*5 + 1) }`);
                    this.client.sendMessage("120363143055632545@g.us", `*NOVO CORREIO!*\n\n${ reply[1] }`);
                }
                
            }
        })
    }

}