import { Router } from 'express';
import { analyzeIsolation } from '../controllers/isolationController.js';
import { getIsolationStatistics } from '../controllers/statisticsController.js';
import { getIsolationSurveyResults } from '../controllers/surveyResultController.js';

const router = Router();

router.get('/statistics', getIsolationStatistics);
router.get('/survey-results', getIsolationSurveyResults);
router.post('/analyze', analyzeIsolation);

export default router;
