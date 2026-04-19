import { $, Glob } from 'bun';
import { frontmatter, getInputFromUser } from '../utils';
// prevents TS errors
declare var self: Worker;

self.onmessage = async (event) => {
    if (event.data.type == "start") {
        event.data.messages.push({role: "user", content: "Start"});
    }

    if (event.data.type == "start" || event.data.type == "restart") {
        void runAgentLoop(event.data.systemPrompt, event.data.frontmatter, event.data.messages);
    }
}

async function runAgentLoop(systemPromptTemplated: string, frontmatterStr: string, messages: Parameters<typeof callModel>[0]) {
    // Initialization
    const globSkill = Glob("**/SKILL.md");
    let agentRunState: "run" | "stop" | "restart" = "run";

    // Agent loop
    while (agentRunState == "run") {
        // Read skill front matter and updated SYSTEM prompt
        const skillData = (await frontmatter("./SKILLS", globSkill)).map(sd => ({path: sd.path, frontmatter: sd.frontmatter}));
        const systemPrompt = systemPromptTemplated.replace("${SKILLS}", !skillData || skillData.length == 0 
            ? "No SKILLs found" 
            : JSON.stringify(skillData, undefined, 2 /* Space ident */));
        const resp = await callModel(messages, systemPrompt);

        // Handle response by either calling tool or responding
        let clearConversation = false;
        const toolResults = [];
        for (const content of resp.content) {
            const respHandleResult = await handleResponse(frontmatterStr, content);
            if (respHandleResult?.runState) {
                // If there is any change in run state then update that
                agentRunState = respHandleResult.runState;
            }
            respHandleResult && toolResults.push({type: "tool_result", tool_use_id: content.id, content: JSON.stringify(respHandleResult.toolResult, undefined, 2)});
            clearConversation = clearConversation || respHandleResult?.action == "clear_conversation";
        }

        if (clearConversation) {
            messages = [{role: "user", content: "Start"}];
        } else {
            messages.push({role: "assistant", content: resp.content});
            messages.push({role: "user", content: toolResults});
        }
    }

    // Terminate the worker
    agentRunState == "stop" ? 
        postMessage({type: "exit", messages}) 
        : postMessage({type: "restart", messages});
}

let yoloMode = false;
async function handleResponse(frontmatter: string, content: any): Promise<{toolResult: any } | { runState: "stop" | "restart", toolResult: string } | { action: "clear_conversation", toolResult: any | undefined} | undefined> {
    if (content.type == "tool_use" && content.name == "call_shell") {
        let userPerm = yoloMode ? "y" : await getInputFromUser(`Run command:\n----\n\n${content.input.shellscript}\n\n----\n (y/n/yolo)`);
        if (userPerm.toLowerCase() == "yolo") {
            yoloMode = true;
            userPerm = "y";
        }
        if (userPerm.toLowerCase() == "y") {
            yoloMode && process.stdout.write(`Running command:\n----\n\n${content.input.shellscript}\n\n----\n`);
            return { toolResult: await callShell(content.input.shellscript) };
        }
    } else if (content.type == "tool_use" && content.name == "get_user_input") {
        // Only allow user input if specifically allowed in agent frontmatter
        return frontmatter.indexOf("interactive: yes") !== -1 ? { toolResult: await getInputFromUser("User: ")} : { toolResult: "User input is not allowed" };
    } else if (content.type == "tool_use" && content.name == "exit") {
        process.stdout.write('Agent Exiting ...\n');
        return { runState: "stop", toolResult: "Stopped Agent" };
    } else if (content.type == "tool_use" && content.name == "restart") {
        process.stdout.write('Agent Restarting...\n');
        return { runState: "restart", toolResult: "Restarted Agent" };
    } else if (content.type == "tool_use" && content.name == "clear_conversation") {
        process.stdout.write('Clearing conversation\n');
        return { action: "clear_conversation" };
    } else if (content.type == "text") {
        process.stdout.write(`Assistant: ${content.text}\n`);
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
            { name: "clear_conversation", description: "Run this only if user enters '/clear' which indicates they want to clear the conversation, otherwise never run this.", input_schema: {type:"object", properties: {}}},
            { name: "exit", description: "Run this if the agent should exit", input_schema: {type: "object", properties: { }} },
        ],
        cache_control: { type: "ephemeral" },
        system,
        messages,
        output_config: { effort: "high" },
    })});
    return await resp.json();
}

async function callShell(command: string): Promise<{stdout: string, stderr: string, exitCode: number }> {
    const { stdout, stderr, exitCode } = await $`sh -c "${command}"`.nothrow().quiet();
    return { stdout: stdout.toString(), stderr: stderr.toString(), exitCode: exitCode }
}
