# 子系统清单 / Systems Map

**Version**: 1.0 (Approved)
**Status**: 草案已拍板 / Draft Approved
**Stage**: Systems Design → 已通过 Systems Gate
**Input**: `design/gdd/game-concept.md` v1.1

---

## 1. 拆分原则

按"职责单一 / 接口清晰 / 可独立开发"原则拆为 **11 个子系统**。每个子系统:
- 有明确的输入、输出、责任边界
- 与其他子系统的协作通过**事件总线**
- 单独分支开发 + 单元测试 + Playtest 验证

---

## 2. 子系统清单

| # | 子系统 | 职责一句话 | 依赖 | 风险 |
|---|---|---|---|---|
| 1 | **回合引擎** | 4X 宏观回合推进、状态机、回合结束条件 | 3, 5 | 中（性能 + 状态爆炸） |
| 2 | **前置编队关卡** | 5–10s 战术编队窗口,AI 自动执行到结果 | 1, 4, 9 | 高（手感风险） |
| 3 | **棋盘 / 网格** | 2D 网格寻路、A*、地形、阻挡 | 2, 5 | 低 |
| 4 | **AI 决策系统** | 敌方 AI（PvE）/ 镜像 AI（PvP）决策生成 | 1, 2, 3 | 高（深度 / 性能平衡） |
| 5 | **动物英雄模型** | 35–49 个动物角色的数据/动画/AI行为 | 2, 9, 10 | 中（美术量） |
| 6 | **阵营系统** | 7 阵营定义、阵营特性、阵营 BUFF | 1, 5 | 低 |
| 7 | **Gacha 抽卡** | 卡池、保底、概率公示、抽卡券 | 5, 11 | 高（合规 + 平衡） |
| 8 | **镜像攻击 PvP** | 异步镜像生成、对手匹配、战报回放 | 1, 2, 4, 11 | 高（云存档 + 公平竞技） |
| 9 | **阵营同盟 / 国联** | 4–6 人国联、世界 BOSS、积分赛季 | 6, 11 | 中（社交合规） |
| 10 | **美术风格系统** | 卡通 2.5D 描边、配色、UI 主题切换 | 5 | 低（已成熟） |
| 11 | **存档 / 云服务 / 反作弊** | PlayFab + Firebase + 行为校验 | 7, 8, 9 | 中（云依赖 + 黑产对抗） |

---

## 3. 依赖图

```
[3 棋盘] → [2 编队] → [4 AI] →─┐ → [1 回合] ←─┐ │
                    [5 英雄] ←───┘
                       ↓
                [6 阵营] → [9 国联] → [存档/云]
                       ↓
                [7 抽卡] → [8 PvP] → [存档/云]
                       ↓
                [10 美术] → [5 英雄]
```

---

## 4. MVP 开发路线（4 阶段 ~7 周）

### Phase A（2 周）：棋盘 + 英雄 + 回合 + 编队 + AI
**目标**：1 阵营 1 地图 8 分钟 PvE 闭环

任务：
- #3 棋盘 / 网格：2D 寻路、地形、阻挡
- #5 动物英雄模型：基础数据框架 + 1 阵营 4 角色
- #1 回合引擎：状态机、回合推进
- #2 前置编队关卡：5–10s 编队窗口
- #4 AI 决策系统：PvE 敌人 AI 基础

### Phase B（2 周）：美术 + 阵营扩展
**目标**：4 阵营美术差异性可识别

任务：
- #10 美术风格系统：卡通 2.5D 描边、配色
- #6 阵营系统：4 阵营定义、阵营特性
- #5 动物英雄模型：扩展到 4 阵营 16 角色

### Phase C（2 周）：Gacha + 镜像 PvP
**目标**：抽卡 + 异步 PvP 可玩 + 公平竞技约束生效

任务：
- #7 Gacha 抽卡：卡池、保底、概率公示
- #8 镜像攻击 PvP：异步镜像生成、对手匹配
- #11 存档 / 云服务：基础存档

### Phase D（1 周）：国联 MVP
**目标**：3 AI + 1 真人入门级国联，1 个世界 BOSS

任务：
- #9 阵营同盟 / 国联：基础国联 + 世界 BOSS

---

## 5. 拆解的硬性约束（CLAUDE.md 协作协议）

1. **trunk-based + feature branch** —— 主分支保持可发布
2. **接口先定（Draft → Approval）→ 再写代码** —— 子系统间的事件总线接口
3. **每个子系统写测试** —— playtest + 单元测试
4. **CI 跑通后才允许 merge** —— 防止 trunk 退化
5. **Addressables 严格分组** —— 每个动物角色、每张地图独立 group
6. **Git LFS 必备** —— PSD / PNG / WAV 走 LFS
7. **不主动 commit** —— CLAUDE.md 要求（任何写文件前都 Approval）

---

## 6. 子系统接口约定（事件总线）

子系统间通过 `IGameEventBus` 解耦，事件格式：

```csharp
public interface IGameEvent {
    string EventId { get; }
    long Timestamp { get; }
}

public interface IGameEventBus {
    void Publish<T>(T evt) where T : IGameEvent;
    void Subscribe<T>(Action<T> handler) where T : IGameEvent;
    void Unsubscribe<T>(Action<T> handler) where T : IGameEvent;
}
```

**核心事件类型**（待细化）：
- `TurnStartedEvent` / `TurnEndedEvent`
- `ConflictTriggeredEvent` / `ConflictResolvedEvent`
- `GachaPulledEvent` / `HeroUnlockedEvent`
- `MirrorGeneratedEvent` / `MatchMadeEvent`
- `AllianceJoinedEvent` / `WorldBossDamageEvent`

---

## 7. 风险与 Mitigation

| 风险 | Mitigation |
|---|---|
| 11 个子系统接口爆炸 | 强制走事件总线 + 接口冻结（interface freeze） |
| 美术资源 4 周做不完 | MVP 4 阵营，余 3 阵营 v1.x 增量 |
| AI 决策性能瓶颈 | 决策树 + 行为树分层 + 服务器端计算 |
| 抽卡合规争议 | 中日韩三国法律预审 + 概率公示模板 |
| 国联聊天合规 | 聊天过滤 + 限时窗口 + 关键词屏蔽 |

---

## 8. 变更日志

### v1.0 (草案完稿)
- ✓ 11 个子系统全采纳
- ✓ Phase A→B→C→D 4 阶段 MVP 开发路线 ~7 周
- ✓ 事件总线接口初版

---

*按 CLAUDE.md 协作协议：本文档所有决策均经用户拍板。*
*任何修改必须先 Show Draft → Approval → 落盘。*