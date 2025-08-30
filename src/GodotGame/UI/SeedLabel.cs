using Godot;

namespace DungeonsOnAutomatic.GodotGame.UI
{
    public partial class SeedLabel : Label
    {
        [Export] public WorldGenerator? WorldGenerator { get; set; }

        public override void _Process(double delta)
        {
            if (WorldGenerator != null)
            {
                Text = WorldGenerator.Seed > 0
                    ? $"Seed: {WorldGenerator.Seed} (Press R to regenerate)"
                    : $"Seed: random (Press R to regenerate)";
            }
        }
    }
}

