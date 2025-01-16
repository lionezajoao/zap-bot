import fs from "fs";

export default class Utils {
    static removeIdentation(str) {
        const lines = str.split('\n');
        const leadingWhitespace = lines[1].match(/^\s*/)[0];
        const pattern = new RegExp(`^${leadingWhitespace}`);
        return lines.map((line) => line.replace(pattern, '')).join('\n');
    };
}