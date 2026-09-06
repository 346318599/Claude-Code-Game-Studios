// Assets/Scripts/AI/Nodes/Action_Defend.cs
// Defend action: move weakest my unit toward my base to guard it.

using UnityEngine;

namespace AnimalCiv.AI.Nodes {

public sealed class Action_Defend : BTAction {
    private readonly int maxRecallDistance;

    public Action_Defend(int maxRecallDistance = 5, string name = null) : base(name) {
        this.maxRecallDistance = maxRecallDistance;
    }

    protected override BTStatus OnExecute(BTContext ctx) {
        if (ctx.ActionsRemainingThisTurn <= 0) return BTStatus.Failure;
        if (ctx.MyUnits.Count == 0) return BTStatus.Failure;

        // Pick my unit farthest from my base (so it returns to defend)
        UnitRuntime pick = null;
        int maxDist = -1;
        foreach (var u in ctx.MyUnits) {
            int dx = Mathf.Abs(u.Position.x - ctx.MyBasePosition.x);
            int dy = Mathf.Abs(u.Position.y - ctx.MyBasePosition.y);
            int dist = dx + dy;
            if (dist > maxDist && dist <= maxRecallDistance) {
                maxDist = dist;
                pick = u;
            }
        }
        if (pick == null) return BTStatus.Failure;

        ctx.ActionsRemainingThisTurn--;
        ctx.PendingCommands.Add(new DefendCommand(pick, ctx.MyBasePosition));
        if (ctx.DebugTrace) {
            Debug.Log($"[BT] Defend: recall {pick.Position} -> {ctx.MyBasePosition}");
        }
        return BTStatus.Success;
    }
}

public sealed class DefendCommand : ICommand {
    public UnitRuntime Unit { get; }
    public Vector2Int RallyPosition { get; }

    public DefendCommand(UnitRuntime unit, Vector2Int rallyPosition) {
        Unit = unit; RallyPosition = rallyPosition;
    }

    public void Execute(BTContext ctx) {
        // Stub: real movement in W2 BattleLoop.
        // For v1.0, BT just queues the intent.
    }
}

} // namespace AnimalCiv.AI.Nodes