# Technical Setup / 技术设置

**Version**: 1.0 (Approved)
**Status**: 草案已拍板 / Draft Approved
**Stage**: Technical Setup → 已通过 Tech Gate
**Input**: `design/gdd/game-concept.md` v1.1 + `docs/architecture/subsystems.md` v1.0

---

## 1. Unity 工程基础

- **Unity 版本**: Unity 6 LTS（最新 LTS 版）
- **语言**: C# 9 + .NET Standard 2.1
- **Repository**: 已有 `my-game/`,无需新建
- **子目录约定**:
  ```
  src/{core, gameplay, ai, networking, ui, tools}
  assets/{art, audio, vfx, shaders, data}
  ```

---

## 2. 必备 Package（Unity Package Manager）

| Package | 用途 |
|---|---|
| `com.unity.render-pipelines.universal` | URP 14+（卡通 2.5D 描边渲染） |
| `com.unity.ai.navigation` | 2D Pathfinding（棋盘寻路） |
| `com.unity.addressables` | 远端资源分发（按阵营 lazy load） |
| `com.unity.test-framework` | 单元测试 + Playtest |
| `com.unity.services.core` | PlayFab SDK 依赖 |
| `com.playfab.playfabunitysdk` | 存档 / 排行榜 / 段位 |
| `com.firebase.unity` | A/B 测试 + RemoteConfig |
| `com.unity.adaptiveperformance` | 移动端性能自适应 |

---

## 3. Build Settings / 双端配置

### 3.1 iOS
- Target iOS 15.0+
- IL2CPP + ARM64 only
- App Store Privacy Manifest（合规）
- Code Stripping: High
- Metal API Validation: Enabled (debug only)

### 3.2 Android
- Target API 34（Android 14）
- ARM64 only
- App Bundle（AAB）强制
- 拆分 ABI / Density

### 3.3 共用
- Player Settings → Color Space: Linear
- Scripting Backend: IL2CPP
- API Compatibility: .NET Standard 2.1
- Active Input Handling: Both（兼容 UI + 手柄）

---

## 4. Asset Pipeline（关键）

### 4.1 Addressables 远端资源分组
| 资源类别 | 加载策略 | 备注 |
|---|---|---|
| 动物角色（按阵营） | lazy load | 按当前阵营解锁 |
| 阵营皮肤 / 表情包 | 远端 CDN | 不入首包 |
| 地图 / 地图资源 | 按关卡 lazy load | MVP 只 4 阵营 PvE |

### 4.2 资源打包规则
- **首包**: 1 张地图 + 4 阵营动物（MVP）≤ 120 MB
- **远端 Addressables**: 其余 3 阵营 + v1.x 内容
- **压缩**: Texture Compression ASTC（iOS）/ ETC2（Android）

### 4.3 Asset Store 起手模板
**二选一**: *Turn Based Battle System* 或 *SRPG Toolkit*
**建议**: 先建空项目再装,避免新手村的依赖冲突。

---

## 5. Unity Project Settings

- **Quality Settings**: Mobile preset baseline（Low / Mid / High 三档）
- **Physics2D**: Collision Matrix 预配置（棋盘阻挡、英雄之间）
- **Time.fixedDeltaTime**: 0.02（50Hz 物理）
- **Graphics**: URP 默认 + SRP Batcher on
- **Audio**: 低码率 OGG / Vorbis,移动端友好
- **Player**: 最低 SDK Version 锚定（iOS 15 / Android 8.0）

---

## 6. CI / 版本管理

- **Git**: 已就绪（`my-game/`）
- **分支策略**: trunk-based + feature branch
- **Git LFS**: 大美术资源走 LFS（PSD / PNG / WAV / FBX）
- **CI**: GitHub Actions / Unity Build Automation
  - **警告**: 首次跑需要海外节点 —— 海外 GitHub Actions runner 配置
- **版本号**: SemVer,主版本对齐 7 大版本（动物文明 v1 / v2 / v3）

---

## 7. 性能预算

| 指标 | 目标 |
|---|---|
| 包体（首装） | iOS 120 MB / Android 120 MB |
| 启动时间 | ≤ 4s（iPhone 12 / 骁龙 870 基线） |
| 8 分钟一局内存峰值 | ≤ 1 GB RAM |
| 8 分钟一局 CPU 占用 | ≤ 60% |
| 帧率 | 30 FPS 稳定（30 / 60 两档可选） |
| 网络 | PvE 离线 / PvP 异步（峰值 ≤ 200 KB / 局） |

---

## 8. 风险与待决项

| 风险 / 待决项 | Mitigation |
|---|---|
| CI 在 GitHub Actions 海外 runner 跑不通 | Gitea + 自托管 runner（深圳机房） |
| Asset Store 模板二选一 | 先装 *Turn Based Battle System*（活跃更新、社区多） |
| 首包 120MB 偏大 | 目标压缩到 80MB: Texture ASTC + Audio OGG + Zip AssetBundle |
| PlayFab SDK 国内连不通 | 自托管 + 阿里云 OSS / 腾讯云 COS 替代 |
| GitHub Actions runner 中国大陆访问 | Gitea Actions / Drone 自托管 |

---

## 9. 验收门（Phase A 启动前）

- [ ] Unity 6 LTS 工程初始化完成
- [ ] 必备 Package 安装无冲突
- [ ] Asset Store 模板接入可运行
- [ ] iOS Build Settings 通过（输出 `.ipa` ≤ 120MB）
- [ ] Android Build Settings 通过（输出 `.aab` ≤ 120MB）
- [ ] Git LFS 配置可用

---

## 10. 变更日志

### v1.0 (草案完稿)
- ✓ Unity 6 LTS + C# 9 锁定
- ✓ URP 2D + Addressables 锁定
- ✓ 双端 Build Settings 锁定
- ✓ 性能预算锁定

---

*按 CLAUDE.md 协作协议:本文档所有决策均经用户拍板。*
*任何修改必须先 Show Draft → Approval → 落盘。*