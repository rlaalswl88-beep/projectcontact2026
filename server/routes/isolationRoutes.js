import { Router } from 'express';
import {
  analyzeIsolation,
  checkIsolationParticipant,
  restartIsolationParticipant,
} from '../controllers/isolationController.js';
import { getIsolationStatistics } from '../controllers/statisticsController.js';
import { getIsolationSurveyResults } from '../controllers/surveyResultController.js';

const router = Router();

router.get('/statistics', getIsolationStatistics);
router.get('/survey-results', getIsolationSurveyResults);
router.post('/participant-check', checkIsolationParticipant);
router.post('/participant-restart', restartIsolationParticipant);
router.post('/analyze', analyzeIsolation);

export default router;
