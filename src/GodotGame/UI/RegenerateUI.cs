using Godot;

namespace DungeonsOnAutomatic.GodotGame.UI
{
    public partial class RegenerateUI : Control
    {
        [Export]
        public Button? RegenerateButton { get; set; }

        [Export]
        public WorldGenerator? WorldGenerator { get; set; }

        public override void _Ready()
        {
            if (RegenerateButton != null)
            {
                RegenerateButton.Pressed += OnRegeneratePressed;
            }
        }

        private void OnRegeneratePressed()
        {
            WorldGenerator?.CallDeferred("Generate");
        }
    }
}

