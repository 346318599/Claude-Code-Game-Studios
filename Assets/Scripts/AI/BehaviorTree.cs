// Assets/Scripts/AI/BehaviorTree.cs
// Top-level BT runner. Holds root node, ticks per AI turn, manages lifecycle.

using UnityEngine;

namespace AnimalCiv.AI {

/// <summary>
/// BehaviorTree runner. Holds the root BTNode and ticks it each AI turn.
/// Lifecycle: Construct → Tick(per turn) → optionally Abort (forced stop).
/// </summary>
public sealed class BehaviorTree {
    private readonly BTNode root;
    private readonly string treeName;

    public string TreeName => treeName;
    public BTNode Root => root;
    public BTStatus LastStatus => root?.LastStatus ?? BTStatus.Failure;

    public BehaviorTree(string treeName, BTNode root) {
        this.treeName = treeName ?? "UnnamedTree";
        this.root = root ?? throw new System.ArgumentNullException(nameof(root));
    }

    /// <summary>Tick the tree once. Returns root's status.</summary>
    public BTStatus Tick(BTContext ctx) {
        if (root == null) return BTStatus.Failure;
        return root.Tick(ctx);
    }

    /// <summary>Force-stop the tree at next tick. Recursively aborts any running subtree.</summary>
    public void Abort(BTContext ctx) {
        root?.Abort(ctx);
    }

    /// <summary>Reset all transient state (e.g., for re-entry after forced reset).</summary>
    public void Reset() {
        root?.Reset();
    }

    /// <summary>
    /// Run the tree to completion (until root returns Success or Failure).
    /// WARNING: only safe for trees without Running actions. For game use,
    /// prefer Tick per turn.
    /// </summary>
    public BTStatus RunToCompletion(BTContext ctx, int maxTicks = 1000) {
        for (int i = 0; i < maxTicks; i++) {
            var s = Tick(ctx);
            if (s != BTStatus.Running) return s;
        }
        Debug.LogWarning($"[BT:{treeName}] RunToCompletion hit maxTicks={maxTicks}");
        return BTStatus.Running;
    }
}

} // namespace AnimalCiv.AI