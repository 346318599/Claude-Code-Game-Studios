# v1.0 Web 单机 Roguelike — Scope（取代 Android 单机版）

> **📌 状态：active**（2026-09-06 拍板三项关键决策；待 Sprint 1 plan 锁定后冻结）
> - ✅ 部署 URL：`346318599.github.io/animal-civ`（GitHub Pages）
> - ✅ v1.0 含触屏适配（移动端浏览器原生支持，虚拟摇杆 + 大点击区）
> - ⏸ Sprint 1 plan：等本 scope 审完后再开工
>
> 取代对象：`docs/production/v1-android-roguelike-scope.md`（已 archived / SUPERSEDED）。
> 取代原因：Unity Hub 3.21.1 要求 Win10 21H1+，本机 2004 (build 19041) 卡死。

---

## 0. Pivot 背景（2026-09-06）

| # | 原方向 | 卡死原因 | 新方向 |
|---|---|---|---|
| 1 | Python my-game 框架引导设计 | 概念 OK，但 AskUserQuestion 比例低 | 直接在 WorkBuddy 推进 |
| 2 | Android Unity 6 LTS 单机 | Hub 3.21.1 强制 Win10 21H1+，本机是 2004 (build 19041) | 退路：Unity 2022.3 LTS |
| 3 | 浏览器网页游戏（本次拍板） | — | — |

**最终决定**：**Web 单机 Roguelike**，所有设计内容（Stage 2 / Animal Civ 7 阵营）保留，stack 整体替换。

---

## 1. v1.0 目标（Web）

- **类型**：浏览器单机 Roguelike + 4X + 回合制（前置编队半即时战术）
- **题材**：动物文明，7 大洲 × 7 阵营（亚洲大熊猫 / 欧洲灰狼 / 非洲非洲狮 / 北美灰熊 / 南美美金刚鹦鹉 / 大洋洲袋鼠 / 南极帝企鹅）
- **单局时长**：8–12 分钟
- **对手**：1 个 AI（行为树驱动）
- **持久**：永久死亡（Permadeath），单周目结束 → 累计 Meta Currency 解锁其他阵营
- **部署形态**：静态网站 `web/index.html`，浏览器直开即玩
- **目标设备**：桌面 + 移动端浏览器（响应式；移动端走触控 + 触屏虚拟摇杆）

---

## 2. Tech Stack

| 层 | 选型 | 理由 |
|---|---|---|
| 渲染引擎 | **Phaser 3.90+** | 2D 网页游戏事实标准，scene/tilemap/input/sound/animation 全套 |
| 语言 | **JavaScript ES Modules** (无 TypeScript) | 无 build step，浏览器原生支持，迭代最快 |
| 包管理 | **None** | 通过 `<script type="module">` 直接 import，CDN 加载 Phaser |
| 测试 | **Vitest** (Node) | 跑 game logic 单测（与 Phaser 视图层解耦） |
| Lint / Format | ESLint + Prettier（可选） | 后续接入 |
| Dev Server | **Vite** (可选) | 跑 Vitest + 起本地静态 server，**不影响生产构建** |
| 部署 | **GitHub Pages（独立 repo）** | `346318599/animal-civ` → `346318599.github.io/animal-civ`；URL 路径 `/animal-civ` 必须是 repo 名，因此不能复用 my-game fork 的子目录 |
| 后端 | **None** | 纯前端，v1.0 不含 PvP / 云存档 |

### 文件结构（计划）

```
my-game/
├── web/                              ← NEW: 实际游戏代码（生产部署目录）
│   ├── index.html                    # Phaser 入口 + boot
│   ├── .nojekyll                     # GitHub Pages: 关掉 Jekyll 处理（保留 _ 开头目录）
│   ├── styles.css
│   ├── js/
│   │   ├── main.js                   # Phaser config + scene 引导
│   │   ├── core/                     # BT 框架 + 游戏循环
│   │   │   ├── BTNode.js
│   │   │   ├── BTContext.js
│   │   │   ├── Composites.js
│   │   │   ├── LeafNodes.js
│   │   │   ├── BehaviorTree.js
│   │   │   ├── DefaultTrees.js
│   │   │   ├── BattleLoop.js
│   │   │   └── EventBus.js
│   │   ├── ai/nodes/
│   │   │   ├── Condition_HasEnoughGold.js
│   │   │   ├── Condition_EnemyNearBase.js
│   │   │   ├── Condition_HasEnoughMyUnits.js
│   │   │   ├── Action_Build.js
│   │   │   ├── Action_Attack.js
│   │   │   └── Action_Defend.js
│   │   ├── data/
│   │   │   ├── factions.js           # 7 阵营数据
│   │   │   ├── units.js              # 单位定义
│   │   │   ├── buildings.js          # 建筑定义
│   │   │   ├── events.js             # 事件卡
│   │   │   └── maps.js               # 地图模板
│   │   ├── scenes/
│   │   │   ├── BootScene.js
│   │   │   ├── MainMenuScene.js
│   │   │   ├── BattleScene.js
│   │   │   ├── EventScene.js
│   │   │   └── ResultScene.js
│   │   └── ui/                       # DOM 元素 + 触屏控件
│   │       ├── HUD.js
│   │       ├── ActionPanel.js
│   │       └── MobileControls.js
│   └── assets/                       # 灰盒占位（彩色矩形 + 文本）
│       └── greybox/
│           ├── tile.png (生成)
│           ├── unit.png (生成)
│           └── building.png (生成)
├── tests/                            ← NEW: Vitest 测试
│   ├── bt.test.js
│   ├── battleLoop.test.js
│   └── eventBus.test.js
├── Assets/                           ← ARCHIVED: Unity C# reference
│   ├── NOTICE.md                     # 解释被 web/ 取代
│   ├── .gitignore
│   ├── Scripts/AI/                   # 留作架构 reference（不删）
│   └── Tests/Editor/BTTests.cs
└── docs/
    ├── gdd/game-concept.md           # 不动
    ├── architecture/                 # 不动（与语言无关）
    ├── art-direction/art-bible.md    # 改：新增 web 灰盒实现策略章节
    ├── gameplay/mirror-pvp-fair-play.md  # 删/PvP-future：v1.0 不含 PvP，文档保留供 v2.0 参考
    ├── technical-setup.md            # 改：Windows 路径段删除，改 Web 浏览器兼容矩阵
    ├── pre-production.md             # 不动（risk 部分需补 1 行 Web 退路注脚）
    └── production/                   # ← Web scope 落这
        ├── v1-web-roguelike-scope.md # 本文件（替代 v1-android-roguelike-scope.md）
        ├── v1-android-roguelike-scope.md  # 标 superseded（不动正文，加 header banner）
        └── sprint-1-web-plan.md      # 新写
```

---

## 3. 与原 Android scope 的差异

| 维度 | Android（已 superseded） | Web（v1.0） |
|---|---|---|
| 引擎 | Unity 6 LTS / URP 2D | Phaser 3 |
| 语言 | C# 9 / .NET Standard 2.1 | JS ES2022 |
| 构建 | APK (arm64-v8a, IL2CPP) | 静态 .html/.js/.css 包 |
| 分发 | Play Store | GitHub Pages（独立 repo `346318599/animal-civ`） |
| 输入 | 触屏为主 | 桌面鼠标键盘 + 移动触屏 |
| 测试 | NUnit / Unity Test Runner | Vitest (Node) |
| 单包大小限制 | < 80 MB APK | < 5 MB（首次加载），lazy load 资源 |
| 最低平台 | Android 8.0 / 4GB RAM | Chrome 100+ / Firefox 100+ / Safari 15+ |
| CI/CD | Unity Cloud Build / Fastlane | GitHub Actions（lint + test + publish） |

**保留不动**：
- BT 节点语义（HasEnoughGold / Build / Attack / Defend 等）
- 7 阵营设计、调参公式、单局循环、心流曲线
- 11 子系统架构（含 EventBus）— 从 C# 直接 1:1 平移到 JS

---

## 4. 单局流程（Web 版不变）

```
Boot → MainMenu → 选择阵营 (v1.0 默认解锁亚洲大熊猫) →
FactionSelect → 地图生成 (WFC) → BattleScene 进入 →
回合制循环 (8-12 分钟) → 胜负条件触发 → ResultScene →
回到 Meta (解锁 1 个新阵营；v1.0 不做 UI 提示，简单结算) → 回到 MainMenu
```

---

## 5. v1.0 必须包含 / 排除

### ✅ 必须（MUST）

- 1 个可玩阵营（默认亚洲大熊猫）
- 1 个 AI 对手（默认非洲非洲狮阵营颜色）
- 灰盒占位美术（彩色矩形 + 文字）
- 桌面 + 移动响应式
- Meta Currency 累计 + 解锁其他 6 阵营（localStorage 持久）
- 离线可玩（无网络依赖）

### ❌ 不做（v1.0 排除）

- PvP / 异步匹配 / 镜像匹配
- Gacha / 抽卡 / IAP
- 服务端 / 云存档 / 跨设备同步
- i18n / 多语言（v1.0 仅中文）
- 7 个阵营全部美术（仅 1 阵营 + 灰盒）
- 教程（设计师标注行为，让玩家通过体验自学会）
- 音效 / BGM（v1.0 不带，但 EventBus 留接口）

---

## 6. Sprint 1 (Web) — 4 周可玩

详见 `sprint-1-web-plan.md`。大致 4 周结构（与 Android 版对应 W1-W4 同名 task 但 stack 替换）：

- **W1** 起 Web 项目 + 灰盒 + 桌面 / 移动浏览器兼容 + 部署到 GitHub Pages
- **W2** 回合制核心循环 + 鼠标/触屏输入 + 单局 UI + localStorage 存档
- **W3** BT AI（手写 JS） + 胜负条件 + 结算 UI + 性能 baseline (60fps)
- **W4** WFC 地图生成 + 事件卡 + 起始 buff + Meta 解锁 + 移动端触屏适配

---

## 7. 风险（新增 vs Android）

| 风险 | 等级 | 缓解 |
|---|---|---|
| Phaser 3 渲染在低端移动浏览器掉到 < 30fps | 中 | W4 强制测 1 台 Android 真机浏览器（Chrome 100+ Mobile） |
| 鼠标 vs 触屏 输入范式差太大 | 中 | **决策：v1.0 含触屏** — `MobileControls.js` 子模块强制走虚拟摇杆（左下虚拟摇杆移动单位 + 右下大按钮触发动作）；桌面端隐藏虚拟控件；通过 `pointer:fine` media query 切换 |
| 触屏虚拟摇杆在 Phaser 3 上手写 vs 库的选择 | 低 | 决策：自写，约 80 行 JS（用 Phaser `pointermove` + `pointerdown` 事件 + GameObject 圆盘），避免引第三方摇杆库引入打包复杂度 |
| 触屏 UI 在 iOS Safari 上 `touch-action` 默认行为冲突 | 中 | W2 输入层统一 `e.preventDefault()` + CSS `touch-action: none` |
| localStorage 被清后 Meta 进度丢失 | 低 | 接受：v1.0 没云存档是显式决策 |
| 静态资源膨胀（7 阵营灰盒 1 MB → 精装资源 50 MB+） | 低 | v1.0 严格 < 5 MB CDN 加载，v2.0 再拆分懒加载 |
| Phaser 3.90+ 浏览器兼容（Edge Legacy / Safari 14 等老浏览器） | 低 | 目标矩阵明确锁 Chrome 100+ / FF 100+ / Safari 15+ |

---

## 8. 已决定项（2026-09-06 拍板）

| # | 项 | 决议 | 详情 |
|---|---|---|---|
| 1 | 部署 URL | ✅ GitHub Pages：`346318599.github.io/animal-civ` | 见 §9.1 |
| 2 | v1.0 触屏适配 | ✅ 是（移动端原生支持） | 见 §9.2 |
| 3 | Sprint 1 plan 排期 | ⏸ 待本 scope 审完后开工 | 见 §9.3 |

### 8.1 仍可调整项（如有异议请审 scope 时提出）

- 7 阵营美术资产策略：v1.0 全部灰盒 vs v1.1 渐进开源免版权美术（未拍板，不影响 Sprint 1）

---

## 9. 决策详情

### 9.1 部署 URL = GitHub Pages `346318599.github.io/animal-civ`

**理由**：
- 用户已有 GitHub fork（`346318599/Claude-Code-Game-Studios`），Pages 复用同账号无需新申请
- 工作流最简单：`web/` 推到 `main` 的 `gh-pages` 分支（或 `/docs` 子目录）即可自动部署
- 免运维，无需服务器
- CDN 加速（HTTPS + 全球节点）

**实施**（Sprint 1 W1 任务）：
- **必须新建独立 repo**：`346318599/animal-civ`（GitHub Pages 用户级 URL 规则是 `{user}.github.io/{repo}/`，要得到 `/animal-civ` 子路径，repo 名必须叫 `animal-civ`）
  - 不能复用 `Claude-Code-Game-Studios` fork 作为 Pages source，否则 URL 变成 `346318599.github.io/Claude-Code-Game-Studios/`，路径不对
  - 仓库内容 = `my-game/web/` 目录内容（建仓时直接 `git mv web/* .`）
- `web/` 目录加 `.nojekyll`（关 Jekyll 处理）
- 配置 Pages Source：Settings → Pages → Branch: `main` / Root（静态站点最简）
- 加 GitHub Actions workflow：`web/**` push → 自动 build + 部署到 Pages（可选；v1.0 也可以手动 push main 触发 Pages 重建）
- 自定义域名（如需要）：CNAME 文件 + DNS 解析（v1.0 不做）

**my-game 仓库 vs animal-civ 仓库的内容边界**：
- **my-game repo**（fork）：保留所有设计文档、Assets/ C# reference、Bot 行为定义等"游戏规格"内容；`web/` 目录是开发源
- **animal-civ repo**（新建）：只放 `web/` 目录生产构建产物（HTML / JS / CSS / assets）；设计文档留在 my-game，不冗余到 animal-civ
- **同步流程**：my-game `web/` 改动 → CI 推送到 animal-civ（git subtree 或 rsync）；或每个 W1 末手动 `git subtree push --prefix=web` 一把
  - 推荐手动：v1.0 没高频发布，手动可控、可 review

**约束**：
- Pages 静态托管，无服务端逻辑（与 v1.0 "无后端" 决策一致）
- 单仓库 1 GB 软限制、100 GB 流量/月软限制（v1.0 灰盒 < 5 MB 完全够）

**回退方案**：若 Pages 后续受限，可迁 Vercel / Netlify（迁移成本 = 改 deploy workflow，本地 `web/` 不动）

### 9.2 v1.0 含触屏适配（移动端原生支持）

**理由**：
- 用户决策（2026-09-06）："是"
- 移动浏览器是天然触屏平台，无需额外开发平台特定应用
- 与"v1.0 不做 PvP / 服务端 / 云存档" 一致：触屏是输入层增强，不引入新后端

**触屏 UX 规范**（Sprint 1 W4 落地）：
- **左下虚拟摇杆**：移动单位；圆形底盘 + 内圆跟随手指；松开回中
- **右下大按钮（≥ 88×88 CSS px）**：触发选中单位的主动作（攻击 / 建造 / 防守）
- **顶部 HUD**：触屏可点击的目标选择按钮（≥ 44×44 CSS px，符合 iOS HIG）
- **桌面端切换**：CSS `@media (pointer: fine)` 检测精准指针（鼠标），隐藏虚拟摇杆，改用键盘 WASD + 鼠标点击
- **iOS Safari 兼容**：CSS `touch-action: none` 阻止浏览器默认手势（滚动 / 缩放）

**工时影响**：
- 原 W4 "移动端适配" 30% 工时升级为强制任务（含虚拟摇杆 + 大点击区 + media query 切换）
- W2 输入层需统一抽象 `PointerEvent`（Phaser 3 内建支持），桌面 + 移动共用一套代码路径

**性能预算**：
- 移动端（Chrome 100+ on Android 10+ 中端机）目标 60fps，兜底 30fps
- W4 真机回归测试最低配置：Moto G Power / Samsung Galaxy A 系列（Snapdragon 6xx 系列）

### 9.3 Sprint 1 plan 排期

**当前状态**：本 scope 待用户审完，**未开工**。

**下一步**：
1. 用户审本 scope（重点：§9.1 部署方案 / §9.2 触屏规范）
2. 用户给绿灯后，写 `sprint-1-web-plan.md`（21 任务 W1-W4 详细任务卡，对应 Android 版同名 task 但 stack 替换）
3. W1 任务起项目（建 `web/` 目录、port BT 框架到 JS、Phaser 灰盒 demo、部署到 Pages）

---

## 10. 相关链接

- Stage 2 设计基线（保留为 v2.0+ 全功能愿景）：
  - `docs/gdd/game-concept.md`
  - `docs/architecture/subsystems.md`
  - `docs/architecture/event-bus.md`
  - `docs/architecture/system-interfaces.md`
  - `docs/art-direction/art-bible.md`
  - `docs/gameplay/mirror-pvp-fair-play.md`
- 已 superseded：
  - `docs/production/v1-android-roguelike-scope.md`
  - `docs/production/sprint-1-plan.md`（将同步更新为 web 版）
- 已 commit（保留为 C# 参考实现）：
  - `Assets/Scripts/AI/BTNode.cs` 等 C# BT 框架
  - `Assets/Tests/Editor/BTTests.cs` NUnit 测试

---

**版本**：v1.0-web-scope（2026-09-06 拍板 3 项决策，待 Sprint 1 plan 锁定后冻结）
