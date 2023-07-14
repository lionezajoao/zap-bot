import Messages from "./messages.js";


const main = async () => {
    Messages.connect();
    Messages.handleCommand("!help", `
*!querida* -> Uma mensagem fofa
*!teste* -> Outra mensagem fofa
*!duvido* -> Uma ajuda fofa
*!vampeta* -> Uma foto fofa
*!vampetasso* -> Uma foto mais fofa
*!gatinho* -> Um gatinho fofo
*!vasco* -> Um time fofo
    `)

    Messages.handleCommand("!querida", "QUERIDA É MINHA XERECA");
    Messages.handleCommand("!teste", "VAI TOMAR NO CU PIRANHA");
    Messages.handleCommand("!duvido", "MEU PAU NO SEU OUVIDO");
    Messages.sendMediaMessage("!vampeta", "./media/vampeta.jpg");
    Messages.sendMediaMessage("!vampetasso", "./media/vampetasso.jpeg");
    Messages.sendMediaMessage("!gatinho", "./media/miau.mp3");
    // Messages.sendVideoMessage("!lula", "./media/lula.mpeg");
    Messages.sendMediaMessage("!vasco", "./media/vascao.jpeg");
    Messages.loveMail();
}

main()