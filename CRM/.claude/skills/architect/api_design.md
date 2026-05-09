# 接口设计方法 — CRM项目

## 适用场景
架构Agent设计RESTful API接口时使用。

---

## 设计原则

1. **RESTful风格**：资源用名词复数，动作用HTTP方法
2. **统一响应格式**：所有接口返回格式一致
3. **错误码语义明确**：错误码和消息必须能让前端直接展示或处理
4. **版本化**：所有接口路径带版本号 `/api/v1/`

---

## URL命名规范

```
GET    /api/v1/{资源}           # 列表
POST   /api/v1/{资源}           # 新建
GET    /api/v1/{资源}/{id}      # 详情
PUT    /api/v1/{资源}/{id}      # 全量更新
PATCH  /api/v1/{资源}/{id}      # 部分更新
DELETE /api/v1/{资源}/{id}      # 删除

# 子资源
GET    /api/v1/customers/{id}/contacts        # 客户的联系人列表
POST   /api/v1/customers/{id}/follow-ups      # 新增跟进记录

# 非CRUD操作用动词
POST   /api/v1/customers/{id}/assign          # 分配负责人
POST   /api/v1/opportunities/{id}/close-won   # 标记成交
POST   /api/v1/opportunities/{id}/close-lost  # 标记失单
```

---

## 统一响应格式

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    // 实际数据
  }
}
```

### 列表响应（带分页）

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 156,
      "total_pages": 8
    }
  }
}
```

### 错误响应

```json
{
  "code": 40001,
  "message": "客户名称不能为空",
  "data": null,
  "errors": [
    { "field": "name", "message": "不能为空" }
  ]
}
```

---

## 错误码规范

```
# HTTP状态码使用规则
200  成功
201  创建成功
204  删除成功（无body）
400  请求参数错误
401  未登录
403  无权限
404  资源不存在
409  冲突（如：数据重复）
422  业务逻辑错误（参数格式对但业务不允许）
500  服务器内部错误

# 业务错误码（code字段）
0        成功
10001    token无效或已过期
10002    无权限访问该资源
20001    客户不存在
20002    客户名称已存在（重复）
20003    客户已被他人分配，无权操作
30001    商机不存在
30002    商机已关闭，不能修改
40001    参数缺失
40002    参数格式错误
50001    服务器内部错误
```

---

## CRM核心接口清单

### 认证接口

```
POST   /api/v1/auth/login          # 登录
POST   /api/v1/auth/logout         # 登出
POST   /api/v1/auth/refresh-token  # 刷新token
GET    /api/v1/auth/me             # 获取当前用户信息
```

### 客户管理

```
GET    /api/v1/customers           # 客户列表（支持分页、筛选、搜索）
POST   /api/v1/customers           # 新建客户
GET    /api/v1/customers/{id}      # 客户详情
PATCH  /api/v1/customers/{id}      # 更新客户信息
DELETE /api/v1/customers/{id}      # 删除（软删除）
POST   /api/v1/customers/{id}/assign  # 分配负责人

GET    /api/v1/customers/{id}/contacts    # 联系人列表
POST   /api/v1/customers/{id}/contacts   # 新增联系人
PATCH  /api/v1/customers/{id}/contacts/{cid}  # 更新联系人
DELETE /api/v1/customers/{id}/contacts/{cid}  # 删除联系人
```

### 跟进记录

```
GET    /api/v1/customers/{id}/follow-ups   # 客户的跟进记录列表
POST   /api/v1/customers/{id}/follow-ups   # 新增跟进记录
GET    /api/v1/follow-ups                  # 全局跟进记录列表（我的/全部）
PATCH  /api/v1/follow-ups/{id}             # 更新跟进记录
DELETE /api/v1/follow-ups/{id}             # 删除跟进记录
```

### 销售管理（商机）

```
GET    /api/v1/opportunities               # 商机列表
POST   /api/v1/opportunities               # 新建商机
GET    /api/v1/opportunities/{id}          # 商机详情
PATCH  /api/v1/opportunities/{id}          # 更新商机
DELETE /api/v1/opportunities/{id}          # 删除商机
POST   /api/v1/opportunities/{id}/close-won   # 标记成交
POST   /api/v1/opportunities/{id}/close-lost  # 标记失单
PATCH  /api/v1/opportunities/{id}/stage       # 推进阶段
```

### 数据报表

```
GET    /api/v1/reports/customer-stats      # 客户统计（总数、本月新增、各状态分布）
GET    /api/v1/reports/follow-up-stats     # 跟进活动统计
GET    /api/v1/reports/sales-funnel        # 销售漏斗数据
GET    /api/v1/reports/performance         # 业绩统计（个人/团队）
```

### 系统设置

```
GET    /api/v1/users                       # 用户列表
POST   /api/v1/users                       # 新增用户
PATCH  /api/v1/users/{id}                  # 更新用户
DELETE /api/v1/users/{id}                  # 禁用用户

GET    /api/v1/roles                       # 角色列表
GET    /api/v1/custom-fields               # 自定义字段列表
POST   /api/v1/custom-fields               # 新增自定义字段
PATCH  /api/v1/custom-fields/{id}          # 更新自定义字段
DELETE /api/v1/custom-fields/{id}          # 删除自定义字段
```

---

## 请求参数规范

### 列表接口通用参数

```
page        INT     第几页，默认1
page_size   INT     每页条数，默认20，最大100
keyword     STRING  关键词搜索
order_by    STRING  排序字段，如：created_at
order_dir   STRING  排序方向：asc/desc，默认desc
```

### 客户列表特有筛选参数

```
status      STRING  客户状态
level       STRING  客户等级
owner_id    INT     负责人ID
industry    STRING  行业
source      STRING  来源
date_from   DATE    创建时间起（格式：2024-01-01）
date_to     DATE    创建时间止
```

---

## 接口设计输出格式

架构Agent输出每个接口时，必须包含：

```
接口名称：
Method + Path：
描述：（一句话）
权限要求：（哪些角色可以访问）

请求参数：
  - 参数名 / 类型 / 必填 / 说明

成功响应示例：（JSON）

错误响应示例：（JSON，至少列一种错误场景）
```

---

## 接口设计检查清单
- [ ] 所有接口路径包含 `/api/v1/`
- [ ] 使用RESTful HTTP方法，不用动词URL（除非确实是操作）
- [ ] 响应格式符合统一格式规范
- [ ] 错误码已定义并说明含义
- [ ] 权限要求已说明（哪些角色可访问）
- [ ] 分页参数已包含
- [ ] 敏感字段（密码等）不在响应中返回
