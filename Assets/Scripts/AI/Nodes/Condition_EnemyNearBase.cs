// Assets/Scripts/AI/Nodes/Condition_EnemyNearBase.cs
// Condition: true if at least one enemy unit is within N tiles of my base.

using UnityEngine;

namespace AnimalCiv.AI.Nodes {

public sealed class Condition_EnemyNearBase : BTCondition {
    private readonly int radius;

    public Condition_EnemyNearBase(int radius, string name = null) : base(name) {
        this.radius = radius;
    }

    protected override bool OnEvaluate(BTContext ctx) {
        foreach (var enemy in ctx.EnemyUnits) {
            int dx = enemy.Position.x - ctx.MyBasePosition.x;
            int dy = enemy.Position.y - ctx.MyBasePosition.y;
            int dist = Mathf.Abs(dx) + Mathf.Abs(dy); // Chebyshev/Manhattan hybrid
            if (dist <= radius) return true;
        }
        return false;
    }
}

} // namespace AnimalCiv.AI.Nodes