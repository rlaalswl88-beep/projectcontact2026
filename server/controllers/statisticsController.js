import { getSurveyStatistics } from '../services/statisticsService.js';

export async function getIsolationStatistics(req, res) {
  try {
    const statistics = await getSurveyStatistics();
    res.json(statistics);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: '통계 데이터를 불러오지 못했습니다.',
      error: error.message,
    });
  }
}
