import { dbPool } from '../config/db.js';

export async function findSurveyParticipantById(participantId) {
  const [rows] = await dbPool.query(
    `
      SELECT
        id,
        user_name,
        age,
        gender,
        total_score,
        result_analysis
      FROM survey_participants
      WHERE id = ?
      LIMIT 1
    `,
    [participantId],
  );

  return rows[0] ?? null;
}

export async function findSurveyResultRowsByParticipantId(participantId) {
  const [rows] = await dbPool.query(
    `
      SELECT
        sm.id AS scene_id,
        sm.scene_code,
        sm.title AS scene_title,
        sm.interaction_type,
        sm.interaction_key,
        sm.interaction_label,
        ur.id AS response_id,
        ur.participant_id,
        ur.option_id,
        so.option_text,
        ur.answer_text,
        sp.user_name,
        sp.age,
        sp.gender,
        sp.total_score,
        sp.result_analysis
      FROM scenes_metadata sm
      INNER JOIN user_responses ur ON ur.scene_id = sm.id
      LEFT JOIN scene_options so ON so.id = ur.option_id
      LEFT JOIN survey_participants sp ON sp.id = ur.participant_id
      WHERE sm.interaction_type <> 'none'
        AND ur.participant_id = ?
      ORDER BY sm.id ASC, ur.id ASC
    `,
    [participantId],
  );

  return rows;
}
