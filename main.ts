import { $, Glob } from 'bun';
import { frontMatter } from './utils';

type Message = { role: "user" | "assistant", content: any };
type AgentWorkersData = { [path: string]: {worker: Worker, messages: Message[], path: string, folderPath: string }};

async function main() {
    // Initialization
    const agentGlob = new Glob("**/AGENT.md");
    const agentWorkers: AgentWorkersData = {};

    while (true) {
        const agentsFrontmatter = await frontMatter("./AGENTS", agentGlob);

        for (const agent of agentsFrontmatter) {
            if (!!agentWorkers[agent.folderPath]) continue;
            const agentData = await createAgent(agent, agentWorkers);
            agentData.messages.push({role: "user", content: "Start"});
            agentData.worker.postMessage({type: "start", systemPrompt: agent.content, messages: agentData.messages});
        }
        await Bun.sleep(1000);
    }
}

async function createAgent(agentFrontmatter: any, agentWorkers: AgentWorkersData) {
    const createAgentWorker = async () => {
        const file = Bun.file(`${agentFrontmatter.folderPath}/agent.ts`);
        const agentCode = new Blob([await file.arrayBuffer()], { type: "application/typescript" });
        return new Worker(URL.createObjectURL(agentCode));
    }

    const agentData = { worker: await createAgentWorker(), messages: [] as Message[], path: agentFrontmatter.path, folderPath: agentFrontmatter.folderPath };
    agentWorkers[agentFrontmatter.folderPath] = agentData;
    agentData.worker.onmessage = async (event) => {
        if (event.data.type == "exit") {
            agentData.worker.terminate();
            delete agentWorkers[agentData.folderPath];
        } else if (event.data.type == "restart") {
            agentData.worker.terminate();
            agentData.worker = await createAgentWorker();
            agentData.worker.postMessage({type: "start", systemPrompt: agentFrontmatter.content, messages: agentData.messages});
        }
    };

    console.log("Created agent", agentData);
    return agentData;
}

await main();