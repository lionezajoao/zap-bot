import { MongoStore } from "wwebjs-mongo";
import mongoose from "mongoose";
import wpp from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv'
dotenv.config({ path: "./.env" })

import Utils from '../utils.js';

export default class Messages extends Utils {
    constructor(){
        super();
    }

    static async connect() {

        try {
            await mongoose.connect("mongodb://127.0.0.1/whatsjs", {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                })
            .then(()=> {
                const store = new MongoStore({ mongoose });
                this.client = new wpp.Client({
                    authStrategy: new wpp.RemoteAuth({
                        store,
                        clientId: "test",
                        backupSyncIntervalMs: 300000,
                    }),
                    puppeteer: {
                        args: ['--no-sandbox'],
                    }
                });
            })
        } catch(err) {
            throw new Error(err);
        }
        
        // this.client = new wpp.Client({
        //     authStrategy: new wpp.LocalAuth(),
        //     puppeteer: {
        //         args: ['--no-sandbox'],
        //     }
        // });

        this.client.on("remote_session_saved", () => {
            console.log("remote session exist");
            socket.emit("wa_ready", { status: true });
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
        this.client.on("message", message => {
            this.handleCommands(message)
        });
    }

    static handleCommands(message) {
        let newMedia;
        const command = message.body;
        
        switch (command) {

            case "!help":
                console.log(`Command ${ command } called from ${ message.from }`);
                message.reply(this.removeIndentation(`
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
                newMedia = wpp.MessageMedia.fromFilePath("./media/vampeta.jpg");
                    message.reply(newMedia);
                break;
            
            case "!vampetasso":
                console.log(`Command ${ command } called from ${ message.from }`);
                newMedia = wpp.MessageMedia.fromFilePath("./media/vampetasso.jpeg");
                    message.reply(newMedia);
                break;
            
            case "!gatinho":
                newMedia = wpp.MessageMedia.fromFilePath("./media/miau.mp3");
                console.log(`Command ${ command } called from ${ message.from }`);
                    message.reply(newMedia);
                break;
            
            case "!vasco":
                newMedia = wpp.MessageMedia.fromFilePath("./media/vascao.jpeg");
                console.log(`Command ${ command } called from ${ message.from }`);
                    message.reply(newMedia);
                break;
            
            case "!karaoke":
                console.log(`Command ${ command } called from ${ message.from }`);
                newMedia = wpp.MessageMedia.fromFilePath("./media/nacionais.pdf");
                message.reply(newMedia);
                newMedia = wpp.MessageMedia.fromFilePath("./media/internacionais.pdf");
                message.reply(newMedia);
                break;
            
            default:
                if (command.startsWith("!curreio")) {
                    console.log(`Command ${command} called from ${message.from}`);
                    this.loveMail(message);
                  }
                break;
        }

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