// Assets/Scripts/AI/Nodes/Action_Build.cs
// Build action — generic. Spawn a worker / soldier / building via ICommand.

using UnityEngine;

namespace AnimalCiv.AI.Nodes {

/// <summary>
/// Generic build action. Queues a BuildCommand and consumes gold.
/// Worker / soldier / building config passed in ctor.
/// </summary>
public sealed class Action_Build : BTAction {
    private readonly int costGold;
    private readonly BuildTargetKind kind;
    private readonly int dataId;

    public Action_Build(BuildTargetKind kind, int dataId, int costGold, string name = null)
        : base(name) {
        this.kind = kind;
        this.dataId = dataId;
        this.costGold = costGold;
    }

    protected override BTStatus OnExecute(BTContext ctx) {
        if (ctx.Gold < costGold) return BTStatus.Failure;
        if (ctx.ActionsRemainingThisTurn <= 0) return BTStatus.Failure;

        ctx.Gold -= costGold;
        ctx.ActionsRemainingThisTurn--;
        ctx.PendingCommands.Add(new BuildCommand(kind, dataId, ctx.MyBasePosition));
        if (ctx.DebugTrace) Debug.Log($"[BT] Build {kind} id={dataId} at {ctx.MyBasePosition}");
        return BTStatus.Success;
    }
}

public enum BuildTargetKind { Worker, Soldier, BuildingMainBase, BuildingBarracks, BuildingTower }

public sealed class BuildCommand : ICommand {
    public BuildTargetKind Kind { get; }
    public int DataId { get; }
    public Vector2Int Position { get; }

    public BuildCommand(BuildTargetKind kind, int dataId, Vector2Int position) {
        Kind = kind; DataId = dataId; Position = position;
    }

    public void Execute(BTContext ctx) {
        // Stub: real implementation in W2 (BattleLoop consumes these).
        // For v1.0 BT, we just record; BattleLoop applies to map.
    }
}

} // namespace AnimalCiv.AI.Nodes