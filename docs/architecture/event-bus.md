# Event Bus 架构

> Status: v1.0 / 决策已拍板  
> 适用: 动物文明 / Animal Civ 的 11 个子系统解耦通信  
> 实现位置（规划）: `src/core/eventbus/`

---

## 1. 设计目标

| 目标 | 落地方式 | 验收标准 |
|---|---|---|
| **解耦** | 子系统之间不直接调用，全部通过 Event / Command / Query | 任何子系统的实现可以替换，单元测试无需真引擎 |
| **可测试** | 注入 `InMemoryEventBus` 替代真实实现 | 11 个子系统各自单元测试覆盖 ≥ 70% |
| **可回放** | 持久化事件日志到 SQLite WAL | 镜像 PvP 战报可重放单局全部事件 |
| **可调试** | Unity Editor 实时事件流窗口 | 事件按时间序列展示，可暂停 / 重放 / 过滤 |
| **可序列化** | 所有事件继承 `ISchemaVersioned` | 事件字段改动走 SchemaMigration，不破坏旧日志 |

---

## 2. 三大交互模式

### 2.1 Event — 已发生的游戏事实

```csharp
public interface IGameEvent {
    Guid EventId { get; }              // 唯一标识（去重 / 幂等）
    DateTime Timestamp { get; }        // 服务器单调时钟
    long GlobalSequence { get; }       // 全局递增序号（用于排序与因果）
    int TurnNumber { get; }            // 所属回合（便于按回合切片）
}

public interface ISchemaVersioned {
    int SchemaVersion { get; }         // 用于版本化与迁移
}
```

**特征**：不可变、只读、可重放、必须被记录。

### 2.2 Command — 改变状态的指令

```csharp
public interface ICommand {
    Guid CommandId { get; }            // 幂等键（同 CommandId 不重复执行）
    Guid IssuerPlayerId { get; }       // 审计 / 反作弊用
    DateTime IssuedAt { get; }
}

public interface ICommandResult {
    bool Success { get; }
    string ErrorCode { get; }          // 失败原因（用于 UI 提示）
}
```

**特征**：可失败、需 ACK、需审计、幂等。

### 2.3 Query — 同步读请求

```csharp
public interface IQuery<TResult> {
    Guid QueryId { get; }
}

public interface IQueryHandler<TQuery, TResult> 
    where TQuery : IQuery<TResult> {
    Task<TResult> HandleAsync(TQuery query, CancellationToken ct);
}
```

**特征**：不改状态、立即返回、跨子系统直接调用（不走总线）。

---

## 3. 核心接口

```csharp
public interface IEventBus {
    // Event
    void Publish<T>(T evt) where T : IGameEvent;
    void Subscribe<T>(IEventHandler<T> handler) where T : IGameEvent;
    void Unsubscribe<T>(IEventHandler<T> handler) where T : IGameEvent;
    
    // Command（带 ACK）
    Task<TResult> Send<TResult>(ICommand<TResult> cmd) 
        where TResult : ICommandResult;
    
    // 内部事件总线状态查询
    long PublishedEventCount { get; }
    bool IsHealthy { get; }
}

public interface IEventHandler<T> where T : IGameEvent {
    Task HandleAsync(T evt, CancellationToken ct);
    int Priority { get; }              // 同事件多 handler 的执行顺序
}
```

---

## 4. 11 个关键决策（已拍板）

| # | 决策点 | 选择 | 理由 |
|---|---|---|---|
| 1 | **事件分发同步性** | 同步分发（同一线程顺序执行） | 因果顺序保证、调试友好；手游 8 分钟局事件量 < 1000 条，同步足够 |
| 2 | **异常隔离** | 单 handler 异常不阻断其他 handler | 一个子系统 bug 不该炸整个回合 |
| 3 | **持久化层** | SQLite + WAL 模式 | 零部署、ACID、可流式 Append、与 Unity 兼容好 |
| 4 | **关键事件 ACK** | 战斗结果 / Gacha / 存档事件需所有订阅者 ACK | 关键流程不能丢 |
| 5 | **回放粒度** | 单局级（每局独立事件流文件） | PvP 战报回放只需重放单局；隔离清晰 |
| 6 | **事件版本化** | 字段 `SchemaVersion` + 迁移器 | 后续字段调整不破坏旧存档 |
| 7 | **开发可视化** | Unity Editor 自定义窗口 `EventStreamWindow` | 实时查看事件流 + 暂停 / 重放 / 过滤 |
| 8 | **死信队列** | handler 失败 3 次后入死信 + Editor 报警 | 不静默吞错，便于线上排查 |
| 9 | **查询路由** | 同进程直接调 `subSystem.QueryAsync<T>(...)` | Query 强制走总线会引入 10–50ms 延迟，不可接受 |
| 10 | **跨子系统依赖** | 严格按 `subsystems.md §3` 依赖图 | 禁止反向依赖（如回合引擎不能直接调 Gacha） |
| 11 | **时序保证** | 全局单调序列号 `GlobalSequence`（持久化） | 跨帧跨子系统事件能可靠排序 |

---

## 5. 实现关键路径

### 5.1 EventBus 核心（伪代码）

```csharp
public class EventBus : IEventBus {
    private readonly Dictionary<Type, List<HandlerEntry>> _handlers = new();
    private readonly IEventLog _log;                     // SQLite WAL
    private long _sequence;
    private readonly HandlerExecutor _executor;
    
    public void Publish<T>(T evt) where T : IGameEvent {
        // 1. 写入日志（同步，必须成功）
        var seq = Interlocked.Increment(ref _sequence);
        evt.SetSequence(seq);
        _log.Append(evt);
        
        // 2. 同步分发（按 Priority 排序）
        if (!_handlers.TryGetValue(typeof(T), out var list)) return;
        foreach (var entry in list.OrderBy(e => e.Priority)) {
            _executor.ExecuteWithRetry(entry, evt);  // 异常隔离 + 重试 + 死信
        }
    }
}
```

### 5.2 异常隔离（HandlerExecutor）

```csharp
private async Task ExecuteWithRetry(HandlerEntry entry, IGameEvent evt) {
    for (int attempt = 1; attempt <= 3; attempt++) {
        try {
            await entry.Handler.HandleAsync(evt, _cts.Token);
            return;  // 成功
        } catch (Exception ex) when (attempt < 3) {
            _logger.Warn($"handler {entry.HandlerName} attempt {attempt} failed", ex);
            await Task.Delay(100 * attempt, _cts.Token);  // 退避
        } catch (Exception ex) {
            _deadLetter.Send(entry, evt, ex);  // 入死信
            _editorAlert.Show($"handler 持续失败：{entry.HandlerName}");
        }
    }
}
```

### 5.3 命令 ACK 机制

```csharp
public async Task<TResult> Send<TResult>(ICommand<TResult> cmd) 
    where TResult : ICommandResult {
    
    var pendingAcks = new Dictionary<Guid, TaskCompletionSource<ACK>>();
    var handler = _commandRouter.Resolve<TResult>(cmd);
    
    // 注册 ACK 收集器
    _ackCollector.Register(cmd.CommandId, pendingAcks);
    
    // 执行
    var result = await handler.HandleAsync(cmd, _cts.Token);
    
    // 收集关键事件 ACK（由 handler 在执行期间发布的事件触发）
    await WaitForKeyEventACKs(cmd, pendingAcks, timeoutMs: 5000);
    
    return result;
}
```

---

## 6. 性能预算

| 指标 | 预算 | 备注 |
|---|---|---|
| 单事件分发延迟（P99） | ≤ 5ms | 同步分发 + 11 子系统 handler |
| 单局事件数上限 | ≤ 1000 条 | 8 分钟 × 30 回合 × ~30 事件/回合 |
| 日志 Append 延迟 | ≤ 2ms | SQLite WAL 本地写入 |
| ACK 超时 | 5000ms | 战斗结果等关键事件 |
| 内存占用（事件缓存） | ≤ 50MB | 用于回放的内存事件池 |
| 死信队列容量 | 100 条 | 触发后 Editor 报警 + 暂停 |

---

## 7. 错误处理策略

| 错误类型 | 处理 |
|---|---|
| 单 handler 异常 | 重试 3 次（指数退避）→ 死信队列 → Editor 报警 |
| 持久化失败 | 拒绝发布新事件，提示玩家"存档异常，请重连" |
| ACK 超时 | 命令返回 `ErrorCode.CommandAckTimeout`，UI 提示"操作超时" |
| 全局序列号耗尽 | 64 位 long，单机理论不会；预留运维重启接口 |
| Schema 迁移失败 | 旧事件降级为"UnknownEvent"记录，不阻断新事件流 |

---

## 8. 单元测试样板

```csharp
[TestFixture]
public class TurnEngineTests {
    private InMemoryEventBus _bus;
    private TurnEngine _engine;
    
    [SetUp]
    public void Setup() {
        _bus = new InMemoryEventBus();
        _engine = new TurnEngine(_bus, new MockGridSystem(), 
                                  new MockHeroSystem(), _seedRng);
    }
    
    [Test]
    public async Task EndTurn_Should_Publish_TurnEnded() {
        // Arrange
        var listener = new RecordingHandler<Turn_Ended>();
        _bus.Subscribe<Turn_Ended>(listener);
        
        // Act
        await _engine.SubmitActionAsync(new EndTurnCommand { ... });
        
        // Assert
        Assert.That(listener.Received, Has.Count.EqualTo(1));
        Assert.That(listener.Received[0].TurnNumber, Is.EqualTo(1));
    }
    
    [Test]
    public async Task HandlerException_Should_Not_Propagate() {
        // Arrange
        var faulty = new FaultyHandler();
        var healthy = new RecordingHandler<Turn_Ended>();
        _bus.Subscribe<Turn_Ended>(faulty);
        _bus.Subscribe<Turn_Ended>(healthy);
        
        // Act
        await _engine.SubmitActionAsync(new EndTurnCommand { ... });
        
        // Assert
        Assert.That(faulty.CallCount, Is.EqualTo(3));  // 重试 3 次
        Assert.That(healthy.Received, Has.Count.EqualTo(1));  // 仍收到
    }
    
    [Test]
    public async Task PvP_Replay_Should_Produce_Identical_Result() {
        // Arrange
        var originalLog = await _engine.PlayAndLog();
        var replayEngine = new TurnEngine(new InMemoryEventBus(), ...);
        
        // Act
        var replayResult = await replayEngine.Replay(originalLog);
        
        // Assert
        Assert.That(replayResult, Is.EqualTo(originalLog.FinalState));
    }
}
```

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 同步分发阻塞主线程 | 帧率掉到 < 30 FPS | 单 handler 超时 100ms 强制中断 + 异步化大计算（如 AI 决策） |
| SQLite 写盘阻塞 | 帧率波动 | 启用 WAL 模式 + 批量提交（每帧最多 1 次 fsync） |
| 事件 Schema 频繁变更 | 旧存档无法回放 | 强制所有事件走 `ISchemaVersioned` + 写 SchemaMigration 单元测试 |
| 死信队列堆积 | 磁盘占用增长 | Editor 报警后强制要求处理；不允许静默通过 |
| 全局序列号跨进程冲突 | 多设备 PvP 战报错乱 | 用 `(DeviceId, LocalSequence)` 复合主键，服务端做全局排序 |

---

## 10. 不在 v1.0 范围（v1.x 增量）

- 跨进程事件总线（WebSocket / MQTT）— 仅 PvP 同步模式启用时需要
- 事件溯源（Event Sourcing）完整支持 — 当前仅"日志用于回放"，未做"日志即真相源"
- 事件 schema 自动生成 OpenAPI / TypeScript 类型 — 客户端联调时增量

---

## 11. 与其他文档的关系

- **依赖**：`docs/architecture/subsystems.md`（依赖图、禁止调用关系）
- **依赖**：`docs/technical-setup.md`（Addressables 分组与事件日志打包）
- **依赖**：`design/gdd/game-concept.md`（核心循环定义的事件）
- **被依赖**：未来 `docs/architecture/system-interfaces.md`（每个子系统的接口契约）
