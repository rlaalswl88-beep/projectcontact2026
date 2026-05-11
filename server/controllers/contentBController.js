import { findContentBByType } from '../repositories/contentBRepository.js';

export async function listContentBItems(req, res) {
  const type = Number.parseInt(req.query.type, 10);
  const requestedLimit = Number.parseInt(req.query.limit ?? '10', 10);
  const offset = Number.parseInt(req.query.offset ?? '0', 10);

  const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 10;
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;

  if (![1, 2, 3, 4].includes(type)) {
    res.status(400).json({ error: 'type은 1~4만 허용됩니다.' });
    return;
  }

  try {
    const fetchLimit = limit + 1;
    const rows = await findContentBByType({ type, limit: fetchLimit, offset: safeOffset });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    res.json({
      items,
      limit,
      offset: safeOffset,
      hasMore,
    });
  } catch (error) {
    console.error('[content-b]', error);
    res.status(500).json({ error: '자료를 불러오지 못했습니다.', detail: error.message });
  }
}
