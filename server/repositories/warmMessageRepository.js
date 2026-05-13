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
      ORDER BY id ASC
      LIMIT ?
    `,
    [limit],
  );

  return rows;
}

/**
 * 채팅 타임라인: 최신 구간부터 페이지 (ORDER BY id DESC 후 ASC로 뒤집음)
 * @param {number} limit 한 페이지 최대 개수
 * @param {number|null} beforeId 이 id 미만(더 오래된) 메시지만
 * @returns {{ messages: Array, hasMore: boolean }}
 */
export async function findPassedCheerMessagesPage({ limit = 20, beforeId = null } = {}) {
  const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const fetchCount = take + 1;
  let sql = `
      SELECT id, nickname, message
      , user_id AS userId
      FROM cheer_messages
      WHERE status = 'PASS'
  `;
  const params = [];
  if (beforeId != null && Number.isFinite(Number(beforeId))) {
    sql += ' AND id < ?';
    params.push(Number(beforeId));
  }
  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(fetchCount);

  const [rows] = await dbPool.query(sql, params);
  const hasMore = rows.length > take;
  const slice = hasMore ? rows.slice(0, take) : rows;
  slice.reverse();
  return { messages: slice, hasMore };
}

export async function findPassedCheerMessagesByUserId({ userId, limit = 100 }) {
  const [rows] = await dbPool.query(
    `
      SELECT id, nickname, message, user_id AS userId
      FROM cheer_messages
      WHERE status = 'PASS'
        AND user_id = ?
      ORDER BY id ASC
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
