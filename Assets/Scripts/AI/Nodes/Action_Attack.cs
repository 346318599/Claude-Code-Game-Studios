// Assets/Scripts/AI/Nodes/Action_Attack.cs
// Attack action: pick weakest enemy unit within range, queue attack command.

using System.Collections.Generic;
using UnityEngine;

namespace AnimalCiv.AI.Nodes {

public sealed class Action_Attack : BTAction {
    private readonly int attackRange;

    public Action_Attack(int attackRange = 3, string name = null) : base(name) {
        this.attackRange = attackRange;
    }

    protected override BTStatus OnExecute(BTContext ctx) {
        if (ctx.MyUnits.Count == 0) return BTStatus.Failure;
        if (ctx.ActionsRemainingThisTurn <= 0) return BTStatus.Failure;
        if (ctx.EnemyUnits.Count == 0) return BTStatus.Failure;

        // Pick the weakest enemy unit (lowest HP) — bang-for-buck AI logic
        UnitRuntime target = null;
        int minHp = int.MaxValue;
        foreach (var e in ctx.EnemyUnits) {
            if (e.Hp < minHp) { minHp = e.Hp; target = e; }
        }
        if (target == null) return BTStatus.Failure;

        // Pick one of my units close enough to attack (closest to enemy)
        UnitRuntime attacker = null;
        int minDist = int.MaxValue;
        foreach (var u in ctx.MyUnits) {
            int dx = Mathf.Abs(u.Position.x - target.Position.x);
            int dy = Mathf.Abs(u.Position.y - target.Position.y);
            int dist = dx + dy;
            if (dist <= attackRange && dist < minDist) {
                minDist = dist;
                attacker = u;
            }
        }
        if (attacker == null) return BTStatus.Failure;

        ctx.ActionsRemainingThisTurn--;
        ctx.PendingCommands.Add(new AttackCommand(attacker, target));
        if (ctx.DebugTrace) {
            Debug.Log($"[BT] Attack: {attacker.Position} -> {target.Position} (hp={target.Hp})");
        }
        return BTStatus.Success;
    }
}

public sealed class AttackCommand : ICommand {
    public UnitRuntime Attacker { get; }
    public UnitRuntime Target    { get; }

    public AttackCommand(UnitRuntime attacker, UnitRuntime target) {
        Attacker = attacker; Target = target;
    }

    public void Execute(BTContext ctx) {
        // Stub: real damage calc in W2 BattleLoop
        if (Target != null) {
            Target.Hp -= Attacker?.Attack ?? 1;
        }
    }
}

} // namespace AnimalCiv.AI.Nodes