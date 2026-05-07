import { dbPool } from '../config/db.js';

export async function findSurveyStatisticsRows() {
  const [rows] = await dbPool.query(
    `
      SELECT
        CASE
          WHEN sp.age IS NULL OR sp.age <= 0 THEN 'unknown'
          WHEN sp.age >= 80 THEN '80대+'
          ELSE CONCAT(FLOOR(sp.age / 10) * 10, '대')
        END AS age_group,
        COALESCE(NULLIF(UPPER(TRIM(sp.gender)), ''), 'unknown') AS gender,
        sm.id AS scene_id,
        sm.scene_code,
        sm.title AS scene_title,
        sm.interaction_type,
        sm.interaction_key,
        sm.interaction_label,
        CASE
          WHEN sm.interaction_type = 'choice' THEN CAST(ur.option_id AS CHAR)
          ELSE UPPER(TRIM(ur.answer_text_feeling))
        END AS answer_key,
        CASE
          WHEN sm.interaction_type = 'choice' THEN COALESCE(so.option_text, '(unknown option)')
          WHEN UPPER(TRIM(ur.answer_text_feeling)) = 'G' THEN '긍정'
          WHEN UPPER(TRIM(ur.answer_text_feeling)) = 'B' THEN '부정'
          WHEN UPPER(TRIM(ur.answer_text_feeling)) = 'S' THEN '중립'
          ELSE '(unknown feeling)'
        END AS answer_label,
        COUNT(*) AS answer_count
      FROM user_responses ur
      INNER JOIN survey_participants sp ON sp.id = ur.participant_id
      INNER JOIN scenes_metadata sm ON sm.id = ur.scene_id
      LEFT JOIN scene_options so ON so.id = ur.option_id
      WHERE
        (sm.interaction_type = 'choice' AND ur.option_id IS NOT NULL)
        OR (
          sm.interaction_type = 'input'
          AND UPPER(TRIM(ur.answer_text_feeling)) IN ('G', 'B', 'S')
        )
      GROUP BY
        age_group,
        gender,
        sm.id,
        sm.scene_code,
        sm.title,
        sm.interaction_type,
        sm.interaction_key,
        sm.interaction_label,
        answer_key,
        answer_label
      ORDER BY
        age_group ASC,
        gender ASC,
        sm.id ASC,
        answer_count DESC
    `,
  );

  return rows;
}

export async function findSurveyParticipantSummaryRows() {
  const [rows] = await dbPool.query(
    `
      SELECT
        CASE
          WHEN age IS NULL OR age <= 0 THEN 'unknown'
          WHEN age >= 80 THEN '80대+'
          ELSE CONCAT(FLOOR(age / 10) * 10, '대')
        END AS age_group,
        COALESCE(NULLIF(UPPER(TRIM(gender)), ''), 'unknown') AS gender,
        CASE
          WHEN age IS NULL OR age <= 0 THEN 'unknown'
          WHEN age <= 40 THEN 'YB'
          ELSE 'OB'
        END AS generation,
        COUNT(*) AS participant_count,
        AVG(total_score) AS average_score
      FROM survey_participants
      GROUP BY age_group, gender, generation
      ORDER BY age_group ASC, gender ASC
    `,
  );

  return rows;
}
