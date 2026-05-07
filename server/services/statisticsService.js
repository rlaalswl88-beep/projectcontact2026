import {
  findSurveyParticipantSummaryRows,
  findSurveyStatisticsRows,
} from '../repositories/statisticsRepository.js';

const GROUP_COLORS = {
  M: '#51d9ff',
  F: '#ffd166',
  unknown: '#a0b0be',
};

function sanitizeId(value) {
  const id = String(value ?? 'unknown')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_+-]/gu, '-');
  return id || 'unknown';
}

function roundPercent(value) {
  return Math.round(value * 1000) / 10;
}

function getStablePosition(index, radius = 120) {
  const angle = index * 2.399963229728653;
  const band = Math.floor(index / 8);
  return {
    x: Math.round(Math.cos(angle) * (radius + band * 24)),
    y: Math.round(((index % 5) - 2) * 18),
    z: Math.round(Math.sin(angle) * (radius + band * 24)),
  };
}

function toNumber(value) {
  return Number(value ?? 0);
}

function buildGroupId(ageGroup, gender) {
  return `group:${sanitizeId(ageGroup)}:${sanitizeId(gender)}`;
}

function buildSceneId(sceneCode) {
  return `scene:${sanitizeId(sceneCode)}`;
}

function buildAnswerId(row) {
  return [
    'answer',
    sanitizeId(row.age_group),
    sanitizeId(row.gender),
    sanitizeId(row.scene_code),
    sanitizeId(row.interaction_type),
    sanitizeId(row.answer_key),
  ].join(':');
}

function getAnswerType(interactionType) {
  return interactionType === 'choice' ? 'option_id' : 'answer_text_feeling';
}

function aggregateQuestionAnswers(question) {
  const answersByKey = new Map();

  question.answers.forEach((answer) => {
    const answerKey = `${answer.answerType}:${answer.answerKey}:${answer.answerLabel}`;
    const previous = answersByKey.get(answerKey);

    if (previous) {
      previous.count += toNumber(answer.count);
      return;
    }

    answersByKey.set(answerKey, {
      answerType: answer.answerType,
      answerKey: answer.answerKey,
      answerLabel: answer.answerLabel,
      count: toNumber(answer.count),
      percentage: 0,
    });
  });

  return [...answersByKey.values()]
    .map((answer) => ({
      ...answer,
      percentage: question.totalResponses > 0 ? roundPercent(answer.count / question.totalResponses) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildStatisticsPayload(statRows, participantRows) {
  const groupTotals = new Map();
  const sceneTotals = new Map();
  const groupSummaries = new Map();
  const questionsByCode = new Map();
  const nodesById = new Map();
  const linksById = new Map();

  statRows.forEach((row) => {
    const groupKey = `${row.age_group}::${row.gender}`;
    const count = toNumber(row.answer_count);

    groupTotals.set(groupKey, (groupTotals.get(groupKey) ?? 0) + count);
    sceneTotals.set(row.scene_code, (sceneTotals.get(row.scene_code) ?? 0) + count);
  });

  participantRows.forEach((row, index) => {
    const groupId = buildGroupId(row.age_group, row.gender);
    const groupKey = `${row.age_group}::${row.gender}`;

    nodesById.set(groupId, {
      id: groupId,
      type: 'group',
      label: `${row.age_group} ${row.gender}`,
      ageGroup: row.age_group,
      gender: row.gender,
      generation: row.generation,
      count: toNumber(row.participant_count),
      responseCount: groupTotals.get(groupKey) ?? 0,
      averageScore: Math.round(toNumber(row.average_score) * 10) / 10,
      color: GROUP_COLORS[row.gender] ?? GROUP_COLORS.unknown,
      ...getStablePosition(index, 64),
    });
  });

  statRows.forEach((row, index) => {
    const groupId = buildGroupId(row.age_group, row.gender);
    const sceneId = buildSceneId(row.scene_code);
    const answerId = buildAnswerId(row);
    const groupKey = `${row.age_group}::${row.gender}`;
    const count = toNumber(row.answer_count);
    const groupTotal = groupTotals.get(groupKey) ?? 0;
    const sceneTotal = sceneTotals.get(row.scene_code) ?? count;
    const percentage = groupTotal > 0 ? roundPercent(count / groupTotal) : 0;
    const scenePercentage = sceneTotal > 0 ? roundPercent(count / sceneTotal) : 0;
    const answerType = getAnswerType(row.interaction_type);

    if (!nodesById.has(groupId)) {
      nodesById.set(groupId, {
        id: groupId,
        type: 'group',
        label: `${row.age_group} ${row.gender}`,
        ageGroup: row.age_group,
        gender: row.gender,
        count: 0,
        responseCount: groupTotal,
        color: GROUP_COLORS[row.gender] ?? GROUP_COLORS.unknown,
        ...getStablePosition(nodesById.size, 64),
      });
    }

    if (!nodesById.has(sceneId)) {
      nodesById.set(sceneId, {
        id: sceneId,
        type: 'scene',
        label: row.scene_title || row.scene_code,
        sceneId: row.scene_id,
        sceneCode: row.scene_code,
        interactionType: row.interaction_type,
        interactionLabel: row.interaction_label,
        count: sceneTotal,
        color: '#ffffff',
        ...getStablePosition(nodesById.size, 104),
      });
    }

    nodesById.set(answerId, {
      id: answerId,
      type: 'answer',
      label: row.answer_label,
      ageGroup: row.age_group,
      gender: row.gender,
      sceneId: row.scene_id,
      sceneCode: row.scene_code,
      sceneTitle: row.scene_title,
      interactionLabel: row.interaction_label,
      interactionType: row.interaction_type,
      answerType,
      answerKey: row.answer_key,
      count,
      percentage,
      color: GROUP_COLORS[row.gender] ?? GROUP_COLORS.unknown,
      ...getStablePosition(index, 150),
    });

    const groupSceneLinkId = `${groupId}->${sceneId}`;
    const sceneAnswerLinkId = `${sceneId}->${answerId}`;
    const previousGroupSceneValue = linksById.get(groupSceneLinkId)?.value ?? 0;

    linksById.set(groupSceneLinkId, {
      id: groupSceneLinkId,
      source: groupId,
      target: sceneId,
      type: 'group-scene',
      value: previousGroupSceneValue + count,
    });

    linksById.set(sceneAnswerLinkId, {
      id: sceneAnswerLinkId,
      source: sceneId,
      target: answerId,
      type: 'scene-answer',
      value: count,
      percentage,
    });

    if (!questionsByCode.has(row.scene_code)) {
      questionsByCode.set(row.scene_code, {
        sceneId: row.scene_id,
        sceneCode: row.scene_code,
        sceneTitle: row.scene_title,
        interactionLabel: row.interaction_label,
        interactionType: row.interaction_type,
        totalResponses: sceneTotal,
        answers: [],
      });
    }

    questionsByCode.get(row.scene_code).answers.push({
      ageGroup: row.age_group,
      gender: row.gender,
      answerType,
      answerKey: row.answer_key,
      answerLabel: row.answer_label,
      count,
      percentage: scenePercentage,
      groupPercentage: percentage,
    });

    if (!groupSummaries.has(groupKey)) {
      groupSummaries.set(groupKey, {
        ageGroup: row.age_group,
        gender: row.gender,
        totalResponses: groupTotal,
        answers: [],
      });
    }

    groupSummaries.get(groupKey).answers.push({
      sceneId: row.scene_id,
      sceneCode: row.scene_code,
      sceneTitle: row.scene_title,
      interactionLabel: row.interaction_label,
      interactionType: row.interaction_type,
      answerType,
      answerKey: row.answer_key,
      answerLabel: row.answer_label,
      count,
      percentage,
    });
  });

  const topAnswers = [...nodesById.values()]
    .filter((node) => node.type === 'answer')
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(({ id, label, ageGroup, gender, sceneCode, interactionType, count, percentage }) => ({
      id,
      label,
      ageGroup,
      gender,
      sceneCode,
      interactionType,
      count,
      percentage,
    }));

  const step2Summary = participantRows.map((row) => ({
    ageGroup: row.age_group,
    gender: row.gender,
    generation: row.generation,
    participantCount: toNumber(row.participant_count),
    averageScore: Math.round(toNumber(row.average_score) * 10) / 10,
  }));

  return {
    graph: {
      nodes: [...nodesById.values()],
      links: [...linksById.values()],
    },
    summary: {
      groups: [...groupSummaries.values()],
      questions: [...questionsByCode.values()].map((question) => ({
        ...question,
        answers: aggregateQuestionAnswers(question),
      })),
      topAnswers,
      participants: step2Summary,
    },
    step2Summary,
  };
}

export async function getSurveyStatistics() {
  const [statRows, participantRows] = await Promise.all([
    findSurveyStatisticsRows(),
    findSurveyParticipantSummaryRows(),
  ]);
  const payload = buildStatisticsPayload(statRows, participantRows);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    totals: {
      participants: participantRows.reduce((sum, row) => sum + toNumber(row.participant_count), 0),
      responses: statRows.reduce((sum, row) => sum + toNumber(row.answer_count), 0),
      groups: participantRows.length,
      answers: payload.graph.nodes.filter((node) => node.type === 'answer').length,
      questions: payload.summary.questions.length,
    },
    ...payload,
  };
}
