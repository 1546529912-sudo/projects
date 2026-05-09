# 错误处理方法 — CRM项目

## 适用场景
开发Agent在编写前后端代码时，统一处理各类错误场景。

---

## 错误分类

| 类型 | 来源 | 处理层 |
|---|---|---|
| 网络错误 | 请求超时、断网 | 前端统一拦截 |
| 认证错误 | token过期、未登录 | 前端统一拦截 |
| 权限错误 | 无权访问 | 前端统一拦截 |
| 业务错误 | 参数错误、数据冲突 | 各页面/组件处理 |
| 服务器错误 | 后端500 | 前端统一拦截 |
| 输入校验错误 | 表单填写错误 | 表单组件处理 |

---

## 前端错误处理规范

### 一、HTTP拦截器（全局处理）

在 axios/fetch 拦截器中统一处理以下情况：

```javascript
// 响应拦截器处理逻辑（伪代码，按实际框架实现）

// 401 未登录或token过期
if (status === 401) {
  clearLocalToken()
  redirectToLogin()
  return
}

// 403 无权限
if (status === 403) {
  showMessage('error', '您没有权限执行此操作')
  return
}

// 500 服务器错误
if (status >= 500) {
  showMessage('error', '服务器繁忙，请稍后重试')
  return
}

// 网络超时
if (error.code === 'ECONNABORTED') {
  showMessage('error', '请求超时，请检查网络后重试')
  return
}
```

### 二、业务错误处理（各页面处理）

业务错误从响应的 `code` 字段判断，不依赖 HTTP 状态码：

```javascript
// 示例：新建客户
async function createCustomer(data) {
  try {
    const result = await api.post('/customers', data)
    if (result.code === 0) {
      showMessage('success', '客户创建成功')
      router.push('/customers')
    } else if (result.code === 20002) {
      showMessage('error', '该客户名称已存在，请检查')
    } else {
      showMessage('error', result.message || '操作失败')
    }
  } catch (error) {
    // 网络层错误已在拦截器处理，这里不需要重复处理
  }
}
```

### 三、表单校验错误处理

- 提交时统一触发校验，不做实时校验（减少干扰）
- 错误提示显示在对应字段下方，字体12px红色
- 如果后端返回字段级错误（`errors` 数组），将错误绑定到对应字段

```javascript
// 后端返回字段级错误时
if (result.errors && result.errors.length > 0) {
  result.errors.forEach(err => {
    formErrors[err.field] = err.message
  })
}
```

### 四、Toast/Message 规范

- **成功**：绿色，3秒后自动消失，文字简短（"保存成功"）
- **失败**：红色，5秒后自动消失，说明具体原因（"客户名称已存在"）
- **警告**：黄色，4秒后自动消失
- **禁止**：alert() / confirm()，一律使用UI组件
- **禁止**：同时弹出多个相同内容的toast

### 五、加载状态处理

```javascript
// 每个异步操作必须有loading状态
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try {
    const data = await api.get('/customers')
    // 处理数据
  } catch (error) {
    // 拦截器已处理，这里可忽略
  } finally {
    loading.value = false  // finally确保loading一定会关闭
  }
}
```

---

## 后端错误处理规范

### 一、错误响应格式

所有错误必须返回统一格式（参见 api_design.md）：

```json
{
  "code": 20002,
  "message": "客户名称已存在",
  "data": null
}
```

**规则：**
- message 必须是用户可读的中文描述
- 不在 message 中暴露技术细节（不写"SQLException: Duplicate entry..."）

### 二、全局异常处理

使用全局异常处理中间件统一捕获未处理的异常：

```javascript
// 伪代码，按实际后端框架实现
app.use((err, req, res, next) => {
  // 业务异常（主动抛出的）
  if (err instanceof BusinessError) {
    return res.status(422).json({
      code: err.code,
      message: err.message,
      data: null
    })
  }

  // 数据库唯一键冲突
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      code: 20002,
      message: '数据已存在，请勿重复提交',
      data: null
    })
  }

  // 未知错误
  console.error('[INTERNAL ERROR]', err)  // 记录完整错误信息到日志
  return res.status(500).json({
    code: 50001,
    message: '服务器内部错误，请稍后重试',
    data: null
  })
})
```

### 三、参数校验

- 在路由处理函数的最开始做参数校验
- 校验不通过立即返回，不进入业务逻辑
- 使用校验库（如 Joi、Zod、express-validator）

```javascript
// 参数校验示例
function validateCreateCustomer(body) {
  const errors = []
  if (!body.name || body.name.trim() === '') {
    errors.push({ field: 'name', message: '客户名称不能为空' })
  }
  if (body.phone && !/^1[3-9]\d{9}$/.test(body.phone)) {
    errors.push({ field: 'phone', message: '手机号格式不正确' })
  }
  return errors
}
```

### 四、数据库操作错误处理

- 数据库操作必须在 try/catch 内
- 捕获到错误后，记录日志（包含SQL和参数），向上抛出业务异常
- 禁止直接将数据库错误信息返回给前端

### 五、日志记录规范

```
错误日志必须包含：
  - 时间戳
  - 请求ID（用于追踪）
  - 用户ID
  - 请求路径和方法
  - 错误信息和堆栈

禁止记录到日志的内容：
  - 用户密码
  - 完整的Authorization token
  - 身份证号等敏感信息
```

---

## 常见错误场景处理清单

| 场景 | 前端处理 | 后端处理 |
|---|---|---|
| 删除后刷新列表 | 直接刷新，不需要提示（已有成功toast） | 软删除，返回204 |
| 表单重复提交 | 提交中禁用按钮 | 幂等校验或唯一键约束 |
| 并发修改同一数据 | 提示"数据已被他人修改，请刷新后重试" | 乐观锁（updated_at校验）|
| 上传文件过大 | 前端预校验文件大小，超限提示 | 后端也做大小限制 |
| 搜索无结果 | 显示"未找到匹配的结果" | 返回空列表，不是404 |
| 权限不足访问页面 | 路由守卫跳转403页面 | 接口返回403 |
