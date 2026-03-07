import { $, Glob } from 'bun';
import { frontMatter, getInputFromUser } from './utils';
// prevents TS errors
declare var self: Worker;

self.onmessage = async (event) => {
    console.log("Received message", event.data);
    if (event.data.type == "start") {
        void runAgentLoop(event.data.systemPrompt, event.data.messages);
    }
}

async function runAgentLoop(systemPromptTemplated: string, messages: Parameters<typeof callModel>[0]) {
    // Initialization
    const globSkill = Glob("**/SKILL.md");
    let agentRunState: "run" | "stop" | "restart" = "run";

    // Agent loop
    while (agentRunState == "run") {
        // Read skill front matter and updated SYSTEM prompt
        const skillData = (await frontMatter("./SKILLS", globSkill)).map(sd => ({path: sd.path, frontMatter: sd.frontmatter}));
        const systemPrompt = systemPromptTemplated.replace("${SKILLS}", JSON.stringify(skillData, undefined, 2));
        const resp = await callModel(messages, systemPrompt);
        console.log("Model response", resp);

        // Handle response by either calling tool or outputting
        const toolResults = [];
        for (const content of resp.content) {
            const respHandleResult = await handleResponse(content);
            if (respHandleResult?.toolResult) {
                toolResults.push({type: "tool_result", tool_use_id: content.id, content: JSON.stringify(respHandleResult.toolResult, undefined, 2)});
            } else if (respHandleResult?.runState) {
                agentRunState = respHandleResult.runState;
            }
        }
        messages.push({role: "assistant", content: resp.content});
        messages.push({role: "user", content: toolResults});
    }

    // Terminate the worker
    agentRunState == "stop" ? postMessage({type: "exit"}) : postMessage({type: "restart"});
}

async function handleResponse(content: any): Promise<{toolResult: any } | { runState: "stop" | "restart" } | undefined> {
    console.log("Entered handle response", content);
    if (content.type == "tool_use" && content.name == "call_shell") {
        const userPerm = await getInputFromUser(`Run command:\n----\n\n${content.input.shellscript}\n\n----\n (y/n)`);
        if (userPerm.toLowerCase() == "y") {
            return { toolResult: await callShell(content.input.shellscript) };
        }
    } else if (content.type == "tool_use" && content.name == "get_user_input") {
        return { toolResult: await getInputFromUser("User: ")};
    } else if (content.type == "tool_use" && content.name == "exit") {
        process.stdout.write(`Agent Exiting ...`);
        return { runState: "stop" };
    } else if (content.type == "tool_use" && content.name == "restart") {
        process.stdout.write(`Agent Restarting...`);
        return { runState: "restart" };
    } else if (content.type == "text") {
        process.stdout.write(`Assistant: ${content.text}`);
        return undefined;
    }
}

async function callModel(messages: {role: "user" | "assistant", content: any}[], system: string): Promise<any> {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {headers: {"x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01"}, method: "POST", body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 32_768,
        tools: [ 
            { name: "call_shell", description: "Runs shell commands on the computer", input_schema: { type: "object", properties: {"shellscript": { type: "string", description: "The shell command or script to run"}}, required: ["shellscript"]}},
            { name: "get_user_input", description: "Run this to get prompt from user", input_schema: {type: "object", properties: { }} },
            { name: "restart", description: "Run this if the agent should restarted for example due to agent runtime changing", input_schema: {type: "object", properties: { }} },
            { name: "exit", description: "Run this if the agent should exit", input_schema: {type: "object", properties: { }} },
        ],
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
