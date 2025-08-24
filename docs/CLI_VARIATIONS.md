# CLI Variations Command

The `variations` command allows you to generate multiple versions of the same dungeon concept, enabling comparison of different parameter settings and design approaches.

## Overview

Instead of manually running multiple generate commands with different settings, the variations command automates the process of creating related dungeons that share a base concept but differ in specific parameters.

## Usage

```bash
pnpm doa variations [options]
```

## Key Features

### 🎲 **Seed-Based Consistency**
- Uses a base seed to ensure related variations
- Automatically derives consistent seeds for each variation
- Reproducible results - same parameters always generate same variations

### 🔄 **Multiple Variation Methods**
- **Automatic variations**: Vary a parameter type with `--vary`
- **Specific comparisons**: Compare exact parameter sets
- **Flexible output**: Console display or file export

### 📁 **File Export Support**
- Save all variations to files for detailed comparison
- Multiple formats: ASCII (.txt), JSON (.json), FoundryVTT (.json)
- Customizable filenames and directories

## Command Options

### Basic Options
- `--seed <seed>` - Base random seed for all variations
- `--count <n>` - Number of variations to generate (default: 3)
- `--system <name>` - System module (generic|dfrpg, default: generic)

### Variation Types
- `--vary <parameter>` - Auto-vary: layout, rooms, size, corridors, shapes

### Specific Comparisons
- `--rooms <rooms...>` - Compare specific room counts (e.g., 5,8,12)
- `--layouts <layouts...>` - Compare layouts (e.g., rectangle,hexagon,cavernous)
- `--sizes <sizes...>` - Compare map sizes (e.g., 30x30,50x50,80x80)
- `--corridors <corridors...>` - Compare corridor types (e.g., straight,winding,maze)
- `--shapes <shapes...>` - Compare room shapes (e.g., rectangular,circular,diverse)

### Output Options
- `--ascii` - Display ASCII maps for all variations
- `--svg` - Generate SVG maps (saves to files)
- `--foundry` - Generate FoundryVTT JSON files
- `--output-dir <dir>` - Directory to save variations
- `--prefix <prefix>` - Filename prefix (default: "dungeon")

## Examples

### Basic Layout Comparison
```bash
# Generate 3 different layout types
pnpm doa variations --seed mycastle --vary layout
```

### Specific Room Count Analysis
```bash
# Compare dungeons with 5, 8, and 12 rooms
pnpm doa variations --seed adventure1 --rooms 5,8,12 --ascii
```

### Size Impact Study
```bash
# See how different map sizes affect the same seed
pnpm doa variations --seed testsize --sizes 30x30,50x50,80x80
```

### Save for Later Analysis
```bash
# Generate variations and save to files
pnpm doa variations --seed compare --vary corridors --output-dir ./my-dungeons --prefix castle-compare
```

### Layout Comparison with ASCII Output
```bash
# Compare specific layouts with visual output
pnpm doa variations --seed visual --layouts rectangle,hexagon,cavernous --ascii
```

## Automatic Variation Types

When using `--vary <parameter>`, the system automatically selects meaningful variations:

### `--vary layout`
- rectangle, hexagon, cavernous, cross, keep

### `--vary rooms` 
- 5, 8, 12, 16, 20 rooms

### `--vary size`
- 30x30, 50x50, 80x80 grid sizes

### `--vary corridors`
- straight, winding, maze corridor types

### `--vary shapes`
- rectangular, diverse, circular-preference room shapes

## Output Format

### Console Output
```
🎲 Generating 3 dungeon variations
📍 Base seed: mytest
⚙️  System: generic

🏰 Variation 1: rectangle layout
──────────────────────────────────────────────────
📊 Rooms: 8
📐 Size: 50x50
🚪 Doors: 14
🛤️  Corridors: 7 segments

🏰 Variation 2: hexagon layout
──────────────────────────────────────────────────
📊 Rooms: 6
📐 Size: 50x50  
🚪 Doors: 10
🛤️  Corridors: 5 segments

✅ All variations generated successfully!
```

### File Output
When using `--output-dir`, files are created with this naming pattern:
- `{prefix}-{number}.json` - Full dungeon data
- `{prefix}-{number}.txt` - ASCII map (if --ascii or default)
- `{prefix}-{number}-foundry.json` - FoundryVTT data (if --foundry)

## Use Cases

### 🎯 **Design Comparison**
Compare how different layout approaches affect the same basic dungeon concept.

### 🔍 **Parameter Impact Analysis**  
Understand how room count, map size, or corridor type changes affect dungeon character.

### 📚 **Campaign Preparation**
Generate multiple versions of a location to choose the best fit for your campaign.

### 🎲 **Random Variation Inspiration**
Use variations as creative inspiration when the first generation doesn't feel quite right.

### 🛠️ **Development Testing**
Test how parameter changes affect generation algorithms and output quality.

## Tips

### Seed Selection
- Use meaningful seeds related to your campaign or location
- Seeds can be words, numbers, or any string
- Same seed always produces same variations

### Parameter Combinations
- Start with `--vary layout` to see broad structural differences
- Use `--rooms` comparison to understand dungeon scale
- Combine `--ascii` with any variation for immediate visual feedback

### File Organization
```bash
# Organize by campaign
--output-dir ./campaign1/castle-variations --prefix ancient-keep

# Organize by parameter type  
--output-dir ./layout-studies --prefix layout-test
```

### Performance
- Variations are generated sequentially
- Each variation is a full dungeon generation
- Use `--count` to limit for faster testing

## Advanced Examples

### Multi-Parameter Campaign Prep
```bash
# Generate castle variations for campaign
pnpm doa variations --seed "ancient-fortress" --layouts rectangle,keep,cross --system dfrpg --output-dir ./campaign/castles --ascii
```

### Development Parameter Testing
```bash
# Test corridor algorithms
pnpm doa variations --seed dev-test --corridors straight,winding,maze --count 5 --ascii
```

### Size-Layout Matrix Study  
```bash
# First, test layouts
pnpm doa variations --seed matrix-test --vary layout --prefix layout-study --output-dir ./studies

# Then, test sizes with same seed
pnpm doa variations --seed matrix-test --vary size --prefix size-study --output-dir ./studies
```