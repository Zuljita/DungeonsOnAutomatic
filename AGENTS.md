I Agent Working Agreement
This document outlines the core principles and workflow for all AI agents contributing to this project. Adherence to these guidelines is mandatory to ensure a clean, maintainable, and rapidly evolving codebase.

1. Core Philosophy: Simplicity and Rapid Iteration
Our primary goal is to build a functional prototype quickly. We are not building enterprise software. This means we prioritize working code and simple solutions over complex architectural patterns. We will refactor and add complexity only when it becomes a necessity, not before. Backwards compatibility is not a concern; we will aggressively refactor and remove old code to make way for better implementations.

2. Pre-flight Checklist: Before You Code
Before beginning any task, you must perform the following steps:

Understand the Goal: Read the user's prompt and the relevant issue/ticket carefully. If the goal is unclear, ask for clarification.

Review Existing Code: You must review the current state of the files you will be modifying. Pay close attention to the existing data structures and logic. The key files to be aware of are:

src/Tagging/TaggingSystem.cs: Defines all logic for tags, affinities, and antagonisms.

src/Generation/WfcService.cs: Contains the core Wave Function Collapse solver.

src/Map/MapData.cs: The primary data structures for the generated map.

src/Godot/MapRenderer.cs: Handles visualization within the Godot engine.

Confirm Your Branch: Ensure you are on a feature branch that is appropriate for the task at hand (e.g., feature/add-new-tag-rules). Do not commit directly to main. Create a new branch if one does not exist.

3. The Golden Rules of Development
Single Path Principle: There must only be one way to do something.

Example: We will not have separate rendering logic for a command-line-interface and the Godot GUI. The core generation logic should produce a data object, and a single renderer should be responsible for visualizing it. If functionality needs to be shared, abstract it into a service that both paths can use.

Obsessively Remove Waste: Code is a liability.

If you refactor a system, you must remove the old code. Do not leave commented-out blocks of the old implementation.

Delete any helper functions, classes, or variables that are no longer used.

Your final commit for a task should leave the codebase cleaner than you found it.

No Backwards Compatibility: We have no users yet.

Do not hesitate to make breaking changes to data structures, method signatures, or file formats if it leads to a better design.

The priority is the best possible implementation for the next step, not preserving the last one. When you rip something out, replace it completely.

4. Post-Task Checklist: After You Code
Update Relevant Files: If your changes necessitate updates to other parts of the system (e.g., you added a new data field that the renderer needs to know about), you are responsible for making those updates.

Self-Correction: Review your generated code. Does it adhere to all the rules in this document? Is it simple? Did you remove all the old code?

Commit with Clarity: Write a clear and concise commit message that explains what you did and why.
