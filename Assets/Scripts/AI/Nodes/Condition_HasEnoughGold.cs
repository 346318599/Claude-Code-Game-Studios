// Assets/Scripts/AI/Nodes/Condition_HasEnoughGold.cs
// Condition: true if AI has at least N gold. Used to gate Build actions.

using UnityEngine;

namespace AnimalCiv.AI.Nodes {

public sealed class Condition_HasEnoughGold : BTCondition {
    private readonly int threshold;

    public Condition_HasEnoughGold(int threshold, string name = null) : base(name) {
        this.threshold = threshold;
    }

    protected override bool OnEvaluate(BTContext ctx) {
        return ctx.Gold >= threshold;
    }
}

} // namespace AnimalCiv.AI.Nodes