# v1.0 安卓单机 Roguelike 范围说明

> **方向切换** (2026-09-06 拍板)：从原 Stage 2 设计基线（7 阵营 / 4X / 异步镜像 PvP /
> Gacha / 服务端匹配）**切到 v1.0 安卓单机 Roguelike**。
>
> **兼容策略**：原 8 份 Stage 2 设计文档（`design/gdd/game-concept.md`、
> `docs/architecture/*`、`docs/pre-production.md`、`docs/technical-setup.md`、
> `docs/art-direction/art-bible.md`、`docs/gameplay/mirror-pvp-fair-play.md`）
> **保留为 v2.0+ 全功能愿景**，本文档作为 v1.0 实际交付的**范围裁剪与优先级**。
>
> 所有已落盘的系统接口契约（11 子系统 / event-bus / data models）**继续生效**——
> 单机模式只是把 `MultiplayerEngine` / `GachaSystem` 等暂时不实例化，
> `SinglePlayerEngine` 直接接管 Run 生命周期。

---

## 1. v1.0 核心交付（"Make it ship"）

| 维度 | 决定 |
|---|---|
| 平台 | Android（手机 + 平板自适应） |
| 模式 | **单机 Roguelike 进程模式**（perma-death + 随机地图 + 8-12 分钟单局） |
| 对手 | **1 个 AI 对手**（行为树脚本，跑在 Unity 端，不需服务端） |
| 美术 | **灰盒占位**（色块 + 简单几何体 + Unity primitive） |
| 测试 | **仅真机**（无模拟器，模拟器不在范围） |
| 验证设备 | 至少 1 台中端 + 1 台低端真机 |
| 商店 | v1.0 不上架（仅内部 / TapTap 申请测试） |

### 1.1 单局核心循环

```
[Start Screen]
   ↓ 选 1 阵营（v1.0 仅亚洲大熊猫；其他 6 阵营占位灰显）
[Run Setup]  → 随机生成地图种子 + 随机 AI 阵营 + 随机起始 buff 三选一
   ↓
[Run Loop] 8-12 分钟内回合制：
   - 玩家回合（触屏输入）：移动 / 建造 / 攻击 / 技能
   - AI 回合（行为树自动）
   - 事件卡（每 3 回合随机触发：奖励 / 灾变 / 交易）
   ↓
[Run End]
   - 胜利：击败 AI 主堡 → 解锁 1 个 Meta currency / 起始 buff / 阵营碎片
   - 失败：玩家主堡被毁 或 时间耗尽 → 仅获得少量 Meta currency
   ↓
[Meta Screen]
   - 解锁进度展示
   - 下一 Run 选项
   ↓
(Loop back to Run Setup)
```

### 1.2 Roguelike 核心机制

| 机制 | 实现 |
|---|---|
| **永久死亡** | 单 Run 失败 → Run 数据清零，仅保留 Meta currency |
| **随机地图** | PCG（WFC / 简单噪声 + 拼房间），种子数 64-bit |
| **随机事件** | 事件卡牌池 ≥ 30 张，每 3 回合抽 1 |
| **随机 build** | 每 Run 起始 3 选 1 起始 buff；每 5 回合 1 次奖励三选一 |
| **Meta 进度** | 累计胜场解锁：6 个其余阵营 / 12 个起始 buff / 5 个 UI 主题 |
| **多周目** | 通关 1 个阵营后解锁下一；不必打全部 7 个 |

### 1.3 Android 设备矩阵

| 等级 | 芯片 | RAM | 系统 | 目标 |
|---|---|---|---|---|
| 最低 (must) | Snapdragon 660 / Helio G80 | 4GB | Android 8.0 (API 26) | 30 FPS 锁定，720p 等效 |
| 推荐 (target) | Snapdragon 870 / Dimensity 1200 | 6GB | Android 11 (API 30) | 60 FPS，1080p |
| 高端 (stretch) | Snapdragon 8 Gen 2 / Dimensity 9200 | 8GB+ | Android 13+ (API 33+) | 60 FPS，全画质 |

**关键约束**：
- `minSdk = 26`（覆盖 CN 95%+ 设备）
- `targetSdk = 34`（Google Play 2024 最低要求）
- 主 ABI `arm64-v8a`，次 ABI `armeabi-v7a`（可选，最低设备兜底）
- 纹理压缩 ASTC 优先，ETC2 fallback
- Scripting Backend: **IL2CPP**（启动快 / 体积小 / 性能好，构建慢 30% 可接受）
- 安装包体积目标 **< 80 MB**

---

## 2. 范围裁剪（v1.0 不做）

| 类别 | 裁剪项 | 后续版本 |
|---|---|---|
| 网络 | 异步镜像 PvP / ELO 匹配 / 服务端 / 云存档 | v2.0 |
| 商业化 | Gacha / 抽卡 / 商城 / IAP / 广告 | v2.0（PvP 上线后引入） |
| 多语言 | i18n（v1.0 仅简中） | v2.0 |
| 阵营 | 7 阵营全开（v1.0 限 1 阵营 + 6 解锁占位） | 边做边加 |
| 社交 | 公会 / 好友 / 聊天 / 邀请 | v2.0 |
| 跨平台 | iOS / PC / Web | 评估中（v2.0+） |

---

## 3. 单机架构（vs 已有 11 子系统）

事件总线 + 11 子系统接口**完整保留**，`SinglePlayerEngine` 实例化子集：

```
[Sprint 1 单机范围]                [v2.0 扩展点]
├─ InputSubsystem (触屏)            ├─ MultiplayerEngine (PvP)
├─ RenderingSubsystem (URP 2D)       ├─ GachaSystem
├─ AudioSubsystem                     ├─ SocialSubsystem
├─ UISubsystem                        ├─ CloudSaveSubsystem
├─ SaveSubsystem (本地)               └─ MatchmakingSubsystem
├─ EconomySubsystem (Meta currency)
├─ BattleSubsystem (回合制核心)
├─ AISubsystem (行为树)
├─ RoguelikeSubsystem (新)
├─ MapGenSubsystem (新)
└─ AnalyticsSubsystem (本地日志)
```

**新子系统**（不在原 11 子系统清单）：
- `MapGenSubsystem`：PCG 地图种子生成
- `RoguelikeSubsystem`：Run 生命周期 / 永久死亡 / Meta 进度

后续在 Sprint 1 / 2 时补充接口契约到 `docs/architecture/system-interfaces.md`。

---

## 4. Sprint 1 任务分解（4 周 → 真机可玩的 Roguelike 单局）

### W1: 项目骨架 + 真机部署 baseline
- [ ] Unity 6 LTS 项目创建 + URP 2D 配置
- [ ] Android Build Settings（minSdk 26 / targetSdk 34 / IL2CPP / arm64-v8a）
- [ ] Android 真机部署 + 启动空场景验证（**必须先走通，否则后续 W2-W4 都白做**）
- [ ] 灰盒美术占位规范（立方体 + 圆柱 + 平面 + 标准色卡）
- [ ] Git 仓库添加 `Assets/` `.gitignore`（Library/、Temp/、obj/ 等）

### W2: 单局核心循环（回合制）
- [ ] 回合制框架（玩家回合 ↔ AI 回合 ↔ 事件回合）
- [ ] 地图数据结构（格子 / Tile / 单位 / 障碍）+ 简单编辑器
- [ ] 触屏输入（点击移动 / 拖拽建造 / 技能面板）
- [ ] 单局 UI 框架（HUD + 回合指示 + 单位信息卡）
- [ ] 数据持久化（`SaveSubsystem` 本地 JSON，单 Run 状态）

### W3: AI 对手 + 胜负条件
- [ ] AI 行为树框架（Behavior Tree 或 Utility AI，择一）
- [ ] AI 决策：建造 / 扩张 / 攻击 / 防守
- [ ] 胜负条件：玩家主堡 vs AI 主堡
- [ ] 简单结算 UI（胜/负 + 战报卡 + 重试 / 返回主菜单）
- [ ] 真机性能 baseline（30 FPS 锁定验证 + 帧时间 < 33ms）

### W4: Roguelike 元素 + 真机适配
- [ ] `MapGenSubsystem` 接入（WFC 或简单噪声）
- [ ] 事件卡牌池（≥ 30 张文案 + 实现）
- [ ] 起始 buff 三选一（≥ 6 个 buff）
- [ ] `RoguelikeSubsystem` 永久死亡 + Meta currency + 解锁进度
- [ ] 解锁 UI（6 阵营占位、12 buff 解锁进度、5 UI 主题）
- [ ] 真机适配：横竖屏切换、不同分辨率、最低设备 30 FPS 验证

**Sprint 1 出口标准**：1 台中端真机（Snapdragon 870 级）能完整跑完 1 个 Run（8-12 分钟），
含胜利 / 失败两条结局线，Meta currency 累积 + 解锁 1 个阵营可玩。

---

## 5. Sprint 2-3 路线图（粗）

### Sprint 2 (3 周): AI 智能 + 内容扩展
- W5-W6: AI 智能升级（多策略、难度自适应、回放可读）
- W7: 6 阵营解锁 + 每个阵营 1 个独特 buff + 1 个独特单位

### Sprint 3 (3 周): 美术替换 + 上架准备
- W8-W9: 灰盒美术逐步替换为 Art Bible 风格（外包 1-2 个阵营先行）
- W10: 真机性能调优（最低设备 30 FPS 锁稳）+ TapTap 测试版打包

---

## 6. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| 中低端机型性能不达标 | 用户体验差 / 退订 | 30 FPS 锁定 + 动态分辨率 + LOD + Shader 简化 |
| 安装包 > 80 MB | Google Play 限流 / 用户下载门槛 | Addressables 分包 + ASTC 压缩 + IL2CPP |
| Unity 6 LTS 已知 Android Bug | Build 失败 / 闪退 | 锁定 Patch 版本（e.g. 6000.0.xx），不追最新 |
| 用户本地无 Unity Editor | Sprint 1 W1 启动阻塞 | 用户需本机安装 Unity Hub + Unity 6 LTS（~10GB） |
| Roguelike 重复可玩性不足 | 用户 1 周后流失 | 事件卡 30+ 张 + buff 组合 12+ 种 + Meta 解锁线 50h+ |
| 中国大陆合规（版号 / 文化部备案） | 商业化上架被卡 | v1.0 仅测试包不商业上架，绕开 |

---

## 7. 与 v2.0 愿景的兼容性

| 原 v2.0 模块 | v1.0 状态 | 升级路径 |
|---|---|---|
| `MultiplayerEngine` | 不实例化，接口保留 | 加 `MatchmakingClient` + 网络层 |
| `GachaSystem` | 不实例化 | 在主菜单加 `GachaSubsystem` 入口 |
| `SocialSubsystem` | 不实例化 | 接入微信 / QQ 分享 SDK |
| 异步 PvP 战报 | 仅本地 AI 战报模板 | PvP 上线后改服务端拉取 |
| ELO / 段位 UI | 完全隐藏 | PvP 上线时显示 |
| 7 阵营全开放 | 1 阵营 + 6 占位 | Meta 解锁逐个开放 |

**架构稳定点**（v1.0 → v2.0 不重构）：
- 事件总线（`EventBus` 三模式）
- 11 子系统接口契约
- 数据模型（阵营 / 单位 / 技能 / 物品）
- Art Bible 视觉规范
- 单局回放格式（PvP / 单机共用）

---

## 8. Sprint 0 完成度自检（更新自 Stage 2）

- [x] Git 仓库 + fork + push（commit `3e4019f`）
- [x] 8 份设计基线落盘（保留为 v2.0 愿景）
- [x] 范围拍板：单机 / Roguelike / 1 AI / 灰盒 / 仅真机
- [x] Android 设备矩阵定档（minSdk 26 / targetSdk 34 / IL2CPP / arm64-v8a）
- [ ] Unity 6 LTS 安装与项目初始化（**用户本地操作**，需 10GB+ 空间）
- [ ] Android SDK / NDK / 真机调试部署（**用户本地操作**）
- [ ] Sprint 1 详细任务卡 + 工时估算（拍板后展开）

---

## 9. 待用户决策（写完本文件后 AskUserQuestion）

- [ ] **Unity 安装版本**：Unity 6 LTS（latest patch，如 6000.0.42f1）vs Pin 到旧 patch
- [ ] **AI 框架**：Behavior Tree（NodeCanvas / 自研）vs Utility AI
- [ ] **关卡地图**：PCG（WFC / 噪声 + 拼房间）vs 手工关卡
- [ ] **真机型号**：用户报 1-2 台具体型号（型号 + Android 版本）作为 Sprint 1 验证目标