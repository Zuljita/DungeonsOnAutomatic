namespace CoreLogic.Generation;

public interface IWfcConstraint
{
    void Initialize(WfcGrid grid);
    void Check(WfcGrid grid);
}