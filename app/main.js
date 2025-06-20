import Messages from "./src/messageHandler.js";
import BotDB from "./database/bot.js";

async function main() {
    try {
        const botDB = new BotDB();
        await botDB.buildDatabase();

        const bot = new Messages(botDB);
        await bot.connect();
        bot.runCommands();
        console.log("Bot started successfully.");
    } catch (error) {
        console.error("Failed to start bot:", error);
        process.exit(1);
    }
}

main();