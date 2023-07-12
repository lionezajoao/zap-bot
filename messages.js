import fs from "fs";
import qrcode from 'qrcode-terminal';
import wpp from 'whatsapp-web.js';


export default class Messages {
    constructor(){}

    static connect() {
        this.client = new wpp.Client({
            authStrategy: new wpp.LocalAuth(),
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
                message.reply(response);
            }
        });
    }

    static sendMediaMessage(command, media) {
        const newMedia = wpp.MessageMedia.fromFilePath(media)
        this.client.on('message', message => {
            if(message.body === command) {
                message.reply(newMedia);
            }
        });
    }

}