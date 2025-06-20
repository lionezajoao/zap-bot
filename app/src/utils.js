import fs from 'fs';
import path from 'path';

export default class Utils {
    removeIdentation(str) {
        const lines = str.split('\n');
        const leadingWhitespace = lines[1].match(/^\s*/)[0];
        const pattern = new RegExp(`^${leadingWhitespace}`);
        return lines.map((line) => line.replace(pattern, '')).join('\n');
    };

    deleteSingletonFiles(absoluteProfilePath) {
        try {
            const files = fs.readdirSync(absoluteProfilePath);
            for (const file of files) {
                if (file.includes('Singleton')) {
                    const filePath = path.join(absoluteProfilePath, file);
                    console.log(`deleting ${filePath}`);
                    fs.unlinkSync(filePath);
                }
            }
        } catch (e) {
            console.error(`Error deleting singleton files: ${e.message}`);
        }
    }

    getMediaFromMessage(mediaName) {
        const mediaDir = path.resolve('./app/media');
        const files = fs.readdirSync(mediaDir);

        const found = files.find(file => file.toLowerCase().startsWith(mediaName.toLowerCase()));
        if (found) {
            return path.join(mediaDir, found);
        }
        return null;
    }
}