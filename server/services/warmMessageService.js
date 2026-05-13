import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildWarmFilterPrompt,
  WARM_CHAT_FILTER_SYSTEM_PROMPT,
} from '../prompts/messageRag.js';
import {
  findPassedCheerMessages,
  findPassedCheerMessagesByUserId,
  findPendingCheerMessages,
  insertCheerMessage,
  updateCheerMessageNicknameAndStatus,
  updateCheerMessageStatus,
} from '../repositories/warmMessageRepository.js';
import { FastScanner } from '../utils/fastscanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const FALLBACK_NICKNAME = '\ub530\ub73b\ud55c\ub9c8\uc74c';
const NICKNAME_EMPTY_WARNING = '\ub2c9\ub124\uc784\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694';
const MESSAGE_EMPTY_WARNING = '\ub0b4\uc6a9\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694';
const NICKNAME_WARNING = '\uc0ac\uc6a9\ud560 \uc218 \uc5c6\ub294 \ub2c9\ub124\uc784\uc785\ub2c8\ub2e4';
const MESSAGE_WARNING = '\ucee4\ubba4\ub2c8\ud2f0 \uac00\uc774\ub4dc\ub77c\uc778\uc5d0 \ub9de\uc9c0 \uc54a\ub294 \ud45c\ud604\uc774 \ud3ec\ud568\ub418\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.';
const EXTRA_FILTER_WORDS = [
  '\u3145\u3142',
  '\u3146\u3142',
  '\u3142\u3145',
  '\u3148\u3139',
  '\u3148\u3132',
  '\u3132\u3148',
];

let scannerPromise = null;

function parseCsvWords(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^"|"$/g, ''))
    .filter((line) => line && line.toLowerCase() !== 'slang,')
    .map((line) => line.replace(/,$/, '').trim())
    .filter(Boolean);
}

function parseLineWords(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function readLeagueFilterList() {
  const files = await readdir(DATA_DIR);
  const leagueFile = files.find((file) => file.endsWith('_2020.txt'));
  if (!leagueFile) return '';
  return readFile(path.join(DATA_DIR, leagueFile), 'utf8');
}

async function getScanner() {
  if (!scannerPromise) {
    scannerPromise = Promise.all([
      readFile(path.join(DATA_DIR, 'slang.csv'), 'utf8'),
      readLeagueFilterList(),
    ]).then(([slangCsv, leagueList]) => {
      const words = [
        ...parseCsvWords(slangCsv),
        ...parseLineWords(leagueList),
        ...EXTRA_FILTER_WORDS,
      ];
      return new FastScanner(words);
    });
  }

  return scannerPromise;
}

async function runListFilter({ nickname, message }) {
  const scanner = await getScanner();
  const nicknameScan = scanner.search(nickname);
  if (nicknameScan.found) {
    return {
      result: 'FAIL',
      target: 'nickname',
      warningMessage: NICKNAME_WARNING,
    };
  }

  const messageScan = scanner.search(message);
  if (messageScan.found) {
    return {
      result: 'FAIL',
      target: 'message',
      warningMessage: MESSAGE_WARNING,
    };
  }

  return {
    result: 'PASS',
    target: 'none',
    warningMessage: '',
  };
}

function normalizeLlmResult(value) {
  const result = value?.result === 'PASS' ? 'PASS' : 'FAIL';
  const target = ['nickname', 'message', 'both', 'none'].includes(value?.target)
    ? value.target
    : 'message';

  return { result, target };
}

async function runLlmFilter({ nickname, message }) {
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  const model = process.env.OPENAI_WARM_FILTER_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  if (!apiKey) {
    console.warn('[warm-message] OPENAI_API_KEY is missing; marking message as FAIL');
    return { result: 'FAIL', target: 'message' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: WARM_CHAT_FILTER_SYSTEM_PROMPT },
        { role: 'user', content: buildWarmFilterPrompt({ nickname, message }) },
      ],
    }),
  });

  if (!response.ok) {
    console.warn(`[warm-message] OpenAI moderation failed with status ${response.status}`);
    return { result: 'FAIL', target: 'message' };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  const parsed = JSON.parse(content);
  return normalizeLlmResult(parsed);
}

async function applyModerationResult({ messageId, result, target }) {
  if (result === 'PASS') {
    await updateCheerMessageStatus({ id: messageId, status: 'PASS' });
    return;
  }

  if (target === 'nickname') {
    await updateCheerMessageNicknameAndStatus({
      id: messageId,
      nickname: FALLBACK_NICKNAME,
      status: 'PASS',
    });
    return;
  }

  await updateCheerMessageStatus({ id: messageId, status: 'FAIL' });
}

async function moderateMessageInBackground({ messageId, nickname, message }) {
  try {
    const llmResult = await runLlmFilter({ nickname, message });
    await applyModerationResult({ messageId, ...llmResult });
  } catch (error) {
    console.warn(`[warm-message] moderation parse/runtime failure for message ${messageId}: ${error.message}`);
    await updateCheerMessageStatus({ id: messageId, status: 'FAIL' });
  }
}

export async function moderateMessage({ userId = null, nickname, message }) {
  const cleanNickname = String(nickname ?? '').trim();
  const cleanMessage = String(message ?? '').trim();

  if (!cleanNickname || !cleanMessage) {
    return {
      ok: false,
      status: 'FAIL',
      target: !cleanNickname ? 'nickname' : 'message',
      message: !cleanNickname ? NICKNAME_EMPTY_WARNING : MESSAGE_EMPTY_WARNING,
    };
  }

  const listResult = await runListFilter({
    nickname: cleanNickname,
    message: cleanMessage,
  });

  if (listResult.result === 'FAIL') {
    const messageId = await insertCheerMessage({
      userId,
      nickname: cleanNickname,
      message: cleanMessage,
      status: 'FAIL',
    });

    return {
      ok: false,
      id: messageId,
      status: 'FAIL',
      target: listResult.target,
      message: listResult.warningMessage,
    };
  }

  const messageId = await insertCheerMessage({
    userId,
    nickname: cleanNickname,
    message: cleanMessage,
  });

  moderateMessageInBackground({
    messageId,
    nickname: cleanNickname,
    message: cleanMessage,
  }).catch(() => {});

  return {
    ok: true,
    id: messageId,
    userId,
    status: 'PENDING',
    message: '\uba54\uc2dc\uc9c0\uac00 \ub4f1\ub85d\ub418\uc5c8\uc2b5\ub2c8\ub2e4.',
  };
}

export async function getWarmMessages({ limit } = {}) {
  return findPassedCheerMessages({ limit });
}

export async function getMyWarmMessages({ userId, limit } = {}) {
  if (!userId) return [];
  return findPassedCheerMessagesByUserId({ userId, limit });
}

export async function reprocessPendingWarmMessages({ limit = 50 } = {}) {
  const pendingMessages = await findPendingCheerMessages({ limit });
  pendingMessages.forEach((item) => {
    moderateMessageInBackground({
      messageId: item.id,
      nickname: item.nickname,
      message: item.message,
    }).catch(() => {});
  });

  return pendingMessages.length;
}
