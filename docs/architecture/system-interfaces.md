# 11 个子系统接口契约

> Status: v1.0 / 决策已拍板  
> 适用: 动物文明 / Animal Civ  
> 配套: `docs/architecture/event-bus.md`、`docs/architecture/subsystems.md`

---

## 1. 总览（11 个子系统接口矩阵）

| # | 子系统 | 输入事件（订阅） | 输出事件（发布） | 关键命令 | 关键查询 |
|---|---|---|---|---|---|
| 1 | 回合引擎 TurnEngine | `PlayerAction_Submitted` | `Turn_Started`, `Turn_Ended`, `Phase_Changed`, `Match_Ended` | `EndTurnCommand`, `SurrenderCommand` | `GetCurrentTurnStateQuery` |
| 2 | 前置编队 TacticalDeployment | `FrontLine_ConflictTriggered`, `Deployment_TimeExpired` | `Deployment_Started/Completed/Failed/TimedOut`, `Unit_Deployed`, `Order_Issued` | `DeployUnitCommand`, `RecallUnitCommand`, `IssueOrderCommand` | `GetDeploymentStateQuery` |
| 3 | 棋盘/网格 GridSystem | `Map_Loaded`, `Unit_Moved`, `Unit_Spawned`, `Unit_Died` | `Grid_Initialized`, `Cell_Occupied`, `Cell_Vacated`, `Path_Computed` | — | `FindPathQuery`, `GetCellsInRangeQuery`, `IsCellReachableQuery`, `GetLineOfSightQuery` |
| 4 | AI 决策 AIDecisionSystem | `Turn_Started`, `Deployment_Completed`, `AI_DifficultyChanged` | `AI_DecisionMade`, `AI_ActionExecuted`, `AI_ThinkingTimeout` | `RequestAIDecisionCommand`, `SetAIDifficultyCommand` | `PredictAIActionQuery` |
| 5 | 动物英雄 HeroModel | `Hero_SpawnRequested`, `Hero_DamageApplied`, `Hero_HealApplied`, `Hero_ExpGained` | `Hero_Spawned`, `Hero_Died`, `Hero_LeveledUp`, `Hero_StatChanged` | `SpawnHeroCommand`, `ReviveHeroCommand`, `ApplyBuffCommand` | `GetHeroQuery`, `GetHeroesByPlayerQuery`, `GetHeroesByFactionQuery` |
| 6 | 阵营 FactionSystem | `Faction_PlayerJoined`, `Faction_BattleEnded`, `Faction_RankChanged` | `Faction_BonusApplied`, `Faction_RankChanged`, `Faction_AllianceFormed` | `JoinFactionCommand`, `LeaveFactionCommand` | `GetFactionBuffQuery`, `GetFactionRankQuery`, `GetAllFactionsQuery` |
| 7 | Gacha GachaSystem | `Currency_Updated`, `Player_LoggedIn`, `Gacha_PoolRefreshed` | `Gacha_Pulled`, `Gacha_PityReached`, `Gacha_PoolChanged`, `Gacha_ProbabilityPublished` | `PullCommand`, `OpenPoolCommand`, `PurchasePityCurrencyCommand` | `GetCurrentPoolQuery`, `GetPityCountQuery`, `GetPoolOddsQuery` |
| 8 | 镜像 PvP MirrorPvP | `PvE_BattleCompleted`, `Player_CameOnline`, `MirrorPvP_ELOUpdated` | `MirrorPvP_BattleInitiated`, `MirrorPvP_BattleResolved`, `MirrorPvP_LayoutFed`, `MirrorPvP_ReportGenerated` | `FeedLayoutCommand`, `ResolveMirrorPvPCommand`, `ReportCheatingCommand` | `FetchMirrorQuery`, `GetMyELOQuery`, `GetBattleReportQuery` |
| 9 | 国联 AllianceSystem | `Alliance_Created`, `Alliance_MemberJoined`, `Alliance_MemberLeft`, `WorldBoss_Spawned`, `WorldBoss_Damaged` | `Alliance_Created`, `Alliance_MemberJoined`, `Alliance_RewardDistributed`, `WorldBoss_Defeated`, `WorldBoss_Failed` | `CreateAllianceCommand`, `JoinAllianceCommand`, `LeaveAllianceCommand`, `ContributeToBossCommand` | `GetAllianceQuery`, `GetActiveWorldBossQuery`, `GetMyAllianceQuery` |
| 10 | 美术风格 ArtStyleSystem | `Faction_Changed`, `UI_ThemeChanged`, `Language_Changed` | `Art_ThemeApplied`, `Art_AssetLoaded`, `Art_AnimationTriggered` | `ApplyThemeCommand`, `PreloadAssetsCommand` | `GetCharacterPrefabQuery`, `GetUIThemeQuery`, `GetAnimationClipQuery` |
| 11 | 存档/云 CloudService | `Battle_Completed`, `Gacha_Pulled`, `Alliance_Changed`, `Hero_LeveledUp`, `CheatSuspected` | `Save_Completed`, `Save_Failed`, `Cloud_ConflictResolved`, `CheatDetected`, `CloudQuotaWarning` | `SaveStateCommand`, `DeleteCloudSaveCommand`, `ReportCheatCommand` | `LoadStateQuery`, `GetCloudQuotaQuery`, `GetCheatHistoryQuery` |

---

## 2. 各子系统详细契约

### 2.1 回合引擎 (TurnEngine)

**职责一句话**：驱动 4X 宏观回合的状态机，管理回合推进与胜负判定。

**状态机**：
```
MatchSetup → PlayerTurn → (可选)FrontlineConflict → EndTurn 
  → ... → 满足胜利条件 → MatchEnded
```

**输入事件**：
- `PlayerAction_Submitted(playerId, actionType, payload)`

**输出事件**：
- `Turn_Started(matchId, turnNumber, activePlayerId, phase, timeLimit)`
- `Turn_Ended(matchId, turnNumber, endReason)`
- `Phase_Changed(matchId, oldPhase, newPhase)`
- `Match_Ended(matchId, winnerId, endCondition)`

**命令**：
```csharp
public record EndTurnCommand : ICommand {
    public Guid CommandId { get; init; }
    public Guid IssuerPlayerId { get; init; }
    public Guid MatchId { get; init; }
}

public record SurrenderCommand : ICommand {
    public Guid CommandId { get; init; }
    public Guid IssuerPlayerId { get; init; }
    public Guid MatchId { get; init; }
}
```

**查询**：
```csharp
public record GetCurrentTurnStateQuery(Guid MatchId) : IQuery<TurnState>;

public record TurnState {
    public Guid MatchId { get; init; }
    public int TurnNumber { get; init; }
    public Guid ActivePlayerId { get; init; }
    public TurnPhase Phase { get; init; }
    public float TimeRemaining { get; init; }
    public bool IsFrontlineActive { get; init; }
}

public enum TurnPhase {
    WaitingForPlayer,   // 等待玩家行动
    FrontlineDeploy,    // 前线编队中
    Resolving,          // AI 自动执行中
    Ended               // 回合结束
}
```

---

### 2.2 前置编队 (TacticalDeployment)

**职责一句话**：5–10 秒战术编队窗口，玩家下达命令后 AI 自动执行。

**输入事件**：
- `FrontLine_ConflictTriggered(frontlineId, conflictId, attackerId, defenderId)`
- `Deployment_TimeExpired(frontlineId, playerId)`

**输出事件**：
- `Deployment_Started(playerId, frontlineId, conflictId, timeLimit)`
- `Unit_Deployed(playerId, unitId, cellX, cellY)`
- `Order_Issued(playerId, unitId, orderType, targetCell)`
- `Deployment_Completed(playerId, frontlineId, orders, totalDeploymentTime)`
- `Deployment_Failed(playerId, frontlineId, reason)`
- `Deployment_TimedOut(playerId, frontlineId, fallbackOrders)`

**命令**：
```csharp
public record DeployUnitCommand : ICommand {
    public Guid UnitId { get; init; }
    public int CellX { get; init; }
    public int CellY { get; init; }
}

public record RecallUnitCommand : ICommand {
    public Guid UnitId { get; init; }
}

public record IssueOrderCommand : ICommand {
    public Guid UnitId { get; init; }
    public OrderType Order { get; init; }   // Attack / Defend / Move / Skill
    public int? TargetCellX { get; init; }
    public int? TargetCellY { get; init; }
}

public enum OrderType { Move, Attack, Defend, UseSkill, Hold }
```

---

### 2.3 棋盘/网格 (GridSystem)

**职责一句话**：2D 网格寻路、地形、阻挡、A*、范围查询。

**输入事件**：
- `Map_Loaded(mapId, dimensions, terrainData)`
- `Unit_Spawned(unitId, cellX, cellY)`
- `Unit_Moved(unitId, fromX, fromY, toX, toY)`
- `Unit_Died(unitId)`

**输出事件**：
- `Grid_Initialized(mapId, width, height)`
- `Cell_Occupied(cellX, cellY, unitId)`
- `Cell_Vacated(cellX, cellY)`
- `Path_Computed(requestId, path, totalCost)`

**查询**：
```csharp
public record FindPathQuery(
    int StartX, int StartY, int EndX, int EndY, Guid UnitId
) : IQuery<PathResult>;

public record PathResult {
    public Guid RequestId { get; init; }
    public List<(int X, int Y)> Cells { get; init; }
    public int TotalCost { get; init; }
    public bool PathFound { get; init; }
}

public record GetCellsInRangeQuery(
    int CenterX, int CenterY, int Range, MovementType Type
) : IQuery<List<Cell>>;

public record IsCellReachableQuery(
    int FromX, int FromY, int ToX, int ToY, int MaxCost, Guid UnitId
) : IQuery<bool>;

public record GetLineOfSightQuery(
    int FromX, int FromY, int ToX, int ToY
) : IQuery<bool>;

public enum MovementType { Walk, Fly, Climb }
```

---

### 2.4 AI 决策 (AIDecisionSystem)

**职责一句话**：敌方 AI（PvE）/ 镜像 AI（PvP）决策生成。

**输入事件**：
- `Turn_Started(...)`（用于触发 AI 决策）
- `Deployment_Completed(...)`（用于评估玩家布阵）
- `AI_DifficultyChanged(aiId, newDifficulty)`

**输出事件**：
- `AI_DecisionMade(aiId, decision, expectedValue)`
- `AI_ActionExecuted(aiId, action, result)`
- `AI_ThinkingTimeout(aiId, fallbackAction)`

**命令**：
```csharp
public record RequestAIDecisionCommand : ICommand {
    public Guid AiId { get; init; }
    public Guid ConflictId { get; init; }
    public AIDifficulty Difficulty { get; init; }
}

public record SetAIDifficultyCommand : ICommand {
    public Guid AiId { get; init; }
    public AIDifficulty Difficulty { get; init; }
}

public enum AIDifficulty { Trivial, Easy, Normal, Hard, Brutal }
```

**查询**（用于镜像 PvP 调试）：
```csharp
public record PredictAIActionQuery(Guid AiId, Guid ConflictId) : IQuery<AIAction>;

public record AIAction {
    public Guid AiId { get; init; }
    public Guid ConflictId { get; init; }
    public List<AIStep> Steps { get; init; }
    public float ExpectedValue { get; init; }
}

public record AIStep {
    public Guid UnitId { get; init; }
    public OrderType Order { get; init; }
    public int TargetX { get; init; }
    public int TargetY { get; init; }
    public int Priority { get; init; }
}
```

---

### 2.5 动物英雄 (HeroModel)

**职责一句话**：35–49 个动物角色的数据、动画、行为树。

**输入事件**：
- `Hero_SpawnRequested(heroId, playerId, factionId, cellX, cellY)`
- `Hero_DamageApplied(heroId, attackerId, damage, damageType)`
- `Hero_HealApplied(heroId, healerId, amount)`
- `Hero_ExpGained(heroId, exp, source)`

**输出事件**：
- `Hero_Spawned(heroId, playerId, factionId, cell)`
- `Hero_Died(heroId, killerId, deathCause)`
- `Hero_LeveledUp(heroId, oldLevel, newLevel)`
- `Hero_StatChanged(heroId, statType, oldValue, newValue)`

**命令**：
```csharp
public record SpawnHeroCommand : ICommand {
    public Guid HeroId { get; init; }
    public Guid PlayerId { get; init; }
    public Guid FactionId { get; init; }
    public int CellX { get; init; }
    public int CellY { get; init; }
}

public record ReviveHeroCommand : ICommand {
    public Guid HeroId { get; init; }
    public int ReviveHpPercent { get; init; }
}

public record ApplyBuffCommand : ICommand {
    public Guid HeroId { get; init; }
    public BuffType Buff { get; init; }
    public int Duration { get; init; }
    public float Value { get; init; }
}

public enum BuffType { AttackUp, DefenseUp, SpeedUp, Regeneration, Shield }
```

**查询**：
```csharp
public record GetHeroQuery(Guid HeroId) : IQuery<Hero>;
public record GetHeroesByPlayerQuery(Guid PlayerId) : IQuery<List<Hero>>;
public record GetHeroesByFactionQuery(Guid FactionId) : IQuery<List<Hero>>;

public record Hero {
    public Guid HeroId { get; init; }
    public Guid PlayerId { get; init; }
    public Guid FactionId { get; init; }
    public string Name { get; init; }
    public HeroRarity Rarity { get; init; }
    public int Level { get; init; }
    public long Exp { get; init; }
    public HeroStats Stats { get; init; }
    public List<BuffInstance> ActiveBuffs { get; init; }
    public bool IsAlive { get; init; }
    public int CellX { get; init; }
    public int CellY { get; init; }
}

public record HeroStats {
    public int MaxHp { get; init; }
    public int CurrentHp { get; init; }
    public int Attack { get; init; }
    public int Defense { get; init; }
    public int Speed { get; init; }
    public int MoveRange { get; init; }
    public int AttackRange { get; init; }
}

public enum HeroRarity { N, R, SR, SSR }
```

---

### 2.6 阵营 (FactionSystem)

**职责一句话**：7 大洲阵营定义、阵营特性、阵营 BUFF。

**输入事件**：
- `Faction_PlayerJoined(playerId, factionId)`
- `Faction_BattleEnded(playerId, factionId, victory)`
- `Faction_RankChanged(playerId, factionId, oldRank, newRank)`

**输出事件**：
- `Faction_BonusApplied(playerId, factionId, buffType, value)`
- `Faction_RankChanged(playerId, factionId, oldRank, newRank)`
- `Faction_AllianceFormed(factionIds, allianceId)`

**命令**：
```csharp
public record JoinFactionCommand : ICommand {
    public Guid PlayerId { get; init; }
    public Guid FactionId { get; init; }
}

public record LeaveFactionCommand : ICommand {
    public Guid PlayerId { get; init; }
}
```

**查询**：
```csharp
public record GetFactionBuffQuery(Guid FactionId, int PlayerRank) : IQuery<FactionBuff>;
public record GetFactionRankQuery(Guid PlayerId) : IQuery<int>;
public record GetAllFactionsQuery() : IQuery<List<Faction>>;

public record Faction {
    public Guid FactionId { get; init; }
    public string Name { get; init; }      // 大熊猫 / 灰狼 / ...
    public string Continent { get; init; } // 亚洲 / 欧洲 / ...
    public Color PrimaryColor { get; init; }
    public string Theme { get; init; }     // 竹林 / 群猎 / ...
    public List<string> PassiveTraits { get; init; }
}

public record FactionBuff {
    public Guid FactionId { get; init; }
    public BuffType BuffType { get; init; }
    public float Value { get; init; }
    public string Description { get; init; }
}
```

**7 阵营静态定义（来自 GCD v1.1）**：
| FactionId | Name | Continent | PrimaryColor | Theme |
|---|---|---|---|---|
| 1 | 大熊猫 | 亚洲 | 翠绿 | 竹林 / 禅意 |
| 2 | 灰狼 | 欧洲 | 灰蓝 | 群猎 / 协作 |
| 3 | 非洲狮 | 非洲 | 赭金 | 草原 / 强权 |
| 4 | 灰熊 | 北美 | 棕红 | 山脉 / 孤独 |
| 5 | 美金刚鹦鹉 | 南美 | 翠蓝 | 雨林 / 色彩 |
| 6 | 袋鼠 | 大洋洲 | 沙橙 | 沙漠 / 速度 |
| 7 | 帝企鹅 | 南极 | 冰白 | 冰原 / 群居 |

---

### 2.7 Gacha (GachaSystem)

**职责一句话**：动物英雄抽卡、保底、概率公示、合规。

**输入事件**：
- `Currency_Updated(playerId, currency, delta)`
- `Player_LoggedIn(playerId)`
- `Gacha_PoolRefreshed(poolId, newVersion)`

**输出事件**：
- `Gacha_Pulled(playerId, poolId, heroId, rarity, isPity)`
- `Gacha_PityReached(playerId, poolId, pityCount)`
- `Gacha_PoolChanged(poolId, newVersion, validUntil)`
- `Gacha_ProbabilityPublished(poolId, odds)`

**命令**：
```csharp
public record PullCommand : ICommand {
    public Guid PlayerId { get; init; }
    public Guid PoolId { get; init; }
    public int Count { get; init; }            // 单抽 / 十连
}

public record OpenPoolCommand : ICommand {
    public Guid PlayerId { get; init; }
    public Guid PoolId { get; init; }
}

public record PurchasePityCurrencyCommand : ICommand {
    public Guid PlayerId { get; init; }
    public int Amount { get; init; }
    public string PaymentMethod { get; init; }
}
```

**查询**：
```csharp
public record GetCurrentPoolQuery() : IQuery<List<GachaPool>>;
public record GetPityCountQuery(Guid PlayerId, Guid PoolId) : IQuery<PityState>;
public record GetPoolOddsQuery(Guid PoolId) : IQuery<PoolOdds>;

public record GachaPool {
    public Guid PoolId { get; init; }
    public string Name { get; init; }
    public PoolType Type { get; init; }
    public DateTime ValidFrom { get; init; }
    public DateTime ValidUntil { get; init; }
    public List<GachaTier> Tiers { get; init; }
    public int CostPerPull { get; init; }
}

public enum PoolType { Permanent, Limited, Faction, Beginner }

public record PityState {
    public int CurrentCount { get; init; }     // 已抽次数
    public int HardPityGuarantee { get; init; } // 90 抽保底
    public int SoftPityStart { get; init; }    // 75 抽开始概率提升
    public int Ceiling { get; init; }          // 300 大保底
}

public record PoolOdds {
    public Guid PoolId { get; init; }
    public Dictionary<HeroRarity, float> Odds { get; init; }
    public DateTime PublishedAt { get; init; }
}
```

---

### 2.8 镜像 PvP (MirrorPvP)

**职责一句话**：异步镜像生成、对手匹配、战报回放、公平竞技约束。

**输入事件**：
- `PvE_BattleCompleted(playerId, layout, result)`
- `Player_CameOnline(playerId)`
- `MirrorPvP_ELOUpdated(playerId, oldELO, newELO)`

**输出事件**：
- `MirrorPvP_LayoutFed(playerId, layout, fedAt)`
- `MirrorPvP_BattleInitiated(defenderId, attackerId, conflictId)`
- `MirrorPvP_BattleResolved(winnerId, loserId, eloChange, replay)`
- `MirrorPvP_ReportGenerated(playerId, reportId)`

**命令**：
```csharp
public record FeedLayoutCommand : ICommand {
    public Guid PlayerId { get; init; }
    public PlayerLayout Layout { get; init; }
}

public record ResolveMirrorPvPCommand : ICommand {
    public Guid DefenderId { get; init; }
    public Guid AttackerId { get; init; }
    public Guid ConflictId { get; init; }
}

public record ReportCheatingCommand : ICommand {
    public Guid ReporterId { get; init; }
    public Guid SuspectPlayerId { get; init; }
    public string Reason { get; init; }
    public List<string> Evidence { get; init; }
}
```

**查询**：
```csharp
public record FetchMirrorQuery(Guid PlayerId) : IQuery<MirrorConfig>;
public record GetMyELOQuery(Guid PlayerId) : IQuery<int>;
public record GetBattleReportQuery(Guid ReportId) : IQuery<BattleReport>;

public record MirrorConfig {
    public Guid MirrorId { get; init; }
    public Guid AttackerId { get; init; }
    public PlayerLayout AttackerLayout { get; init; }
    public int AttackerELO { get; init; }
    public List<Guid> AllowedHeroPool { get; init; }  // 公平竞技约束：PvP 池
    public DateTime GeneratedAt { get; init; }
}

public record PlayerLayout {
    public Guid PlayerId { get; init; }
    public Guid FactionId { get; init; }
    public List<DeployedUnit> Units { get; init; }
    public int TurnAtCapture { get; init; }
}

public record DeployedUnit {
    public Guid HeroId { get; init; }
    public int CellX { get; init; }
    public int CellY { get; init; }
    public int CurrentHp { get; init; }
    public int RemainingSkillCooldown { get; init; }
}

public record BattleReport {
    public Guid ReportId { get; init; }
    public Guid WinnerId { get; init; }
    public Guid LoserId { get; init; }
    public int WinnerELOChange { get; init; }
    public int LoserELOChange { get; init; }
    public List<IGameEvent> EventReplay { get; init; }
    public DateTime GeneratedAt { get; init; }
}
```

**公平竞技约束（强制实现，详见 GCD v1.1 §6）**：
1. 镜像池只取 `AllowedHeroPool` 中的动物（与 Gacha 高 R 英雄分开）
2. PvP 用 ELO 分段匹配
3. Gacha 英雄仅在 PvE 闯关中加成
4. 8 分钟硬性局时上限

---

### 2.9 国联 (AllianceSystem)

**职责一句话**：4–6 人阵营同盟、世界 BOSS、积分赛季。

**输入事件**：
- `Alliance_Created(allianceId, factionId, founderId)`
- `Alliance_MemberJoined(allianceId, playerId)`
- `Alliance_MemberLeft(allianceId, playerId)`
- `WorldBoss_Spawned(bossId, validUntil)`
- `WorldBoss_Damaged(bossId, allianceId, damage, contributorId)`

**输出事件**：
- `Alliance_Created(allianceId, factionId, founderId)`
- `Alliance_MemberJoined(allianceId, playerId, joinedAt)`
- `Alliance_RewardDistributed(allianceId, rewards, contributors)`
- `WorldBoss_Defeated(bossId, topAlliance, totalDamage)`
- `WorldBoss_Failed(bossId, expiredAt)`

**命令**：
```csharp
public record CreateAllianceCommand : ICommand {
    public Guid FounderId { get; init; }
    public Guid FactionId { get; init; }
    public string AllianceName { get; init; }
    public int MaxMembers { get; init; } = 6;
}

public record JoinAllianceCommand : ICommand {
    public Guid PlayerId { get; init; }
    public Guid AllianceId { get; init; }
}

public record LeaveAllianceCommand : ICommand {
    public Guid PlayerId { get; init; }
    public Guid AllianceId { get; init; }
}

public record ContributeToBossCommand : ICommand {
    public Guid PlayerId { get; init; }
    public Guid BossId { get; init; }
    public int DamageDealt { get; init; }
}
```

**查询**：
```csharp
public record GetAllianceQuery(Guid AllianceId) : IQuery<Alliance>;
public record GetActiveWorldBossQuery() : IQuery<WorldBoss>;
public record GetMyAllianceQuery(Guid PlayerId) : IQuery<Alliance>;

public record Alliance {
    public Guid AllianceId { get; init; }
    public Guid FactionId { get; init; }
    public string Name { get; init; }
    public List<Guid> MemberIds { get; init; }
    public int TotalScore { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record WorldBoss {
    public Guid BossId { get; init; }
    public string Name { get; init; }
    public int TotalHp { get; init; }
    public int CurrentHp { get; init; }
    public DateTime ValidUntil { get; init; }
    public List<BossContributor> TopContributors { get; init; }
}
```

**新手引导期强制**：入门级国联 3 AI + 1 真人自动匹配。

---

### 2.10 美术风格 (ArtStyleSystem)

**职责一句话**：卡通 2.5D 描边、阵营配色、UI 主题切换、远端资源加载。

**输入事件**：
- `Faction_Changed(playerId, newFactionId)`
- `UI_ThemeChanged(playerId, themeId)`
- `Language_Changed(playerId, language)`

**输出事件**：
- `Art_ThemeApplied(themeId, factionId)`
- `Art_AssetLoaded(assetId, assetPath)`
- `Art_AnimationTriggered(animationId, targetObjectId)`

**命令**：
```csharp
public record ApplyThemeCommand : ICommand {
    public Guid PlayerId { get; init; }
    public string ThemeId { get; init; }
}

public record PreloadAssetsCommand : ICommand {
    public List<string> AssetIds { get; init; }
}
```

**查询**：
```csharp
public record GetCharacterPrefabQuery(Guid HeroId) : IQuery<GameObject>;
public record GetUIThemeQuery(string ThemeId) : IQuery<UITheme>;
public record GetAnimationClipQuery(string AnimationId) : IQuery<AnimationClip>;

public record UITheme {
    public string ThemeId { get; init; }
    public Color PrimaryColor { get; init; }
    public Color SecondaryColor { get; init; }
    public Font TitleFont { get; init; }
    public Font BodyFont { get; init; }
}
```

**Addressables 分组（参考 Tech Setup §4）**：
- `art/heroes/faction-asia` (4–6 角色)
- `art/heroes/faction-europe` (4–6 角色)
- `art/heroes/faction-africa` (4–6 角色)
- `art/heroes/faction-north-america` (4–6 角色)
- `art/heroes/faction-south-america` (4–6 角色)
- `art/heroes/faction-oceania` (4–6 角色)
- `art/heroes/faction-antarctica` (4–6 角色)
- `art/skins/<faction>` (v1.x 增量)
- `art/ui/themes/<themeId>`

---

### 2.11 存档/云 (CloudService)

**职责一句话**：PlayFab + Firebase + 行为校验 / 反作弊。

**输入事件**：
- `Battle_Completed(matchId)`
- `Gacha_Pulled(playerId)`
- `Alliance_Changed(allianceId)`
- `Hero_LeveledUp(heroId)`
- `CheatSuspected(playerId, signal, severity)`

**输出事件**：
- `Save_Completed(playerId, saveVersion, savedAt)`
- `Save_Failed(playerId, errorCode)`
- `Cloud_ConflictResolved(playerId, resolution, serverVersion)`
- `CheatDetected(playerId, reason, severity)`
- `CloudQuotaWarning(playerId, usedMB, quotaMB)`

**命令**：
```csharp
public record SaveStateCommand : ICommand {
    public Guid PlayerId { get; init; }
    public SaveData Data { get; init; }
    public SavePriority Priority { get; init; }
}

public record DeleteCloudSaveCommand : ICommand {
    public Guid PlayerId { get; init; }
    public string Reason { get; init; }
}

public record ReportCheatCommand : ICommand {
    public Guid ReporterId { get; init; }
    public Guid SuspectId { get; init; }
    public CheatSignal Signal { get; init; }
    public List<string> Evidence { get; init; }
}

public enum SavePriority { Critical, Normal, Background }
public enum CheatSignal { ImpossibleAction, RepeatedAbnormalWinRate, CurrencyInjection, ClientTampering }
```

**查询**：
```csharp
public record LoadStateQuery(Guid PlayerId) : IQuery<SaveData>;
public record GetCloudQuotaQuery(Guid PlayerId) : IQuery<QuotaInfo>;
public record GetCheatHistoryQuery(Guid PlayerId) : IQuery<List<CheatRecord>>;

public record SaveData {
    public Guid PlayerId { get; init; }
    public int SchemaVersion { get; init; }
    public PlayerProfile Profile { get; init; }
    public List<Hero> OwnedHeroes { get; init; }
    public PityState GachaPity { get; init; }
    public int PlayerELO { get; init; }
    public Guid? AllianceId { get; init; }
    public DateTime SavedAt { get; init; }
}

public record QuotaInfo {
    public int UsedMB { get; init; }
    public int QuotaMB { get; init; }
    public DateTime ResetAt { get; init; }
}

public record CheatRecord {
    public Guid RecordId { get; init; }
    public Guid PlayerId { get; init; }
    public CheatSignal Signal { get; init; }
    public string Description { get; init; }
    public DateTime DetectedAt { get; init; }
    public CheatSeverity Severity { get; init; }
}

public enum CheatSeverity { Warning, Suspension, PermanentBan }
```

**合规要求**：
- 国内走自托管 + 阿里云 OSS 替代（PlayFab 国内不通，详见 Tech Setup §10）
- 客户端反作弊 + 服务端行为校验
- 国联聊天过滤 + 限时窗口（未成年人保护）
- 抽卡概率公示（中日韩三国法律预审）

---

## 3. 跨子系统依赖图（强约束）

```
[3 棋盘] ──┬──> [2 编队] ──> [4 AI] ──┐
           │                             │
           └──> [5 英雄] ───────────────┴──> [1 回合] <──┐
                                                          │
[6 阵营] ───────────────────────────────────────────────┘
   │
   └──> [9 国联] ────────────────────────────────────> [11 云]
                                                          ↑
[7 抽卡] ────> [8 镜像 PvP] ───────────────────────────> [11 云]
   │                  │
   └──────> [5 英雄] <┘
                                                          ↑
[10 美术] ─────────────────────────────────────────────> [5 英雄]

```

**禁止反向调用**（编译期检测）：
- [1 回合] 不能直接调 [7 抽卡] / [8 镜像 PvP] / [9 国联]
- [3 棋盘] 不能直接调任何上层系统
- [10 美术] 不能直接调业务系统（仅供业务系统查询）
- [11 云] 不能被任何业务系统主动调（仅订阅事件）

**调用方式**：
- 实线 → 通过 `IEventBus.Publish<T>` 发事件
- 虚线 → 通过 `subSystem.QueryAsync<T>` 直接调查询

---

## 4. 数据模型版本化策略

所有数据模型实现 `ISchemaVersioned`：

```csharp
public interface ISchemaVersioned {
    int SchemaVersion { get; }
}

public abstract class Migration<TFrom, TTo> {
    public abstract TTo Migrate(TFrom old);
}
```

**当前 Schema 版本**：
| 模型 | Version |
|---|---|
| Hero | 1 |
| SaveData | 1 |
| GachaPool | 1 |
| MirrorConfig | 1 |
| BattleReport | 1 |
| PlayerLayout | 1 |

**版本变更流程**：
1. 修改模型 + 提升 `SchemaVersion`
2. 写 `Migration<TOld, TNew>`
3. 单元测试覆盖迁移路径
4. 旧存档加载时自动迁移

---

## 5. 单元测试样板

```csharp
[TestFixture]
public class GachaSystemTests {
    private InMemoryEventBus _bus;
    private GachaSystem _gacha;
    
    [SetUp]
    public void Setup() {
        _bus = new InMemoryEventBus();
        var heroSystem = new MockHeroSystem();
        _gacha = new GachaSystem(_bus, heroSystem, seed: 42);
    }
    
    [Test]
    public async Task Single_Pull_Should_Return_One_Hero() {
        var result = await _gacha.PullAsync(new PullCommand {
            PlayerId = Guid.NewGuid(),
            PoolId = TestPoolId,
            Count = 1
        });
        
        Assert.That(result.Success, Is.True);
        Assert.That(result.PulledHeroes, Has.Count.EqualTo(1));
    }
    
    [Test]
    public async Task Hard_Pity_Should_Guarantee_SSR_At_90() {
        // Arrange
        var playerId = Guid.NewGuid();
        for (int i = 0; i < 89; i++) {
            await _gacha.PullAsync(new PullCommand { ... });
        }
        
        // Act
        var result = await _gacha.PullAsync(new PullCommand {
            PlayerId = playerId,
            PoolId = TestPoolId,
            Count = 1
        });
        
        // Assert
        Assert.That(result.PulledHeroes[0].Rarity, Is.EqualTo(HeroRarity.SSR));
        AssertPublished<Gacha_PityReached>(times: 1);
    }
}
```

---

## 6. 与其他文档的关系

- **依赖**：`docs/architecture/event-bus.md`（事件总线机制）
- **依赖**：`docs/architecture/subsystems.md`（子系统清单 + 依赖图）
- **依赖**：`docs/technical-setup.md`（Addressables 分组 + CI）
- **依赖**：`design/gdd/game-concept.md`（核心循环定义）
- **被依赖**：未来 Sprint 0 / Production 阶段的代码实现
