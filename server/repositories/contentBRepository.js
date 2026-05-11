import { dbPool } from '../config/db.js';

function normalizeContentRow(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const id = row.id ?? row.ID ?? row.idx ?? row.IDX;
  const title = row.title ?? row.TITLE ?? row.subject ?? row.SUBJECT ?? '';
  const url = row.url ?? row.URL ?? row.link ?? row.LINK ?? row.link_url ?? row.LINK_URL ?? null;
  const summary =
    row.summary ??
    row.SUMMARY ??
    row.description ??
    row.DESCRIPTION ??
    row.content ??
    row.CONTENT ??
    row.sub_title ??
    null;

  return {
    id: id != null ? Number(id) : 0,
    type: row.type != null ? Number(row.type) : null,
    title: String(title || '').trim() || '제목 없음',
    url: url != null && String(url).trim() ? String(url).trim() : null,
    summary: summary != null && String(summary).trim() ? String(summary).trim() : null,
  };
}

/**
 * content_b_db: type 1 관련기사, 2 관련기관, 3 관련 논문, 4 관련 척도
 * 컬럼명이 다를 경우 SELECT * 후 위 매핑으로 정규화합니다.
 */
export async function findContentBByType({ type, limit, offset }) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const safeOffset = Math.max(0, Number(offset) || 0);

  const [rows] = await dbPool.query(
    `
      SELECT *
      FROM content_b_db
      WHERE type = ?
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `,
    [type, safeLimit, safeOffset],
  );

  return rows.map((row) => normalizeContentRow(row)).filter(Boolean);
}
