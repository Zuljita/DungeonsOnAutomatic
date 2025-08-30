using DungeonsOnAutomatic.CoreLogic.Map;

namespace DungeonsOnAutomatic.CoreLogic.Plugins
{
    /// <summary>
    /// Optional plugin for post-processing a successfully generated map.
    /// </summary>
    public interface IEnrichmentPlugin
    {
        string Name { get; }
        string Description { get; }

        /// <summary>
        /// Enriches the generated map with additional features.
        /// </summary>
        /// <param name="mapData">The generated map data. 
        /// TODO: This will be replaced with a RoomGraphArtifact in Phase 4.</param>
        void Enrich(MapData mapData);
    }
}
