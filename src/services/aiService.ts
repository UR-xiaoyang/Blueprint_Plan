import { Plan, Task } from '../App';

// 生成 UUID (复用)
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const stripJsonWrapper = (raw: string) => {
  return String(raw ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/```(?:json)?\s*|\s*```/g, '')
    .trim();
};

const extractFirstJsonObject = (raw: string) => {
  const s = stripJsonWrapper(raw);
  const start = s.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
};

const parseJsonObject = (raw: string) => {
  const extracted = extractFirstJsonObject(raw);
  if (!extracted) throw new Error('No JSON object found in response');

  const withoutLineComments = extracted.replace(/^\s*\/\/.*$/gm, '');
  const withoutBlockComments = withoutLineComments.replace(/\/\*[\s\S]*?\*\//g, '');
  const noTrailingCommas = withoutBlockComments.replace(/,\s*([}\]])/g, '$1');

  return JSON.parse(noTrailingCommas);
};

export interface AIPlanRequest {
  goal: string;
  duration?: string; // e.g., "1 month", "2 weeks"
  intensity?: 'low' | 'medium' | 'high';
}

export interface AIProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider?: string;
}

export interface AIConfig {
  provider: 'openai' | 'custom' | 'ollama' | 'openrouter';
  openai: AIProviderConfig;
  ollama: AIProviderConfig;
  openrouter: AIProviderConfig;
  custom: AIProviderConfig;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'ollama',
  openai: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo'
  },
  ollama: {
    apiKey: '',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3'
  },
  openrouter: {
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-3.5-turbo'
  },
  custom: {
    apiKey: '',
    baseUrl: '',
    model: ''
  }
};

const CONFIG_KEY = 'ai_service_config';

export const aiService = {
  getConfig: (): AIConfig => {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migration logic: if old config format (flat), migrate to new structure
        if ('apiKey' in parsed && !('openai' in parsed)) {
           const migrated: AIConfig = {
             ...DEFAULT_CONFIG,
             provider: parsed.provider === 'ollama' || parsed.provider === 'openai' || parsed.provider === 'custom' ? parsed.provider : DEFAULT_CONFIG.provider,
             openai: { ...DEFAULT_CONFIG.openai, apiKey: parsed.apiKey || '', baseUrl: parsed.baseUrl || DEFAULT_CONFIG.openai.baseUrl, model: parsed.model || DEFAULT_CONFIG.openai.model }
           };
           return migrated;
        }
        // Deep merge to ensure all fields exist
        const merged: AIConfig = {
          ...DEFAULT_CONFIG,
          ...parsed,
          openai: { ...DEFAULT_CONFIG.openai, ...(parsed.openai || {}), },
          ollama: { ...DEFAULT_CONFIG.ollama, ...(parsed.ollama || {}), },
          openrouter: { ...DEFAULT_CONFIG.openrouter, ...(parsed.openrouter || {}), },
          custom: { ...DEFAULT_CONFIG.custom, ...(parsed.custom || {}), },
        };
        if (merged.provider !== 'openai' && merged.provider !== 'custom' && merged.provider !== 'ollama' && merged.provider !== 'openrouter') {
          merged.provider = DEFAULT_CONFIG.provider;
        }
        return merged;
      }
    } catch (e) {
      console.error('Failed to load AI config', e);
    }
    return DEFAULT_CONFIG;
  },

  saveConfig: (config: AIConfig) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  },

  /**
   * Helper to get active provider config
   */
  getActiveConfig: (config: AIConfig): AIProviderConfig & { provider: string } => {
    const provider = config.provider;
    return { ...config[provider], provider };
  },

  /**
   * 获取模型列表
   */
  fetchModels: async (provider: string): Promise<{id: string, name: string}[]> => {
    if (provider === 'openrouter') {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (!response.ok) return [];
        const data = await response.json();
        if (data && Array.isArray(data.data)) {
          return data.data.map((m: any) => ({ id: m.id, name: m.name || m.id }));
        }
        return [];
      } catch (e) {
        console.error('Fetch models failed', e);
        return [];
      }
    }
    return [];
  },

  /**
   * 生成计划
   */
  generatePlan: async (request: AIPlanRequest, onStream?: (content: string) => void): Promise<Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'progress'>> => {
    const config = aiService.getConfig();
    const activeConfig = aiService.getActiveConfig(config);

    if (config.provider !== 'ollama' && !activeConfig.apiKey) {
      const msg = '请先在设置中配置 AI 服务（API Key）。';
      if (window.appDialog?.alert) await window.appDialog.alert(msg);
      throw new Error(msg);
    }

    try {
      return await generatePlanWithLLM(request, activeConfig, onStream);
    } catch (error) {
      console.error('LLM generation failed:', error);
      const msg = 'AI 生成失败。错误信息: ' + (error instanceof Error ? error.message : String(error));
      if (window.appDialog?.alert) await window.appDialog.alert(msg);
      throw error;
    }
  },

  /**
   * 修改计划
   */
  modifyPlan: async (
    currentPlan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'progress'>,
    instruction: string,
    onAssistantContent?: (content: string) => void
  ): Promise<Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'progress'>> => {
    const config = aiService.getConfig();
    const activeConfig = aiService.getActiveConfig(config);

    if (config.provider !== 'ollama' && !activeConfig.apiKey) {
      const msg = '请先在设置中配置 AI 服务（API Key）。';
      if (window.appDialog?.alert) await window.appDialog.alert(msg);
      throw new Error(msg);
    }

    try {
      return await modifyPlanWithLLM(currentPlan, instruction, activeConfig, onAssistantContent);
    } catch (error) {
      console.error('LLM modification failed:', error);
      const msg = 'AI 修改失败。错误信息: ' + (error instanceof Error ? error.message : String(error));
      if (window.appDialog?.alert) await window.appDialog.alert(msg);
      throw error;
    }
  }
};

async function modifyPlanWithLLM(
  currentPlan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'progress'>,
  instruction: string,
  config: AIProviderConfig,
  onAssistantContent?: (content: string) => void
): Promise<Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'progress'>> {
  const isStageHeadingTitle = (title: unknown) => {
    const t = String(title ?? '').trim();
    if (!t) return false;
    if (/^(执行\s*)?阶段\s*[-—:：]?\s*第[一二三四五六七八九十\d]+\s*阶段/.test(t)) return true;
    if (/^第[一二三四五六七八九十\d]+\s*阶段/.test(t)) return true;
    if (/^phase\s*\d+/i.test(t)) return true;
    return false;
  };

  const normalizePlanForCompare = (plan: { title: any; description: any; tasks: any[] }) => {
    return JSON.stringify({
      title: plan.title ?? '',
      description: plan.description ?? '',
      tasks: Array.isArray(plan.tasks)
        ? plan.tasks.map(t => ({
            id: t?.id ?? '', // Include ID in comparison
            title: t?.title ?? '',
            description: t?.description ?? '',
            startDate: t?.startDate ?? '',
            dueDate: t?.dueDate ?? ''
          }))
        : []
    });
  };

  const prompt = `
你是一个专业的项目规划助手。用户希望修改现有的项目计划。
请根据用户的修改指令，更新计划的 JSON 数据。

当前计划 JSON:
${JSON.stringify({
  title: currentPlan.title,
  description: currentPlan.description,
  tasks: currentPlan.tasks.map(t => ({
    id: t.id, // Include ID
    title: t.title,
    description: t.description,
    startDate: t.startDate,
    dueDate: t.dueDate
  }))
}, null, 2)}

用户修改指令: ${instruction}

请返回更新后的完整 JSON 格式。
重要规则：
1. 仅返回合法的 JSON 字符串，不要包含 Markdown 代码块标记（如 \`\`\`json）。
2. 不要包含任何解释性文字。
3. JSON 结构必须包含: title (字符串), description (字符串), tasks (数组)。
4. tasks 数组中的每个对象必须包含: id (字符串), title, description, startDate (YYYY-MM-DD), dueDate (YYYY-MM-DD)。
   - **修改任务时**：必须保留原任务的 id 字段值，直接修改 title/description/date 等内容。
   - **新增任务时**：id 字段必须设为 null。
   - **删除任务时**：直接从 tasks 数组中移除该对象。
   - **严禁**：不要为了修改一个任务而创建一个新任务（id: null）并同时保留旧任务。
5. 请确保根据用户的指令修改了相应的内容。
6. 如果指令较抽象，请至少改动 description 或某个 task.description 来体现修改结果。
7. 返回的 JSON 必须与“当前计划 JSON”不同，不能原样照抄。
8. tasks 仅包含可执行的具体任务，不要把“第一阶段/第二阶段/Phase 1”等阶段标题当作任务。
`;

  let baseUrl = config.baseUrl?.replace(/\/+$/, '') || 'https://api.openai.com/v1';
  if (config.provider === 'ollama' && !baseUrl.endsWith('/v1')) {
    baseUrl += '/v1';
  }

  const requestContent = async (extraMessages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    };

    if (config.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'http://localhost:3000';
      headers['X-Title'] = 'Blueprint Plan';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that modifies JSON project plans. You must respond with valid JSON only.' },
          { role: 'user', content: prompt },
          ...(extraMessages || [])
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in response');
    return content;
  };

  const inputComparable = normalizePlanForCompare({
    title: currentPlan.title,
    description: currentPlan.description,
    tasks: currentPlan.tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      startDate: t.startDate,
      dueDate: t.dueDate
    }))
  });

  let content = await requestContent();
  if (onAssistantContent) onAssistantContent(`AI 返回：\n${content}`);

  let planData: any;
  try {
    planData = parseJsonObject(content);
  } catch (e) {
    console.error('JSON Parse Error:', content);
    throw new Error('Failed to parse AI response as JSON. Raw response: ' + content.substring(0, 100) + '...');
  }

  const outputComparable = normalizePlanForCompare(planData);
  if (outputComparable === inputComparable) {
    const retryPrompt = `你的上一次回答与“当前计划 JSON”完全相同，属于无效回答。现在必须根据“用户修改指令”对 JSON 做出改动，并返回更新后的完整 JSON。`;
    content = await requestContent([{ role: 'user', content: retryPrompt }]);
    if (onAssistantContent) onAssistantContent(`AI 返回（重试）：\n${content}`);
    try {
      planData = parseJsonObject(content);
    } catch (e) {
      console.error('JSON Parse Error:', content);
      throw new Error('Failed to parse AI response as JSON. Raw response: ' + content.substring(0, 100) + '...');
    }

    const retryComparable = normalizePlanForCompare(planData);
    if (retryComparable === inputComparable) {
      const fallbackPlanData = {
        title: planData.title || currentPlan.title,
        description:
          planData.description && planData.description !== currentPlan.description
            ? planData.description
            : `${currentPlan.description}\n\n已应用修改指令：${instruction}`,
        tasks: Array.isArray(planData.tasks) ? planData.tasks : currentPlan.tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          startDate: t.startDate,
          dueDate: t.dueDate
        }))
      };
      if (Array.isArray(fallbackPlanData.tasks) && fallbackPlanData.tasks.length > 0) {
        const t0 = fallbackPlanData.tasks[0];
        fallbackPlanData.tasks[0] = {
          ...t0,
          description: t0?.description ? `${t0.description}\n\n已应用修改指令：${instruction}` : `已应用修改指令：${instruction}`
        };
      }
      planData = fallbackPlanData;
      if (onAssistantContent) onAssistantContent('已启用兜底修改：AI 多次返回无变化结果。');
    }
  }

  // 转换 tasks 为 Task 对象格式 (保留 ID 如果没有变化，新任务生成 ID)
  // 这里简化处理，直接重新映射，实际可能需要更复杂的 diff 逻辑，但对于简单的 AI 生成，全部重生成也可以
  const rawTasks = Array.isArray(planData.tasks) ? planData.tasks : [];
  const filteredTasks = rawTasks.filter((t: any) => !isStageHeadingTitle(t?.title));

  const finalTasks: Task[] = filteredTasks.map((t: any) => {
    // Try to find existing task by ID
    const taskId = t.id ? String(t.id).trim() : null;
    const isValidId = taskId && taskId.toLowerCase() !== 'null' && taskId.toLowerCase() !== 'undefined';
    
    const existingTask = isValidId ? currentPlan.tasks.find(ct => ct.id === taskId) : undefined;

    if (existingTask) {
      return {
        ...existingTask,
        title: t.title || existingTask.title,
        description: t.description || existingTask.description,
        startDate: t.startDate || existingTask.startDate,
        dueDate: t.dueDate || existingTask.dueDate,
        updatedAt: new Date().toISOString()
      };
    } else {
      return {
        id: generateUUID(),
        planId: '',
        title: t.title || '未命名任务',
        description: t.description || '',
        status: 'todo',
        priority: 'medium',
        startDate: t.startDate,
        dueDate: t.dueDate,
        logs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  });

  return {
    title: planData.title || currentPlan.title,
    description: planData.description || currentPlan.description,
    status: currentPlan.status,
    startDate: currentPlan.startDate,
    endDate: currentPlan.endDate, // 这里应该重新计算，但简化起见暂且保留或由外部更新
    tasks: finalTasks
  };
}

async function generatePlanWithLLM(request: AIPlanRequest, config: AIProviderConfig, onStream?: (content: string) => void): Promise<Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'progress'>> {
  const isStageHeadingTitle = (title: unknown) => {
    const t = String(title ?? '').trim();
    if (!t) return false;
    if (/^(执行\s*)?阶段\s*[-—:：]?\s*第[一二三四五六七八九十\d]+\s*阶段/.test(t)) return true;
    if (/^第[一二三四五六七八九十\d]+\s*阶段/.test(t)) return true;
    if (/^phase\s*\d+/i.test(t)) return true;
    return false;
  };

  const prompt = `
你是一个专业的项目规划助手。请根据用户的目标生成一个详细的执行计划。
目标: ${request.goal}
时长: ${request.duration || '默认'}
强度: ${request.intensity || '适中'}

请返回一个标准的 JSON 格式。
重要规则：
1. 仅返回合法的 JSON 字符串，不要包含 Markdown 代码块标记（如 \`\`\`json）。
2. 不要包含任何解释性文字。
3. JSON 结构如下：
{
  "title": "计划标题",
  "description": "计划简短描述",
  "tasks": [
    {
      "title": "任务标题",
      "description": "任务详细说明",
      "daysOffset": 0, // 距离开始日期的天数偏移
      "duration": 1 // 任务持续天数
    }
  ]
}
4. tasks 仅包含可执行的具体任务，不要把“第一阶段/第二阶段/Phase 1”等阶段标题当作任务。
确保任务步骤合理，循序渐进。
`;

  let baseUrl = config.baseUrl?.replace(/\/+$/, '') || 'https://api.openai.com/v1';
  if (config.provider === 'ollama' && !baseUrl.endsWith('/v1')) {
    baseUrl += '/v1';
  }

  const requestOnce = async (stream: boolean) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    };

    if (config.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'http://localhost:3000';
      headers['X-Title'] = 'Blueprint Plan';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates JSON project plans. You must respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error: ${response.status} ${errText}`);
    }

    if (!stream) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (!content) throw new Error('No content in response');
      return content;
    }

    if (!response.body) throw new Error('No streaming body in response');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') continue;
        try {
          const data = JSON.parse(dataStr);
          const delta = data.choices?.[0]?.delta?.content || '';
          if (delta) {
            content += delta;
            onStream?.(delta);
          }
        } catch {}
      }
    }

    return content;
  };

  const content = await requestOnce(!!onStream);
  if (!content) throw new Error('No content received from AI');

  let planData: any;
  try {
    planData = parseJsonObject(content);
  } catch (e) {
    if (onStream) {
      const fullContent = await requestOnce(false);
      try {
        planData = parseJsonObject(fullContent);
      } catch (_) {
        console.error('JSON Parse Error:', fullContent);
        throw new Error('Failed to parse AI response as JSON. Raw response: ' + fullContent.substring(0, 100) + '...');
      }
    } else {
      console.error('JSON Parse Error:', content);
      throw new Error('Failed to parse AI response as JSON. Raw response: ' + content.substring(0, 100) + '...');
    }
  }

  // 转换数据格式
  const now = new Date();
  const startDate = now.toISOString().split('T')[0];
  
  // 计算 endDate
  let maxDays = 0;
  if (Array.isArray(planData.tasks)) {
     planData.tasks.forEach((t: any) => {
        const endDay = (t.daysOffset || 0) + (t.duration || 1);
        if (endDay > maxDays) maxDays = endDay;
     });
  }
  const endDateObj = new Date(now);
  endDateObj.setDate(now.getDate() + maxDays);
  const endDate = endDateObj.toISOString().split('T')[0];

  const rawTasks = Array.isArray(planData.tasks) ? planData.tasks : [];
  const filteredTasks = rawTasks.filter((t: any) => !isStageHeadingTitle(t?.title));

  const finalTasks: Task[] = filteredTasks.map((t: any) => {
    const taskStart = new Date(now);
    taskStart.setDate(now.getDate() + (t.daysOffset || 0));
    const taskDue = new Date(taskStart);
    taskDue.setDate(taskStart.getDate() + (t.duration || 1));

    return {
      id: generateUUID(),
      planId: '',
      title: t.title || '未命名任务',
      description: t.description || '',
      status: 'todo',
      priority: 'medium',
      startDate: taskStart.toISOString().split('T')[0],
      dueDate: taskDue.toISOString().split('T')[0],
      logs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  return {
    title: planData.title || `关于 ${request.goal} 的计划`,
    description: planData.description || 'AI 生成计划',
    status: 'planning',
    startDate,
    endDate,
    tasks: finalTasks
  };
}
