import Messages from "./src/messages.js";

const main = async () => {
    await Messages.connect();
    Messages.runCommands();
}

main()