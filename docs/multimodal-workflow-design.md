# 多模型协作架构设计
# Package 站 — One-Stop Multi-Modal Workflow
# 2026-06-24 | Owner: 虾

## 主人需求（22:07）

> "同一个工作聊天框里面，不同的大模型能识别上下文，且根据要求生成相应内容：
> - chat 模型出关键词
> - image 模型给图片样图（可选分辨率）
> - video 模型给视频（按时长）
> - voice 配音（按要求）
> - music 加背景音乐
> 达成一站式服务"

---

## 现状（已实现 70%）

当前 `TryView.vue` 已经支持：
- ✅ 单聊天框
- ✅ 顶部模型选择器（点击 sidebar 切换模型）
- ✅ 5 类 endpoint（chat / image / video / audio）
- ✅ 自动路由（按 category 调对应 endpoint）

但缺：
- ❌ 没有"上下文"——chat 模型的输出不会自动作为 image/video 的输入
- ❌ 没有"模型参数" UI（image 分辨率、video 时长、voice 音色）
- ❌ 没有"一站式"工作流——每次只能用一个模型

---

## 三种方案对比

### 方案 A：单聊天框 + 多模型切换（已有 + 改进）
**时间**：1-2 天
**复杂度**：低

每个 message 标注用了哪个模型，用户手动切换：
- 选 **Banana Pro** → 输入"a cat" → 出图
- 切 **GLM 5.2** → 输入"describe this image" → 出文字
- 切 **Wanxiang Video** → 输入"make this cat walk" → 出视频

**上下文**：用户手动复制粘贴（最简单）

### 方案 B：多模型工作流（Workflow Studio）⭐ 虾推荐
**时间**：3-5 天
**复杂度**：中

新页面 `/studio`，每个任务一个面板：
```
[1] Chat: GLM 5.2 → "Describe a cat walking in grass" → 输出关键词
[2] Image: Banana Pro → 用 [1] 关键词 → 出图 1024x1024
[3] Video: Wanxiang → 用 [2] 图 → 20s 视频
[4] Voice: Doubao TTS → 用 [1] 关键词 → 配音
[5] Music: Suno → 欢快背景音乐
```

**上下文**：自动串联（每个任务用上一个的输出）

### 方案 C：智能 Agent（一句话触发全套）
**时间**：1-2 周
**复杂度**：高

用户说"做一个 20 秒视频，猫在草地走路，配欢快音乐"，Agent 自动拆解 + 调用 + 串联所有模型。

---

## 虾推荐：先 A 后 B

**阶段 1（1-2 天）**：改进单聊天框
- 每个 message 标 `m.model = "Banana Pro"`
- 顶部加"当前模型 + 参数" UI
- image 可选分辨率、video 可选时长、voice 可选音色

**阶段 2（3-5 天）**：新增 Workflow Studio
- 新页面 `/studio`
- 多面板任务流
- 上下文自动串联

**阶段 3（1-2 周）**：智能 Agent
- 一句话触发全套
- 暂不开发

---

## 视频超时问题（待解决）

视频生成 20s 需要 90-180s，超过 Vercel Hobby 60s 限制。三个选项：

### 选项 1：升级 Vercel Pro
- $20/月，Function timeout 改为 300s
- 可以生成 20-40 秒视频
- 主人现在决定

### 选项 2：异步化（不改 plan）
- Submit → return taskId
- 前端每 10s 轮询 status
- 完成后再 fetch 视频
- 视频生成与聊天框解耦
- 虾可以做，2-3 小时

### 选项 3：用短时长（默认 5s）
- 已经做了（commit 008d5be）
- 主人立即能用
- 长期方案 = 选项 1 + 选项 2

---

## 请主人决定

1. **方案选择**：A（1-2 天）/ B（3-5 天）/ C（1-2 周）？
2. **视频超时**：升级 Vercel Pro（$20/月）/ 异步化（虾做）/ 接受 5s 短视频？

虾等主人一句话就开干。🦐