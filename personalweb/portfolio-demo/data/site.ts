export type CaseStudySections = {
  problem: string;
  goal: string;
  design: string;
  aiRole: string;
  thinking: string;
  mvp: string;
  outcome: string;
};

export type Project = {
  id: string;
  name: string;
  position: string;
  summary: string;
  narrative: string;
  highlights: string[];
  previewNote: string;
  caseStudy: CaseStudySections;
};

export type SkillGroup = {
  title: string;
  items: string[];
};

export const site = {
  name: "林凤",
  title: "林凤 - AI产品经理个人网站",
  role: "AI产品经理 / B端产品经理",
  heroLead:
    "8年B端产品经验，擅长AI产品落地、电商交易、供应链协同与数据产品建设。能把复杂业务逻辑抽象成可交付、可验收、可持续迭代的系统产品。",
  heroKeywords: ["AI产品落地", "RAG知识库", "电商交易", "供应链平台", "数据产品"],
} as const;

export const projects: Project[] = [
  {
    id: "ai-customer-service",
    name: "AI电商智能客服",
    position: "AI产品 / 产品负责人",
    summary:
      "从0到1设计并落地电商AI客服，覆盖售前、售中、售后高频咨询与查单、改地址、退换货等复杂操作场景。",
    narrative:
      "项目重点不是单纯接入模型，而是把知识库、意图识别、多轮对话、转人工兜底和效果评估做成一套可运营的产品闭环，让AI能进入真实客服工作流。",
    highlights: [
      "设计RAG知识库架构、知识入库标准与更新机制",
      "制定意图识别、多轮交互与转人工兜底策略",
      "搭建解决率、转人工率、满意度等效果评估体系",
    ],
    previewNote: "RAG / 意图识别 / 多轮对话",
    caseStudy: {
      problem:
        "电商平台日均客服咨询量大，人工成本高、响应慢，售后问题链路长且容易反复沟通。",
      goal:
        "在保障用户体验的前提下降低人工承接压力，让AI优先处理高频、标准化、可追踪的客服问题。",
      design:
        "按售前、售中、售后拆解对话路径，围绕查单、改地址、退换货设计多轮流程，并设置明确的转人工兜底规则。",
      aiRole:
        "RAG知识检索、意图识别、多轮对话管理与答案生成；对高风险或不确定场景降级到人工确认。",
      thinking:
        "B端AI产品的关键是可控和可复盘。模型能力必须被知识治理、指标评估和运营机制托住。",
      mvp:
        "优先上线高频咨询与售后标准链路，先验证解决率和转人工率，再逐步扩展复杂异常场景。",
      outcome:
        "转人工率从45%降至28%，RAG知识库覆盖率达95%，AI幻觉率明显下降。",
    },
  },
  {
    id: "data-profile",
    name: "大数据用户画像与精准推荐系统",
    position: "数据产品 / 产品负责人",
    summary:
      "建立统一用户认知与指标体系，规划埋点、标签、数据存储和BI看板，支撑运营决策与精准推荐。",
    narrative:
      "项目把分散的数据口径、用户标签和运营看板收束为统一数据产品能力，让业务从经验判断转向可观测、可复盘、可持续优化的决策方式。",
    highlights: [
      "定义30+核心指标算法，统一跨部门数据口径",
      "设计用户标签体系与埋点采集方案，覆盖率提升至95%",
      "搭建2分钟刷新实时监控大屏与动态报告能力",
    ],
    previewNote: "用户画像 / BI看板 / Hive + Doris",
    caseStudy: {
      problem:
        "平台缺乏统一用户认知体系，运营决策依赖经验判断，推荐效果和数据可信度不足。",
      goal:
        "建立统一指标口径、标签体系和可视化看板，让运营、产品和管理层围绕同一套数据协作。",
      design:
        "从指标定义、埋点采集、数仓分层、标签计算到BI展示建立完整链路，并支持实时监控与一键投屏。",
      aiRole:
        "本项目以数据产品能力为主，为后续推荐策略、智能分析和自动化报告提供结构化数据基础。",
      thinking:
        "数据产品的价值不在于看板数量，而在于能否让组织更快形成一致判断并采取行动。",
      mvp:
        "先统一核心指标和高频运营场景，再扩展标签维度和实时分析能力，避免一次性铺太散。",
      outcome:
        "覆盖全国22省市，用户活跃度提升15%，报告生成时间从3天缩短至2小时，并获CEO点名表扬。",
    },
  },
  {
    id: "commerce-supply-chain",
    name: "全渠道电商与供应链一体化平台",
    position: "B端平台 / 产品负责人",
    summary:
      "主导从0到1建设商品、营销、售后、合同、订单、物流与资金链路一体化平台，支撑多端协同与复杂业务状态管理。",
    narrative:
      "这是一个典型的复杂B端系统建设项目：既要处理商品、库存、订单、支付和售后，也要把合同驱动型供应链流程做成透明、可追踪、可审批的企业级平台。",
    highlights: [
      "设计商品中心、营销引擎、库存预扣与售后闭环",
      "打通合同到订单、物流、资金的全链路管理",
      "通过工作流引擎支持审批自定义与PC/TV/手机协同",
    ],
    previewNote: "电商平台 / 供应链 / 工作流引擎",
    caseStudy: {
      problem:
        "商品、订单、合同、物流和资金链路分散，流程不透明，异常处理依赖人工沟通。",
      goal:
        "建设一个能支撑全渠道交易和供应链履约的统一平台，提高订单处理效率并降低客诉。",
      design:
        "围绕商品中心、营销引擎、售后闭环和合同驱动供应链建模，并用状态机处理超卖、物流异常等复杂场景。",
      aiRole:
        "当前项目以交易和供应链系统能力为主，可进一步延展到智能预警、异常归因和运营辅助决策。",
      thinking:
        "复杂B端平台要先把业务对象和状态流转定义清楚，体验优化才不会漂浮在流程之外。",
      mvp:
        "先搭建商品、订单、合同和履约主链路，再逐步增强营销玩法、异常策略和多端协同能力。",
      outcome:
        "支撑百万级订单金额，合同执行透明化率100%，订单处理效率提升40%，客诉量降低40%。",
    },
  },
];

export const skillGroups: SkillGroup[] = [
  {
    title: "AI产品",
    items: [
      "RAG知识库设计与知识治理",
      "意图识别与多轮对话流程设计",
      "Prompt Engineering与效果评估",
      "转人工兜底、bad case复盘与持续优化",
    ],
  },
  {
    title: "B端产品",
    items: [
      "0到1企业级平台建设",
      "复杂业务抽象与状态机设计",
      "需求取舍、里程碑管理与跨团队协作",
      "商品、订单、合同、售后与供应链流程设计",
    ],
  },
  {
    title: "数据产品",
    items: [
      "指标体系、埋点方案与数据口径统一",
      "用户标签、画像体系与推荐策略支持",
      "BI看板、实时大屏与经营分析",
      "了解ODS / DWD / DWS / ADS数仓分层",
    ],
  },
  {
    title: "协作工具",
    items: [
      "Axure / XMind / Visio",
      "PMP项目管理认证",
      "API接口与数据契约沟通",
      "Hive / Doris / SQL基础认知",
    ],
  },
];

export const about = {
  path: [
    "我是一名拥有8年B端产品经验的产品经理，长期在通信、电商、供应链和数据产品场景中推进企业级系统建设。",
    "近阶段重点关注AI如何进入真实业务流程：不是展示一个炫技Demo，而是把知识、流程、指标、兜底和组织协作一起设计出来。",
    "过往项目横跨AI电商客服、用户画像与精准推荐、全渠道电商供应链平台，习惯在复杂约束下推进从0到1落地。",
  ],
  focus: [
    "AI智能体产品设计：RAG、意图识别、多轮对话、效果优化",
    "B端复杂系统建模：商品、订单、合同、履约、售后与审批",
    "数据产品闭环：指标体系、埋点、标签、BI看板与经营分析",
  ],
  philosophy:
    "我相信好的产品经理要能把复杂业务讲清楚、拆明白、推落地。对AI产品来说，真正的价值不只是生成答案，而是让系统在真实场景里稳定、可控、可复盘地解决问题。",
} as const;

export const contact = {
  email: "1546529912@qq.com",
  phone: "18503051130",
  wechat: "可按需要放置微信二维码或改为邮箱优先联系",
  links: [
    { label: "下载简历", href: "/linfeng-resume.pdf" },
    { label: "发送邮件", href: "mailto:1546529912@qq.com" },
  ],
} as const;

export const navItems = [
  { href: "#hero", label: "首页" },
  { href: "#projects", label: "项目" },
  { href: "#case-study", label: "案例" },
  { href: "#skills", label: "能力" },
  { href: "#about", label: "关于" },
  { href: "#contact", label: "联系" },
] as const;
