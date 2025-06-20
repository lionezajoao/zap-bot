import mongoose from 'mongoose';
import fs from 'fs/promises';

export default class BotDB {
    constructor() {
        this.db = null;
    }

    async connectDB() {
        if (!this.db) {
            try {
                this.db = await mongoose.connect(process.env.MONGO_URI, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                });
                console.log('Database connected successfully');
            } catch (error) {
                console.error('Database connection error:', error);
            }
        }
        return this.db;
    }

    async disconnectDB() {
        if (this.db) {
            await mongoose.disconnect();
            this.db = null;
            console.log('Database disconnected successfully');
        }
    }

    async handleCommand(message) {
        if (this.db) {
            return await this.db.model('commands').findOne({ trigger: message.body });   
        }
    }

    async listCommands() {
        if (this.db) {
            return await this.db.model('commands').find({}, { _id: 0, trigger: 1, description: 1 }).lean();
        }
    }

    async buildDatabase() {
        try {
            await this.connectDB();

            const commandSchema = new mongoose.Schema({}, { strict: false });
            mongoose.model('commands', commandSchema);

            if ( await this.db.model('commands').exists() ) {
                console.log("Commands collection already exists. Skipping creation.");
                return;
            }
            console.log("Creating commands collection...");
            await this.db.model('commands').createCollection();
            console.log("Commands collection created successfully.");

            const commandsData = JSON.parse(
                await fs.readFile(new URL("../media/commands.json", import.meta.url), "utf-8")
            );

            await this.db.model('commands').insertMany(commandsData);
            console.log("Commands loaded from /media/commands.json and inserted successfully.");

        } catch (error) {
            console.error("Error connecting to the database:", error);
        } finally {
            await this.disconnectDB();
        }
    }
}