# Sprint 1 详细任务卡 — Web 单机 Roguelike 4 周交付（Phaser 3）

> **来源**：依据 `docs/production/v1-web-roguelike-scope.md` 范围 + 本轮拍板决定
> **目标**：4 周后，桌面 Chrome 100+ / 移动 Chrome 100+ 能完整跑完
> 1 个 Run（8-12 分钟），含胜利/失败两条结局线，Meta currency 累积 + 解锁 1 个阵营可玩。
> **部署 URL**：`https://346318599.github.io/animal-civ/`

## 拍板决定（2026-09-06 锁定）

| 项 | 决定 | 备注 |
|---|---|---|
| 引擎 | **Phaser 3.90+** | CDN `<script>` tag，无 build step |
| 语言 | **JavaScript ES2022** (无 TypeScript) | ES Modules，浏览器原生支持 |
| AI 框架 | **行为树（BT）** | 手写 JS，从 C# 版 1:1 平移 |
| 地图生成 | **WFC + 房间模板** | 10-20 个预制房间，PCG 拼接 |
| 美术 | **灰盒占位** | Phaser Graphics 矩形 + 文字 |
| 测试工具 | **Vitest** (Node) | 跑 game-logic 单测，与 Phaser 视图层解耦 |
| 部署 | **GitHub Pages（独立 repo）** | `346318599/animal-civ` → Pages 自动部署 |
| 测试目标 | 桌面 Chrome 100+ + 移动 Chrome 100+ | 至少 1 桌面 + 1 移动真机 |
| 触屏 | **v1.0 含**（W4 强制） | 虚拟摇杆 + 大点击区 + `pointer:fine` 切换 |
| CI/CD | GitHub Actions | lint + Vitest + Pages deploy |

---

## W1：项目骨架 + Pages 部署 baseline

> **W1 出口标准**：`https://346318599.github.io/animal-civ/` 在桌面 Chrome 打开，
> 看到灰色 "Animal Civ" 占位画面，DevTools console 无报错。
> ⚠️ W1 不通 = W2-W4 全白做。

### T1.1 项目初始化（用户本地 + 我引导）

- **负责**：用户（创建 repo）+ 我（提供 init 脚本）
- **动作**：
  1. 用户在 GitHub 创建新 repo `animal-civ`（owner: `346318599`，Public，初始化无 README）
  2. 我在 WorkBuddy 写：
     - `web/index.html`（HTML5 骨架 + viewport meta + Phaser 3.90 CDN script）
     - `web/.nojekyll`（关 Jekyll 处理）
     - `web/styles.css`（黑底灰框占位）
     - `web/js/main.js`（Phaser Game config + BootScene 占位）
  3. 把 `my-game/web/` 内容推送到 `animal-civ` repo main 分支
     - 方式 A：`git subtree push --prefix=web my-game main:animal-civ-main`（一次性初始化后改用远端直推）
     - 方式 B：在 `animal-civ` repo clone 一次后 `rsync -av web/ animal-civ/` + 手动 commit push
     - **推荐方式 B**（v1.0 简单；后续可改 A 自动同步）
- **验收**：Chrome 打开 URL 看到灰色 "Animal Civ" 标题
- **预计工时**：1 小时

### T1.2 Pages 部署配置

- **负责**：用户（GitHub UI 操作）
- **动作**：
  1. 用户在 `animal-civ` repo Settings → Pages → Build and deployment
     - Source: `Deploy from a branch`
     - Branch: `main` / Root
  2. 等 1-3 分钟看到 Pages URL 200
- **验收**：URL 访问返回 200，HTML 内容正确
- **预计工时**：30 分钟

### T1.3 web/ 目录结构 + .gitignore

- **负责**：我
- **动作**：
  1. 写 `web/.gitignore`（基本空；静态网站无构建产物，但保留 vite/ 临时目录忽略模板）
  2. 仓库根 `.gitignore` 加 `web/node_modules/`（Vitest 依赖隔离）
  3. 创建目录结构（参考 `v1-web-roguelike-scope.md` §2）：
     ```
     web/
       index.html
       .nojekyll
       styles.css
       js/
         main.js                       # Phaser config + scene 引导
         core/                         # BT 框架 + 游戏循环
           BTNode.js
           BTContext.js
           Composites.js
           LeafNodes.js
           BehaviorTree.js
           DefaultTrees.js
           BattleLoop.js
           EventBus.js
           Tile.js
           BattleMap.js
           UnitInstance.js
           BuildingInstance.js
           InputSubsystem.js
           InputHandler.js
           SelectionManager.js
           MapGenSubsystem.js
           WFCGenerator.js
           SeedRandom.js
           SaveSubsystem.js
           RoguelikeSubsystem.js
           PermaDeath.js
           MetaProgression.js
         ai/nodes/
           Condition_HasEnoughGold.js
           Condition_EnemyNearBase.js
           Condition_HasEnoughMyUnits.js
           Action_Build.js
           Action_Attack.js
           Action_Defend.js
         data/
           factions.js
           units.js
           buildings.js
           events.js
           buffs.js
           maps.js
         scenes/
           BootScene.js
           MainMenuScene.js
           BattleScene.js
           EventScene.js
           RunSetupScene.js
           ResultScene.js
         ui/
           HUD.js
           ActionPanel.js
           MobileControls.js
           GreyboxFactory.js
       assets/greybox/
         (placeholder)
     tests/                             # 仓库根：Vitest 测试
       bt.test.js
       battleLoop.test.js
       eventBus.test.js
       tile.test.js
       saveSubsystem.test.js
     ```
- **交付物**：目录占位 + `.gitignore`
- **预计工时**：15 分钟

### T1.4 灰盒美术占位规范（Web 版）

- **负责**：我
- **动作**：
  1. 写 `web/js/ui/greybox-spec.md`（或 `docs/production/greybox-web-spec.md`）：
     - 色彩：7 阵营各 1 主色 + 1 辅色（沿用 Art Bible HEX）
     - 几何体：Phaser `add.rectangle()` / `add.circle()` / `add.text()`
     - 尺寸约定：tile = 32×32 CSS px / 单位 = 24×24 / 建筑 = 32×32
     - 阵营色卡：`GreyboxFactory.js` 导出 `FACTION_COLORS = { panda: '#000+', ... }`
  2. 实现 `web/js/ui/GreyboxFactory.js`：
     - `createUnit(scene, x, y, faction)` → Phaser Container
     - `createBuilding(scene, x, y, type)` → Phaser Container
     - `createTile(scene, x, y, terrain)` → Phaser Rectangle
  3. 在 `BootScene` 演示：放 5 个单位占位 + 5 个建筑占位
- **验收**：URL 打开看到 10 个灰盒对象整齐排列
- **预计工时**：2 小时

### T1.5 桌面浏览器 baseline 验证

- **负责**：用户本地（手动）+ 我（CDN/HTTP 自动化 + 文档模板）
- **动作**：
  1. 我：`curl -I` + WebFetch 验证 Pages 200 OK、HTML < 2KB、`.nojekyll` 落地、CORS `*`
  2. 我：写 `web/TEST-RESULTS-W1.md` 模板（视觉清单 / Console 检查 / FPS baseline）
  3. 用户：依次在 **2 个桌面浏览器** 打开 URL，各跑一次 DevTools Console 检查
     + Performance 录制 5 秒，记下 FPS
     - 推荐组合：Chrome + Edge（同 Win10 一台机就能跑，都是 Chromium/Blink）
     - Safari（macOS 必需）/ Firefox 看用户是否有，没有就跳过
  4. 用户：填测试结果到 `web/TEST-RESULTS-W1.md`，commit + push
- **交付物**：`web/TEST-RESULTS-W1.md`（已填的测试结果 doc）
- **预计工时**：30 分钟（我 10 分钟 + 用户 20 分钟）
- **降级接受**：只有 1 个浏览器跑通也算 W1 baseline 满足（v1.0 ship 前再补 cross-engine）；2 浏览器过算强通过；3 浏览器过算满分

---

## W2：单局核心循环（回合制）

### T2.1 回合制框架

- **负责**：我
- **动作**：
  1. `web/js/core/BattleLoop.js`：回合状态机（`PlayerTurn → EnemyTurn → EventTurn → EndRound`）
  2. `web/js/core/TurnContext.js`：回合上下文（当前玩家 ID、可用操作、状态）
  3. `BattleLoop.js` 驱动回合切换 + 事件触发（订阅 `EventBus`）
  4. Vitest 单测：mock 状态机，验证切换条件
- **交付物**：3 个 JS + 1 个 test 文件
- **预计工时**：4 小时

### T2.2 地图数据结构

- **负责**：我
- **动作**：
  1. `web/js/core/Tile.js`：格子数据结构（坐标、地形、生物、占据者）
  2. `web/js/core/BattleMap.js`：地图管理（grid、tile 集合、单位注册表）
  3. `web/js/core/UnitInstance.js`：运行时单位实例（位置、血量、buff 列表）
  4. `web/js/core/BuildingInstance.js`：运行时建筑实例（位置、血量、产出）
  5. Vitest 单测：map add/remove/get/serialize
- **交付物**：4 个 JS + 1 个 test
- **预计工时**：6 小时

### T2.3 输入抽象（桌面 + 移动）

- **负责**：我
- **动作**：
  1. `web/js/core/InputSubsystem.js`：输入抽象（Phaser `pointermove` / `pointerdown` / `keydown`）
  2. `web/js/core/InputHandler.js`：屏幕坐标 → 格子坐标（Phaser camera 投影）
  3. `web/js/core/SelectionManager.js`：选中 / 取消 / 选目标
  4. **暂不**写 `MobileControls.js`（W4 详做）；W2 先做桌面键鼠
  5. Vitest 单测：屏幕坐标转换（mock camera）
- **交付物**：3 个 JS + 1 个 test
- **预计工时**：5 小时

### T2.4 单局 UI 框架

- **负责**：我
- **动作**：
  1. `web/js/scenes/BattleScene.js`：Phaser Scene（继承 `Phaser.Scene`）
  2. `web/js/ui/HUD.js`：HUD（回合指示 / 单位信息 / 资源条 / 时间条）
  3. `web/js/ui/ActionPanel.js`：动作面板（攻击 / 建造 / 防守按钮）
  4. 灰盒风格：纯色矩形 + 文字（沿用 `GreyboxFactory`）
  5. 横竖屏响应式：Phaser `Scale.FIT` + `CENTER_BOTH` + viewport meta
- **交付物**：3 个 JS（scene + 2 ui）
- **预计工时**：6 小时

### T2.5 SaveSubsystem（localStorage）

- **负责**：我
- **动作**：
  1. `web/js/core/SaveSubsystem.js`：JSON 序列化（`JSON.parse` / `JSON.stringify`）
  2. `web/js/core/SaveData_Run.js`：单 Run 数据（地图 / 玩家 / AI / 回合数 / 状态）
  3. `web/js/core/SaveData_Meta.js`：Meta 进度（解锁阵营 / 解锁 buff / currency）
  4. 自动保存：每回合结束 + Run 结束时（localStorage key 命名 `animal-civ-save-v1`）
  5. Vitest 单测：序列化往返 + localStorage mock
- **交付物**：3 个 JS + 1 个 test
- **预计工时**：3 小时

---

## W3：AI 对手 + 胜负条件

### T3.1 行为树框架（JS）

- **负责**：我
- **动作**：
  1. `web/js/core/BTNode.js` (abstract class)：`tick(context)` 返回 `'success' | 'running' | 'failure'`
  2. `web/js/core/Composites.js`：`Sequence` / `Selector` / `Parallel`
  3. `web/js/core/LeafNodes.js`：`Action` / `Condition` 基类 + 装饰器 `Inverter` / `Repeat` / `UntilFail`
  4. `web/js/core/BehaviorTree.js`：运行整棵树（管理 root + tick loop）
  5. `web/js/core/BTContext.js`：tick 间共享数据（blackboard 模式）
  6. Vitest 单测：覆盖 Sequence / Selector / Inverter / Repeat（≥ 11 cases，平移 C# 版）
- **交付物**：5 个 JS + 1 个 test 文件（≥ 50 行）
- **预计工时**：6 小时

### T3.2 AI 行为节点（具体实现）

- **负责**：我
- **动作**：
  1. `web/js/ai/nodes/Condition_HasEnoughGold.js`
  2. `web/js/ai/nodes/Condition_EnemyNearBase.js`
  3. `web/js/ai/nodes/Condition_HasEnoughMyUnits.js`
  4. `web/js/ai/nodes/Action_Build.js`
  5. `web/js/ai/nodes/Action_Attack.js`
  6. `web/js/ai/nodes/Action_Defend.js`
  7. `web/js/ai/DefaultTrees.js`：默认树配置（`Selector → [Defend, Attack, Build]`）
  8. Vitest 单测：每个节点 1 个 case（≥ 6 cases）
- **交付物**：7 个 JS + 1 个 test
- **预计工时**：4 小时

### T3.3 胜负条件

- **负责**：我
- **动作**：
  1. `web/js/core/WinCondition_MainBaseDestroyed.js`：玩家主堡被毁 = 负，AI 主堡被毁 = 胜
  2. `web/js/core/WinCondition_Timeout.js`：8 分钟（480000ms）未分胜负 = 资源多者胜
  3. `BattleLoop.js` 接入胜负检测（每回合末检查）
  4. Vitest 单测：mock 主堡被毁 + timeout
- **交付物**：2 个 JS + 1 个 test
- **预计工时**：2 小时

### T3.4 结算 UI

- **负责**：我
- **动作**：
  1. `web/js/scenes/ResultScene.js`：Phaser Scene（接收 BattleLoop 结果）
  2. `web/js/ui/UIBattleResult.js`：胜/负 + 战报卡（回合数 / 双方资源 / 击杀数）
  3. 重试 / 返回主菜单按钮（点击 → 切换 scene）
  4. 灰盒风格：纯色矩形 + 文字
- **交付物**：2 个 JS
- **预计工时**：3 小时

### T3.5 桌面浏览器性能 baseline

- **负责**：用户本地 + 我指导
- **动作**：
  1. Chrome DevTools → Performance 面板录制 1 个完整 Run
  2. 验证：桌面 60 FPS 锁定（Chrome FPS meter 启用）
  3. 验证：Chrome / Firefox / Safari 控制台无错
  4. 检查 Network：所有资源 < 5MB，首屏 < 2s
- **交付物**：性能报告（截图 + FPS 数据）+ 多浏览器截图
- **预计工时**：2 小时

---

## W4：Roguelike 元素 + 移动端触屏适配

### T4.1 MapGenSubsystem（WFC + JS）

- **负责**：我
- **动作**：
  1. `web/js/core/MapGenSubsystem.js`：入口，接收 seed → 输出 `BattleMap`
  2. `web/js/core/WFCGenerator.js`：Wave Function Collapse（简化版，JS 1:1 平移 C# 版 `WFCGenerator.cs`）
  3. `web/js/data/maps.js`：10-20 个房间模板（tilemap JSON 描述）+ 邻接约束
  4. `web/js/core/SeedRandom.js`：64-bit Mulberry32 / xorshift PRNG
  5. Vitest 单测：相同 seed 产出相同地图
- **交付物**：4 个 JS + 1 个 test
- **预计工时**：8 小时

### T4.2 事件卡牌系统

- **负责**：我
- **动作**：
  1. `web/js/data/events.js`：事件卡数据（标题 / 文案 / 效果 / 稀有度）
  2. ≥ 30 张事件卡（奖励 / 灾变 / 交易，各 ≥ 10 张）
  3. 每 3 回合抽 1 张，AI / Player 任选接受
  4. `web/js/scenes/EventScene.js`：事件卡弹出 + 三选一按钮（接受 / 拒绝 / 替换）
  5. Vitest 单测：事件触发 + 效果应用
- **交付物**：2 个 JS + 1 个 test + 30 条数据
- **预计工时**：6 小时

### T4.3 起始 buff 三选一

- **负责**：我
- **动作**：
  1. `web/js/data/buffs.js`：≥ 6 个 buff（金币 +20% / 起始多 1 工人 / 起始多 1 兵 / 资源点 +2 / 起始 HP +1 / 移动速度 +1）
  2. `web/js/scenes/RunSetupScene.js`：Run 开始前随机抽 3 个 buff 让玩家选 1 个
  3. UI：3 张 buff 卡并排展示 + 选中高亮 + 确认按钮
- **交付物**：2 个 JS（data + scene）
- **预计工时**：4 小时

### T4.4 RoguelikeSubsystem（JS）

- **负责**：我
- **动作**：
  1. `web/js/core/RoguelikeSubsystem.js`：Run 生命周期（`Init → Loop → End → Meta Update`）
  2. `web/js/core/PermaDeath.js`：Run 失败时清空 `SaveData_Run`，仅保留 Meta
  3. `web/js/core/MetaProgression.js`：累计 currency、解锁进度
- **交付物**：3 个 JS
- **预计工时**：5 小时

### T4.5 解锁 UI

- **负责**：我
- **动作**：
  1. `web/js/ui/UIMetaProgression.js`：6 阵营解锁状态展示（卡片网格 + 锁定/解锁状态）
  2. `web/js/scenes/MainMenuScene.js`：主菜单（继续 / 新 Run / 解锁状态查看）
  3. `web/js/ui/UIUnlockPopup.js`：解锁新阵营 / buff 的弹窗
- **交付物**：3 个 JS
- **预计工时**：4 小时

### T4.6 移动端触屏适配 + 真机回归

- **负责**：我（写 MobileControls + iOS fix）+ 用户本地（移动真机测试）
- **动作**：
  1. **写 `web/js/ui/MobileControls.js`**（v1.0 含触屏强制任务）：
     - 左下虚拟摇杆（圆形底盘 + 内圆跟随手指；松开回中）
     - 右下大按钮（≥ 88×88 CSS px）触发主动作
     - 顶部 HUD 触屏可点击按钮（≥ 44×44 CSS px）
     - 通过 `window.matchMedia('(pointer: coarse)')` 检测移动端才显示
  2. CSS `@media (pointer: fine)` 切换桌面 / 移动 UI
  3. CSS `touch-action: none` 阻止 iOS Safari 默认手势（滚动 / 缩放）
  4. Phaser scale manager：`Scale.FIT` + `CENTER_BOTH` + viewport meta（已 W2 配，W4 复测）
  5. 用户在移动 Chrome（Moto G Power / Galaxy A 系列）跑 5 个完整 Run，验证 60fps
- **预计工时**：6 小时
- **依赖**：T4.4（Meta 解锁）、T4.5（解锁 UI）已合入才有完整 Run

---

## Sprint 1 出口（最终交付）

- [ ] `https://346318599.github.io/animal-civ/` 跑通桌面 Chrome 100+
- [ ] 移动 Chrome 100+ 跑通（含触屏 60fps）
- [ ] Firefox 100+ + Safari 15+ 双跑通（仅桌面，无需触屏）
- [ ] 1 个胜利结局 + 1 个失败结局
- [ ] Meta currency 累积 + 至少 1 个阵营解锁可玩
- [ ] 至少 5 个完整 Run 数据保存在 SaveSubsystem
- [ ] ≥ 30 条 Vitest 单测全过
- [ ] 桌面 60 FPS / 移动 60 FPS 锁定
- [ ] 首屏 < 5 MB，< 2s 首屏加载

---

## 工时汇总

| 周 | 任务数 | 我的工时 | 用户工时 |
|---|---|---|---|
| W1 | 5 | ~5 小时 | ~2 小时 |
| W2 | 5 | ~24 小时 | 0 |
| W3 | 5 | ~17 小时 | ~2 小时 |
| W4 | 6 | ~33 小时 | ~2 小时 |
| **总计** | **21** | **~79 小时**（≈ 10 工作日） | **~6 小时** |

---

## 风险与依赖

| 风险 | 应对 |
|---|---|
| GitHub Pages 部署失败 / 404 | 备选：本地 `web/index.html` 双击（v1.0 接受）；进一步可迁 Vercel |
| Phaser 3 在低端移动浏览器掉到 < 30fps | W4 强制测 1 台 Android 真机浏览器（Moto G Power / Galaxy A）；掉帧降级方案：关闭抗锯齿 + 缩放 canvas 分辨率 |
| Phaser 3 CDN 被墙（CN 网络） | 备选：本地 bundle Phaser.js 到 `web/assets/`；v1.0 部署后实测 |
| 桌面 / 移动输入范式差异 | W4 MobileControls 子模块强制抽象；通过 `pointer:fine` media query 切换 |
| W4 WFC 实现时间超 | 降级：手工关卡 + 随机 buff（已在 v1.0 scope 里备选） |
| localStorage 被清后 Meta 进度丢失 | 接受：v1.0 没云存档是显式决策 |
| my-game/web → animal-civ 同步失误 | 推荐手动 rsync（v1.0 简单可控）；后续可加 GitHub Actions 自动 sync |

---

## 待用户后续决策（W1 起项目时确认）

- [ ] 移动真机型号（用户报具体型号 + Chrome 版本）— W4 T4.6 用
- [ ] 桌面浏览器偏好（Chrome / Firefox / Safari 优先级）— W3 T3.5 验证用
- [ ] 项目主菜单色（默认亚洲大熊猫黑白色，可改）— W4 T4.5 用
- [ ] `animal-civ` repo 初始化偏好（README 模板 / LICENSE / .github/）— W1 T1.1 用