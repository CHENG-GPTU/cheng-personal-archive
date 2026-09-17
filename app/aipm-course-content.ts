export type AipmTerm = {
  term: string;
  plain: string;
  atWork: string;
};

export type AipmTermGroup = {
  title: string;
  note: string;
  terms: AipmTerm[];
};

export type AipmDeepDive = {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  example: string;
  workQuestion: string;
};

export type AipmQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type AipmCourseSource = {
  id: string;
  provider: string;
  title: string;
  url: string;
  note: string;
  kind: "课程" | "视频" | "课程大纲" | "参考书";
};

export type AipmLessonGuide = {
  chapter: string;
  estimatedMinutes: number;
  whyItMatters: string;
  objectives: string[];
  termGroups: AipmTermGroup[];
  deepDives: AipmDeepDive[];
  quiz: AipmQuizQuestion[];
  sourceIds: string[];
  videoEmbedUrl?: string;
};

export const aipmCourseSources: AipmCourseSource[] = [
  {
    id: "ai-for-everyone",
    provider: "DeepLearning.AI · Andrew Ng",
    title: "AI for Everyone",
    url: "https://www.deeplearning.ai/alpha/courses/ai-for-everyone",
    note: "用于建立 AI 术语、能力边界、AI 项目工作流与组织协作的非技术基础。",
    kind: "课程",
  },
  {
    id: "ai-for-everyone-video",
    provider: "DeepLearning.AI",
    title: "AI for Everyone by Andrew Ng",
    url: "https://www.youtube.com/watch?v=JPcx9qHzzgk",
    note: "官方公开视频。观看时重点记录：AI 能做什么、不能做什么，以及哪些问题适合机器学习。",
    kind: "视频",
  },
  {
    id: "aipmbook",
    provider: "AI 产品经理自学手册",
    title: "9 章公开课程大纲",
    url: "https://aipmbook.cn/",
    note: "参考其公开学习顺序：认知、技术、方案、交互、成本、上线、案例与求职；本站内容为重新组织后的原创讲解。",
    kind: "课程大纲",
  },
  {
    id: "product-school",
    provider: "Product School",
    title: "AI Product Management Certification Curriculum",
    url: "https://productschool.com/certifications/ai-for-product-managers",
    note: "参考 AI PRD、RAG、AI 原生交互、Agent、Evals 与 Guardrails 的实践能力结构。",
    kind: "课程大纲",
  },
  {
    id: "duke-aipm",
    provider: "Duke University · Coursera",
    title: "AI Product Management Specialization",
    url: "https://www.coursera.org/specializations/ai-product-management-duke",
    note: "参考机器学习基础、ML 项目管理、人本设计、隐私与伦理的项目式学习结构。",
    kind: "课程",
  },
  {
    id: "ml-yearning",
    provider: "Andrew Ng · DeepLearning.AI",
    title: "Machine Learning Yearning",
    url: "https://home-wordpress.deeplearning.ai/wp-content/uploads/2022/03/andrew-ng-machine-learning-yearning.pdf",
    note: "用于理解单一评测指标、误差分析和如何决定下一步优化动作。",
    kind: "参考书",
  },
];

const term = (termName: string, plain: string, atWork: string): AipmTerm => ({ term: termName, plain, atWork });

const industryGlossary: AipmTermGroup[] = [
  {
    title: "01 · 产品与岗位语言",
    note: "先知道 AIPM 每天到底在判断什么、交付什么。",
    terms: [
      term("AIPM / AI 产品经理", "把用户问题、商业目标和 AI 能力连接起来的人，不等于训练模型的算法工程师。", "你需要定义使用场景、AI 边界、数据、评测、成本和失败处理，并推动设计与研发交付。"),
      term("PM / 产品经理", "负责决定为谁解决什么问题、为什么现在做，以及怎样判断做对了。", "面试中不要只说“协调”，要说你如何基于证据做了哪项取舍。"),
      term("PRD / 产品需求文档", "把需求写到设计、研发、测试都能依据它工作的说明书。", "AI PRD 还要补模型输入输出、上下文、评测集、成本、延迟、兜底和人工边界。"),
      term("MVP / 最小可验证产品", "用最少功能验证最关键假设的版本，不是随便少做一点。", "删除一个功能前问：没有它，核心假设还能被验证吗？"),
      term("JTBD / 待完成任务", "用户在特定情境下真正想取得的进展，而不是用户的年龄标签。", "用“当……时，我想要……从而……”描述任务，避免空泛画像。"),
      term("User Story / 用户故事", "用一句话说明谁因为什么价值要完成什么动作。", "常用结构：作为某类用户，我希望完成某事，从而获得某种结果。"),
      term("PMF / 产品市场匹配", "一群明确用户持续使用并愿意付出时间或金钱解决同一问题。", "个人自测只能证明流程能跑，不能声称已经获得 PMF。"),
    ],
  },
  {
    title: "02 · AI 基础语言",
    note: "不需要推公式，但必须能判断每种能力解决哪类问题。",
    terms: [
      term("AI / 人工智能", "让机器完成通常需要人类判断、理解或决策的任务的总称。", "先问任务究竟需要规则、预测、生成还是工具执行，不要所有问题都硬套大模型。"),
      term("ML / 机器学习", "让系统从数据中学习输入与结果之间的规律，而不是人工写完所有规则。", "适合存在大量历史样本、目标可定义、规律会重复出现的预测或分类问题。"),
      term("Deep Learning / 深度学习", "使用多层神经网络从大量数据中学习复杂模式的机器学习方法。", "图像、语音、文本等非结构化数据常用，但数据与计算成本更高、解释更困难。"),
      term("Generative AI / 生成式 AI", "根据上下文生成新的文字、图片、音频、视频或代码。", "输出不是数据库里的固定答案，因此必须设计评测、引用、确认和失败恢复。"),
      term("LLM / 大语言模型", "在大量文本上训练、根据上下文预测后续 Token 的生成模型。", "擅长语言转换、总结、生成和一定程度的推理，但不天然知道企业最新事实。"),
      term("Model / 模型", "把输入映射为预测或生成结果的计算系统。", "选型时同时比较质量、延迟、成本、上下文长度、安全与供应稳定性。"),
      term("Training / 训练", "使用数据调整模型内部参数，让它学到规律。", "产品经理通常不亲自训练基础模型，但要知道数据质量和目标会决定模型能力。"),
      term("Inference / 推理", "模型上线后接收一次输入并返回结果的过程。", "每次推理都会带来延迟与成本；产品方案要算单次成功结果的总成本。"),
      term("Token", "模型处理文字时使用的小片段，不完全等同于一个汉字或单词。", "输入、输出和历史对话都会占 Token，直接影响上下文容量、速度与费用。"),
      term("Context Window / 上下文窗口", "模型一次能够读取和参考的信息容量。", "上下文太长会增加成本，也可能稀释关键指令；应只提供完成任务所需的最小充分信息。"),
    ],
  },
  {
    title: "03 · AI 方案黑话",
    note: "面试高频，但重点是“什么时候用、什么时候不用”。",
    terms: [
      term("Prompt / 提示词", "给模型的任务说明、背景、规则、示例和输出要求。", "稳定产品不能只靠一句用户输入，需要系统规则、上下文和结构化输出共同约束。"),
      term("Embedding / 向量表示", "把文字、图片等内容转换成可计算相似度的一串数字。", "常用于语义检索、推荐和聚类；它表示相似，不等于事实正确。"),
      term("Vector Database / 向量数据库", "专门存储和检索向量，快速找出语义上接近的内容。", "它通常是 RAG 检索层的一部分，需要定义切块、元数据、过滤与更新策略。"),
      term("RAG / 检索增强生成", "先从可信资料中找相关内容，再让模型依据这些内容回答。", "适合知识更新快、答案需要出处的场景；不能把检索不到的问题伪装成确定答案。"),
      term("Fine-tuning / 微调", "用特定样本继续训练模型，让行为或风格更稳定。", "它适合学习稳定模式，不是给模型灌入每天变化的事实；知识更新通常先考虑 RAG。"),
      term("Agent / 智能体", "模型不仅生成文字，还能规划多步任务、调用工具并根据结果继续行动。", "只要涉及外部写入、付款、删除或高风险决定，就要设计审批、暂停、重试和回滚。"),
      term("Function Calling / 函数调用", "让模型按固定结构选择并填写一个外部工具的参数。", "模型负责建议调用什么，真正执行前仍需由系统校验权限和参数。"),
      term("API / 应用程序接口", "不同软件之间按约定交换请求与结果的入口。", "PRD 要写清请求字段、响应字段、超时、错误码、重试和限流。"),
      term("MCP / 模型上下文协议", "让 AI 客户端用统一方式发现并调用外部工具或数据源的协议。", "产品判断重点不是追协议热度，而是权限、数据边界、可观察性和失败恢复。"),
    ],
  },
  {
    title: "04 · 上线、质量与成本语言",
    note: "AI 产品不是“能回答”就算完成，必须稳定地交付价值。",
    terms: [
      term("Hallucination / 幻觉", "模型生成听起来合理、但没有事实依据或与资料冲突的内容。", "通过引用、检索、拒答、人工确认和评测降低风险，不能承诺彻底消失。"),
      term("Eval / 评测", "用固定样本和标准系统判断 AI 输出质量。", "把“感觉不错”变成任务成功率、事实性、相关性、安全、延迟和成本等可比较指标。"),
      term("Golden Set / 黄金评测集", "一组具有代表性并经人工确认的测试输入、理想结果或评分规则。", "上线前用于基线比较，上线后持续加入新 Bad Case，但要防止只针对测试集优化。"),
      term("Bad Case", "不符合预期、暴露产品或模型问题的真实失败案例。", "记录输入、上下文、模型版本、输出和用户影响，再判断是数据、检索、提示、模型还是交互问题。"),
      term("Guardrail / 护栏", "限制危险输入、输出或工具行为的一组规则与检查。", "包括权限校验、敏感信息检测、内容审核、额度限制和高风险人工审批。"),
      term("Human in the Loop / 人在回路", "在 AI 流程关键节点让人确认、纠正或接管。", "高风险或低置信度任务不追求全自动，应明确何时转人工以及人工看到什么信息。"),
      term("Latency / 延迟", "从用户发出请求到看见结果所等待的时间。", "拆分首字等待、完整结果和工具执行时间；用进度、流式输出、取消与恢复改善体验。"),
      term("Throughput / 吞吐量", "系统在单位时间内能处理多少请求。", "高并发时要考虑队列、限流、缓存与降级，而不只是单次速度。"),
      term("MLOps / 机器学习运维", "让模型从开发、部署、监控到更新形成可重复流程。", "产品经理要关注版本、数据漂移、线上指标、回滚和责任人，不必亲自维护基础设施。"),
    ],
  },
];

const guides: Record<number, AipmLessonGuide> = {
  1: {
    chapter: "序章 · 先学会行业语言，再让 AI 听懂你",
    estimatedMinutes: 75,
    whyItMatters: "你现在最大的障碍不是不会背提示词，而是不知道一个 AI 产品任务由哪些部分组成。先建立词汇地图，后面写需求、做原型、和研发沟通时才不会只会说“做得智能一点”。",
    objectives: ["能用日常语言解释 20 个以上 AIPM 高频术语", "能区分规则、预测、生成与工具执行四类方案", "能把模糊想法补齐为对象、场景、目标、约束、证据和验收标准"],
    termGroups: industryGlossary,
    deepDives: [
      {
        eyebrow: "ROLE MAP",
        title: "AIPM 的价值不是“比研发更懂模型”",
        paragraphs: ["AI 产品经理首先对用户结果负责。你要判断问题是否真实、AI 是否必要、什么数据可以使用、错误会伤害谁，以及怎样证明方案比原来的做法更好。", "研发会告诉你技术怎样实现，模型会生成内容，但“是否值得做、做到什么程度、失败如何兜底”仍然是产品判断。你过去做跨部门协调的经历可以迁移到推进上，但必须补上可验证的产品判断。"],
        example: "不是“接入 DeepSeek 做教练”，而是“当学员卡在当前关卡时，教练只指出一个缺口并追问一个问题；不得重排 30 天计划或代写交付物”。",
        workQuestion: "如果去掉 AI，这个问题还能否用规则或内容解决？为什么仍值得用 AI？",
      },
      {
        eyebrow: "CAPABILITY MAP",
        title: "先选问题类型，再选 AI 技术",
        paragraphs: ["固定规则适合税率、权限和确定公式；机器学习适合从历史样本预测分类；生成式 AI 适合开放语言与内容生成；Agent 适合需要多步计划和工具执行的任务。", "技术越复杂，质量评测、成本、权限和失败恢复的责任越大。AIPM 不应从“现在流行 Agent”出发，而应从任务的不确定性、可验证性和风险出发。"],
        example: "营养目标公式优先用确定规则；根据一段饮食描述识别食物可用 LLM；真正写入健康记录前仍需用户确认。",
        workQuestion: "你的 AIPM 学习系统里，哪些部分必须确定，哪些部分允许 AI 给出概率性答案？",
      },
      {
        eyebrow: "PROMPT AS SPEC",
        title: "提示词是微型需求文档，不是咒语",
        paragraphs: ["高质量输入要说明对象、场景、目标、约束、证据和验收标准。对象回答为谁做；场景回答何时何地发生；目标只保留一个主结果；约束明确不能做什么；证据区分事实与猜测；验收标准让第三方可以判断完成。", "当信息不足时，不要让 AI 自己补故事。让它复述理解、标出事实与判断，并且每轮只问一个最关键问题。这正是你后续写 PRD、访谈提纲和评测规则的共同底层能力。"],
        example: "“帮我做个高级网站”没有用户、任务和完成定义；“为全职转行者做站内学习闭环，完成教学—练习—评分，80 分且无关键缺项才能解锁”可以被设计和测试。",
        workQuestion: "你当前任务中，哪一项是事实，哪一项只是你希望成立的判断？",
      },
    ],
    quiz: [
      { id: "l1q1", question: "一个知识库问答产品要求答案必须引用公司最新制度，优先考虑哪种方案？", options: ["只写更长的 Prompt", "RAG 检索增强生成", "把温度调高", "直接做全自动 Agent"], correctIndex: 1, explanation: "知识更新快且需要出处时，先检索可信资料再生成，RAG 比把事实写进 Prompt 或微调更合适。" },
      { id: "l1q2", question: "以下哪一项最能体现 AIPM 的产品判断？", options: ["会背 Transformer 公式", "会调用多个模型 API", "定义 AI 的使用边界、质量标准和失败兜底", "让模型自由发挥"], correctIndex: 2, explanation: "AIPM 的核心是把用户价值、技术可行性、风险与可验收结果连接起来。" },
      { id: "l1q3", question: "“把页面做得更高级”最缺少什么？", options: ["更多形容词", "一个更强的模型", "可观察的用户结果与验收标准", "更长的上下文"], correctIndex: 2, explanation: "“高级”无法由第三方判断；需要改写成用户行为、质量标准和明确边界。" },
    ],
    sourceIds: ["ai-for-everyone", "ai-for-everyone-video", "aipmbook", "product-school", "duke-aipm"],
    videoEmbedUrl: "https://www.youtube.com/embed/JPcx9qHzzgk",
  },
  2: {
    chapter: "基础一 · 从目标、指标到可验收结果",
    estimatedMinutes: 45,
    whyItMatters: "传统功能可以判断按钮是否能点，AI 输出却具有不确定性。你必须同时定义用户结果、质量门槛和不能被伤害的护栏指标。",
    objectives: ["区分 Output、Outcome 与 Impact", "把主观形容词改成可测试验收标准", "为 AI 功能写出质量、延迟、成本和安全四类门槛"],
    termGroups: [{ title: "本关工作语言", note: "每个词都要落到一个可计算或可判断的标准。", terms: [
      term("Output / 产出", "系统直接交付的东西，例如一份摘要或一张评分卡。", "产出存在不代表用户问题已经解决。"),
      term("Outcome / 用户结果", "用户因为使用产品而完成的行为或获得的改善。", "例如独立完成一关，而不是只打开课程页面。"),
      term("Acceptance Criteria / 验收标准", "第三方可以据此判断需求是否完成的条件。", "写清前置条件、动作、结果与异常，而不是“体验良好”。"),
      term("North Star Metric / 北极星指标", "最能代表持续用户价值的核心指标。", "本项目可以先观察通过且形成真实证据的关卡数，而不是页面浏览量。"),
      term("Guardrail Metric / 护栏指标", "防止主指标增长时伤害质量、安全或成本的指标。", "如通过率不能靠放松评分换取，需同时看人工抽检一致性。"),
      term("Offline Eval / 离线评测", "上线前用固定数据集比较方案质量。", "适合模型、Prompt、RAG 版本之间做可重复对比。"),
      term("Online Eval / 在线评测", "上线后观察真实用户任务和系统表现。", "结合完成率、人工反馈、投诉和失败案例，不能只看点赞。"),
    ] }],
    deepDives: [
      { eyebrow: "METRIC CHAIN", title: "先写用户结果，再倒推系统指标", paragraphs: ["目标不是“上线 AI 教练”，而是“学员能在不离站、不丢上下文的情况下独立完成当前关卡”。功能只是实现路径。", "把指标连接成链：用户结果 → 驱动行为 → 系统质量 → 护栏。这样模型分数波动时，你知道应该检查哪一层。"], example: "主结果：单关独立通过；驱动：草稿修改次数与完成率；质量：评分一致性；护栏：误通过率、延迟和单次成本。", workQuestion: "如果主指标上涨，哪一个护栏能防止你用错误方式赢？" },
      { eyebrow: "AI ACCEPTANCE", title: "AI 验收看分布，不看一次演示", paragraphs: ["同一问题的生成结果可能变化，一次回答正确不能证明稳定。要准备代表性测试集，定义每类题目的通过标准。", "对高风险场景，平均分不够。还要单独设置零容忍项，例如泄露隐私、编造医疗建议或未经确认执行写操作。"], example: "50 条关卡草稿中，关键缺项识别召回率达到目标；任何可识别患者信息都必须触发匿名化提醒。", workQuestion: "你的验收样本是否覆盖最容易失败的边界情况？" },
    ],
    quiz: [
      { id: "l2q1", question: "“AI 教练已经上线”属于哪一类描述？", options: ["用户结果", "系统产出", "北极星指标", "护栏指标"], correctIndex: 1, explanation: "上线是产出，不代表学员因此完成学习或能力提升。" },
      { id: "l2q2", question: "以下哪条最适合作为 AI 评分功能的护栏？", options: ["页面访问量", "生成字数", "关键缺项的误通过率", "按钮颜色"], correctIndex: 2, explanation: "护栏用于防止为了提高通过率而牺牲评审质量。" },
    ],
    sourceIds: ["ai-for-everyone", "ml-yearning", "product-school"],
  },
  3: {
    chapter: "基础二 · 从现象到可验证的问题",
    estimatedMinutes: 50,
    whyItMatters: "AIPM 最常见的失败不是模型不够强，而是一开始解决了错误的问题。问题树把事实、假设和下一步验证分开。",
    objectives: ["区分现象、原因、影响和方案", "建立 MECE 问题树并标注证据强弱", "为最高风险假设设计最小验证"],
    termGroups: [{ title: "本关工作语言", note: "这些词帮你避免把用户说的功能直接当需求。", terms: [
      term("Problem Statement / 问题陈述", "说明谁在什么场景遇到什么阻碍，以及造成什么影响。", "不提前塞入聊天框、Agent 等解决方案。"),
      term("Symptom / 现象", "可以观察到的结果，例如完成率下降。", "现象只是起点，不直接等于根因。"),
      term("Root Cause / 根因", "如果被改变，会显著影响现象的底层原因。", "根因必须用数据或实验验证，不能靠会议共识命名。"),
      term("Hypothesis / 假设", "当前认为可能成立、但仍需证据验证的解释。", "写成“如果…那么…因为…”，并说明什么结果会推翻它。"),
      term("Issue Tree / 问题树", "把一个复杂问题拆成互不重复、尽量完整的子问题。", "用于决定先查流量、任务难度、交互、模型还是系统稳定性。"),
      term("Counterfactual / 反事实", "思考如果没有某个原因，结果是否仍会发生。", "帮助判断相关性是否可能是真正因果。"),
    ] }],
    deepDives: [
      { eyebrow: "PROBLEM FRAMING", title: "用户提出的是方案，不一定是需求", paragraphs: ["“我要聊天框”可能真正意味着用户不想反复复制上下文；“我要 Agent”可能意味着多系统任务太碎。产品经理要追到任务、阻碍和影响。", "先记录用户原话，再写自己的解释。两者分开可以防止你把主观判断伪装成用户证据。"], example: "原话：每次开新对话 AI 都把计划带偏。解释：离站操作导致课程上下文和验收标准丢失。", workQuestion: "去掉用户提出的功能名后，问题还能否完整成立？" },
      { eyebrow: "VALIDATION", title: "优先验证最危险的假设", paragraphs: ["不是所有未知都同时研究。优先选择一旦错误就会让项目失去价值、且当前证据最弱的假设。", "验证动作要尽可能小：查日志、做 5 次任务观察、比较两个原型或人工模拟服务，而不是直接开发完整功能。"], example: "先让 3 位转行者分别用离站 Prompt 和站内教练完成同一关，记录完成时间、偏题次数和修改质量。", workQuestion: "哪一个假设被推翻后，你会停止做这个产品？" },
    ],
    quiz: [
      { id: "l3q1", question: "完成率下降、访问量不变时，以下哪项属于现象？", options: ["课程太难", "AI 评分有问题", "完成率下降", "增加提醒功能"], correctIndex: 2, explanation: "完成率下降是已观察现象；课程难和评分问题是待验证原因，提醒是方案。" },
      { id: "l3q2", question: "最值得优先验证的假设通常是什么？", options: ["最容易证明的", "领导最喜欢的", "错误后会让核心价值不成立且证据最弱的", "开发最想做的"], correctIndex: 2, explanation: "优先降低最大的不确定性，而不是优先寻找支持已有想法的证据。" },
    ],
    sourceIds: ["aipmbook", "duke-aipm", "ai-for-everyone"],
  },
  4: {
    chapter: "基础三 · 用户、场景与待完成任务",
    estimatedMinutes: 45,
    whyItMatters: "人口标签不能指导功能取舍。你需要知道用户在什么触发下、用什么替代办法、卡在哪一步。",
    objectives: ["用行为与任务定义主用户", "写出触发—任务—阻碍—结果的完整场景", "识别自身作为首位用户的样本偏差"],
    termGroups: [{ title: "本关工作语言", note: "画像不是填表，而是帮助团队做取舍。", terms: [
      term("Persona / 用户画像", "一组目标、行为和障碍相似的用户模型。", "只保留会影响产品决策的特征。"),
      term("Scenario / 使用场景", "触发、环境、任务、限制和期望结果组成的具体情境。", "同一用户在通勤和全职学习时可能需要完全不同的产品。"),
      term("Trigger / 触发", "让用户开始某项任务的事件或时刻。", "它决定入口、提醒和首屏信息。"),
      term("Alternative / 替代方案", "用户当前用于完成任务的产品、人工服务或凑合办法。", "你的竞争对手可能是 Excel、微信群或放弃。"),
      term("Workaround / 绕行办法", "产品不满足需求时用户自行拼出的临时路径。", "高频绕行往往比口头需求更能暴露机会。"),
      term("Edge Case / 边界场景", "非主流但可能带来严重后果的输入或用户情境。", "健康、隐私和外部写入场景必须提前处理。"),
    ] }],
    deepDives: [
      { eyebrow: "JTBD", title: "从“是谁”转向“要取得什么进展”", paragraphs: ["年龄、城市和爱好只有在影响任务时才重要。真正能指导设计的是用户何时产生需求、当前怎样做、为什么失败。", "JTBD 的常用句式是：当我处于某种情境时，我想完成某个进展，从而得到某种结果。"], example: "当我全职准备 AIPM 求职、信息来源混乱时，我想每天在一个地方学完并产出证据，从而能在面试中讲清真实项目。", workQuestion: "如果用户年龄改变，这个任务和阻碍还成立吗？" },
      { eyebrow: "SAMPLE BOUNDARY", title: "以自己为用户，但不能把自己等同于市场", paragraphs: ["你可以做首位用户，因为能快速暴露流程问题并留下完整日志；但个人偏好不能代表其他转行者。", "在作品集中要明确证据层级：自我日志证明流程可运行，小样本测试证明他人能使用，持续数据才可能支持更广的价值判断。"], example: "事实：我连续使用 7 天；判断：站内闭环减少上下文丢失；待验证：其他转行者是否也愿意长期使用。", workQuestion: "你的哪项结论只对全职学习者成立？" },
    ],
    quiz: [
      { id: "l4q1", question: "以下哪条画像最能指导产品设计？", options: ["22—30 岁，喜欢 AI", "杭州用户，审美好", "全职备战 AIPM，但每天不知道如何形成可面试证据", "普通本科毕业生"], correctIndex: 2, explanation: "它包含任务与阻碍，能够直接指导课程闭环和证据设计。" },
      { id: "l4q2", question: "以自己为首位用户时，最重要的边界是什么？", options: ["不能记录任何数据", "个人体验不能直接代表市场需求", "必须隐藏全部失败", "不需要再访谈别人"], correctIndex: 1, explanation: "自我实践是强过程证据，但外部价值仍需其他目标用户验证。" },
    ],
    sourceIds: ["duke-aipm", "aipmbook"],
  },
  5: {
    chapter: "基础四 · 访谈不是问意见，而是找行为证据",
    estimatedMinutes: 50,
    whyItMatters: "用户会礼貌地说“会用”，但真实行为、付出的成本和绕行方式才决定问题是否值得解决。",
    objectives: ["把意愿问题改写为过去行为问题", "围绕一个假设完成追问链", "分开记录原话、观察和解释"],
    termGroups: [{ title: "本关工作语言", note: "访谈的目标不是让用户认可你的方案。", terms: [
      term("Discovery Interview / 探索访谈", "在方案确定前理解用户任务、行为和障碍的访谈。", "避免展示原型后才问“你需不需要”。"),
      term("Leading Question / 诱导问题", "问题中已经暗示期望答案。", "将“这个功能很方便吧”改为“上一次你怎么完成这件事”。"),
      term("Behavioral Evidence / 行为证据", "用户过去真实做过、花过时间或付过成本的事实。", "强于对未来意愿的口头承诺。"),
      term("Sample Bias / 样本偏差", "受访者来源导致结论系统性偏向某类人。", "只访谈朋友或高投入用户会高估普遍需求。"),
      term("Transcript / 逐字记录", "保留访谈原话和时间顺序的文本。", "AI 可以帮助聚类，但不能替你编补没有说过的内容。"),
      term("Saturation / 信息饱和", "继续访谈时很少出现新的关键主题。", "它是阶段性停止信号，不等于样本已经代表市场。"),
    ] }],
    deepDives: [
      { eyebrow: "QUESTION DESIGN", title: "从“你会不会”改成“上一次发生了什么”", paragraphs: ["未来意愿成本很低，容易得到好听但无用的回答。过去行为能暴露真实步骤、频率、替代方案和放弃原因。", "每个问题都应对应一个待验证假设，否则访谈会变成漫无目的聊天。"], example: "不要问“你会用 AI 学习站吗”；问“上一次你准备 AIPM 面试时，从哪里找资料，在哪一步停下了？”", workQuestion: "这道问题的答案会改变你的哪个产品决定？" },
      { eyebrow: "EVIDENCE HYGIENE", title: "原话、观察、解释三列分开", paragraphs: ["原话是用户说了什么，观察是你看到什么行为，解释是你认为为什么。三者混在一起会把假设伪装成事实。", "使用 AI 总结访谈时，要求它为每条洞察附原始引用位置，并明确无法确定的部分。涉及真实公司或个人时先匿名化。"], example: "原话：我收藏了很多教程但没打开。观察：收藏夹 43 条。解释：用户缺少下一步指引——这仍是待验证判断。", workQuestion: "你的洞察是否能回到至少两条原始证据？" },
    ],
    quiz: [
      { id: "l5q1", question: "受访者说“这个功能我肯定会用”，下一问最有效的是？", options: ["那你愿意付多少钱？", "你觉得界面好看吗？", "最近一次遇到这个问题时，你具体怎么处理？", "你能推荐给朋友吗？"], correctIndex: 2, explanation: "追问最近一次真实行为，才能检验口头意愿是否对应真实问题。" },
      { id: "l5q2", question: "AI 总结访谈时最重要的要求是什么？", options: ["写得更专业", "每条洞察可追溯到原始证据并标注不确定性", "自动补齐缺失回答", "只保留正面反馈"], correctIndex: 1, explanation: "可追溯性可以防止模型把推测写成受访者事实。" },
    ],
    sourceIds: ["aipmbook", "duke-aipm"],
  },
  6: {
    chapter: "基础五 · 从证据到优先级与取舍",
    estimatedMinutes: 50,
    whyItMatters: "产品经理不是整理需求的人，而是明确解释为什么先做这一项、暂时放弃什么的人。",
    objectives: ["把原始反馈聚类成可行动洞察", "用价值、证据、成本和风险排序", "写出暂不做清单与触发重启条件"],
    termGroups: [{ title: "本关工作语言", note: "框架只是让判断透明，不会替你做决定。", terms: [
      term("Insight / 洞察", "把重复行为、动机和阻碍连接成可行动的解释。", "必须能回溯到证据，并说明适用样本。"),
      term("Desirability / 用户渴望度", "用户是否真正需要并愿意改变现有行为。", "用行为、频率和替代成本判断，不只看口头喜欢。"),
      term("Feasibility / 技术可行性", "团队能否在质量、数据、时间和系统约束下实现。", "PoC 能运行不等于能稳定上线。"),
      term("Viability / 商业可行性", "价值、成本、风险和持续运营是否成立。", "计算成功任务的完整成本，不只算 Token。"),
      term("RICE", "用覆盖人数、影响、信心和投入帮助比较机会的框架。", "分数不能掩盖证据薄弱；信心项必须说明依据。"),
      term("Opportunity Cost / 机会成本", "选择一项工作时因此无法做的其他价值。", "取舍说明必须明确被推迟的内容及影响。"),
    ] }],
    deepDives: [
      { eyebrow: "SYNTHESIS", title: "洞察不是把用户原话换个标题", paragraphs: ["“用户说想要提醒”只是反馈；“用户在任务过长时失去下一步感，因此需要可见进度和最小行动提示”才可能指导方案。", "一条合格洞察包含行为模式、可能原因、造成影响、证据来源和仍待验证的部分。"], example: "多位学员收藏课程但未完成；访谈显示离站切换导致上下文丢失。优先验证站内学习—练习—评审闭环。", workQuestion: "你的洞察能排除哪一个看似合理但不该先做的功能？" },
      { eyebrow: "PRIORITIZATION", title: "先比较机会，再比较功能", paragraphs: ["直接给功能打分容易把已有想法合理化。先比较用户问题的频率、严重度和战略价值，再讨论方案。", "AI 项目还要加入数据可得性、评测可行性、成本和风险。一个看起来惊艳但无法验证的功能不应进入首版。"], example: "站内评分闭环可直接验证能力提升；3D 角色主要提升氛围，因此后者不阻断首版。", workQuestion: "如果只能保留一项，你用哪条证据证明它最接近核心价值？" },
    ],
    quiz: [
      { id: "l6q1", question: "以下哪一条更接近产品洞察？", options: ["用户想要提醒", "三位用户都说不错", "长任务中用户失去下一步感，导致收藏后不行动；需验证分步引导是否提升完成", "增加每日打卡"], correctIndex: 2, explanation: "它连接了行为、阻碍、影响和待验证方向，而不是复述需求或直接给方案。" },
      { id: "l6q2", question: "AI 功能优先级除用户价值和开发成本外，还必须重点考虑什么？", options: ["动画数量", "模型名称是否热门", "数据、评测可行性与错误风险", "竞品用了什么颜色"], correctIndex: 2, explanation: "没有数据、无法评测或风险不可控时，PoC 再惊艳也不等于可上线产品。" },
    ],
    sourceIds: ["product-school", "duke-aipm", "aipmbook"],
  },
  7: {
    chapter: "基础 BOSS · 用自己的证据完成问题答辩",
    estimatedMinutes: 70,
    whyItMatters: "面试不会只问术语定义，而会追问你凭什么这样判断、为何不用更简单方案、证据能支持到哪里。",
    objectives: ["在 5 分钟内讲清用户、场景、问题、证据和验收", "回答为什么用 AI、为什么现在做", "主动说明样本、能力和验证边界"],
    termGroups: [{ title: "答辩语言", note: "把前六关的概念串成一条经得起追问的逻辑链。", terms: [
      term("Problem–Solution Fit / 问题方案匹配", "方案能否针对一个已被验证的重要问题。", "原型好看不能替代问题证据。"),
      term("Evidence Ladder / 证据阶梯", "从个人判断、行为记录、小样本测试到持续真实数据的强弱层级。", "结论不能超过当前证据等级。"),
      term("Scope / 范围", "本阶段明确做什么、不做什么以及为什么。", "范围是对目标的保护，不是功能越少越好。"),
      term("Trade-off / 取舍", "获得某项价值时主动接受的成本或损失。", "说明为什么接受这一代价，以及何时会重新评估。"),
      term("Falsifiability / 可证伪性", "明确什么结果出现时你会承认假设不成立。", "能说出停止条件，比只找支持证据更像产品判断。"),
    ] }],
    deepDives: [
      { eyebrow: "DEFENSE STRUCTURE", title: "用一条问题链回答，而不是堆术语", paragraphs: ["推荐顺序：目标用户与场景 → 可观察问题 → 证据与局限 → 为什么值得现在解决 → 为什么选择该方案 → 怎样验收 → 下一步最大未知。", "每一段都应包含你的判断。不要说“我们做了调研”，要说调研改变了什么决定。"], example: "我先把首位用户限定为全职转行者；基于离站对话丢上下文的记录，选择站内教练；首版不做社区，先验证单关完成和证据质量。", workQuestion: "哪一个决定最能证明这不是 AI 自动生成的项目包装？" },
      { eyebrow: "PRESSURE TEST", title: "先承认边界，再说明验证计划", paragraphs: ["面对“这只是你自己的需求”时，不要辩称所有人都一样。承认自我样本只能证明流程问题，然后说明下一层需要什么外部证据。", "面对“为什么用 AI”时，比较规则、内容、人工和 AI 四种方案，说明 AI 只被放在需要开放语言判断的位置。"], example: "目前证据能证明我能完成端到端闭环，不能证明市场规模；下一步用 5 位目标用户的任务完成率和失败原因验证外部适用性。", workQuestion: "如果面试官不同意你的方案，你能否用事实说明而不是防御个人审美？" },
    ],
    quiz: [
      { id: "l7q1", question: "面试官问“这只是你自己的需求”，最好的回应是？", options: ["很多人一定也需要", "这是 AI 风口", "承认当前证据只到自我实践，并说明下一步外部验证方法", "展示更多页面"], correctIndex: 2, explanation: "边界意识和可执行验证计划比夸大结论更可信。" },
      { id: "l7q2", question: "以下哪种说法最能体现产品取舍？", options: ["所有功能都重要", "先做评分闭环，暂缓社区，因为只有前者直接验证核心假设", "研发说做不了", "竞品没有所以不做"], correctIndex: 1, explanation: "取舍要回到核心假设、证据和机会成本。" },
      { id: "l7q3", question: "答辩中最需要主动区分什么？", options: ["中文和英文", "事实、当前判断与待验证内容", "前端和后端", "免费和付费工具"], correctIndex: 1, explanation: "这能避免把愿望包装成结果，也能让下一步验证更清楚。" },
    ],
    sourceIds: ["ai-for-everyone", "aipmbook", "product-school", "duke-aipm", "ml-yearning"],
  },
};

const contextualTerms: Record<number, AipmTerm[]> = {
  8: [term("Project Charter / 项目章程", "用一页明确目标、范围、角色、里程碑和风险。", "范围变更时用它判断是否偏离 30 天目标。"), term("Milestone / 里程碑", "可以被验收的重要阶段结果。", "不是“继续开发”，而是可打开、可检查的交付物。"), term("Risk Register / 风险登记册", "记录风险、概率、影响、责任人和应对。", "每周更新，不把问题发生后才称为风险。")],
  9: [term("Competitor / 竞品", "争夺同一用户任务的产品。", "不只找界面相似的软件。"), term("Substitute / 替代方案", "用户现在完成任务的其他办法。", "包括人工、表格、课程或放弃。"), term("Benchmark / 基准", "用于比较路径、质量或成本的统一参照。", "比较前先统一任务和测试条件。")],
  10: [term("Task Flow / 任务流", "用户从触发到结果的动作链。", "同时画主流程和失败分支。"), term("Happy Path / 主成功路径", "在正常条件下完成任务的最短路径。", "不能因此忽略超时、空结果和撤销。"), term("Fallback / 降级", "主能力失败时仍能让用户继续的替代路径。", "例如保存草稿、改为规则提示或转人工。")],
  11: [term("Scope Creep / 范围蔓延", "需求不断加入导致目标和周期失控。", "新增项必须说明替换掉什么。"), term("MoSCoW", "按必须、应该、可以、不做整理范围。", "Must 只保留形成核心闭环的内容。"), term("Definition of Done / 完成定义", "团队一致认可的完成条件。", "要包含测试、异常、文档和上线准备。")],
  12: [term("Information Architecture / 信息架构", "内容和功能的组织、层级与命名规则。", "让用户知道自己在哪和下一步去哪。"), term("Navigation / 导航", "帮助用户在信息结构中移动的入口。", "名称要用用户语言，不用内部部门名。"), term("Mental Model / 心智模型", "用户认为系统应该如何工作的理解。", "用卡片分类和任务测试检查命名是否符合预期。")],
  13: [term("Wireframe / 线框图", "低成本表达页面结构和优先级的草图。", "先验证流程，不先做视觉细节。"), term("Prototype / 原型", "让用户体验关键交互的可测试模型。", "它用于回答问题，不等于正式产品。"), term("State / 状态", "同一界面在加载、成功、失败、空数据等条件下的表现。", "AI 产品尤其要显示等待、取消和恢复。")],
  14: [term("Usability Test / 可用性测试", "观察目标用户完成真实任务的过程。", "测试者停顿时不要立即教学。"), term("Severity / 严重度", "问题对任务成功和用户影响的等级。", "先修阻断任务和高风险错误。"), term("Think Aloud / 出声思考", "让测试者边操作边说当前理解。", "记录原话，不把解释强加给用户。")],
  15: [term("Functional Requirement / 功能需求", "系统必须提供的具体行为。", "用规则和状态写清，不用愿景代替。"), term("Non-functional Requirement / 非功能需求", "性能、安全、可用性等质量约束。", "AI 功能要写延迟、成本、稳定性和隐私。"), term("Given–When–Then", "按前置条件、动作和结果写验收。", "让开发与测试对同一行为没有歧义。")],
  16: [term("System Prompt / 系统提示", "产品在服务端给模型的稳定角色和规则。", "用户内容不能覆盖安全和课程边界。"), term("Structured Output / 结构化输出", "要求模型按固定字段返回结果。", "服务端仍要校验字段、类型和缺失。"), term("Temperature", "控制生成随机性的一类参数。", "低温也不能保证事实正确，仍需评测。")],
  17: [term("Data Model / 数据模型", "定义对象、字段、关系和约束。", "先画用户、关卡、记录、消息和证据关系。"), term("RBAC / 基于角色的权限", "按角色控制可读写资源。", "身份验证后仍要对每次查询做授权。"), term("PII / 可识别个人信息", "能直接或组合识别个人的数据。", "收集最少化、默认私密、公开前脱敏。")],
  18: [term("Case Study / 项目案例", "用证据讲清问题、判断、方案、验证和反思。", "不是功能截图合集。"), term("Contribution / 个人贡献", "你亲自做出的分析、取舍和交付。", "说明 AI、协作者和你各自完成什么。"), term("Limitation / 局限", "当前证据无法支持的结论。", "主动写出反而更经得起追问。")],
  19: [term("Behavioral Evidence / 行为证据", "用户过去真实做过什么，比口头说会不会用更可靠。", "用“忘记后默认当作第 3 组”记录当前补救行为。"), term("Workaround / 替代做法", "产品不存在时，用户为完成任务采取的临时办法。", "判断替代做法的频率、代价和可接受程度。"), term("Evidence Boundary / 证据边界", "结论不能超过当前样本实际支持的范围。", "本人记录证明问题存在，不等于证明市场规模。")],
  20: [term("State Machine / 状态机", "把系统有哪些状态、怎样切换写成明确规则。", "定义待开始、训练、休息、完成和结束。"), term("Timer Semantics / 计时语义", "明确计时从何时开始、暂停、恢复和结束。", "正计时与倒计时都由同一组完成事件触发。"), term("Undo / 撤销", "让用户低成本恢复刚才的错误操作。", "撤销时同步回退组数、时间和训练记录。")],
  21: [term("Glanceable UI / 一瞥可读界面", "用户只看一眼就能取得关键状态。", "器械旁的手机优先显示当前组、总组数和休息时间。"), term("Live Activity / 实时活动", "iPhone 在锁屏或灵动岛持续展示进行中任务的系统能力。", "网页原型只模拟信息结构，原生版本再验证真实接入。"), term("Audio Cue / 音频提示", "用短声音或语音在不看屏幕时反馈状态。", "耳机只播报关键变化，并允许关闭。")],
  22: [term("Human in the Loop / 人在回路", "AI 提建议，人对高影响结果确认。", "可能完成一组时先提示，不直接改记录。"), term("Confidence / 置信度", "系统对判断把握程度的表达。", "低置信度时保持当前组或请求确认。"), term("False Positive / 误报", "实际未完成却被系统判为完成。", "动作识别误报必须可忽略、可撤销并被记录。")],
  23: [term("North Star Metric / 北极星指标", "最能代表用户持续获得核心价值的主指标。", "本项目先观察经核对的组数正确记录率。"), term("Guardrail Metric / 护栏指标", "防止主指标变好却伤害体验或安全的指标。", "同时看撤销率、单次记录耗时和打扰感。"), term("Event Taxonomy / 事件字典", "统一定义产品行为的名称、字段和触发时点。", "区分完成组、开始休息、撤销和结束训练。")],
  24: [term("Functional Prototype / 功能原型", "输入会真正驱动状态变化的可操作版本。", "四组、计时、撤销与总结必须能从头跑完。"), term("Persistence / 持久化", "页面关闭或刷新后仍保留必要状态。", "保存当前动作、组数和计时起点。"), term("Simulation Label / 模拟标识", "明确演示界面与已接入真实能力的区别。", "锁屏、灵动岛和耳机卡片必须标注为模拟。")],
  25: [term("Pilot / 小规模试点", "先在有限用户和场景里验证任务与风险。", "用 5—10 位健身者走完四组流程。"), term("Willingness to Pay / 付费意愿", "用户是否愿意为持续价值实际付出金钱或替代成本。", "不能用一句“愿意”代替价格与行为验证。"), term("Retention Hypothesis / 留存假设", "为什么用户会在首次体验后继续回来。", "假设持续计组和训练复盘会形成重复价值，再用行为数据验证。")],
  26: [term("Portfolio / 作品集", "证明你如何判断和交付的证据集合。", "公开页面只放脱敏且经选择的材料。"), term("Information Scent / 信息气味", "用户从标题和入口判断内容是否相关的线索。", "招聘者 30 秒内应找到两个主项目。"), term("Progressive Detail / 层层深入", "首页给结论，案例页给过程，附件给原始证据。", "避免把所有作业堆在首屏。")],
  27: [term("STAR", "用情境、任务、行动、结果组织经历。", "重点放在你的判断与行动。"), term("Evidence Index / 证据索引", "把主张与可打开证据一一对应。", "面试追问时快速定位原型、文档或测试记录。"), term("Attribution / 归因", "说明结果由哪些因素造成以及你的贡献。", "不能把 AI 或团队成果全部算成个人成果。")],
  28: [term("JD / 职位描述", "公司对岗位任务与能力的公开要求。", "拆成能力、场景、证据和门槛。"), term("ATS / 简历筛选系统", "按结构和关键词处理简历的系统。", "关键词必须有真实经历支撑。"), term("Transferable Skill / 可迁移能力", "能在新行业继续产生价值的旧经验能力。", "把跨部门推进翻译为具体任务、动作和结果。")],
  29: [term("Behavioral Interview / 行为面试", "用过去真实经历判断能力的面试。", "准备可追问的事实，不背抽象优点。"), term("Pressure Question / 压力追问", "连续挑战证据、边界和一致性的提问。", "先结论，再证据，最后说明未知。"), term("Calibration / 校准", "通过反馈调整对自身回答质量的判断。", "录音复盘含糊、冗长和证据薄弱处。")],
  30: [term("Final Acceptance / 最终验收", "按已确认目标检查成果是否齐全可用。", "未完成项进入修复单，不另起新计划。"), term("Release Candidate / 候选发布版", "准备上线、只修阻断问题的版本。", "冻结非必要视觉需求。"), term("Retrospective / 回顾", "总结有效做法、问题和下一周期行动。", "区分项目成果与个人能力增长。")],
};

export function getAipmLessonGuide(levelId: number) {
  return guides[levelId] ?? null;
}

export function getAipmContextualTerms(levelId: number) {
  return contextualTerms[levelId] ?? [];
}

export function getAipmSources(ids: string[]) {
  return ids.map((id) => aipmCourseSources.find((source) => source.id === id)).filter((source): source is AipmCourseSource => Boolean(source));
}
