import { Glob } from 'bun';

export async function getInputFromUser(message: string): string {
    process.stdout.write(`\n${message}`);
    for await (const line of console) {
        return line;
    }
}

const FRONTMATTER_REGEX_PATTERN = /(.+):(.+)$/gm;

export async function frontMatter(scanningFolder: string, glob: Glob) {
    const data = [];
    for await (const fileRelativePath of glob.scan(scanningFolder)) {
        const filepath = `${scanningFolder}/${fileRelativePath}`;
        const file = await Bun.file(filepath).text();
        const splits: string[] = file.split("---");
        const folderPath = `${scanningFolder}/${fileRelativePath.split("/").reverse().slice(1).reverse().join("/")}`
        const parsedFrontMatter = splits[1]?.trim().split("\n").map(line => FRONTMATTER_REGEX_PATTERN.exec(line))).reduce((dict, val) => (dict[val[1]] = val[2]));
        data.push({ path: filepath, folderPath, frontmatter: splits[1]?.trim(), content: splits[2]?.trim() });
    }

    return data;
}