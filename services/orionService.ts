
import { API_CONFIG, Message, OrionResponse } from '../types';

/**
 * 智能递归查找响应文本
 * 能够处理：
 * 1. 标准平铺 JSON: { text_response: "..." }
 * 2. 嵌套数组/对象: [{ output: { content: ... } }]
 * 3. 字符串化的 JSON (截图中的情况): "短信": "{\"text_response\": ...}"
 * 4. 包含 Markdown 代码块的脏 JSON: "```json\n{...}\n```"
 */
const findResponseText = (data: any): string | null => {
  if (!data) return null;

  // 1. 检查当前对象是否直接包含目标字段 (优先级最高)
  if (typeof data === 'object' && data !== null) {
    if (data.text_response && typeof data.text_response === 'string') return data.text_response;
    if (data.output && typeof data.output === 'string') return data.output;
    // 兼容部分 N8N 节点直接返回 'message' 或 'response'
    if (data.response && typeof data.response === 'string') return data.response;
    if (data.message && typeof data.message === 'string') return data.message;
    // 兼容部分 LLM 直接输出 content
    if (data.content && typeof data.content === 'string') return data.content;
  }

  // 2. 字符串处理：尝试从字符串中提取并解析 JSON
  // 这是修复问题的关键：处理被 Markdown 包裹或包含前缀的 JSON 字符串
  if (typeof data === 'string') {
    const trimmed = data.trim();
    
    // 如果字符串看起来包含对象结构
    if (trimmed.includes('{') && trimmed.includes('}')) {
        
        // 尝试 A: 直接解析 (针对干净的 stringified JSON)
        try {
            const parsed = JSON.parse(trimmed);
            const found = findResponseText(parsed); // 递归检查解析后的结果
            if (found) return found;
        } catch (e) {
            // 解析失败，尝试 B 方案
        }

        // 尝试 B: 提取子字符串 (针对 ```json ... ``` 或 'json ... 等情况)
        try {
            const firstBrace = trimmed.indexOf('{');
            const lastBrace = trimmed.lastIndexOf('}');
            
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                const potentialJson = trimmed.substring(firstBrace, lastBrace + 1);
                
                // 只有当提取出的子串和原串不同时才尝试解析，避免重复工作
                if (potentialJson !== trimmed) {
                    const parsedDeep = JSON.parse(potentialJson);
                    const foundDeep = findResponseText(parsedDeep); // 递归检查
                    if (foundDeep) return foundDeep;
                }
            }
        } catch (e) {
            // 依然无法解析，说明可能只是普通文本中包含括号，忽略
        }
    }
    
    // 如果无法解析为 JSON，这里返回 null，继续由外层逻辑遍历其他字段
    return null; 
  }

  // 3. 递归遍历数组
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findResponseText(item);
      if (found) return found;
    }
  } 
  
  // 4. 递归遍历对象的值
  else if (typeof data === 'object' && data !== null) {
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
          // 这里的 data[key] 可能是截图中的 "短信" 字段
          const found = findResponseText(data[key]);
          if (found) return found;
      }
    }
  }

  return null;
};

export const sendMessageToOrion = async (
  text: string, 
  history: Message[]
): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 延长到 90s 超时，防止复杂工作流中断

  try {
    // 构建上下文，排除当前正在发送的这条消息，防止重复
    const previousMessages = history.filter(m => m.content !== text);
    
    const memoryContext = previousMessages.length > 0 
      ? previousMessages
          .filter(m => m.content.trim() !== '') 
          .slice(-10) // 增加上下文长度
          .map(m => `${m.role === 'user' ? 'User' : 'Orion'}: ${m.content}`)
          .join('\n')
      : "当前是对话的开始。"; 

    const basePayload = {
      free_text: text.trim(),
      intent_selection: "自动", 
      memory_context: memoryContext
    };

    console.log("🚀 [Orion] 发送请求:", JSON.stringify(basePayload).slice(0, 100) + "...");

    let response: Response;

    try {
        response = await fetch(API_CONFIG.ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': API_CONFIG.KEY,
                'Accept': 'application/json'
            },
            body: JSON.stringify(basePayload),
            signal: controller.signal,
            mode: 'cors', 
            credentials: 'omit'
        });
    } catch (err: any) {
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
            console.warn("⚠️ [Orion] CORS 拦截或网络错误，尝试降级模式...");
            const fallbackPayload = {
                ...basePayload,
                api_key: API_CONFIG.KEY, 
                x_api_key: API_CONFIG.KEY 
            };
            try {
                 response = await fetch(API_CONFIG.ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(fallbackPayload),
                    signal: controller.signal,
                    mode: 'cors',
                    credentials: 'omit'
                });
            } catch (fallbackErr) {
                throw err;
            }
        } else {
            throw err;
        }
    }

    clearTimeout(timeoutId);

    // 获取原始文本
    const textResult = await response.text();
    let jsonResult: any = null;
    
    // 尝试解析为 JSON
    try {
        jsonResult = JSON.parse(textResult);
    } catch (e) {
        // 无法解析 JSON，后续会当作纯文本尝试处理
    }

    if (!response.ok) {
      console.error(`❌ [Orion] Error ${response.status}:`, textResult);
      if (response.status === 404) {
          throw new Error("连接地址错误 (404)。如果您使用的是测试 URL，请确保 N8N 中已点击'Execute'，或切换到生产 URL。");
      }
      throw new Error(jsonResult?.message || `连接不稳定 (${response.status})`);
    }

    // --- 核心修改：使用智能解析器查找内容 ---
    console.log("📦 [Orion] 收到数据长度:", textResult.length);
    
    // 1. 尝试从 JSON 结构中深层查找
    if (jsonResult) {
        const foundText = findResponseText(jsonResult);
        if (foundText) {
            return foundText;
        }
    }

    // 2. 如果 JSON 解析失败或没找到字段，但 textResult 本身是字符串且不为空
    // 这种情况下，可能 N8N 直接返回了纯文本
    if (textResult && textResult.trim().length > 0 && !jsonResult) {
        return textResult;
    }

    // 3. 如果 JSON 是空的或者无法理解
    console.warn("⚠️ [Orion] 无法从响应中提取有效文本:", jsonResult);
    return "Orion 收到信号，但无法解码内容 (格式解析错误)。";

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("💥 [Orion] Service Error:", error);
    
    if (error.name === 'AbortError') return "Orion 思考超时了 (请检查 N8N 是否卡住)。";
    if (error.name === 'TypeError') return "网络连接似乎断开了。";
    if (error.message.includes("404")) return error.message;
    
    throw error;
  }
};
