export async function getInputFromUser(message: string): string {
    process.stdout.write(`\n${message}`);
    for await (const line of console) {
        return line;
    }
}

