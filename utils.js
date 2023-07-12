import fs from "fs";

class Utils {
    static checkSessionFile(name) {
        return fs.readFileSync(`session-${ name }.json`)
    }
}