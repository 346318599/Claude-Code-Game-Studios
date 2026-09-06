// Assets/Scripts/AI/LeafNodes.cs
// Action and Condition leaf node base classes + common decorators.

using UnityEngine;

namespace AnimalCiv.AI {

/// <summary>
/// Action: a leaf node that performs a side-effect (queue a command,
/// mutate state, request animation). Override <see cref="OnExecute"/>.
/// </summary>
public abstract class BTAction : BTNode {
    protected BTAction(string name = null) : base(name) { }

    public override BTStatus Tick(BTContext ctx) {
        if (LastStatus != BTStatus.Running) OnEnter(ctx);
        LastStatus = OnExecute(ctx);
        if (LastStatus != BTStatus.Running) OnExit(ctx);
        return LastStatus;
    }

    /// <summary>Override to perform the action. Return Running to be ticked again next frame.</summary>
    protected abstract BTStatus OnExecute(BTContext ctx);
}

/// <summary>
/// Condition: a leaf node that evaluates a predicate. Override
/// <see cref="OnEvaluate"/>. Returns Success on true, Failure on false.
/// Conditions never return Running.
/// </summary>
public abstract class BTCondition : BTNode {
    protected BTCondition(string name = null) : base(name) { }

    public override BTStatus Tick(BTContext ctx) {
        LastStatus = OnEvaluate(ctx) ? BTStatus.Success : BTStatus.Failure;
        return LastStatus;
    }

    protected abstract bool OnEvaluate(BTContext ctx);
}

// ─── Decorators ─────────────────────────────────────────────────────

/// <summary>Inverter: flips Success/Failure of the child.</summary>
public sealed class Inverter : BTNode {
    private readonly BTNode child;
    public Inverter(string name, BTNode child) : base(name) { this.child = child; }

    public override BTStatus Tick(BTContext ctx) {
        var s = child.Tick(ctx);
        if (s == BTStatus.Success) return BTStatus.Failure;
        if (s == BTStatus.Failure) return BTStatus.Success;
        return BTStatus.Running;
    }

    public override void Abort(BTContext ctx) { child.Abort(ctx); }
    public override void Reset() { base.Reset(); child.Reset(); }
}

/// <summary>Repeat: ticks child N times, ignoring result. -1 = infinite.</summary>
public sealed class Repeat : BTNode {
    private readonly BTNode child;
    private readonly int count;
    private int counter = 0;

    public Repeat(string name, BTNode child, int count) : base(name) {
        this.child = child;
        this.count = count;
    }

    public override BTStatus Tick(BTContext ctx) {
        if (count >= 0 && counter >= count) {
            counter = 0;
            return BTStatus.Success;
        }
        child.Tick(ctx);
        counter++;
        return BTStatus.Running;
    }

    public override void Abort(BTContext ctx) {
        child.Abort(ctx);
        counter = 0;
    }

    public override void Reset() {
        base.Reset();
        counter = 0;
        child.Reset();
    }
}

/// <summary>UntilFail: ticks child until it returns Failure (then Success).</summary>
public sealed class UntilFail : BTNode {
    private readonly BTNode child;
    public UntilFail(string name, BTNode child) : base(name) { this.child = child; }

    public override BTStatus Tick(BTContext ctx) {
        var s = child.Tick(ctx);
        return s == BTStatus.Failure ? BTStatus.Success : BTStatus.Running;
    }

    public override void Abort(BTContext ctx) { child.Abort(ctx); }
    public override void Reset() { base.Reset(); child.Reset(); }
}

} // namespace AnimalCiv.AI