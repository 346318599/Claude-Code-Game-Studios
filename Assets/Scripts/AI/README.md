# BT 框架（Animal Civ AI）

> Sprint 1 W3 的 AI 行为树基础设施。手写 C#，不引第三方依赖。

## 文件清单

```
Assets/Scripts/AI/
├── BTNode.cs                # BTStatus enum + 抽象基类
├── BTContext.cs             # 黑板（资源 / 单位 / 建筑 / 阵营 / 棋盘 / 命令队列 / RNG）
├── Composites.cs            # Sequence / Selector / Parallel（state-composite）
├── LeafNodes.cs             # BTAction / BTCondition + 装饰器（Inverter / Repeat / UntilFail）
├── BehaviorTree.cs          # 顶层 runner：Tick / Abort / Reset / RunToCompletion
├── DefaultTrees.cs          # v1.0 默认 AI 树工厂（4 策略优先级）
└── Nodes/
    ├── Condition_HasEnoughGold.cs
    ├── Condition_EnemyNearBase.cs
    ├── Action_Build.cs              # 通用建造（worker / soldier / 建筑）
    ├── Action_Attack.cs             # 攻击最弱敌人
    └── Action_Defend.cs             # 召回远处的我方单位

Assets/Tests/Editor/
└── BTTests.cs               # NUnit 测试（Unity Test Runner EditMode）

Assets/.gitignore            # Unity 标准忽略
```

## v1.0 默认 AI 树

```
Selector (AI_Root)
├─ Sequence: DefendBranch
│   ├─ Condition: EnemyNearBase? (radius=3)
│   └─ Action: RecallUnit (max dist=5)
├─ Sequence: AttackBranch
│   ├─ Condition: HasEnoughMyUnits? (>=2)
│   └─ Action: AttackWeakest (range=3)
└─ Sequence: BuildBranch
    ├─ Condition: HasEnoughGold? (>=50)
    └─ Action: BuildWorker (cost=50)
```

**单回合 tick 流程**：
1. `BattleLoop` 把当前 AI 的回合状态写入 `BTContext`（gold、units、buildings、enemy positions）
2. `BehaviorTree.Tick(ctx)` — 树按优先级走
3. 树可能产生 0..N 个 `ICommand`（写入 `ctx.PendingCommands`）
4. `BattleLoop` flush 这些 command 到 map（应用建造 / 攻击 / 移动）
5. 回合结束，命令清空

## 测试

在 Unity Editor 里打开 **Window → General → Test Runner → EditMode**，
点 **Run All**。11 个 test 应该全 pass：
- Sequence 语义（empty / all succeed / one fail）
- Selector 语义（first succeeds / all fail）
- Sequence / Selector 的 Running 状态保持（currentIndex 续行）
- 默认 AI 树端到端（无资源 → Failure；有钱 → Build；有敌人近 → Defend；强 → Attack）
- Inverter（flip Success/Failure，preserve Running）

## 设计原则

1. **状态可恢复**：composite 节点记住 currentIndex，Running 时下次 tick 续行
2. **可中止**：任何节点可被外部 `Abort()` 强制 cancel（用于回合切换 / Run 失败）
3. **黑板传引用**：所有节点共享同一个 `BTContext` 实例，Sequence 严格左→右保证确定性
4. **类型安全**：`ICommand` 接口，BattleLoop 显式 flush（不反射、不 dynamic）
5. **零依赖**：纯 C# + UnityEngine 基本类型，不引 NodeCanvas / Behavior Designer / 任何第三方包

## 后续扩展点（Sprint 2+）

- JSON 描述 BT 结构（`bt_default.json`）— 需 W3 加 JSON 解析 + factory
- Utility AI 评分替换 Selector（多目标权衡）
- BT 可视化（GraphView / 自研 IMGUI）— 调试 + 设计师编辑
- 难度等级：不同权重 + 不同节点启用（Sprint 2 W5）

## 不做的事

- ❌ 不写树持久化 / 反序列化（v1.0 用代码 factory）
- ❌ 不写黑板变更订阅（每个 tick 全量 evaluate，性能足够）
- ❌ 不写 BT 子节点可视化编辑器（v2.0+）