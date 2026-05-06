import { dbPool } from '../config/db.js';
import {
  findSceneAnswerRows,
  insertParticipant,
  insertUserResponse,
  updateParticipantResult,
} from '../repositories/isolationRepository.js';
import { buildResultAnalysis, classifyAnswerFeeling } from './llmService.js';

function getRiskLevel(totalScore) {
  if (totalScore <= 16) {
    return '낮음';
  }
  if (totalScore <= 28) {
    return '중간';
  }
  return '높음';
}

function getGeneration(age) {
  return age <= 40 ? 'YB' : 'OB';
}

function getGender(gender) {
  const normalized = (gender ?? '').trim().toUpperCase();
  if (normalized === 'M' || normalized === 'F') {
    return normalized;
  }
  return null;
}

export async function buildIsolationResult({ sessionId, submittedAt, totalScenes, responses }) {
  const participant = {
    userName: (responses?.introName ?? '').trim() || '익명',
    age: Number.parseInt(responses?.introAge ?? '0', 10) || 0,
    gender: getGender(responses?.introGender),
  };

  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();

    const sceneRows = await findSceneAnswerRows(connection);
    const sceneByKey = new Map();
    const optionBySceneAndText = new Map();

    sceneRows.forEach((row) => {
      if (row.interaction_key) {
        sceneByKey.set(row.interaction_key, {
          sceneId: row.scene_id,
          sceneCode: row.scene_code,
          interactionType: row.interaction_type,
        });
      }

      if (row.option_id && row.option_text) {
        optionBySceneAndText.set(`${row.scene_id}::${row.option_text.trim()}`, {
          optionId: row.option_id,
          score: Number(row.score ?? 0),
        });
      }
    });

    const participantId = await insertParticipant(connection, participant);
    let totalScore = 0;
    const choiceAnswers = [];
    const textAnswers = [];

    for (const [interactionKey, rawValue] of Object.entries(responses ?? {})) {
      if (interactionKey === 'introName' || interactionKey === 'introAge' || interactionKey === 'introGender') {
        continue;
      }

      if (typeof rawValue !== 'string') {
        continue;
      }

      const value = rawValue.trim();
      if (!value) {
        continue;
      }

      const sceneInfo = sceneByKey.get(interactionKey);
      if (!sceneInfo) {
        continue;
      }

      if (sceneInfo.interactionType === 'choice') {
        const optionInfo = optionBySceneAndText.get(`${sceneInfo.sceneId}::${value}`);
        const optionId = optionInfo?.optionId ?? null;
        const optionScore = optionInfo?.score ?? 0;
        totalScore += optionScore;
        choiceAnswers.push({
          sceneCode: sceneInfo.sceneCode,
          interactionKey,
          selectedText: value,
          score: optionScore,
        });
        await insertUserResponse(connection, {
          participantId,
          sceneId: sceneInfo.sceneId,
          optionId,
          answerText: null,
          answerTextFeeling: null,
        });
        continue;
      }

      textAnswers.push({
        sceneCode: sceneInfo.sceneCode,
        interactionKey,
        answerText: value,
      });
      const answerTextFeeling = await classifyAnswerFeeling(value);
      await insertUserResponse(connection, {
        participantId,
        sceneId: sceneInfo.sceneId,
        optionId: null,
        answerText: value,
        answerTextFeeling,
      });
    }

    const resultAnalysis = await buildResultAnalysis({
      participant,
      totalScore,
      choiceAnswers,
      textAnswers,
    });

    await updateParticipantResult(connection, {
      participantId,
      totalScore,
      resultAnalysis,
    });

    await connection.commit();

    return {
      ok: true,
      sessionId,
      submittedAt,
      totalScenes,
      participantId,
      cookieProfile: {
        id: participantId,
        name: participant.userName,
        generation: getGeneration(participant.age),
        gender: participant.gender,
      },
      score: {
        total: totalScore,
        riskLevel: getRiskLevel(totalScore),
      },
      summary: resultAnalysis,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
