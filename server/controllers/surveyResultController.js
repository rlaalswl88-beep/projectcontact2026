import { getSurveyResults } from '../services/surveyResultService.js';

const USER_INFO_COOKIE_KEY = 'isolation_user_info';

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, pair) => {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) return cookies;

    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!key) return cookies;

    cookies[key] = value;
    return cookies;
  }, {});
}

function getParticipantIdFromCookie(req) {
  const cookies = parseCookies(req.headers.cookie);
  const rawUserInfo = cookies[USER_INFO_COOKIE_KEY];
  if (!rawUserInfo) return null;

  try {
    const userInfo = JSON.parse(decodeURIComponent(rawUserInfo));
    const participantId = Number.parseInt(userInfo?.id, 10);
    return Number.isFinite(participantId) ? participantId : null;
  } catch {
    return null;
  }
}

export async function getIsolationSurveyResults(req, res) {
  try {
    const participantId = getParticipantIdFromCookie(req);
    if (!participantId) {
      res.status(401).json({
        ok: false,
        message: '개인 설문 결과를 찾기 위한 쿠키 정보가 없습니다.',
      });
      return;
    }

    const surveyResults = await getSurveyResults(participantId);
    if (!surveyResults.ok) {
      res.status(404).json(surveyResults);
      return;
    }

    res.json(surveyResults);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: '설문결과 데이터를 불러오지 못했습니다.',
      error: error.message,
    });
  }
}
