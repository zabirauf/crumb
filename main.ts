import { $, Glob } from 'bun';

async function main() {
    // Initialization
    const SYSTEM: string = await Bun.file("SYSTEM.md").text();
    const messages: Parameters<typeof callModel>[0] = [];

    // Agent loop
    let pendingUserInput = true;
    while (true) {
        if (pendingUserInput) messages.push({role: "user", content: await getInputFromUser("User: ")});

        // Read skill front matter and updated SYSTEM prompt
        const skillData = await readSkillMetadata();
        const systemPrompt = SYSTEM.replace("${SKILLS}", JSON.stringify(skillData, undefined, 2));
        const resp = await callModel(messages, systemPrompt);

        // Handle response by either calling tool or outputting
        const toolResults = [];
        for (const content of resp.content) {
            const respHandleResult = await handleResponse(content);
            if (respHandleResult?.toolResult) {
                toolResults.push({type: "tool_result", tool_use_id: content.id, content: JSON.stringify(respHandleResult.toolResult, undefined, 2)});
            }
        }
        messages.push({role: "assistant", content: resp.content});
        messages.push({role: "user", content: toolResults});

        // If the turn has ended then wait for next user prompt
        pendingUserInput = resp.stop_reason == "end_turn";
    }
}

async function handleResponse(content: any): Promise<{toolResult: any } | undefined> {
    if (content.type == "tool_use" && content.name == "call_shell") {
        const userPerm = await getInputFromUser(`Run command:\n----\n\n${content.input.shellscript}\n\n----\n (y/n)`);
        if (userPerm.toLowerCase() == "y") {
            return { toolResult: await callShell(content.input.shellscript) };
        }
    } else if (content.type == "text") {
        process.stdout.write(`Assistant: ${content.text}`);
    } 

    return undefined;
}

async function getInputFromUser(message: string): string {
    process.stdout.write(`\n${message}`);
    for await (const line of console) {
        return line;
    }
}

async function readSkillMetadata(): Promise<{ path: string, frontmatter: string }[]> {
    const glob = Glob("**/SKILL.md");
    const skillFrontMatter = [];
    for await (const file of glob.scan("./SKILLS")) {
        const filepath = `./SKILLS/${file}`;
        const skillFile = await Bun.file(filepath).text();
        skillFrontMatter.push({ path: filepath, frontmatter: skillFile.split("---")[1]?.trim() });
    }

    return skillFrontMatter.filter(fm => !!fm.frontmatter);
}

async function callModel(messages: {role: "user" | "assistant", content: any}[], system: string): Promise<any> {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {headers: {"x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01"}, method: "POST", body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 32_768,
        tools: [ { name: "call_shell", description: "Runs shell commands on the computer", input_schema: { type: "object", properties: {"shellscript": { type: "string", description: "The shell command or script to run"}}, required: ["shellscript"]}}],
        messages,
        output_config: { effort: "high" },
        system
    })});
    return await resp.json();
}

async function callShell(command: string): Promise<{stdout: string, stderr: string, exitCode: number }> {
    const { stdout, stderr, exitCode } = await $`sh -c "${command}"`.nothrow().quiet();
    return { stdout: stdout.toString(), stderr: stderr.toString(), exitCode: exitCode }
}

await main();