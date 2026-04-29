import { buildIsolationResult } from '../services/isolationService.js';

export function analyzeIsolation(req, res) {
  const { sessionId, submittedAt, totalScenes, responses } = req.body || {};

  if (!sessionId || !responses || typeof responses !== 'object') {
    res.status(400).json({
      message: '잘못된 요청입니다. sessionId와 responses가 필요합니다.',
    });
    return;
  }

  const result = buildIsolationResult({
    sessionId,
    submittedAt,
    totalScenes,
    responses,
  });

  res.json(result);
}
