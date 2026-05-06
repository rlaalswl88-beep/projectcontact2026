import { buildIsolationResult } from '../services/isolationService.js';

const USER_INFO_COOKIE_KEY = 'isolation_user_info';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getCookieOptions() {
  return {
    path: '/',
    maxAge: ONE_DAY_MS,
    sameSite: process.env.COOKIE_SAME_SITE ?? 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
  };
}

export async function analyzeIsolation(req, res) {
  const { sessionId, submittedAt, totalScenes, responses } = req.body || {};

  if (!sessionId || !responses || typeof responses !== 'object') {
    res.status(400).json({
      message: '잘못된 요청입니다. sessionId와 responses가 필요합니다.',
    });
    return;
  }

  try {
    const result = await buildIsolationResult({
      sessionId,
      submittedAt,
      totalScenes,
      responses,
    });
    if (result.cookieProfile) {
      res.cookie(USER_INFO_COOKIE_KEY, JSON.stringify(result.cookieProfile), getCookieOptions());
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: '응답 저장/분석 처리 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
}
