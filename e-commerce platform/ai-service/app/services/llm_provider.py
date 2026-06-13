"""LLM Provider 抽象 · 通过环境变量切换底层实现

环境变量（建议放在 ai-service/.env，启动时 `uvicorn --env-file .env`）：
- LLM_PROVIDER : mock | deepseek | dashscope
- LLM_API_KEY  : 真实 key（mock 无需）
- LLM_MODEL    : 模型名（如 deepseek-chat / qwen-plus）
- LLM_BASE_URL : API 域名（默认指向官方）

业务调用方只需要 chat()，切换 provider 业务代码无感。
"""
from __future__ import annotations

import os

import httpx


def chat(system_prompt: str, history: list[dict[str, str]], user_message: str) -> str:
    """统一入口。返回 LLM 文本回复。"""
    provider = os.environ.get("LLM_PROVIDER", "mock").lower()

    try:
        if provider == "deepseek":
            return _deepseek_chat(system_prompt, history, user_message)
        if provider == "dashscope":
            return _dashscope_chat(system_prompt, history, user_message)
    except httpx.HTTPError as e:
        return f"（{provider} 暂时不可达：{e.__class__.__name__}）已为您转接人工客服。"
    except Exception as e:
        return f"（{provider} 调用异常：{e}）已为您转接人工客服。"

    return _mock_chat(system_prompt, history, user_message)


def _mock_chat(system_prompt: str, history: list[dict[str, str]], user_message: str) -> str:
    """规则模拟回复 — 让 UI 有真实可见的对话效果，无需 LLM 费用。"""
    return (
        f"（mock 模式）我已记下您的需求：「{user_message}」。"
        f" 真实接入 DeepSeek/通义千问后，这里会返回 LLM 生成的回答。"
    )


def _deepseek_chat(system_prompt: str, history: list[dict[str, str]], user_message: str) -> str:
    """调 DeepSeek 官方 API（OpenAI 兼容协议）。"""
    api_key = os.environ.get("LLM_API_KEY")
    if not api_key:
        return "（DeepSeek API key 未配置，请在 ai-service/.env 填 LLM_API_KEY）"

    base_url = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com").rstrip("/")
    model = os.environ.get("LLM_MODEL", "deepseek-chat")

    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    resp = httpx.post(
        f"{base_url}/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": messages,
            "stream": False,
            "temperature": 0.3,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()


def _dashscope_chat(system_prompt: str, history: list[dict[str, str]], user_message: str) -> str:
    """调阿里通义千问（OpenAI 兼容协议入口）。"""
    api_key = os.environ.get("DASHSCOPE_API_KEY") or os.environ.get("LLM_API_KEY")
    if not api_key:
        return "（DASHSCOPE_API_KEY 未配置）"

    model = os.environ.get("DASHSCOPE_MODEL") or os.environ.get("LLM_MODEL", "qwen-plus")
    base_url = "https://dashscope.aliyuncs.com/compatible-mode/v1"

    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    resp = httpx.post(
        f"{base_url}/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": messages,
            "stream": False,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()
