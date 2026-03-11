import { $, Glob } from 'bun';
import { frontMatter } from './utils';

type Message = { role: "user" | "assistant", content: any };
type AgentWorkersData = { [path: string]: {worker: Worker, messages: Message[], path: string, folderPath: string }};

async function main() {
    const agentGlob = new Glob("**/AGENT.md");
    const agentWorkers: AgentWorkersData = {};

    while (true) {
        // On each iteration of loop, start any new agents that haven't run before
        const agentsFrontmatter = await frontMatter("./AGENTS", agentGlob);

        for (const agent of agentsFrontmatter) {
            if (!!agentWorkers[agent.folderPath]) continue;
            const agentData = await createAgent(agent, agentWorkers);
            agentData.worker.postMessage({type: "start", systemPrompt: agent.content, messages: agentData.messages});
        }
        await Bun.sleep(1000);
    }
}

async function createAgent(agentFrontmatter: any, agentWorkers: AgentWorkersData) {
    const createAgentWorker = async () => {
        // Load the agent code dynamically, which allows the agent to update while being used
        const file = Bun.file(`${agentFrontmatter.folderPath}/agent.ts`);
        const agentCode = new Blob([await file.arrayBuffer()], { type: "application/typescript" });
        return new Worker(URL.createObjectURL(agentCode));
    }

    let worker: Worker | null = await createAgentWorker();
    const agentData = { worker, messages: [] as Message[], path: agentFrontmatter.path, folderPath: agentFrontmatter.folderPath };
    agentWorkers[agentFrontmatter.folderPath] = agentData;

    const setupWorkerOnMessage = () => {
        worker!.onmessage = async (event) => {
            if (event.data.type == "exit") {
                agentData.worker.terminate();
                agentData.worker.onmessage = null;
                worker = null; 
                delete agentWorkers[agentData.folderPath];
            } else if (event.data.type == "restart") {
                agentData.messages = event.data.messages;
                agentData.worker.terminate(); // Terminate the worker
                worker = await createAgentWorker(); // Create new worker set to `worker` so setupWorkerOnMessage closure can use it
                agentData.worker = worker;
                setupWorkerOnMessage(); // Resetup the onmessage handler
                worker.postMessage({type: "restart", systemPrompt: agentFrontmatter.content, messages: agentData.messages});
                process.stdout.write("Agent restart complete\n");
            }
        };
    };
    setupWorkerOnMessage(); // Call setup onmessage handler for first time

    return agentData;
}

await main();