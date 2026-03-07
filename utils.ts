import { Glob } from 'bun';

export async function getInputFromUser(message: string): string {
    process.stdout.write(`\n${message}`);
    for await (const line of console) {
        return line;
    }
}

export async function frontMatter(scanningFolder: string, glob: Glob): Promise<{ path: string, frontmatter: string, content: string }[]> {
    const data = [];
    for await (const fileRelativePath of glob.scan(scanningFolder)) {
        const filepath = `${scanningFolder}/${fileRelativePath}`;
        const file = await Bun.file(filepath).text();
        const splits = file.split("---");
        data.push({ path: filepath, frontmatter: splits[1]?.trim(), content: splits[2]?.trim() });
    }

    return data;
}