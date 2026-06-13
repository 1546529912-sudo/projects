<!DOCTYPE html>
<html lang="zh-CN" translate="no">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    {{-- 避免 Chrome 等「整页翻译」改掉 Alpine 动态节点，表现为 pin/按钮变成外文或错乱 --}}
    <meta name="google" content="notranslate">
    <title>@yield('title', 'AI Demo 工作台') — {{ config('app.name') }}</title>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/dist/cdn.min.js"></script>
    <style>
      :root { --black: #000; --white: #fff; --gray: #4b4b4b; --muted: #afafaf; --chip: #efefef; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--white); color: var(--black); min-height: 100vh; display: flex; flex-direction: column; }
    </style>
    @stack('styles')
</head>
<body>
    @yield('content')
    @stack('scripts')
</body>
</html>
