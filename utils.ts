import { Glob } from 'bun';

export async function getInputFromUser(message: string): string {
    process.stdout.write(`\n${message}`);
    for await (const line of console) {
        return line;
    }
}

export async function frontMatter(scanningFolder: string, glob: Glob) {
    const data = [];
    for await (const fileRelativePath of glob.scan(scanningFolder)) {
        const filepath = `${scanningFolder}/${fileRelativePath}`;
        const file = await Bun.file(filepath).text();
        const splits = file.split("---");
        const folderPath = `${scanningFolder}/${fileRelativePath.split("/").reverse().slice(1).reverse().join("/")}`
        data.push({ path: filepath, folderPath, frontmatter: splits[1]?.trim(), content: splits[2]?.trim() });
    }

    return data;
}