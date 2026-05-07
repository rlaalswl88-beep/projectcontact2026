export async function findSceneAnswerRows(connection) {
  const [rows] = await connection.query(
    `
      SELECT
        sm.id AS scene_id,
        sm.scene_code,
        sm.interaction_type,
        sm.interaction_key,
        so.id AS option_id,
        so.option_text,
        so.score
      FROM scenes_metadata sm
      LEFT JOIN scene_options so ON so.scene_id = sm.id
      ORDER BY sm.id ASC, so.id ASC
    `,
  );
  return rows;
}

export async function findLatestParticipantByIdentity(connection, { userName, age, gender }) {
  const [rows] = await connection.query(
    `
      SELECT id, user_name, age, gender, total_score, result_analysis
      FROM survey_participants
      WHERE user_name = ?
        AND age = ?
        AND (
          (gender IS NULL AND ? IS NULL)
          OR gender = ?
        )
      ORDER BY id DESC
      LIMIT 1
    `,
    [userName, age, gender, gender],
  );
  return rows[0] ?? null;
}

export async function insertParticipant(connection, { userName, age, gender }) {
  const [result] = await connection.query(
    `
      INSERT INTO survey_participants (user_name, age, gender, total_score, result_analysis)
      VALUES (?, ?, ?, 0, '')
    `,
    [userName, age, gender],
  );

  return result.insertId;
}

export async function resetParticipantForRetry(connection, { participantId, userName, age, gender }) {
  await connection.query(
    `
      UPDATE survey_participants
      SET user_name = ?, age = ?, gender = ?, total_score = 0, result_analysis = ''
      WHERE id = ?
    `,
    [userName, age, gender, participantId],
  );
}

export async function insertUserResponse(connection, { participantId, sceneId, optionId, answerText, answerTextFeeling }) {
  await connection.query(
    `
      INSERT INTO user_responses (participant_id, scene_id, option_id, answer_text, answer_text_feeling)
      VALUES (?, ?, ?, ?, ?)
    `,
    [participantId, sceneId, optionId, answerText, answerTextFeeling],
  );
}

export async function deleteUserResponsesByParticipantId(connection, participantId) {
  await connection.query(
    `
      DELETE FROM user_responses
      WHERE participant_id = ?
    `,
    [participantId],
  );
}

export async function updateParticipantResult(connection, { participantId, totalScore, resultAnalysis }) {
  await connection.query(
    `
      UPDATE survey_participants
      SET total_score = ?, result_analysis = ?
      WHERE id = ?
    `,
    [totalScore, resultAnalysis, participantId],
  );
}
