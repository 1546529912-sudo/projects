# shop-miniprogram

原生微信小程序。Phase 1 仅含首页 + 商品列表两页。

## 启动方式
1. 安装微信开发者工具
2. 打开本目录 `apps/shop-miniprogram/`
3. AppID 填占位（`wx_PLACEHOLDER_APPID`），勾选"测试号"或"不校验合法域名"
4. 默认配置请求 `http://localhost:8001`（shop-backend）
5. 编译运行

## 端到端联通验证
1. 确保 `docker-compose up` 后 shop-backend / pim-backend 都已起来
2. 进入首页，应自动调用 `GET http://localhost:8001/api/v1/product/list`
3. shop-backend 内部转发到 `pim-backend`
4. 首页应展示 seed 数据中的 3 个 SPU（iPhone 15 Pro / Mate 60 Pro / 示例 T 恤）
5. 底部应显示来源："shop-backend → pim-backend"

## 目录
```
pages/
├── home/index.{js,wxml,wxss,json}   ← 首页
└── list/index.{js,wxml,wxss,json}   ← 商品列表
apis/index.js   ← 业务接口
utils/request.js  ← 网络封装
app.{js,wxss,json}  ← 入口
sitemap.json / project.config.json
```

## 注意
- 本环境无法实际加载/运行小程序，验证步骤交给用户
- AppID 是占位符，真实小程序发布需要替换
- 开发模式必须勾选"不校验合法域名"才能访问 localhost
