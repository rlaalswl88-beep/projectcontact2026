import {
  getMyWarmMessages,
  getWarmMessages,
  moderateMessage,
} from '../services/warmMessageService.js';

const MESSAGE_WARNING = '\ucee4\ubba4\ub2c8\ud2f0 \uac00\uc774\ub4dc\ub77c\uc778\uc5d0 \ub9de\uc9c0 \uc54a\ub294 \ud45c\ud604\uc774 \ud3ec\ud568\ub418\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.';

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf('=');
        if (separatorIndex < 0) return [part, ''];
        return [
          decodeURIComponent(part.slice(0, separatorIndex)),
          decodeURIComponent(part.slice(separatorIndex + 1)),
        ];
      }),
  );
}

function getIsolationUserId(req) {
  const cookies = parseCookies(req.headers.cookie ?? '');
  const rawUserInfo = cookies.isolation_user_info;
  if (!rawUserInfo) return null;

  try {
    const parsed = JSON.parse(rawUserInfo);
    const userId = Number.parseInt(parsed.id, 10);
    return Number.isFinite(userId) ? userId : null;
  } catch {
    const params = new URLSearchParams(rawUserInfo.replace(/,/g, '&'));
    const userId = Number.parseInt(params.get('id'), 10);
    return Number.isFinite(userId) ? userId : null;
  }
}

function getLimit(req, fallback = 50) {
  const limit = Number.parseInt(req.query.limit ?? String(fallback), 10);
  return Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : fallback;
}

export async function createWarmMessage(req, res) {
  try {
    const result = await moderateMessage({
      ...req.body,
      userId: getIsolationUserId(req),
    });

    if (!result.ok && result.status === 'FAIL') {
      res.status(400).json(result);
      return;
    }

    res.status(202).json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      status: 'FAIL',
      target: 'message',
      message: MESSAGE_WARNING,
      error: error.message,
    });
  }
}

export async function listWarmMessages(req, res) {
  try {
    const messages = await getWarmMessages({ limit: getLimit(req) });

    res.json({
      ok: true,
      currentUserId: getIsolationUserId(req),
      messages,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: '\uba54\uc2dc\uc9c0\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.',
      error: error.message,
    });
  }
}

export async function listMyWarmMessages(req, res) {
  try {
    const userId = getIsolationUserId(req);
    const messages = await getMyWarmMessages({
      userId,
      limit: getLimit(req, 100),
    });

    res.json({
      ok: true,
      currentUserId: userId,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: '\ub0b4 \uba54\uc2dc\uc9c0\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.',
      error: error.message,
    });
  }
}
