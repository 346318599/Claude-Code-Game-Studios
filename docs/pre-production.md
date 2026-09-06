# Pre-Production 计划

> Status: v1.0 / 决策已拍板  
> 适用: 动物文明 / Animal Civ  
> 阶段: 7 阶段流水线的第 4 阶段（Pre-Production）

---

## 0. 阶段定位

按 my-game 框架的 7 阶段流水线（Concept → Systems → Tech → **Pre-Prod** → Prod → Polish → Release），本阶段的目标是把前三阶段的概念全部转成**可执行 PRD**，并启动 **Sprint 0（2 周基建周）**。通过 `/gate-check` 后正式进入 Production 阶段。

---

## 1. PRD 核心 KPI

| 指标 | v1.0 目标 | 评估方法 | 警戒线 |
|---|---|---|---|
| **D1 留存** | ≥ 45% | Firebase Analytics | < 35% 触发预警 |
| **D7 留存** | ≥ 18% | 同上 | < 12% 触发预警 |
| **D30 留存** | ≥ 8% | 同上 | < 5% 触发预警 |
| **付费转化率** | ≥ 4% | PlayFab Revenue / 自托管营收 | < 2% 触发预警 |
| **ARPPU** | ≥ ¥80 | 同上 | < ¥40 触发预警 |
| **MAU（首发 3 月）** | ≥ 30 万 | 渠道 + 自有 | < 15 万 触发预警 |
| **首局完成率** | ≥ 85% | Firebase Event funnel | < 70% 触发预警 |
| **平均局时** | 8 ± 1 分钟 | 服务器事件日志 | > 10 分钟 或 < 5 分钟需调参 |

**KPI 验收时点**：首发 30 天后做首次复盘，D90 做完整验收。

---

## 2. 功能清单（按 11 子系统展开）

### 2.1 回合引擎（TurnEngine）
- **核心场景**：8 分钟一局 / 5–6 回合宏观 / 3 种结束条件（胜利 / 失败 / 投降）
- **关键状态**：`WaitingForPlayer` → `FrontlineDeploy` → `Resolving` → `Ended`
- **v1.0 范围**：单局 PvE / PvP 全支持；观战模式 v1.x 增量

### 2.2 前置编队（TacticalDeployment）
- **核心场景**：每回合内最多触发 1 次前线冲突，5–10 秒编队窗口
- **关键操作**：部署 / 召回 / 下达命令（移动 / 攻击 / 防御 / 技能 / 驻守）
- **v1.0 范围**：硬性 5–10 秒时间限制 + 跳过按钮（无障碍）

### 2.3 棋盘/网格（GridSystem）
- **核心场景**：2D 网格地图 × A* 寻路 × 飞行/步行/攀爬 3 类移动
- **v1.0 范围**：单张地图（PvE 闯关默认）+ 随机地图（PvP 镜像）

### 2.4 AI 决策（AIDecisionSystem）
- **核心场景**：5 难度（Trivial / Easy / Normal / Hard / Brutal）敌方 AI
- **v1.0 范围**：PvE 难度自适应（按玩家胜率动态调整）

### 2.5 动物英雄（HeroModel）
- **核心场景**：v1.0 = **4 阵营 / 共 16 角色**（亚洲 / 欧洲 / 非洲 / 南美）
- **v1.x 增量**：余 3 阵营（北美 / 大洋洲 / 南极）+ 24 角色
- **角色属性**：HP / Attack / Defense / Speed / MoveRange / AttackRange / 6 个 Buff 类型

### 2.6 阵营（FactionSystem）
- **核心场景**：7 大洲 7 阵营 + 阵营 BUFF + 段位
- **v1.0 范围**：4 阵营已实装 + 段位 5 级（青铜/白银/黄金/铂金/钻石）

### 2.7 Gacha（GachaSystem）
- **核心场景**：动物英雄抽卡 + 90 抽保底 + 300 抽大保底
- **白嫖量**：日常任务 + PvE / PvP / 国联奖励 = **30 张抽卡券/月**
- **合规**：中日韩三国概率公示强制

### 2.8 镜像 PvP（MirrorPvP）
- **核心场景**：异步镜像攻击 + ELO 段位 + 公平竞技约束（强制）
- **v1.0 范围**：PvE 闯关模式布阵自动喂给对手；首周不开放（详见 §4 发布策略）

### 2.9 国联（AllianceSystem）
- **核心场景**：4–6 人阵营同盟 + 世界 BOSS + 积分赛季
- **新手期强制**：入门级国联 3 AI + 1 真人自动匹配
- **v1.0 范围**：第 1 个世界 BOSS 在上线后 8 周开放

### 2.10 美术风格（ArtStyleSystem）
- **核心场景**：卡通 2.5D + 7 阵营配色 + UI 主题切换
- **角色动画**：5 帧关键帧动画
- **v1.0 范围**：4 阵营美术 + 7 阵营 UI 配色（含未实装 3 阵营的占位配色）

### 2.11 存档/云（CloudService）
- **核心场景**：PlayFab + Firebase + 行为校验 / 反作弊
- **国内方案**：自托管 + 阿里云 OSS 替代（PlayFab 国内不通）
- **v1.0 范围**：基础存档 + 行为校验 + 客户端反作弊

---

## 3. 非功能性需求

### 3.1 性能（详见 Tech Setup §7）
- iOS / Android 首包 ≤ 120MB
- 8 分钟一局内存峰值 ≤ 1 GB RAM，CPU ≤ 60%
- 启动时间 ≤ 4s（iPhone 12 / 骁龙 870 基线）
- 帧率 30 FPS 稳定（30 / 60 两档可选）
- 网络峰值 ≤ 200 KB / 局

### 3.2 安全
- **客户端反作弊**：Unity 引擎层 + IL2CPP 代码混淆
- **服务端行为校验**：所有关键事件双端校验（伤害计算 / 抽卡结果 / PvP 匹配）
- **数据加密**：存档 + 通信均 AES-256
- **反作弊三档**：Warning（警告） → Suspension（短期封禁） → PermanentBan（永久封禁）

### 3.3 合规
- **未成年人保护**：国联聊天过滤 + 时长限制（每日上限 90 分钟，未成年实名认证）
- **抽卡概率公示**：中日韩三国法律预审通过后才能上线
- **隐私合规**：GDPR / 中国《个人信息保护法》/ 日本 APPI
- **App Store Privacy Manifest**：iOS 15+ 强制

### 3.4 国际化
- **首发语言**：简中 / 英文 / 日文 / 韩文
- **字符集**：UTF-8 + 全角符号支持
- **本地化字段**：UI 文案 / 阵营描述 / 角色名 / 战斗台词

---

## 4. 发布策略

### 4.1 首发平台与地区
- **首发平台**：iOS + Android **同时**（不先发 iOS）
- **首发地区**：中国 / 日本 / 韩国 / 北美（次序待定）
- **预注册期**：上线前 **8 周** 开预注册
- **预注册奖励**：SSR 限定动物 × 1 + 抽卡券 × 10

### 4.2 渐进式开放（重要）
- **首周（D1–D7）**：仅 PvE 闯关模式开放
  - 目的：让服务器 / 抽卡池 / 客户端稳定性验证后再开 PvP
- **D8 起**：镜像 PvP 开放
- **D30 起**：阵营同盟 / 世界 BOSS 开放
- **D60 起**：第 1 个赛季通行证

### 4.3 首发期运营活动
| 时段 | 活动 |
|---|---|
| D1–D7 | 新手 7 日登录奖励 + 引导活动 + 首充双倍 |
| D8–D30 | PvP 开放 + 第一个镜像 PvP 赛季 |
| D31–D60 | 第一个世界 BOSS + 阵营同盟 |
| D61+ | 第 1 个限定 Gacha 池 + 第 1 个赛季通行证 |

---

## 5. 运营节奏（首发后）

```
Week 1–4:    引导活动 / 首充双倍 / 7 日登录
Week 5–8:    第一个赛季 / 第 1 个限定 Gacha 池
Week 9–12:   第一个世界 BOSS / 阵营同盟功能开放
Quarter 2:   v1.1 增量（余 3 阵营 / 新玩法）
Quarter 3:   v1.2 / 首次大版本（国际服开通）
Quarter 4:   v2.0 跨年大版本
```

**版本对齐**：主版本对齐 7 大版本（动物文明 v1/v2/v3...），按季度发布。

---

## 6. 资源预算（粗算）

| 类别 | MVP（4 个月） | v1.0（首发） |
|---|---|---|
| 美术（含动画） | ¥80 万 | ¥220 万 |
| 程序（1 主程 + 1 客户端 + 1 服务端） | 同上 | 同上 |
| QA | 0.5 人 | 1 人 |
| 运营 / 市场 | ¥10 万 | ¥50 万 |
| **合计** | **¥150 万** | **¥400 万** |

**预算假设**：
- 美术外发（外发单价 ¥800–¥1500 / 角色，含动画）
- MVP 只做 4 阵营（16 角色 + 4 阵营配色）
- v1.0 全部 7 阵营 + 7 阵营皮肤（v1.x 增量）
- 服务器成本第 1 年约 ¥30 万（阿里云 ECS + OSS + RDS）

---

## 7. 风险与缓解（Top 5）

| # | 风险 | 影响 | Mitigation |
|---|---|---|---|
| 1 | **海外 CI runner 不可达** | 构建管线断 | Gitea + 自托管 runner（深圳机房） |
| 2 | **PlayFab 国内不通** | PvP / 存档崩 | 自托管 + 阿里云 OSS 替代 |
| 3 | **抽卡合规争议** | 下架风险 | 中日韩三国法律预审 + 概率公示模板 |
| 4 | **美术 35 角色 4 月做不完** | 延期 | MVP 只做 4 阵营，余 v1.x 增量 |
| 5 | **留存低于目标** | LTV 不达标 | 上线前预留 ¥30 万投放预算 + 预注册转化 |

### 7.1 风险预警机制
- **D7 留存 < 12%**：触发紧急调优（玩法 / UI / 新手引导）
- **付费转化 < 2%**：触发 Gacha 池 / 价位调整
- **崩溃率 > 1%**：触发紧急热更
- **合规风险**：法律预审不通过 → 延期发布，不冒险上线

---

## 8. Sprint 0 计划（启动 Sprint，2 周基建周）

**目标**：项目基建完整，不写游戏逻辑。**验收**：能在 iPhone 12 模拟器启动空工程，输出首包 ≤ 120MB。

### Week 1：Unity 工程初始化
- [ ] Unity 6 LTS 工程初始化（路径：`src/`）
- [ ] Git LFS 配置（PSD / PNG / WAV 走 LFS）
- [ ] 必备 Package 安装：URP / Addressables / AI Navigation / PlayFab / Firebase / Adaptive Performance / Test Framework
- [ ] Asset Store 模板接入：Turn Based Battle System（先建空项目再装）
- [ ] Player Settings 配置：Color Space / Scripting Backend / .NET Standard 2.1

### Week 2：双端 Build 验证
- [ ] iOS Build Settings：iOS 15.0+ / IL2CPP / ARM64 / App Store Privacy Manifest
- [ ] Android Build Settings：Target API 34 / ARM64 / App Bundle（AAB）
- [ ] Addressables 分组（按 7 阵营 + 地图 lazy load）
- [ ] CI 跑通：Gitea + 自托管 runner
- [ ] iPhone 12 模拟器启动验证 + 首包 ≤ 120MB 验证

### Sprint 0 交付物
- [ ] Unity 工程仓库（`my-game/src/`）
- [ ] 双端 Build 配置（iOS .ipa + Android .aab 各 1 个）
- [ ] CI 配置（`.gitea/workflows/`）
- [ ] Addressables 分组表
- [ ] Sprint 0 验收报告

### Sprint 0 之后
- **Sprint 1（2 周）**：Phase A 起步（棋盘 + 英雄 + 回合 + 编队 + AI 子系统骨架）

---

## 9. Pre-Production 验收门（/gate-check 通过条件）

按 my-game 框架的 7 阶段流水线，Pre-Production 与 Production 之间有 `/gate-check` 关卡。**通过条件**（全部勾选才能进入 Production）：

- [ ] PRD v1.1 完整（GCD / 子系统 / Tech Setup / Pre-Prod 4 份文档全部落盘且 Approval）
- [ ] 美术预算确认（外发合同 / 自研团队到位）
- [ ] 服务端方案确认（自托管 vs PlayFab 国内等价方案敲定）
- [ ] 合规预审通过（中日韩三国法律意见书齐备）
- [ ] Sprint 0 启动并通过验收
- [ ] CI / CD 跑通（双端 build + 自动化测试）

**未达成任意一项 → 禁止进入 Production 阶段**。

### 9.1 /gate-check 决策流程
1. Pre-Prod 负责人（用户）召集评审会
2. 11 子系统负责人逐项确认本子系统 PRD 完成度
3. 全部通过 → 进入 Production；任一不通过 → 回流到对应子系统补完

---

## 10. 与其他文档的关系

- **依赖**：`design/gdd/game-concept.md`（GCD v1.1 是 PRD 的来源）
- **依赖**：`docs/architecture/subsystems.md`（11 子系统的功能边界）
- **依赖**：`docs/technical-setup.md`（性能预算 / 包体 / 双端配置）
- **依赖**：`docs/architecture/event-bus.md`（事件总线决定哪些事件可回放）
- **依赖**：`docs/architecture/system-interfaces.md`（子系统接口决定哪些命令可调用）
- **被依赖**：未来 Sprint 1+ 的开发任务分解

---

## 11. 附录：版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-09-06 | 初稿落盘，基于会话内已 Approval 的草案 |

---

## 12. 附录：my-game 7 阶段流水线全景

| 阶段 | 状态 | 文档 |
|---|---|---|
| 1. Concept | ✅ | `design/gdd/game-concept.md` |
| 2. Systems Design | ✅ | `docs/architecture/subsystems.md` |
| 3. Technical Setup | ✅ | `docs/technical-setup.md` |
| 4. **Pre-Production** | ✅ | **`docs/pre-production.md`** ← 本文档 |
| 5. Production | ⏸ 待 Sprint 0 启动 | — |
| 6. Polish | ⏸ | — |
| 7. Release | ⏸ | — |

**当前进度**：5/7 阶段文档落盘完成，仅剩 Production / Polish / Release 待启动。
