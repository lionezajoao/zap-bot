import fs from "fs";
import qrcode from 'qrcode-terminal';
import wpp from 'whatsapp-web.js';

export default class Messages {
    constructor(){}

    static connect() {
        this.client = new wpp.Client({
            authStrategy: new wpp.LocalAuth(),
        });

        this.client.on("auth_failure", () => {
            this.client.on('qr', qr => {
                qrcode.generate(qr, { small: true });
            });
        })

        this.client.on('ready', () => {
            console.log('Client is ready!');
        });
        
        this.client.initialize();
    }

    static async getConnState() {
        console.log(this.client.getState());
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