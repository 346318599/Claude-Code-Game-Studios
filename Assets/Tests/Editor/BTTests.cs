// Assets/Tests/Editor/BTTests.cs
// NUnit tests for Behavior Tree framework. Run via Unity Test Runner (EditMode).
// Tests cover: BTNode lifecycle, Sequence semantics, Selector semantics,
// composite state retention (Running resumes from currentIndex),
// default AI tree end-to-end behavior.

using NUnit.Framework;
using UnityEngine;
using AnimalCiv.AI;
using AnimalCiv.AI.Nodes;

namespace AnimalCiv.Tests {

public class BTTests {

    private BTContext MakeCtx(int gold = 0, int units = 0, int enemies = 0) {
        var ctx = new BTContext {
            Gold = gold,
            ActionsRemainingThisTurn = 5,
            MyBasePosition = new Vector2Int(0, 0),
            EnemyBasePosition = new Vector2Int(10, 10),
            Rng = new System.Random(42),
            DebugTrace = false
        };
        for (int i = 0; i < units; i++) {
            ctx.MyUnits.Add(new UnitRuntime {
                UnitDataId = 1001, Hp = 10, HpMax = 10, Attack = 3,
                Position = new Vector2Int(1, 1)
            });
        }
        for (int i = 0; i < enemies; i++) {
            ctx.EnemyUnits.Add(new UnitRuntime {
                UnitDataId = 2001, Hp = 5, HpMax = 5, Attack = 2,
                Position = new Vector2Int(2, 0)  // within 3 tiles of my base
            });
        }
        return ctx;
    }

    // ─── Basic node ─────────────────────────────────────────────────

    [Test]
    public void Sequence_Empty_Succeeds() {
        var seq = new Sequence("Empty");
        var ctx = MakeCtx();
        Assert.AreEqual(BTStatus.Success, seq.Tick(ctx));
    }

    [Test]
    public void Sequence_AllSucceed_ReturnsSuccess() {
        var seq = new Sequence(
            new Condition_HasEnoughGold(0, "AlwaysTrue1"),
            new Condition_HasEnoughGold(0, "AlwaysTrue2"));
        var ctx = MakeCtx(gold: 0);
        Assert.AreEqual(BTStatus.Success, seq.Tick(ctx));
    }

    [Test]
    public void Sequence_OneFails_ReturnsFailure() {
        var seq = new Sequence(
            new Condition_HasEnoughGold(100, "FalseGold"),
            new Condition_HasEnoughGold(0, "AlwaysTrue"));
        var ctx = MakeCtx(gold: 0);
        Assert.AreEqual(BTStatus.Failure, seq.Tick(ctx));
    }

    // ─── Selector ───────────────────────────────────────────────────

    [Test]
    public void Selector_FirstSucceeds_ReturnsSuccess() {
        var sel = new Selector(
            new Condition_HasEnoughGold(0, "AlwaysTrue"),
            new Condition_HasEnoughGold(0, "AlwaysTrue2"));
        var ctx = MakeCtx();
        Assert.AreEqual(BTStatus.Success, sel.Tick(ctx));
    }

    [Test]
    public void Selector_AllFail_ReturnsFailure() {
        var sel = new Selector(
            new Condition_HasEnoughGold(100, "False1"),
            new Condition_HasEnoughGold(200, "False2"));
        var ctx = MakeCtx(gold: 0);
        Assert.AreEqual(BTStatus.Failure, sel.Tick(ctx));
    }

    // ─── Running state retention ────────────────────────────────────

    [Test]
    public void Sequence_TickOnceThenContinue_TracksIndex() {
        // A custom node that returns Running on first call, Success on second.
        var running = new RunningThenSuccess("RunningThenSuccess");
        var seq = new Sequence(
            running,
            new Condition_HasEnoughGold(0, "AlwaysTrue"));

        var ctx = MakeCtx();
        // First tick: child 0 Running -> Sequence Running
        Assert.AreEqual(BTStatus.Running, seq.Tick(ctx));
        // Second tick: child 0 Success -> child 1 -> Sequence Success
        Assert.AreEqual(BTStatus.Success, seq.Tick(ctx));
    }

    [Test]
    public void Selector_TickOnceThenContinue_TracksIndex() {
        var running = new RunningThenSuccess("RunningThenSuccess");
        var sel = new Selector(
            running,
            new Condition_HasEnoughGold(0, "AlwaysTrue"));

        var ctx = MakeCtx();
        Assert.AreEqual(BTStatus.Running, sel.Tick(ctx));
        Assert.AreEqual(BTStatus.Success, sel.Tick(ctx));
    }

    // ─── Default AI tree ────────────────────────────────────────────

    [Test]
    public void DefaultAI_NoGold_NoUnits_EndsWithFailure() {
        var tree = DefaultTrees.CreateDefaultTree();
        var ctx = MakeCtx(gold: 0, units: 0, enemies: 0);
        // No conditions match → selector falls through → returns Failure
        Assert.AreEqual(BTStatus.Failure, tree.Tick(ctx));
        Assert.AreEqual(0, ctx.PendingCommands.Count, "no commands should be issued");
    }

    [Test]
    public void DefaultAI_HasGold_BuildsWorker() {
        var tree = DefaultTrees.CreateDefaultTree();
        var ctx = MakeCtx(gold: 100, units: 0, enemies: 0);
        Assert.AreEqual(BTStatus.Success, tree.Tick(ctx));
        Assert.AreEqual(1, ctx.PendingCommands.Count);
        Assert.IsInstanceOf<BuildCommand>(ctx.PendingCommands[0]);
        Assert.AreEqual(50, ctx.Gold, "50 gold consumed");
    }

    [Test]
    public void DefaultAI_EnemyNearBase_RecallsDefender() {
        var tree = DefaultTrees.CreateDefaultTree();
        var ctx = MakeCtx(gold: 0, units: 1, enemies: 1);
        Assert.AreEqual(BTStatus.Success, tree.Tick(ctx));
        Assert.IsInstanceOf<DefendCommand>(ctx.PendingCommands[0]);
    }

    [Test]
    public void DefaultAI_StrongEnough_Attacks() {
        var tree = DefaultTrees.CreateDefaultTree();
        // 2 my units (>= AttackMinMyUnits), enemy far enough not to trigger defend (radius=3, place at (5,0))
        var ctx = MakeCtx(gold: 0, units: 2, enemies: 0);
        ctx.EnemyUnits.Add(new UnitRuntime {
            UnitDataId = 2001, Hp = 5, HpMax = 5, Attack = 2,
            Position = new Vector2Int(2, 0)
        });
        // Move enemy farther to avoid defend branch
        ctx.EnemyUnits[0].Position = new Vector2Int(20, 0);
        // My units placed close to enemy to enable attack
        ctx.MyUnits[0].Position = new Vector2Int(20, 0);
        ctx.MyUnits[1].Position = new Vector2Int(20, 0);

        Assert.AreEqual(BTStatus.Success, tree.Tick(ctx));
        Assert.IsInstanceOf<AttackCommand>(ctx.PendingCommands[0]);
    }

    // ─── Decorator ──────────────────────────────────────────────────

    [Test]
    public void Inverter_FlipsResult() {
        var inv = new Inverter("Inv", new Condition_HasEnoughGold(100, "FalseGold"));
        var ctx = MakeCtx(gold: 0);
        Assert.AreEqual(BTStatus.Success, inv.Tick(ctx));
    }

    [Test]
    public void Inverter_PreservesRunning() {
        var inv = new Inverter("Inv", new RunningThenSuccess("RTS"));
        var ctx = MakeCtx();
        Assert.AreEqual(BTStatus.Running, inv.Tick(ctx));
    }
}

// ─── Test helper: returns Running on first call, Success on second ───
public class RunningThenSuccess : BTNode {
    private int calls = 0;
    public RunningThenSuccess(string name) : base(name) { }
    public override BTStatus Tick(BTContext ctx) {
        calls++;
        return calls >= 2 ? BTStatus.Success : BTStatus.Running;
    }
}

} // namespace AnimalCiv.Tests