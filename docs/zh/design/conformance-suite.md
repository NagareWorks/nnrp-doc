# NNRP 协议一致性测试套件设计

## 1. 定位

本文定义 NNRP 协议一致性测试套件的公共设计边界。

它的作用不是替代协议设计文档，也不是替代各 SDK 仓库自己的单元测试，而是提供一套跨实现、跨语言、跨版本线复用的公共一致性测试基线，使 NNRP 的任意实现都能回答同一个问题：

“这个实现是否真的符合当前协议版本，而不是只在自己仓库里自洽？”

因此，一致性测试套件在协议体系中的正式定位是：

1. 协议文档之后的第一层可执行基线。
2. 多语言 SDK、runtime、服务端和第三方实现共享的验证入口。
3. 版本冻结、preview 迁移和历史回归的统一事实来源之一。

## 2. 为什么必须放在协议侧

一致性测试套件必须放在 `nnrp-doc` 的协议侧说明清楚，而不能只散落在某个 SDK 仓库里，原因如下：

1. 一致性测试验证的是协议公共语义，不是某个宿主语言的 API 习惯。
2. 未来实现者可能不是 `nnrp-cs`、`nnrp-py` 或 `nnrp-rs` 的维护者，但仍然需要一套可依赖的协议级验证入口。
3. 如果一致性测试只在实现仓库里定义，就容易退化成“实现拥有协议解释权”，反过来污染协议边界。
4. preview 阶段尤其需要同一套公共基线，否则不同实现会各自形成一套内部口径，看起来都通过了 CI，但彼此并不互通。

协议文档负责冻结语义；一致性测试套件负责把被冻结的语义转成可执行断言。两者必须同源、但不能混为同一件事。

## 3. 与协议文档、实现仓库的边界

### 3.1 `nnrp-doc` 负责什么

`nnrp-doc` 负责：

1. 定义协议对象、固定布局、状态机、错误码、版本边界和一致性测试规则。
2. 定义一致性测试套件的公共目标、版本策略、分层结构和通过标准。
3. 记录哪些语义已经冻结，哪些仍处于设计中，因而还不能进入 mandatory 一致性测试。

### 3.2 `nnrp-rs` 负责什么

`nnrp-rs` 负责：

1. 提供 canonical 的 `nnrp-conformance` 产物与参考实现。
2. 生成 recipe-backed vector、fixture manifest、状态机用例、错误路径基线和机器可读报告格式。
3. 作为第一实现来消费协议文档，但不得在 `nnrp-doc` 未冻结前私设协议语义。

### 3.3 各 SDK / runtime 仓库负责什么

各 SDK、runtime 或第三方实现负责：

1. 消费 canonical 一致性测试产物并在 CI 中执行。
2. 为本语言实现提供 adapter / driver，使同一批协议用例能够被运行。
3. 可以增加本仓库特有的回归测试，但不能用本地私有测试替代公共一致性测试。

## 4. 设计目标

一致性测试套件至少应满足以下目标：

1. 同一个协议版本在不同语言实现上运行同一套核心断言。
2. 支持 preview 版本和正式冻结版本并存，而不是只保留“当前最新版”。
3. 能区分协议失败、绑定失败、运行时集成失败和性能回归，避免把所有问题混成一个大红灯。
4. 允许未来第三方实现不依赖内部仓库布局，也能复用公共测试说明和测试产物。
5. 在设计上优先服务协议稳定性，其次才是测试执行便利性。

## 5. 非目标

一致性测试套件不直接承担以下职责：

1. 不替代某个 SDK 的 API 体验测试、IDE 集成测试或宿主框架适配测试。
2. 不替代 benchmark、容量测试、长时 soak、模型质量评估或视觉指标对比。
3. 不负责冻结某个实现特有的线程模型、回调风格、打包方式或宿主对象树。
4. 不把尚未冻结的协议设计提前变成“测试要求”。

## 6. 版本策略

一致性测试套件必须按协议版本线组织，而不是只有一份不分版本的大杂烩。

最小要求：

1. 每个协议线至少区分 `NNRP/1-preview1`、`NNRP/1-preview2`、`NNRP/1-preview3` 与后续正式冻结版本。
2. preview 用例必须保留，因为同一主版本线内的 preview 会覆盖当前语义，但历史实现和迁移验证仍需要历史基线。
3. 新 preview 冻结后，不允许直接改写旧 preview 的一致性测试结果；必须新增新版本目录或新版本标签。
4. 若某条语义在设计文档里尚未冻结，只能进入 experimental 或 draft case 集，不得进入 mandatory case 集。

建议的版本目录形态：

1. `protocol/nnrp-1-preview1/...`
2. `protocol/nnrp-1-preview2/...`
3. `protocol/nnrp-1-preview3/...`
4. `protocol/nnrp-1-final/...`

## 7. 测试分层

一致性测试套件应至少分为以下五层：

### 7.1 L0 字节级与固定布局层

用于验证：

1. 公共头、长度模型、固定 metadata、枚举值、错误码数值。
2. golden vector 的 parse / re-emit / roundtrip 一致性。
3. 非法长度、越界字段、保留位、未知 mandatory 标记等硬错误路径。

### 7.2 L1 协议状态机层

用于验证：

1. 握手与能力协商。
2. session open / patch / close。
3. operation lifecycle、priority、cancel scope。
4. `FLOW_UPDATE`、`RESULT_HINT`、恢复/恢复窗口等跨实现必须一致的控制语义。

### 7.3 L2 绑定与驱动一致性层

用于验证：

1. FFI 句柄生命周期。
2. callback / polling 驱动模式是否保留协议语义。
3. buffer ownership、错误映射、event pump 行为是否与协议层口径一致。

这一层允许不同语言的适配方式不同，但不允许改变公共协议语义。

### 7.4 L3 集成 smoke 层

用于验证：

1. 单连接多 session。
2. 实际 transport 绑定。
3. runtime / SDK / 服务端最小互通路径。

这一层仍属于一致性测试扩展层，但它不应替代 L0-L2 的规范性断言。

### 7.5 L4 性能与稳态回归层

用于验证：

1. 是否出现明显的复制回退、尾延迟恶化或流控退化。
2. 是否触发协议实现的稳定性回退。

这一层可以作为发布门禁，但不应与 mandatory 协议一致性通过条件混为一谈。

## 8. 用例状态分类

每个一致性测试 case 都应至少带以下状态标签：

1. `mandatory`：协议已经冻结，所有宣称支持该版本的实现都必须通过。
2. `optional`：协议允许实现声明不支持，但如果声称支持相关 feature，就必须通过。
3. `experimental`：设计尚未最终冻结，只用于并行验证，不计入正式合规矩阵。
4. `deprecated`：旧版本仍保留回归价值，但不再作为当前主线能力要求。

## 9. 公共产物

协议侧必须明确未来会存在的公共产物种类，以便实现仓库围绕它们接入：

1. golden vectors：字节级 canonical 样本。
2. fixture manifests：机器可读的 case 清单、输入、期望输出和版本标签。
3. state-machine scenarios：按步骤驱动的握手、session、operation、恢复与流控脚本。
4. machine-readable reports：供 CI 消费的通过/失败报告。
5. binding-consumption contract：说明 SDK / 第三方实现如何接入 runner，而不是直接依赖某个内部测试 API。

需要特别区分：

1. 公共协议契约是 fixture、manifest、case 语义和报告格式。
2. `nnrp-conformance` 的 Rust 内部 API 可以演进，不必把 crate 内部类型直接冻结成跨语言公共 API。

### 9.1 已冻结的 adapter execution contract

协议侧冻结行为执行接入契约，即 adapter execution contract。它的公共接口必须是语言无关的输入/输出 JSON，而不是某个仓库内部测试框架的私有调用约定。

adapter execution contract 至少冻结以下公共边界：

1. suite 先基于 protocol manifest 与 capability manifest 计算 execution plan，而不是让实现仓库自己决定跑哪些 case。
2. suite 交给实现仓库的是一份 machine-readable execution plan，最少包含：协议版本、实现标识、被选中的 case id、case 的 layer / status / feature / required capabilities，以及产物输出上下文。
3. 实现仓库返回的是 machine-readable case result report，最少包含：case id、结果状态（如 pass / fail / skip / error）、失败分类，以及可选证据路径。
4. suite 不得把 `pytest`、`xUnit`、`cargo test` 过滤表达式、内部模块名或仓库私有目录结构冻结成公共 adapter API。
5. 业务后端、产品 runtime、宿主对象树和部署脚本不得进入 adapter execution contract 的公共输入参数；它们只能作为实现仓库内部的测试支撑细节存在。

换句话说，adapter execution contract 冻结的是 suite 与实现仓库之间的执行接口，不是实现仓库内部测试 harness 的对象模型。

### 9.2 线路级主动一致性测试契约

Adapter execution 不能覆盖所有协议保证。实现仓库自己维护的 adapter 可能会无意中把本地行为标准化，从而掩盖 SDK 之间的语义漂移。因此从
preview4 工作流开始，suite 还要定义线路级主动一致性测试契约。

线路级契约冻结以下公共边界：

1. target manifest 声明实现标识、协议版本、runner 模式、传输端点、选中的线路级 capability 和执行限制。
2. suite 可以扮演 NNRP client，主动连接实现侧 server。
3. suite 可以扮演 NNRP server，接受实现侧 client。
4. suite 可以扮演 proxy，注入帧顺序、超时、背压、关闭和恢复行为。
5. 实现返回 machine-readable 线路级 case result report，包含观察到的帧、终止状态、失败分类、计时和证据路径。

这个 contract 验证的是 frame/session 边界上的协议行为。它不得要求私有 SDK API、业务 runtime 对象或仓库本地 harness 约定。公共 target
surface 只有声明的 endpoint 和选中的协议角色。

线路级一致性测试对 preview4 控制帧尤其重要，例如 cancellation、priority update、deadline、partial result、backpressure、route
hint、cache reference、trace context 和 result drop reason。这些语义只有在独立客户端与服务端能在线路上观察到一致行为时才成立。

## 10. 推荐执行模型

推荐执行模型为“一个 canonical suite，多条执行通道”：

1. `nnrp-rs` 生成或承载 canonical conformance 产物。
2. 各实现仓库提供本语言 test driver / adapter，用于仓库本地执行。
3. 暴露 live endpoint 的实现还要提供线路级 target manifest。
4. CI 按目标协议版本选择 case 集，并输出统一格式结果。

共享接入路径包括 capability manifest + suite-owned adapter execution plan + implementation-owned adapter command + case-result report，以及
线路级 target manifest + suite-owned wire execution plan + live endpoint + wire case-result report。canonical 字节向量仍然是 suite-owned
artifact，由可读 recipe 生成，并由 suite 自身验证。

换句话说，不推荐让每个 SDK 各自手写一份“看起来差不多”的协议测试；那样只会产生多份漂移的伪基线。

## 11. 变更规则

凡是以下变更，必须先改 `nnrp-doc`，再改 conformance 产物，最后才允许实现仓库适配：

1. wire shape、固定 metadata、错误码语义、descriptor 布局变更。
2. session / operation / recovery / flow-control 的公共状态机语义变更。
3. mandatory case 的新增、删除或断言升级。

凡是以下变更，不应直接改协议侧一致性测试规则：

1. 某个 SDK 的宿主 API 命名调整。
2. 某个 runtime 的线程池、队列或框架集成改造。
3. 某种包格式、发布脚本或平台特有装配细节。

## 12. 对未来实现者的明确约束

任何实现者，无论是否属于当前官方仓库，只要声称实现了某个 NNRP 协议版本，就应至少满足以下要求：

1. 以 `nnrp-doc` 中冻结的协议语义为准，而不是以某个 SDK 当前行为为准。
2. 以同版本的一致性测试 case 集为准，而不是只跑本地单元测试。
3. 不得通过修改本地 adapter 来规避 mandatory case 的公共断言。
4. 若发现协议文档与一致性测试 case 冲突，应先修正文档和基线，而不是在实现侧私设解释。

## 13. 当前结论

从 NNRP 当前的多语言现状看，协议一致性测试套件应被视为协议设计的一部分，而不是某个实现仓库的附属工具。

协议层应明确：

1. 一致性测试是公共协议资产。
2. `nnrp-rs` 是 canonical baseline 的第一实现来源。
3. `nnrp-cs`、`nnrp-py`、runtime 以及未来第三方实现，都应通过消费同一套版本化一致性测试基线来证明自己符合协议。
