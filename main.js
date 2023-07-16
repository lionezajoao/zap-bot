import Messages from "./messages.js";

const main = async () => {
    Messages.connect();
    Messages.runCommands();
}

main()