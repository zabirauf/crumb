# Crumb (of an agent)

All the code in this project is handwritten. The goal of the project is to learn how to write a very simple agent that can improve itself and hot reload itself so improvements show up as user chats with it. I see this as hello world for self improving agent harness.

### Goals

The goal of the project is

* All code is hand written
* Keeping it under 200 lines of code
* No external libraries allowed except for what comes with Bun

### Axioms

Before building the project I had the following axioms

* Models are reliable enough in outputting valid code that hot reloading can be done
* Running Bash command is the primarily tool for agent to have (or build) wide capabilities
* Agents are now good at instruction following so multi-turn over decent amount of iterations don't go off track

### Why Bun?

Bun has a good set of libraries out of box with good ergonomics, which makes the goal of no libraries allowed possible. Primarily running bash and managing/creating worker process is easier, allowing us to build hot-reloading capabilities.

### Contributions

PRs wont be accepted, to keep the simplicity of the project. Any suggestions to improve or simplify while still meeting the goals, please create an issue.