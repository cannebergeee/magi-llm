import OpenAI from 'openai';

const hasKey = () => Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_key_here');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const PERSONAS = {
  melchior: {
    name: 'MELCHIOR',
    // 理性/工程师
    system: `你是 MAGI System 的一部分：MELCHIOR（理性·科学·工程师人格）。\n\n任务：阅读“案件描述”，给出“可决/否决”判断。\n要求：\n- 以严格的成本/风险/可行性为依据，偏理性。\n- 输出必须是 JSON，且只输出 JSON。\n- 字段：vote(只能是 resolve 或 reject), confidence(0-100整数), reason(<=60字)。`
  },
  balthasar: {
    name: 'BALTHASAR',
    // 伦理/社会
    system: `你是 MAGI System 的一部分：BALTHASAR（伦理·社会·人文人格）。\n\n任务：阅读“案件描述”，给出“可决/否决”判断。\n要求：\n- 以伦理、社会影响、公平性、长短期后果为依据。\n- 输出必须是 JSON，且只输出 JSON。\n- 字段：vote(只能是 resolve 或 reject), confidence(0-100整数), reason(<=60字)。`
  },
  casper: {
    name: 'CASPER',
    // 情感/直觉
    system: `你是 MAGI System 的一部分：CASPER（情感·直觉·个体意志人格）。\n\n任务：阅读“案件描述”，给出“可决/否决”判断。\n要求：\n- 以直觉、情感、个人意志与“想不想做”为依据。\n- 输出必须是 JSON，且只输出 JSON。\n- 字段：vote(只能是 resolve 或 reject), confidence(0-100整数), reason(<=60字)。`
  }
};

function clampInt(n, min, max) {
  n = Math.round(Number(n));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeVote(v) {
  v = String(v || '').toLowerCase().trim();
  if (v === 'resolve' || v === 'approved' || v === 'approve' || v === 'yes') return 'resolve';
  if (v === 'reject' || v === 'denied' || v === 'deny' || v === 'no') return 'reject';
  return null;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    // try extract first json block
    const m = String(text).match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function llmOne({ personaKey, caseText, volume, exMode, priority }) {
  // 无 key 时：退化为“原项目的概率决议”风格
  if (!hasKey()) {
    const reject = (Math.random() * 100) > volume;
    return {
      role: PERSONAS[personaKey].name,
      vote: reject ? 'reject' : 'resolve',
      confidence: clampInt(volume, 0, 100),
      reason: '未配置 API Key，使用概率模拟。'
    };
  }

  const persona = PERSONAS[personaKey];

  // exMode：更“极端/武断”，让模型更快下结论
  const temperature = exMode ? 0.9 : 0.4;

  const user = [
    `案件描述：\n${caseText || '（空）'}`,
    `参数：volume=${volume}（0-100，越高越倾向 resolve）、priority=${priority}、exMode=${exMode}`,
    `提示：volume 代表可接受风险阈值：volume 越低越保守、越容易 reject；volume 越高越宽松、越容易 resolve。`
  ].join('\n\n');

  const resp = await client.chat.completions.create({
    model: MODEL,
    temperature,
    messages: [
      { role: 'system', content: persona.system },
      { role: 'user', content: user }
    ],
    response_format: { type: 'json_object' }
  });

  const text = resp.choices?.[0]?.message?.content ?? '';
  const data = safeJsonParse(text) || {};
  const vote = normalizeVote(data.vote) || 'reject';
  const confidence = clampInt(data.confidence ?? 50, 0, 100);
  const reason = String(data.reason || '').trim().slice(0, 80) || '（无理由）';

  return {
    role: persona.name,
    vote,
    confidence,
    reason
  };
}

function finalDecision(votes, priority) {
  // votes: {melchior,balthasar,casper}
  const arr = Object.values(votes);
  const resolves = arr.filter(v => v.vote === 'resolve').length;
  const rejects = arr.filter(v => v.vote === 'reject').length;

  // priority 影响决策规则：
  // - 'E': 任何一个 reject 即 reject（极度保守）
  // - '+++': 2/3 通过即可 resolve
  // - 'A','AA','AAA': 默认多数票；AAA 时若 1:1:1 不可能，这里用平均置信度打破平局
  if (priority === 'E') {
    return rejects > 0 ? 'reject' : 'resolve';
  }
  if (priority === '+++') {
    return resolves >= 2 ? 'resolve' : 'reject';
  }

  if (resolves > rejects) return 'resolve';
  if (rejects > resolves) return 'reject';

  // 理论上不会出现（3个投票），但保底：看置信度
  const score = arr.reduce((s, v) => s + (v.vote === 'resolve' ? v.confidence : -v.confidence), 0);
  return score >= 0 ? 'resolve' : 'reject';
}

export async function createVote({ caseText, file, volume, exMode, priority }) {
  const v = clampInt(volume ?? 66, 0, 100);
  const p = ['E', '+++', 'A', 'AA', 'AAA'].includes(priority) ? priority : 'AAA';

  const [melchior, balthasar, casper] = await Promise.all([
    llmOne({ personaKey: 'melchior', caseText, volume: v, exMode, priority: p }),
    llmOne({ personaKey: 'balthasar', caseText, volume: v, exMode, priority: p }),
    llmOne({ personaKey: 'casper', caseText, volume: v, exMode, priority: p })
  ]);

  const votes = { melchior, balthasar, casper };
  const final = finalDecision(votes, p);

  return {
    input: { caseText, file, volume: v, exMode, priority: p },
    votes,
    final
  };
}
