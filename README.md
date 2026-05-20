![Crumb logo](assets/logo.svg)

# Crumb (of an agent)
Crumb is a small, handwritten, self-improving agent. You can use it to improve itself and progressively do complex tasks.

The goal of the project is to learn how to write a very simple agent that can improve itself and hot reload so improvements show up as user chats with it. It's a simple hello world for self improving agent harness. This may help demystify that there is no magic behind all the coding harness/agents by giving learning a simple example to learn from.

The demo shows how the agent can improve itself into a nice TUI while running. Wait for few seconds and you'll see the Crumb CLI transforming into a decent TUI and continuing conversation with user.

![Crumb demo](assets/demo.gif)

## How to run

1. Clone/Download the repo
2. Install [Bun.js](https://bun.com)
3. Make sure you have `ANTHROPIC_API_KEY` set in your environment variables e.g. `export ANTHROPIC_API_KEY=...`
4. Run `bun main.ts`

Note: By default any shell commands that need to run ask user permission. If you want to run using yolo mode (i.e. all shell commands approved by default) then would recommend it to run in an isolated environment where you don't have risk of it deleting, leaking information.

## Goals

The goal of the project is

* All code is hand written
* Keep the code quickly readable for humans (currently under 200 LOC)
* No external libraries allowed except for what comes with Bun

## Axioms

Before building the project I had the following axioms

* Models are reliable enough in outputting valid code that hot reloading can be done
* Running Bash command is the primarily tool for agent to have (or build) wide capabilities
* Agents are now good at instruction following so multi-turn over decent amount of iterations don't go off track
* Prefer adding to prompt than adding code for feature and let the agent rip, will yield in more capabilities

## Structure of Project

* **main.ts**: This is the main agent running, which looks for any unrun agent in AGENTS folder and runs them. It creates a new worker/process for each agent bu dynamically loading the code in AGENTS/**/agent.ts
* **AGENTS/base-agent**: This is the base agent that runs when you first start Crumb. The system prompt for that agent is in `AGENTS/base-agent/AGENT.md`
* **AGENTS/base-agent/agent.ts**: This is the agent runtime, which exposes 5 tools `get_user_input`, `call_shell`, `clear_conversation` `restart` and `exit`. Its responsible for running the agent loop and executing the tools.

## How does it work?

The `main.ts` runs a loop that looks for AGENTS/\*\*/AGENT.md, and if one exists that it hasn't ran before then it loads the runtime from AGENTS/\*\*/agent.ts by loading the code in file and creating a Worker (which is its own isolated JS runtime). 
The way hot-reloading works is that, if the agent sends back message `restart` then it gets the latest conversation state, reloads the code, creates a new worker and passes in the conversation state so that the updated agent runs but still maintaining its previous conversation history. This is what gives agent the continuity as it hot-reloads.

The `agent.ts` is the agent loop, which calls LLM and exposes multiple tools and let LLM decide what to do next. The `call_shell` is the most powerful tool as it gives agent the ability to run any command. The tool is protected by asking user permission to run the command, every time its called. User can decide to allow all future commands by typing `yolo` but be careful if you do that and run in an isolated environment.

## Why Bun?

Bun has a good set of libraries out of box with good ergonomics, which makes the goal of no libraries allowed possible. Primarily running bash and managing/creating worker process is easier, allowing us to build hot-reloading capabilities.

## Contributions

PRs wont be accepted, to keep the simplicity of the project. Any suggestions to improve or simplify while still meeting the goals, please create an issue.