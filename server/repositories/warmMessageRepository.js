import { dbPool } from '../config/db.js';

export async function insertCheerMessage({ userId = null, nickname, message, status = 'PENDING' }) {
  const [result] = await dbPool.query(
    `
      INSERT INTO cheer_messages (user_id, nickname, message, status)
      VALUES (?, ?, ?, ?)
    `,
    [userId, nickname, message, status],
  );

  return result.insertId;
}

export async function updateCheerMessageStatus({ id, status }) {
  await dbPool.query(
    `
      UPDATE cheer_messages
      SET status = ?
      WHERE id = ?
    `,
    [status, id],
  );
}

export async function updateCheerMessageNicknameAndStatus({ id, nickname, status }) {
  await dbPool.query(
    `
      UPDATE cheer_messages
      SET nickname = ?, status = ?
      WHERE id = ?
    `,
    [nickname, status, id],
  );
}

export async function findPassedCheerMessages({ limit = 50 } = {}) {
  const [rows] = await dbPool.query(
    `
      SELECT id, nickname, message
      , user_id AS userId
      FROM cheer_messages
      WHERE status = 'PASS'
      ORDER BY id DESC
      LIMIT ?
    `,
    [limit],
  );

  return rows;
}

export async function findPassedCheerMessagesByUserId({ userId, limit = 100 }) {
  const [rows] = await dbPool.query(
    `
      SELECT id, nickname, message, user_id AS userId
      FROM cheer_messages
      WHERE status = 'PASS'
        AND user_id = ?
      ORDER BY id DESC
      LIMIT ?
    `,
    [userId, limit],
  );

  return rows;
}

export async function findPendingCheerMessages({ limit = 50 } = {}) {
  const [rows] = await dbPool.query(
    `
      SELECT id, nickname, message, user_id AS userId
      FROM cheer_messages
      WHERE status = 'PENDING'
      ORDER BY id ASC
      LIMIT ?
    `,
    [limit],
  );

  return rows;
}
