import fs from "fs";
import qrcode from 'qrcode-terminal';
import { Client, LegacySessionAuth } from 'whatsapp-web.js';

const SESSION_FILE_PATH = './session.json';

let sessionData;
if(fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}

const client = new Client({
    authStrategy: new LegacySessionAuth({
        session: sessionData
    })
});

client.on('authenticated', (session) => {
    sessionData = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
        if (err) {
            console.error(err);
        }
    });
});
 

client.on('message', message => {
  console.log(message.body);
});

client.on('message', message => {
  if (message.body === '!teste') {
    console.log(message);
    message.reply('VAI TOMAR NO CU PIRANHA');
  }
});
