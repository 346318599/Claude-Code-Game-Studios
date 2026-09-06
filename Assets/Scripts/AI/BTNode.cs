// Assets/Scripts/AI/BTNode.cs
// Behavior Tree — Animal Civ, v1.0 Android single-player Roguelike
// Hand-rolled C# BT framework, no third-party dependencies.
// Target: Unity 6 LTS (IL2CPP, Android).

using UnityEngine;

namespace AnimalCiv.AI {

/// <summary>BT node return status. Standard 3-state semantics.</summary>
public enum BTStatus {
    /// <summary>Node completed its work successfully.</summary>
    Success,
    /// <summary>Node could not complete its work.</summary>
    Failure,
    /// <summary>Node is still working; tick again next frame.</summary>
    Running
}

/// <summary>
/// Base class for all BT nodes. Override <see cref="Tick"/>; optionally
/// <see cref="OnEnter"/> / <see cref="OnExit"/> for state transitions.
/// State-composite nodes (Sequence / Selector) track which child is currently
/// running and resume from there on subsequent ticks.
/// </summary>
public abstract class BTNode {
    /// <summary>Last Tick result. Defaults to Failure until first Tick.</summary>
    public BTStatus LastStatus { get; protected set; } = BTStatus.Failure;

    /// <summary>Human-readable name for debug logs and BT visualizer later.</summary>
    public string Name { get; set; }

    protected BTNode(string name = null) { Name = name ?? GetType().Name; }

    /// <summary>Called once when this node first becomes active in a branch.</summary>
    public virtual void OnEnter(BTContext ctx) { }

    /// <summary>Called when this node leaves the active branch (success / failure / abort).</summary>
    public virtual void OnExit(BTContext ctx) { }

    /// <summary>Called every frame the tree is ticked. Returns Success / Failure / Running.</summary>
    public abstract BTStatus Tick(BTContext ctx);

    /// <summary>Forced cancellation. Default: mark Failure, call OnExit.</summary>
    public virtual void Abort(BTContext ctx) {
        LastStatus = BTStatus.Failure;
        OnExit(ctx);
    }

    /// <summary>Reset transient state (e.g., current child index). Default: no-op.</summary>
    public virtual void Reset() {
        LastStatus = BTStatus.Failure;
    }
}

} // namespace AnimalCiv.AI