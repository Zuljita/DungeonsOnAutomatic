using CoreLogic.Generation;

namespace CoreLogic.Plugins;

public interface IEnrichmentPlugin
{
    string Name { get; }
    void EnrichMap(WfcGrid grid);
}