# Sprint 1 详细任务卡 — 安卓单机 Roguelike 4 周交付

> **来源**：依据 `docs/production/v1-android-roguelike-scope.md` 范围 + 本轮拍板决定
> **目标**：4 周后，1 台中端 Android 真机（Snapdragon 870 / Android 11+）能完整跑完
> 1 个 Run（8-12 分钟），含胜利/失败两条结局线，Meta currency 累积 + 解锁 1 个阵营可玩。

## 拍板决定（2026-09-06 锁定）

| 项 | 决定 | 备注 |
|---|---|---|
| AI 框架 | **行为树（BT）** | 手写 C#，无第三方依赖 |
| 地图生成 | **WFC 算法 + 房间模板** | 10-20 个预制房间，PCG 拼接 |
| Unity 版本 | **Unity 6 LTS 稳定 patch** | 装好后锁定到具体 patch 号 |
| 美术 | **灰盒占位** | Unity primitive + 标准色卡 |
| 测试 | **仅真机** | 至少 1 中端 + 1 低端 |

---

## W1：项目骨架 + 真机部署 baseline

> **W1 出口标准**：构建出的 APK 能在用户的真机上启动空白场景，能在 Unity Editor
> Play Mode 下看到 Android Build Settings 正确（minSdk 26 / targetSdk 34 / IL2CPP / arm64-v8a）。
> ⚠️ W1 不通 = W2-W4 全白做。

### T1.1 Unity 6 LTS 项目初始化（用户本地操作）
- **负责**：用户
- **动作**：
  1. 装 Unity Hub + Unity 6 LTS（最新稳定 patch，如 `6000.0.42f1`）
  2. 创建新项目：模板选 `Universal 2D`，项目名 `AnimalCiv`
  3. 在 Hub 里装 Android Build Support 模块
- **验收**：Editor 能打开项目，能看到 URP 2D 默认场景
- **预计工时**：1-2 小时（含下载）

### T1.2 Android Build 配置
- **负责**：我（WorkBuddy 写代码 / 用户本地导入）
- **动作**：
  1. `File → Build Settings → Player Settings → Other Settings`：
     - `Min API Level = 26` (Android 8.0)
     - `Target API Level = 34` (Android 14)
     - `Scripting Backend = IL2CPP`
     - `Target Architectures = ARM64`
     - `Install Location = Auto`
     - `Package Name = com.animalciv.game`（v1.0 placeholder）
  2. `Project Settings → Quality → Mobile`：
     - VSync Off，FPS 锁定 30
     - Texture Quality = Half Res（最低设备 720p 等效）
  3. `Project Settings → Graphics → URP Asset`：
     - 选 2D Renderer
     - Anti Aliasing = Off
     - HDR = Off
- **交付物**：`ProjectSettings/ProjectSettings.asset` + `ProjectSettings/QualitySettings.asset` 改完状态
- **预计工时**：30 分钟

### T1.3 Assets 目录结构 + .gitignore
- **负责**：我（写 `.gitignore` + 目录占位）
- **动作**：
  1. 写 `Assets/.gitignore`（标准 Unity gitignore）
  3. 仓库根 `.gitignore` 加 Unity 顶层忽略（Library/Temp/obj/Build/）
  2. 创建目录结构：
     ```
     Assets/
       Scenes/
       Scripts/
         Core/            # 事件总线、子系统接口
         Battle/          # 回合制、单位、技能
         AI/              # BT 节点、行为树
         MapGen/          # WFC、房间模板
         Roguelike/       # Run 生命周期、永久死亡、Meta
         UI/              # HUD、菜单、解锁面板
         Data/            # ScriptableObject 数据
         Input/           # 触屏输入
       Prefabs/
         Units/           # 单位 prefab
         Buildings/       # 建筑 prefab
         UI/              # UI prefab
       ScriptableObjects/
         Factions/        # 阵营数据
         Units/           # 单位数据
         Events/          # 事件卡数据
         Buffs/           # 起始 buff 数据
       Materials/
       Textures/
       Sprites/
     ```
- **交付物**：`Assets/.gitignore`、目录结构、`.gitignore` 顶层忽略
- **预计工时**：30 分钟

### T1.4 灰盒美术占位规范
- **负责**：我（写规范 + 1-2 个示例 prefab）
- **动作**：
  1. 写 `docs/production/greybox-spec.md`：色彩、几何体、尺寸约定
  2. 创建 5 个灰盒单位 prefab 占位（方块 + 圆柱 + 平面 + 标准色）：
     - `Unit_Worker`（黄色立方体）
     - `Unit_Soldier`（红色圆柱）
     - `Building_Base`（蓝色大方块）
     - `Building_Barracks`（橙色中块）
     - `ResourceNode_Food`（绿色平面）
  3. 创建阵营色卡：7 阵营各 1 主色 + 1 辅色（参考 Art Bible）
- **验收**：在场景里放 5 个 prefab，截图记录
- **预计工时**：2 小时

### T1.5 真机部署 baseline
- **负责**：用户本地（我指导）
- **动作**：
  1. 真机开 USB 调试（开发者选项 → USB 调试）
  2. Unity Build → 选真机 → Build And Run
  3. 启动后看到空白场景（带 1 个 Camera + 1 个 Light）
- **交付物**：截图 + APK 大小记录（目标 < 80 MB）
- **预计工时**：1 小时（含首次 USB 驱动）

---

## W2：单局核心循环（回合制）

### T2.1 回合制框架
- **负责**：我
- **动作**：
  1. `BattleSubsystem.cs`：回合状态机（PlayerTurn → EnemyTurn → EventTurn → EndRound）
  2. `TurnContext.cs`：回合上下文（当前玩家 ID、可用操作、状态）
  3. `BattleLoop.cs`：驱动回合切换 + 事件触发
  4. 单测：Mock 状态机，验证切换条件
- **交付物**：3 个 C# 脚本 + 1 个 EditMode 测试
- **预计工时**：4 小时

### T2.2 地图数据结构
- **负责**：我
- **动作**：
  1. `Tile.cs`：格子数据结构（坐标、地形、生物、占据者）
  2. `BattleMap.cs`：地图管理（grid、tile 集合、单位注册表）
  3. `UnitInstance.cs`：运行时单位实例（位置、血量、buff 列表）
  4. `BuildingInstance.cs`：运行时建筑实例（位置、血量、产出）
  5. 简单地图编辑器（运行时）：右键放置 Tile，左键放单位
- **交付物**：5 个 C# 脚本
- **预计工时**：6 小时

### T2.3 触屏输入
- **负责**：我
- **动作**：
  1. `InputSubsystem.cs`：触屏抽象（点击、拖拽、长按、缩放）
  2. `InputHandler.cs`：把屏幕坐标转格子坐标（摄像机投影 + raycast）
  3. `SelectionManager.cs`：选中单位 / 取消选中 / 选目标
  4. Unity EventSystem 集成（PointerInputModule 触屏）
- **交付物**：3 个 C# 脚本
- **预计工时**：4 小时

### T2.4 单局 UI 框架
- **负责**：我
- **动作**：
  1. Canvas + HUD：回合指示、单位信息卡、资源条、时间条
  2. `UIBattleHUD.cs`：绑定 BattleSubsystem 事件
  3. UI 风格：纯色 + 文字（灰盒风格，避免美术依赖）
  4. 横竖屏切换适配（默认竖屏，可旋转横屏）
- **交付物**：1 个 Scene `BattleScene.unity` + 3 个 C# 脚本 + UI prefab
- **预计工时**：6 小时

### T2.5 SaveSubsystem（本地）
- **负责**：我
- **动作**：
  1. `SaveSubsystem.cs`：JSON 序列化（Newtonsoft.Json 或 Unity JsonUtility）
  2. `SaveData_Run.cs`：单 Run 数据（地图、玩家、AI、回合数、状态）
  3. `SaveData_Meta.cs`：Meta 进度（解锁阵营、解锁 buff、货币）
  4. 自动保存：每回合结束 + Run 结束时
- **交付物**：4 个 C# 脚本
- **预计工时**：3 小时

---

## W3：AI 对手 + 胜负条件

### T3.1 行为树框架
- **负责**：我
- **动作**：
  1. `BTNode.cs` (abstract)：Tick() 返回 `Success/Running/Failure`
  2. `Composite.cs`：Sequence / Selector
  3. `Action.cs`：叶子节点基类
  4. `Condition.cs`：条件节点基类
  5. `BehaviorTree.cs`：运行整棵树
- **交付物**：5 个 C# 脚本
- **预计工时**：4 小时

### T3.2 AI 行为节点（具体实现）
- **负责**：我
- **动作**：
  1. `Condition_HasEnoughGold.cs`
  2. `Condition_EnemyNearBase.cs`
  3. `Action_BuildWorker.cs`
  4. `Action_BuildSoldier.cs`
  5. `Action_Attack.cs`
  6. `Action_Defend.cs`
  7. BT 配置文件：JSON 描述树结构（`AI/bt_default.json`）
- **交付物**：6 个 C# 脚本 + 1 个 JSON
- **预计工时**：4 小时

### T3.3 胜负条件
- **负责**：我
- **动作**：
  1. `WinCondition_MainBaseDestroyed.cs`：玩家主堡被毁 = 负，AI 主堡被毁 = 胜
  2. `WinCondition_Timeout.cs`：8 分钟未分胜负 = 资源多者胜
  3. `BattleSubsystem` 接入胜负检测
- **交付物**：2 个 C# 脚本 + BattleSubsystem 改
- **预计工时**：2 小时

### T3.4 结算 UI
- **负责**：我
- **动作**：
  1. `UIBattleResult.cs`：胜/负 + 战报卡（回合数、双方资源、击杀数）
  2. 重试 / 返回主菜单 按钮
  3. `RogueRunResult`：传给 MetaSubsystem 的数据
- **交付物**：2 个 C# 脚本 + 1 个 Scene
- **预计工时**：3 小时

### T3.5 真机性能 baseline
- **负责**：用户本地（我指导）
- **动作**：
  1. 真机运行 1 个完整 Run
  2. 用 Unity Profiler（Android 远程）记录帧时间
  3. 验证：中端机 60 FPS / 低端机 30 FPS 锁定
- **交付物**：截图 + 性能报告
- **预计工时**：2 小时

---

## W4：Roguelike 元素 + 真机适配

### T4.1 MapGenSubsystem（WFC）
- **负责**：我
- **动作**：
  1. `MapGenSubsystem.cs`：入口，接收种子 → 输出 BattleMap
  2. `WFCGenerator.cs`：Wave Function Collapse 实现（简化版）
  3. `RoomTemplate.cs`：10-20 个预制房间 prefab + 邻接约束
  4. `SeedRandom.cs`：64-bit Mulberry32 / xorshift PRNG
- **交付物**：4 个 C# 脚本 + 10 个房间 prefab
- **预计工时**：8 小时

### T4.2 事件卡牌系统
- **负责**：我
- **动作**：
  1. `EventCardData.cs` (ScriptableObject)：标题、文案、效果、稀有度
  2. `EventCardPool.cs`：≥ 30 张事件卡（混合：奖励 / 灾变 / 交易）
  3. `EventCardTrigger.cs`：每 3 回合抽 1 张，AI / Player 任选接受
  4. UI：事件卡弹出 + 三选一按钮（接受 / 拒绝 / 替换）
- **交付物**：3 个 C# 脚本 + 30 个 ScriptableObject 数据 + UI prefab
- **预计工时**：6 小时

### T4.3 起始 buff 三选一
- **负责**：我
- **动作**：
  1. `BuffData.cs` (ScriptableObject)：buff 描述、效果
  2. `BuffPool.cs`：≥ 6 个 buff（金币+20% / 起始多 1 工人 / 起始多 1 兵 / 资源点 +2 等）
  3. `RunSetupUI.cs`：Run 开始前随机抽 3 个 buff 让玩家选 1 个
- **交付物**：3 个 C# 脚本 + 6 个 ScriptableObject 数据 + UI prefab
- **预计工时**：4 小时

### T4.4 RoguelikeSubsystem
- **负责**：我
- **动作**：
  1. `RoguelikeSubsystem.cs`：Run 生命周期（Init → Loop → End → Meta Update）
  2. `PermaDeath.cs`：Run 失败时清空 SaveData_Run，仅保留 Meta
  3. `MetaProgression.cs`：累计 currency、解锁进度
  4. `MetaCurrency.cs`：虚拟货币（仅记录，不做商业化）
- **交付物**：4 个 C# 脚本
- **预计工时**：5 小时

### T4.5 解锁 UI
- **负责**：我
- **动作**：
  1. `UIMetaProgression.cs`：6 阵营解锁状态展示
  2. `UIUnlockPopup.cs`：解锁新阵营 / buff / 主题的弹窗
  3. 5 个 UI 主题占位（仅换色卡）
- **交付物**：3 个 C# 脚本 + UI prefab
- **预计工时**：4 小时

### T4.6 真机适配
- **负责**：用户本地（我指导）
- **动作**：
  1. 在 2 台真机（中端 + 低端）跑 5 个完整 Run
  2. 验证：
     - 中端 60 FPS 锁定
     - 低端 30 FPS 锁定，无明显卡顿
     - 不同分辨率（720p / 1080p / 1440p）UI 不破图
     - 横竖屏切换正常
  3. 修复发现的 UI / 性能 bug
- **交付物**：测试矩阵报告
- **预计工时**：4 小时

---

## Sprint 1 出口（最终交付）

- [ ] 1 个 Android APK（< 80 MB）
- [ ] 1 台中端真机能完整跑完 1 Run
- [ ] 1 台低端真机能跑（30 FPS）
- [ ] 1 个胜利结局 + 1 个失败结局
- [ ] Meta currency 累积 + 至少 1 个阵营解锁可玩
- [ ] 至少 5 个完整 Run 数据保存在 SaveSubsystem

---

## 工时汇总

| 周 | 任务数 | 我的工时 | 用户工时 |
|---|---|---|---|
| W1 | 5 | 3 小时 | 3-4 小时 |
| W2 | 5 | 23 小时 | 0 |
| W3 | 5 | 15 小时 | 2 小时 |
| W4 | 6 | 31 小时 | 4 小时 |
| **总计** | **21** | **~72 小时**（≈ 9 工作日） | **~10 小时** |

---

## 风险与依赖

| 风险 | 应对 |
|---|---|
| W1 真机部署失败（驱动 / SDK / 证书） | 备选：先云真机测试平台（Firebase Test Lab） |
| W2-W3 我的代码 / 用户本地 Unity 集成摩擦 | 每日 1 次同步：用户截图本地状态，我看代码推断 |
| W4 WFC 实现时间超 | 降级：手工关卡 + 随机 buff（已在 v1.0 scope 里备选） |
| MetaProgression 数据持久化丢失 | 频繁自动保存 + 多备份路径（Application.persistentDataPath） |

---

## 待用户后续决策（v1.0 scope 9 节遗留）

- [ ] 真机型号（用户报具体型号 + Android 版本作为 Sprint 1 验证目标）
- [ ] Unity 6 LTS 具体版本号（用户装好后告诉我）
- [ ] 项目 Package Name（默认 `com.animalciv.game`，可改）