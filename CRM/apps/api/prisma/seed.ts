import {
  PrismaClient,
  Prisma,
  UserRole,
  LeadStatus,
  CustomerLevel,
  CustomerStatus,
  DuplicateStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** 演示数据：主手机号 1999001*（客户）/ 1999002*（线索），或历史种子中客户名曾含 DEMO_MARK；线索公司名等仍可能含 DEMO_MARK */
const DEMO_MARK = '[DEMO]';

async function wipeDemoDataset() {
  const demoCustomers = await prisma.customer.findMany({
    where: {
      OR: [{ name: { contains: DEMO_MARK } }, { primaryPhone: { startsWith: '1999001' } }],
    },
    select: { id: true },
  });
  const cids = demoCustomers.map((c) => c.id);
  if (cids.length > 0) {
    await prisma.lead.updateMany({
      where: { convertedCustomerId: { in: cids } },
      data: { convertedCustomerId: null, convertedContactId: null, convertedAt: null },
    });
    await prisma.customer.updateMany({
      where: { id: { in: cids } },
      data: { sourceLeadId: null },
    });

    const opps = await prisma.opportunity.findMany({
      where: { customerId: { in: cids } },
      select: { id: true },
    });
    const oid = opps.map((o) => o.id);

    const qFromCust = await prisma.quotation.findMany({
      where: { customerId: { in: cids } },
      select: { id: true },
    });
    const qidsSet = new Set(qFromCust.map((q) => q.id));
    if (oid.length > 0) {
      const qFromOpp = await prisma.quotation.findMany({
        where: { opportunityId: { in: oid } },
        select: { id: true },
      });
      for (const q of qFromOpp) qidsSet.add(q.id);
    }
    const qids = [...qidsSet];

    if (qids.length > 0) {
      await prisma.quotationApproval.deleteMany({ where: { quotationId: { in: qids } } });
      await prisma.quotation.deleteMany({ where: { id: { in: qids } } });
    }

    await prisma.contract.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.order.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.followUpRecord.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.contact.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.customerTag.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.customerCollaborator.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.statusRollbackRequest.deleteMany({ where: { customerId: { in: cids } } });
    if (oid.length > 0) {
      await prisma.opportunity.deleteMany({ where: { id: { in: oid } } });
    }
    await prisma.customerStatusHistory.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.businessEvent.deleteMany({
      where: { objectType: 'customer', objectId: { in: cids } },
    });
    await prisma.customer.deleteMany({ where: { id: { in: cids } } });
  }

  const demoLeadWhere = {
    OR: [{ companyName: { contains: DEMO_MARK } }, { phone: { startsWith: '1999002' } }],
  };
  const demoLeadsForCandidates = await prisma.lead.findMany({
    where: demoLeadWhere,
    select: { id: true },
  });
  const demoLeadIds = demoLeadsForCandidates.map((l) => l.id);
  if (demoLeadIds.length > 0 || cids.length > 0) {
    await prisma.duplicateCandidate.deleteMany({
      where: {
        OR: [
          ...(demoLeadIds.length
            ? [{ objectType: 'lead' as const, objectId: { in: demoLeadIds } }]
            : []),
          ...(cids.length
            ? [{ matchedObjectType: 'customer' as const, matchedObjectId: { in: cids } }]
            : []),
        ],
      },
    });
  }

  await prisma.product.deleteMany({ where: { code: { startsWith: 'DEMO-' } } });

  const demoWorkflowRules = await prisma.workflowRule.findMany({
    where: { name: { contains: DEMO_MARK } },
    select: { id: true },
  });
  const wrIds = demoWorkflowRules.map((r) => r.id);
  if (wrIds.length > 0) {
    await prisma.workflowExecution.deleteMany({ where: { ruleId: { in: wrIds } } });
    await prisma.workflowRule.deleteMany({ where: { id: { in: wrIds } } });
  }

  await prisma.notification.deleteMany({ where: { dedupKey: { startsWith: 'demo-seed:' } } });

  await prisma.lead.deleteMany({ where: demoLeadWhere });
}

async function seedRichDemo() {
  const admin = await prisma.user.findUnique({ where: { phone: '13800000001' } });
  const manager = await prisma.user.findUnique({ where: { phone: '13800000002' } });
  const sales = await prisma.user.findUnique({ where: { phone: '13800000003' } });
  if (!admin || !manager || !sales) {
    console.warn('Users missing; skip rich demo.');
    return;
  }

  const salesId = sales.id;

  await wipeDemoDataset();

  const today = new Date();
  const isoMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const targetExisting = await prisma.salesTarget.findFirst({
    where: {
      period: isoMonth,
      periodType: 'month',
      targetType: 'personal',
      userId: salesId,
    },
  });
  if (!targetExisting) {
    await prisma.salesTarget.create({
      data: {
        period: isoMonth,
        periodType: 'month',
        targetType: 'personal',
        userId: salesId,
        amount: new Prisma.Decimal('800000'),
      },
    });
  }

  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { name: `${DEMO_MARK} 重点` },
      update: {},
      create: { name: `${DEMO_MARK} 重点`, color: '#dc2626', category: 'customer_trait' },
    }),
    prisma.tag.upsert({
      where: { name: `${DEMO_MARK} 长尾` },
      update: {},
      create: { name: `${DEMO_MARK} 长尾`, color: '#6366f1', category: 'customer_trait' },
    }),
  ]);

  const leadsData: Array<{
    companyName: string;
    contactName: string;
    phone: string;
    status: LeadStatus;
    sourceCategory: string;
  }> = [
    {
      companyName: `${DEMO_MARK} 新线索-A公司`,
      contactName: '张三',
      phone: '19990020001',
      status: LeadStatus.new,
      sourceCategory: 'inbound',
    },
    {
      companyName: `${DEMO_MARK} 疑似重复-B公司`,
      contactName: '李四',
      /** 与客户「华强科技」同号，用于线索去重候选 ↔ 客户关联 */
      phone: '19990010001',
      status: LeadStatus.duplicate_suspected,
      sourceCategory: 'referral',
    },
    {
      companyName: `${DEMO_MARK} 无效线索-C`,
      contactName: '王五',
      phone: '19990020003',
      status: LeadStatus.invalid,
      sourceCategory: 'ad',
    },
    {
      companyName: `${DEMO_MARK} 待转化-D公司`,
      contactName: '孙七',
      phone: '19990020004',
      status: LeadStatus.new,
      sourceCategory: 'inbound',
    },
  ];

  const createdLeads = await Promise.all(
    leadsData.map((l) =>
      prisma.lead.create({
        data: {
          companyName: l.companyName,
          contactName: l.contactName,
          phone: l.phone,
          status: l.status,
          sourceCategory: l.sourceCategory,
          sourceDetail: 'website',
          ownerId: salesId,
        },
      }),
    ),
  );

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  async function createConvertedCustomer(
    leadInput: {
      companyName: string;
      contactName: string;
      phone: string;
      email?: string | null;
      sourceCategory: string;
      sourceDetail?: string;
      initialLeadStatus?: LeadStatus;
    },
    customerData: {
      name: string;
      companyName?: string;
      primaryContactName?: string;
      primaryEmail?: string | null;
      level: CustomerLevel;
      status: CustomerStatus;
      region?: string;
      industry?: string;
      duplicateStatus?: DuplicateStatus;
      archivedAt?: Date | null;
      archiveReason?: string | null;
      nextFollowUpAt?: Date | null;
      lastFollowUpAt?: Date | null;
    },
    contactExtra?: { position?: string },
  ) {
    const lead = await prisma.lead.create({
      data: {
        companyName: leadInput.companyName,
        contactName: leadInput.contactName,
        phone: leadInput.phone,
        email: leadInput.email ?? null,
        sourceCategory: leadInput.sourceCategory,
        sourceDetail: leadInput.sourceDetail ?? 'website',
        status: leadInput.initialLeadStatus ?? LeadStatus.new,
        ownerId: salesId,
      },
    });
    const customer = await prisma.customer.create({
      data: {
        name: customerData.name,
        companyName: customerData.companyName ?? leadInput.companyName,
        primaryContactName: customerData.primaryContactName ?? leadInput.contactName,
        primaryPhone: leadInput.phone,
        primaryEmail: customerData.primaryEmail ?? leadInput.email ?? null,
        level: customerData.level,
        status: customerData.status,
        ownerId: salesId,
        sourceLeadId: lead.id,
        sourceCategory: leadInput.sourceCategory,
        sourceDetail: leadInput.sourceDetail ?? null,
        region: customerData.region,
        industry: customerData.industry,
        duplicateStatus: customerData.duplicateStatus ?? DuplicateStatus.none,
        archivedAt: customerData.archivedAt ?? null,
        archiveReason: customerData.archiveReason ?? null,
        nextFollowUpAt: customerData.nextFollowUpAt ?? null,
        lastFollowUpAt: customerData.lastFollowUpAt ?? null,
      },
    });
    const contact = await prisma.contact.create({
      data: {
        customerId: customer.id,
        name: customerData.primaryContactName ?? leadInput.contactName,
        phone: leadInput.phone,
        email: leadInput.email ?? null,
        isPrimary: true,
        ...(contactExtra?.position ? { position: contactExtra.position } : {}),
      },
    });
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: LeadStatus.converted,
        convertedCustomerId: customer.id,
        convertedContactId: contact.id,
        convertedAt: new Date(),
      },
    });
    return { lead, customer, contact };
  }

  const cust1 = await prisma.customer.create({
    data: {
      name: '华强科技',
      companyName: '深圳华强科技有限公司',
      primaryContactName: '陈总',
      primaryPhone: '19990010001',
      primaryEmail: 'demo1@example.com',
      level: CustomerLevel.C,
      status: CustomerStatus.following,
      ownerId: sales.id,
      sourceLeadId: createdLeads[3].id,
      sourceCategory: 'inbound',
      sourceDetail: 'website',
      region: '华南',
      industry: '软件开发',
      nextFollowUpAt: today,
      lastFollowUpAt: twoDaysAgo,
    },
  });

  const { customer: custDupSuspect } = await createConvertedCustomer(
    {
      companyName: `${DEMO_MARK} 线索-重复核实`,
      contactName: '陈某',
      phone: '19990010001',
      email: 'dup-check@example.com',
      sourceCategory: 'inbound',
      initialLeadStatus: LeadStatus.duplicate_suspected,
    },
    {
      name: '重复待核实',
      companyName: '华强科技（重复录入）',
      primaryContactName: '陈某',
      primaryEmail: 'dup-check@example.com',
      level: CustomerLevel.D,
      status: CustomerStatus.following,
      duplicateStatus: DuplicateStatus.suspected,
      region: '华南',
    },
  );

  const { customer: cust2 } = await createConvertedCustomer(
    {
      companyName: `${DEMO_MARK} 线索-云帆医疗`,
      contactName: '刘主任',
      phone: '19990010002',
      sourceCategory: 'referral',
    },
    {
      name: '云帆医疗',
      companyName: '云帆医疗器械有限公司',
      primaryContactName: '刘主任',
      level: CustomerLevel.B,
      status: CustomerStatus.interested,
      region: '华东',
      industry: '医疗健康',
      nextFollowUpAt: nextWeek,
    },
  );

  const { customer: cust3, contact: contact3 } = await createConvertedCustomer(
    {
      companyName: `${DEMO_MARK} 线索-顶峰制造`,
      contactName: '赵工',
      phone: '19990010003',
      sourceCategory: 'ad',
    },
    {
      name: '顶峰制造',
      companyName: '顶峰智能制造',
      primaryContactName: '赵工',
      level: CustomerLevel.A,
      status: CustomerStatus.negotiating,
      region: '华北',
      industry: '制造业',
    },
    { position: '生产部' },
  );

  const { customer: custWon, contact: contactWon } = await createConvertedCustomer(
    {
      companyName: `${DEMO_MARK} 线索-星辰物流`,
      contactName: '周经理',
      phone: '19990010004',
      sourceCategory: 'inbound',
    },
    {
      name: '已成交-星辰物流',
      companyName: '星辰物流集团',
      primaryContactName: '周经理',
      level: CustomerLevel.A,
      status: CustomerStatus.won,
      region: '华东',
    },
    { position: '供应链负责人' },
  );

  const { customer: custLost } = await createConvertedCustomer(
    {
      companyName: `${DEMO_MARK} 线索-远光能源`,
      contactName: '吴总',
      phone: '19990010005',
      sourceCategory: 'social',
    },
    {
      name: '流失-远光能源',
      companyName: '远光能源科技',
      primaryContactName: '吴总',
      level: CustomerLevel.C,
      status: CustomerStatus.lost,
      region: '西部',
    },
  );

  const { customer: custArchived } = await createConvertedCustomer(
    {
      companyName: `${DEMO_MARK} 线索-旧项目归档`,
      contactName: '郑先生',
      phone: '19990010006',
      sourceCategory: 'other',
    },
    {
      name: '已归档客户',
      companyName: '旧项目演示有限公司',
      primaryContactName: '郑先生',
      level: CustomerLevel.D,
      status: CustomerStatus.lost,
      archivedAt: yesterday,
      archiveReason: '演示：长期未响应，归档占位',
    },
  );

  const contact1 = await prisma.contact.create({
    data: {
      customerId: cust1.id,
      name: '陈总',
      phone: '19990010001',
      isPrimary: true,
      position: '总经理',
    },
  });

  await prisma.lead.update({
    where: { id: createdLeads[3].id },
    data: {
      status: LeadStatus.converted,
      convertedCustomerId: cust1.id,
      convertedContactId: contact1.id,
      convertedAt: yesterday,
    },
  });

  await prisma.duplicateCandidate.create({
    data: {
      objectType: 'lead',
      objectId: createdLeads[1].id,
      matchedObjectType: 'customer',
      matchedObjectId: cust1.id,
      matchType: 'phone',
      matchValue: '19990010001',
      createdBy: sales.id,
    },
  });

  await prisma.customerStatusHistory.createMany({
    data: [
      {
        customerId: cust1.id,
        fromStatus: null,
        toStatus: 'following',
        triggerType: 'manual',
        reason: '演示：新建客户',
        changedBy: sales.id,
      },
      {
        customerId: cust2.id,
        fromStatus: 'following',
        toStatus: 'interested',
        triggerType: 'manual',
        reason: '演示：意向升级',
        changedBy: sales.id,
      },
      {
        customerId: custWon.id,
        fromStatus: 'negotiating',
        toStatus: 'won',
        triggerType: 'manual',
        reason: '演示：赢单',
        changedBy: sales.id,
      },
    ],
  });

  await prisma.customerTag.createMany({
    data: [
      { customerId: cust1.id, tagId: tags[0].id, addedById: sales.id },
      { customerId: cust3.id, tagId: tags[0].id, addedById: sales.id },
      { customerId: custWon.id, tagId: tags[1].id, addedById: sales.id },
      { customerId: custDupSuspect.id, tagId: tags[1].id, addedById: sales.id },
    ],
    skipDuplicates: true,
  });

  const productsDemo = await Promise.all([
    prisma.product.create({
      data: {
        name: `${DEMO_MARK} 实施服务人天`,
        code: 'DEMO-P-SVC',
        unit: '人天',
        unitPrice: new Prisma.Decimal('1200'),
        minPrice: new Prisma.Decimal('800'),
        description: '演示用产品',
      },
    }),
    prisma.product.create({
      data: {
        name: `${DEMO_MARK} 软件订阅年费`,
        code: 'DEMO-P-SUB',
        unit: '套',
        unitPrice: new Prisma.Decimal('50000'),
        minPrice: new Prisma.Decimal('45000'),
        description: '演示用订阅',
      },
    }),
  ]);

  const opp1 = await prisma.opportunity.create({
    data: {
      customerId: cust1.id,
      title: `${DEMO_MARK} 华强-年度框架`,
      amount: new Prisma.Decimal('180000'),
      stage: 'initial_contact',
      ownerId: sales.id,
      expectedCloseDate: nextWeek,
    },
  });

  const oppMedical = await prisma.opportunity.create({
    data: {
      customerId: cust2.id,
      title: `${DEMO_MARK} 云帆-设备采购`,
      amount: new Prisma.Decimal('95000'),
      stage: 'needs_analysis',
      ownerId: sales.id,
    },
  });

  const oppNegotiate = await prisma.opportunity.create({
    data: {
      customerId: cust3.id,
      title: `${DEMO_MARK} 顶峰-产线改造`,
      amount: new Prisma.Decimal('420000'),
      stage: 'negotiation',
      ownerId: sales.id,
    },
  });

  const oppWon = await prisma.opportunity.create({
    data: {
      customerId: custWon.id,
      title: `${DEMO_MARK} 星辰-WMS项目`,
      amount: new Prisma.Decimal('240000'),
      stage: 'closed_won',
      ownerId: sales.id,
      closeReason: '演示赢单',
      contractStatus: 'signed',
    },
  });

  await prisma.opportunity.create({
    data: {
      customerId: custLost.id,
      title: `${DEMO_MARK} 远光-储能方案`,
      amount: new Prisma.Decimal('120000'),
      stage: 'closed_lost',
      ownerId: sales.id,
      closeReason: '预算未批',
    },
  });

  const orderTs = Date.now();

  await prisma.order.create({
    data: {
      customerId: cust3.id,
      opportunityId: oppNegotiate.id,
      orderNo: `DEMO-ORD-${orderTs}-pp`,
      amount: new Prisma.Decimal('420000'),
      paidAmount: new Prisma.Decimal('0'),
      status: 'pending_payment',
    },
  });

  await prisma.order.create({
    data: {
      customerId: custWon.id,
      opportunityId: oppWon.id,
      orderNo: `DEMO-ORD-${orderTs}-pd`,
      amount: new Prisma.Decimal('240000'),
      paidAmount: new Prisma.Decimal('240000'),
      status: 'paid',
    },
  });

  await prisma.order.create({
    data: {
      customerId: cust1.id,
      opportunityId: opp1.id,
      orderNo: `DEMO-ORD-${orderTs}-rq`,
      amount: new Prisma.Decimal('50000'),
      paidAmount: new Prisma.Decimal('50000'),
      status: 'refund_requested',
    },
  });

  await prisma.order.create({
    data: {
      customerId: cust2.id,
      opportunityId: oppMedical.id,
      orderNo: `DEMO-ORD-${orderTs}-rf`,
      amount: new Prisma.Decimal('8800'),
      paidAmount: new Prisma.Decimal('0'),
      status: 'refunded',
    },
  });

  const quoteDraft = await prisma.quotation.create({
    data: {
      quoteNo: `DEMO-QT-${orderTs}-drf`,
      opportunityId: opp1.id,
      customerId: cust1.id,
      status: 'draft',
      totalAmount: new Prisma.Decimal('18000'),
      validUntil: nextWeek,
      createdById: sales.id,
      items: {
        create: [
          {
            productId: productsDemo[0].id,
            name: `${DEMO_MARK} 实施服务人天`,
            unit: '人天',
            quantity: new Prisma.Decimal('15'),
            unitPrice: new Prisma.Decimal('1200'),
            discount: new Prisma.Decimal('100'),
            lineTotal: new Prisma.Decimal('18000'),
            sortOrder: 0,
          },
        ],
      },
    },
  });

  const quoteSent = await prisma.quotation.create({
    data: {
      quoteNo: `DEMO-QT-${orderTs}-neg`,
      opportunityId: oppNegotiate.id,
      customerId: cust3.id,
      status: 'sent',
      totalAmount: new Prisma.Decimal('96000'),
      validUntil: nextWeek,
      notes: '演示：已发送，待客户回签',
      createdById: sales.id,
      items: {
        create: [
          {
            productId: productsDemo[0].id,
            name: `${DEMO_MARK} 实施服务人天`,
            unit: '人天',
            quantity: new Prisma.Decimal('80'),
            unitPrice: new Prisma.Decimal('1200'),
            discount: new Prisma.Decimal('100'),
            lineTotal: new Prisma.Decimal('96000'),
            sortOrder: 0,
          },
        ],
      },
    },
  });

  const quoteApproval = await prisma.quotation.create({
    data: {
      quoteNo: `DEMO-QT-${orderTs}-apr`,
      opportunityId: oppMedical.id,
      customerId: cust2.id,
      status: 'draft',
      approvalStatus: 'pending_approval',
      totalAmount: new Prisma.Decimal('40000'),
      validUntil: nextWeek,
      notes: '演示：单价低于商品最低限价，需审批（与商机/客户/商品串联）',
      createdById: sales.id,
      items: {
        create: [
          {
            productId: productsDemo[1].id,
            name: `${DEMO_MARK} 软件订阅年费`,
            unit: '套',
            quantity: new Prisma.Decimal('1'),
            unitPrice: new Prisma.Decimal('40000'),
            discount: new Prisma.Decimal('100'),
            lineTotal: new Prisma.Decimal('40000'),
            sortOrder: 0,
          },
        ],
      },
    },
  });

  await prisma.quotationApproval.create({
    data: { quotationId: quoteApproval.id, requestedBy: sales.id },
  });

  await prisma.contract.create({
    data: {
      opportunityId: oppWon.id,
      customerId: custWon.id,
      contractNo: `DEMO-CT-${orderTs}`,
      title: `${DEMO_MARK} 星辰-WMS 服务合同`,
      amount: new Prisma.Decimal('240000'),
      status: 'active',
      signingDate: twoDaysAgo,
      startDate: yesterday,
      ownerId: sales.id,
      notes: '演示：与赢单商机、付款订单同一客户闭环',
    },
  });

  await prisma.statusRollbackRequest.create({
    data: {
      customerId: cust3.id,
      fromStatus: 'negotiating',
      toStatus: 'interested',
      reason: '演示：客户暂缓采购节奏，申请回退阶段',
      status: 'pending',
      requestedBy: sales.id,
    },
  });

  const demoWorkflowRule = await prisma.workflowRule.create({
    data: {
      name: `${DEMO_MARK} 新客分配到负责人（示例未开启）`,
      description: '演示：条件为空则不会误触发；可在设置里改为开启并配置动作',
      trigger: 'customer.created',
      conditions: [],
      actions: [
        {
          type: 'notify_owner',
          config: { title: '有新客户', message: '演示工作流：新客户已创建，请关注跟进节奏' },
        },
      ],
      isActive: false,
    },
  });

  await prisma.workflowExecution.create({
    data: {
      ruleId: demoWorkflowRule.id,
      triggerEvent: 'customer.created',
      entityType: 'customer',
      entityId: cust1.id.toString(),
      status: 'success',
      errorMessage: null,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: salesId,
        type: 'demo',
        title: `${DEMO_MARK} 今日需回访`,
        body: '演示通知：客户「华强科技」已在首页看板出现，请查看跟进记录。',
        refType: 'customer',
        refId: cust1.id,
        dedupKey: `demo-seed:${orderTs}:sales1`.slice(0, 128),
      },
      {
        userId: manager.id,
        type: 'demo',
        title: `${DEMO_MARK} 报价待审批`,
        body: '演示通知：云帆医疗有一条低于最低价的报价单待您处理。',
        refType: 'quotation',
        refId: quoteApproval.id,
        dedupKey: `demo-seed:${orderTs}:mgr1`.slice(0, 128),
      },
    ],
  });

  const fuBodies = [
    '电话沟通，客户希望下周再看方案。',
    '上门拜访，已确认决策链与预算区间。',
    '演示系统功能，对方对报表模块满意。',
    '跟进合同条款，法务在审。',
    '演示：今日待反馈报价。',
  ];

  for (let i = 0; i < fuBodies.length; i++) {
    const t = new Date(today);
    t.setHours(10 + i, 0, 0, 0);
    t.setDate(t.getDate() - i);
    await prisma.followUpRecord.create({
      data: {
        customerId: cust1.id,
        contactId: contact1.id,
        content: fuBodies[i] ?? '跟进记录',
        followUpTime: t,
        nextFollowUpTime: i === 0 ? nextWeek : null,
        ownerId: salesId,
      },
    });
  }

  await prisma.followUpRecord.create({
    data: {
      customerId: cust3.id,
      contactId: contact3.id,
      content: '视频会议，技术答疑。',
      followUpTime: yesterday,
      ownerId: sales.id,
    },
  });

  await prisma.followUpRecord.create({
    data: {
      customerId: custWon.id,
      contactId: contactWon.id,
      content: '交付启动会已开，演示数据。',
      followUpTime: twoDaysAgo,
      ownerId: sales.id,
    },
  });

  await prisma.businessEvent.createMany({
    data: [
      {
        objectType: 'customer',
        objectId: cust1.id,
        eventType: 'opportunity_created',
        title: '新建商机（演示动态）',
        createdBy: sales.id,
      },
      {
        objectType: 'customer',
        objectId: cust1.id,
        eventType: 'quotation_created',
        title: `新建报价单 ${quoteDraft.quoteNo}（草稿）`,
        detail: { quoteId: quoteDraft.id.toString(), opportunityId: opp1.id.toString() },
        createdBy: sales.id,
      },
      {
        objectType: 'customer',
        objectId: cust3.id,
        eventType: 'quotation_created',
        title: `新建报价单 ${quoteSent.quoteNo}（已发送）`,
        detail: { quoteId: quoteSent.id.toString() },
        createdBy: sales.id,
      },
      {
        objectType: 'customer',
        objectId: custWon.id,
        eventType: 'contract_signed',
        title: `合同已签署：${DEMO_MARK} 星辰-WMS 服务合同`,
        createdBy: sales.id,
      },
      {
        objectType: 'customer',
        objectId: custWon.id,
        eventType: 'order_paid',
        title: '订单已付款（演示）',
        createdBy: admin.id,
      },
      {
        objectType: 'customer',
        objectId: cust3.id,
        eventType: 'status_rollback_requested',
        title: '申请客户阶段回退（演示：待审批）',
        createdBy: sales.id,
      },
    ],
  });

  await prisma.customerCollaborator.create({
    data: {
      customerId: cust1.id,
      userId: manager.id,
      addedById: sales.id,
    },
  });

  console.log(
    `Rich demo data seeded (${DEMO_MARK}). Login as sales 13800000003 / admin 13800000001 — password Crm@2026`,
  );
}

async function main() {
  const passwordHash = await bcrypt.hash('Crm@2026', 10);

  const department = await prisma.department.upsert({
    where: { id: 1n },
    update: {},
    create: { name: '销售部' },
  });

  const admin = await prisma.user.upsert({
    where: { phone: '13800000001' },
    update: {},
    create: {
      name: '管理员',
      phone: '13800000001',
      email: 'admin@crm.local',
      role: UserRole.admin,
      passwordHash,
      departmentId: department.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { phone: '13800000002' },
    update: {},
    create: {
      name: '销售主管',
      phone: '13800000002',
      email: 'manager@crm.local',
      role: UserRole.manager,
      passwordHash,
      departmentId: department.id,
      managerId: admin.id,
    },
  });

  await prisma.user.upsert({
    where: { phone: '13800000003' },
    update: {},
    create: {
      name: '销售员',
      phone: '13800000003',
      email: 'sales@crm.local',
      role: UserRole.sales,
      passwordHash,
      departmentId: department.id,
      managerId: manager.id,
    },
  });

  console.log('Seed users created. Default password: Crm@2026');

  // Seed default lead source categories
  const defaultSources = [
    { category: 'referral', categoryLabel: '转介绍', name: 'employee', label: '员工介绍', sortOrder: 1 },
    { category: 'referral', categoryLabel: '转介绍', name: 'customer', label: '客户介绍', sortOrder: 2 },
    { category: 'referral', categoryLabel: '转介绍', name: 'partner', label: '合作伙伴介绍', sortOrder: 3 },
    { category: 'social', categoryLabel: '社交媒体', name: 'wechat', label: '微信', sortOrder: 1 },
    { category: 'social', categoryLabel: '社交媒体', name: 'weibo', label: '微博', sortOrder: 2 },
    { category: 'social', categoryLabel: '社交媒体', name: 'linkedin', label: 'LinkedIn', sortOrder: 3 },
    { category: 'ad', categoryLabel: '广告投放', name: 'baidu', label: '百度广告', sortOrder: 1 },
    { category: 'ad', categoryLabel: '广告投放', name: 'wechat_ad', label: '微信广告', sortOrder: 2 },
    { category: 'ad', categoryLabel: '广告投放', name: 'douyin', label: '抖音广告', sortOrder: 3 },
    { category: 'exhibition', categoryLabel: '展会', name: 'trade_show', label: '行业展会', sortOrder: 1 },
    { category: 'exhibition', categoryLabel: '展会', name: 'summit', label: '行业峰会', sortOrder: 2 },
    { category: 'inbound', categoryLabel: '主动来访', name: 'website', label: '官网留资', sortOrder: 1 },
    { category: 'inbound', categoryLabel: '主动来访', name: 'phone', label: '电话主动来访', sortOrder: 2 },
    { category: 'other', categoryLabel: '其他', name: 'unknown', label: '未知', sortOrder: 1 },
  ];

  for (const src of defaultSources) {
    const existing = await prisma.leadSourceConfig.findFirst({
      where: { category: src.category, name: src.name },
    });
    if (!existing) {
      await prisma.leadSourceConfig.create({ data: src });
    }
  }
  console.log('Lead source configs seeded.');

  await seedRichDemo();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
