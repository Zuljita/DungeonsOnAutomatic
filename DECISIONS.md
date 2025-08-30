# Design Decisions

This document records design decisions made during development, especially when deviating from the original plan.

## `IWFCConstraint` Interface

**Decision:** The `IWFCConstraint` interface will not be changed to match the simplified version in `plan.md` at this time.

**Reasoning:** The current implementation of the WFC engine relies on the `Propagate` method in the `IWFCConstraint` interface. The `plan.md` file describes a simpler interface with only `Initialize` and `Check` methods. Removing `Propagate` would require a significant and potentially risky refactoring of the working WFC engine. The current interface is more detailed and has proven to be effective. We will proceed with the current interface and may revisit this decision later if a refactoring is deemed necessary.