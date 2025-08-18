# Plugin Developer Guide

## Getting Started

This guide walks through creating your first DungeonsOnAutomatic (DOA) plugin.
Plugins extend the core features of DOA without modifying the main codebase.

### Prerequisites

- Node.js LTS and pnpm installed
- Familiarity with JavaScript or TypeScript
- A local clone of the DOA repository or a project using the DOA CLI

### Project Structure

An example plugin lives in `examples/plugins/minimal-system` and contains:

```
minimal-system/
├── index.js            # Plugin implementation
├── package.json        # Metadata describing the plugin
└── README.md           # Documentation for the plugin
```

Each plugin must expose a default export that implements the interface for its
plugin type. Metadata in `package.json` describes the plugin to the loader.

## Development Workflow

1. **Create a plugin folder** in your project's `plugins/` directory or clone
   the examples.
2. **Implement required methods** for your plugin type. For a system plugin this
   includes an `enrich` function that receives generated dungeon data.
3. **Test locally** using the CLI with the `--plugin-path` option or by copying
   the plugin into `plugins/`.
4. **Validate** the plugin:

   ```bash
   pnpm doa plugins validate my.plugin.id
   ```

5. **Iterate** on the plugin until validation and tests pass.

## Publishing

Plugins are regular npm packages. To distribute a plugin:

1. Ensure `package.json` includes a unique `doaPlugin.id` and the appropriate
   `doaPlugin.type` field.
2. Publish to npm or share the package folder directly.
3. Users install plugins into their project's `plugins/` directory or via npm.

## Further Reading

- [Plugin API Specification](./plugin-api-specification.md) – details all
  available interfaces.
- [Plugin Configuration Schema](./plugin-configuration-schema.md) – describes
  plugin configuration and CLI integration.
- [Plugin Security Guidelines](./plugin-security-guidelines.md) – security and
  sandboxing requirements.

## Example Plugins

Reference implementations are available in the `examples/plugins` directory:

- **Minimal System Plugin** – demonstrates the smallest possible system module.
- **Circular Room Generator** – shows how to provide a custom room generator.

Use these as templates when building your own extensions.
