import {
  findSurveyParticipantById,
  findSurveyResultRowsByParticipantId,
} from '../repositories/surveyResultRepository.js';

function getAnswerType(interactionType) {
  return interactionType === 'choice' ? 'option_id' : 'answer_text';
}

function getAnswerValue(row) {
  if (row.interaction_type === 'choice') {
    return row.option_text ?? null;
  }
  return row.answer_text ?? null;
}

export async function getSurveyResults(participantId) {
  const participant = await findSurveyParticipantById(participantId);
  if (!participant) {
    return {
      ok: false,
      message: '설문 참여자 정보를 찾을 수 없습니다.',
      participant: null,
      answers: [],
    };
  }

  const rows = await findSurveyResultRowsByParticipantId(participantId);
  const scenesById = new Map();

  rows.forEach((row) => {
    if (!scenesById.has(row.scene_id)) {
      scenesById.set(row.scene_id, {
        id: row.scene_id,
        sceneId: row.scene_id,
        sceneCode: row.scene_code,
        sceneTitle: row.scene_title,
        interactionType: row.interaction_type,
        interactionKey: row.interaction_key,
        interactionLabel: row.interaction_label,
        answerType: getAnswerType(row.interaction_type),
        answer: null,
      });
    }

    scenesById.get(row.scene_id).answer = {
      id: row.response_id,
      responseId: row.response_id,
      participantId: row.participant_id,
      optionId: row.option_id,
      answerText: row.answer_text,
      answerValue: getAnswerValue(row),
    };
  });

  const answers = [...scenesById.values()];

  return {
    ok: true,
    participant: {
      id: participant.id,
      name: participant.user_name,
      age: participant.age,
      gender: participant.gender,
      totalScore: participant.total_score,
      resultAnalysis: participant.result_analysis,
    },
    totalAnswers: answers.length,
    answers,
  };
}
