<?php

namespace App\Services;

class SampleDemoHtml
{
    public static function make(string $demoId): string
    {
        $safeId = preg_replace('/[^a-zA-Z0-9_-]/', '', $demoId);
        if ($safeId === '') {
            $safeId = 'demo';
        }
        $jsonId = json_encode($safeId, JSON_THROW_ON_ERROR);

        return <<<HTML
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>示例 Demo — {$safeId}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #fff; color: #000; }
    header { padding: 16px 20px; border-bottom: 1px solid #000; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .pill { padding: 10px 14px; border-radius: 999px; border: 1px solid #000; background: #efefef; cursor: pointer; font: 500 14px system-ui; }
    .pill.active { background: #000; color: #fff; }
    main { padding: 24px 20px; max-width: 720px; }
    h1 { margin: 0 0 12px; font-size: 28px; }
    p { margin: 0; color: #4b4b4b; line-height: 1.5; }
    .tag { font-size: 12px; color: #afafaf; margin-top: 16px; }
    code { background: #efefef; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <header>
    <span style="font-weight:700;font-size:14px;">{$safeId}</span>
    <button type="button" class="pill active" data-page="home">首页</button>
    <button type="button" class="pill" data-page="detail">详情</button>
    <button type="button" class="pill" data-page="checkout">结算</button>
  </header>
  <main id="panel-home">
    <h1>首页</h1>
    <p>这是离线示例 HTML，用于验证 iframe 与 <code>postMessage</code> 协议。</p>
    <p class="tag">切换顶部 Tab 会向父页面发送 <code>DEMO_PAGE_CHANGE</code>。</p>
  </main>
  <main id="panel-detail" hidden>
    <h1>详情页</h1>
    <p>当前 <code>pageKey</code> 为 <strong>detail</strong>（示例）。</p>
  </main>
  <main id="panel-checkout" hidden>
    <h1>结算</h1>
    <p>演示多页状态；不调用真实接口。</p>
  </main>
  <script>
(function () {
  var demoId = {$jsonId};
  function post(type, payload) {
    try {
      window.parent.postMessage(Object.assign({ type: type }, payload), "*");
    } catch (e) {}
  }
  function setPage(pageKey, silent) {
    ["home", "detail", "checkout"].forEach(function (key) {
      var el = document.getElementById("panel-" + key);
      if (el) el.hidden = key !== pageKey;
    });
    document.querySelectorAll("[data-page]").forEach(function (btn) {
      var k = btn.getAttribute("data-page");
      btn.classList.toggle("active", k === pageKey);
    });
    if (!silent) {
      post("DEMO_PAGE_CHANGE", { pageKey: pageKey, demoId: demoId });
    }
  }
  document.querySelectorAll("[data-page]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setPage(btn.getAttribute("data-page"), false);
    });
  });
  setPage("home", true);
  post("DEMO_READY", { pageKey: "home", demoId: demoId });
})();
  </script>
</body>
</html>
HTML;
    }
}
