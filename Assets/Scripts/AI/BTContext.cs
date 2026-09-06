// Assets/Scripts/AI/BTContext.cs
// Blackboard data passed to every BT node during a Tick.
// Single struct passed by reference (no boxing) for performance.

using System.Collections.Generic;
using UnityEngine;

namespace AnimalCiv.AI {

/// <summary>
/// Mutable blackboard passed to every BT node during Tick. Holds references
/// to runtime state: unit/building inventories, resources, board map, RNG.
/// All nodes share the same instance; mutations are visible to siblings on
/// the same Tick (Sequence left→right order guarantees determinism).
/// </summary>
public sealed class BTContext {
    // ─── Identity ───────────────────────────────────────────────────
    /// <summary>Owning AI faction id (matches ScriptableObject FactionData.id).</summary>
    public int FactionId;

    // ─── Resources ──────────────────────────────────────────────────
    public int Gold;
    public int Wood;
    public int Food;

    // ─── Turn budget ────────────────────────────────────────────────
    public int ActionsRemainingThisTurn;

    // ─── Unit / building inventories ────────────────────────────────
    public readonly List<UnitRuntime>      MyUnits      = new();
    public readonly List<UnitRuntime>      EnemyUnits   = new();
    public readonly List<BuildingRuntime>  MyBuildings  = new();
    public readonly List<BuildingRuntime>  EnemyBuildings = new();

    // ─── Map positions ──────────────────────────────────────────────
    public Vector2Int MyBasePosition;
    public Vector2Int EnemyBasePosition;

    // ─── Board read-only API (stub; replaced by BattleMap in W2) ──
    public IBoardView Board;

    // ─── Outbound commands (written by actions, consumed by BattleLoop) ─
    public readonly List<ICommand> PendingCommands = new();

    // ─── Deterministic PRNG (seeded per Run) ───────────────────────
    public System.Random Rng;

    // ─── Debug ──────────────────────────────────────────────────────
    public bool DebugTrace;

    public BTContext Clone() {
        var c = new BTContext {
            FactionId = FactionId,
            Gold = Gold, Wood = Wood, Food = Food,
            ActionsRemainingThisTurn = ActionsRemainingThisTurn,
            MyBasePosition = MyBasePosition,
            EnemyBasePosition = EnemyBasePosition,
            Board = Board,
            Rng = Rng,
            DebugTrace = DebugTrace
        };
        c.MyUnits.AddRange(MyUnits);
        c.EnemyUnits.AddRange(EnemyUnits);
        c.MyBuildings.AddRange(MyBuildings);
        c.EnemyBuildings.AddRange(EnemyBuildings);
        c.PendingCommands.AddRange(PendingCommands);
        return c;
    }
}

/// <summary>Placeholder for runtime unit state — replaced by UnitRuntime in W2.</summary>
public class UnitRuntime {
    public int UnitDataId;
    public Vector2Int Position;
    public int Hp;
    public int HpMax;
    public int Attack;
}

/// <summary>Placeholder for runtime building state — replaced by BuildingRuntime in W2.</summary>
public class BuildingRuntime {
    public int BuildingDataId;
    public Vector2Int Position;
    public int Hp;
    public int HpMax;
    public int OwnerFactionId;
    public bool IsMainBase;
}

/// <summary>Outbound command written by an Action node. BattleLoop flushes these.</summary>
public interface ICommand {
    void Execute(BTContext ctx);
}

/// <summary>Read-only view of the battle map. Provided by BattleMap in W2.</summary>
public interface IBoardView {
    bool IsPassable(Vector2Int pos);
    bool IsOccupied(Vector2Int pos);
    int TileAt(Vector2Int pos);
    int Distance(Vector2Int a, Vector2Int b);
    Vector2Int? NearestEnemyFrom(Vector2Int pos, int enemyFactionId, int maxDistance);
}

} // namespace AnimalCiv.AI