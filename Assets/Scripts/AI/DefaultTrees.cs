// Assets/Scripts/AI/DefaultTrees.cs
// Factory methods for v1.0 default AI behavior tree.
// Simple 4-strategy AI: Defend-if-threatened > Attack-if-strong > Build-economy > Idle.

using UnityEngine;

namespace AnimalCiv.AI {

using AnimalCiv.AI.Nodes;

/// <summary>
/// Factory for v1.0 default AI tree. Single difficulty (medium).
/// Tree structure:
///   Selector (root)
///   ├─ Sequence: Defend (if enemy near base → recall unit)
///   ├─ Sequence: Attack (if strong enough → attack weakest enemy)
///   ├─ Sequence: Build (if has gold → build worker)
///   └─ Idle (do nothing — return Failure to end turn)
/// </summary>
public static class DefaultTrees {

    // Tunable constants (move to ScriptableObject FactionData later in Sprint 2)
    public const int DefendEnemyRadius = 3;
    public const int DefendMaxRecallDist = 5;
    public const int AttackRange = 3;
    public const int AttackMinMyUnits = 2;
    public const int WorkerCost = 50;
    public const int SoldierCost = 100;
    public const int TowerCost = 150;
    public const int WorkerDataId = 1001;
    public const int SoldierDataId = 1002;

    /// <summary>Default AI tree for v1.0. Single difficulty.</summary>
    public static BehaviorTree CreateDefaultTree(string name = "DefaultAI_v1") {
        // Strategy 1: Defend if threatened
        var defendBranch = new Sequence(
            "DefendBranch",
            new Condition_EnemyNearBase(DefendEnemyRadius, "EnemyNearBase?"),
            new Action_Defend(DefendMaxRecallDist, "RecallUnit"));

        // Strategy 2: Attack if we have ≥ N units
        var attackBranch = new Sequence(
            "AttackBranch",
            new Condition_HasEnoughMyUnits(AttackMinMyUnits, "StrongEnough?"),
            new Action_Attack(AttackRange, "AttackWeakest"));

        // Strategy 3: Build worker if can afford
        var buildBranch = new Sequence(
            "BuildBranch",
            new Condition_HasEnoughGold(WorkerCost, "Has50Gold?"),
            new Action_Build(BuildTargetKind.Worker, WorkerDataId, WorkerCost, "BuildWorker"));

        // Root: try each strategy in priority order
        var root = new Selector(
            "AI_Root",
            defendBranch,
            attackBranch,
            buildBranch
        );

        return new BehaviorTree(name, root);
    }
}

/// <summary>Condition: true if I have at least N units.</summary>
public sealed class Condition_HasEnoughMyUnits : BTCondition {
    private readonly int threshold;
    public Condition_HasEnoughMyUnits(int threshold, string name = null) : base(name) {
        this.threshold = threshold;
    }
    protected override bool OnEvaluate(BTContext ctx) => ctx.MyUnits.Count >= threshold;
}

} // namespace AnimalCiv.AI