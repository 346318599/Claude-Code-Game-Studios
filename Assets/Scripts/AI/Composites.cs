// Assets/Scripts/AI/Composites.cs
// Composite BT nodes: Sequence, Selector, Parallel.
// State-composite: track currently-running child, resume from there.

using UnityEngine;

namespace AnimalCiv.AI {

/// <summary>
/// Sequence: ticks children left→right. Returns Failure on first child failure,
/// Running if any child is Running, Success only when all succeed.
/// </summary>
public sealed class Sequence : BTNode {
    private readonly BTNode[] children;
    private int currentIndex = 0;

    public Sequence(string name, params BTNode[] children) : base(name) {
        this.children = children ?? System.Array.Empty<BTNode>();
    }

    public Sequence(params BTNode[] children) : this(null, children) { }

    public override BTStatus Tick(BTContext ctx) {
        if (children.Length == 0) return BTStatus.Success;

        // Resume from currentIndex if last tick was Running
        while (currentIndex < children.Length) {
            var child = children[currentIndex];
            var status = child.Tick(ctx);

            switch (status) {
                case BTStatus.Success:
                    currentIndex++;
                    continue;
                case BTStatus.Failure:
                    Reset();
                    return BTStatus.Failure;
                case BTStatus.Running:
                    return BTStatus.Running;
            }
        }

        // All children succeeded
        Reset();
        return BTStatus.Success;
    }

    public override void Reset() {
        base.Reset();
        currentIndex = 0;
        foreach (var c in children) c.Reset();
    }

    public override void Abort(BTContext ctx) {
        if (currentIndex < children.Length) {
            children[currentIndex].Abort(ctx);
        }
        currentIndex = 0;
        LastStatus = BTStatus.Failure;
    }
}

/// <summary>
/// Selector: ticks children left→right until one succeeds.
/// Returns Success on first child success, Running if any is Running,
/// Failure only when all fail.
/// </summary>
public sealed class Selector : BTNode {
    private readonly BTNode[] children;
    private int currentIndex = 0;

    public Selector(string name, params BTNode[] children) : base(name) {
        this.children = children ?? System.Array.Empty<BTNode>();
    }

    public Selector(params BTNode[] children) : this(null, children) { }

    public override BTStatus Tick(BTContext ctx) {
        if (children.Length == 0) return BTStatus.Failure;

        while (currentIndex < children.Length) {
            var child = children[currentIndex];
            var status = child.Tick(ctx);

            switch (status) {
                case BTStatus.Success:
                    Reset();
                    return BTStatus.Success;
                case BTStatus.Failure:
                    currentIndex++;
                    continue;
                case BTStatus.Running:
                    return BTStatus.Running;
            }
        }

        Reset();
        return BTStatus.Failure;
    }

    public override void Reset() {
        base.Reset();
        currentIndex = 0;
        foreach (var c in children) c.Reset();
    }

    public override void Abort(BTContext ctx) {
        if (currentIndex < children.Length) {
            children[currentIndex].Abort(ctx);
        }
        currentIndex = 0;
        LastStatus = BTStatus.Failure;
    }
}

/// <summary>
/// Parallel: ticks ALL children each Tick. Returns:
/// - Failure if N or more children fail (default N=1)
/// - Success if ALL children succeed
/// - Running otherwise
/// </summary>
public sealed class Parallel : BTNode {
    private readonly BTNode[] children;
    private readonly int failureThreshold;

    public Parallel(string name, int failureThreshold, params BTNode[] children) : base(name) {
        this.children = children ?? System.Array.Empty<BTNode>();
        this.failureThreshold = failureThreshold;
    }

    public override BTStatus Tick(BTContext ctx) {
        int successCount = 0, runningCount = 0, failureCount = 0;

        foreach (var child in children) {
            var status = child.Tick(ctx);
            switch (status) {
                case BTStatus.Success: successCount++; break;
                case BTStatus.Running: runningCount++; break;
                case BTStatus.Failure: failureCount++; break;
            }
        }

        if (failureCount >= failureThreshold) {
            Abort(ctx);
            return BTStatus.Failure;
        }
        if (successCount == children.Length) {
            return BTStatus.Success;
        }
        return BTStatus.Running;
    }

    public override void Abort(BTContext ctx) {
        foreach (var child in children) child.Abort(ctx);
        LastStatus = BTStatus.Failure;
    }

    public override void Reset() {
        base.Reset();
        foreach (var c in children) c.Reset();
    }
}

} // namespace AnimalCiv.AI