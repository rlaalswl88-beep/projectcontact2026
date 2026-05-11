import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const outDir = path.join(root, 'output', 'ppt');
const tmpRoot = path.join(outDir, '_pptx_tmp');

const EMU = 914400;
const SLIDE_W = 13.333333;
const SLIDE_H = 7.5;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rm(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function emu(v) {
  return Math.round(v * EMU);
}

function color(hex) {
  return hex.replace('#', '').toUpperCase();
}

function textRuns(lines, opts = {}) {
  const size = Math.round((opts.size ?? 22) * 100);
  const c = color(opts.color ?? '#111111');
  const bold = opts.bold ? '<a:b/>' : '';
  const font = opts.font ?? 'Malgun Gothic';
  const bullet = opts.bullet ? '<a:buChar char="•"/>' : '<a:buNone/>';
  const body = lines.map((line) => `
        <a:p>
          <a:pPr marL="${opts.bullet ? 228600 : 0}" indent="${opts.bullet ? -171450 : 0}" algn="${opts.align ?? 'l'}">${bullet}</a:pPr>
          <a:r>
            <a:rPr lang="ko-KR" sz="${size}" dirty="0">${bold}<a:solidFill><a:srgbClr val="${c}"/></a:solidFill><a:latin typeface="${font}"/><a:ea typeface="${font}"/></a:rPr>
            <a:t>${esc(line)}</a:t>
          </a:r>
        </a:p>`).join('');
  return body || '<a:p/>';
}

function shapeXml(id, shape) {
  const x = emu(shape.x);
  const y = emu(shape.y);
  const w = emu(shape.w);
  const h = emu(shape.h);
  const fill = shape.fill
    ? `<a:solidFill><a:srgbClr val="${color(shape.fill)}"><a:alpha val="${Math.round((shape.alpha ?? 1) * 100000)}"/></a:srgbClr></a:solidFill>`
    : '<a:noFill/>';
  const line = shape.line
    ? `<a:ln w="${Math.round((shape.lineWidth ?? 1) * 12700)}"><a:solidFill><a:srgbClr val="${color(shape.line)}"/></a:solidFill></a:ln>`
    : '<a:ln><a:noFill/></a:ln>';
  const radius = shape.round ? 'roundRect' : 'rect';
  const paragraphs = Array.isArray(shape.text) ? shape.text : [shape.text ?? ''];
  return `
      <p:sp>
        <p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>
          <a:prstGeom prst="${radius}"><a:avLst/></a:prstGeom>
          ${fill}
          ${line}
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="${emu(shape.padX ?? 0.12)}" tIns="${emu(shape.padY ?? 0.08)}" rIns="${emu(shape.padX ?? 0.12)}" bIns="${emu(shape.padY ?? 0.08)}" anchor="${shape.valign ?? 'mid'}"/>
          <a:lstStyle/>
          ${textRuns(paragraphs, shape)}
        </p:txBody>
      </p:sp>`;
}

function arrowXml(id, a) {
  return `
      <p:cxnSp>
        <p:nvCxnSpPr><p:cNvPr id="${id}" name="Arrow ${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${emu(a.x)}" y="${emu(a.y)}"/><a:ext cx="${emu(a.w)}" cy="${emu(a.h)}"/></a:xfrm>
          <a:prstGeom prst="line"><a:avLst/></a:prstGeom>
          <a:ln w="${Math.round((a.lineWidth ?? 2) * 12700)}">
            <a:solidFill><a:srgbClr val="${color(a.color ?? '#ffffff')}"/></a:solidFill>
            <a:tailEnd type="triangle"/>
          </a:ln>
        </p:spPr>
      </p:cxnSp>`;
}

function slideXml(slide, index) {
  const bg = color(slide.bg ?? '#FFFFFF');
  let id = 2;
  const items = [];
  items.push(shapeXml(id++, {
    x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
    fill: slide.bg ?? '#ffffff',
    line: null,
    text: '',
  }));
  if (slide.accent) {
    items.push(shapeXml(id++, {
      x: 0, y: 0, w: 0.16, h: SLIDE_H,
      fill: slide.accent,
      line: null,
      text: '',
    }));
  }
  if (slide.title) {
    items.push(shapeXml(id++, {
      x: 0.65, y: 0.38, w: 12.0, h: 0.62,
      text: slide.title,
      size: 27,
      bold: true,
      color: slide.titleColor ?? '#ffffff',
      fill: null,
      line: null,
      valign: 'top',
      padX: 0,
      padY: 0,
    }));
  }
  (slide.shapes ?? []).forEach((shape) => items.push(shapeXml(id++, shape)));
  (slide.arrows ?? []).forEach((arrow) => items.push(arrowXml(id++, arrow)));

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="${bg}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      ${items.join('\n')}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function writeBaseParts(dir, slides) {
  ensureDir(path.join(dir, '_rels'));
  ensureDir(path.join(dir, 'docProps'));
  ensureDir(path.join(dir, 'ppt', '_rels'));
  ensureDir(path.join(dir, 'ppt', 'slides', '_rels'));
  ensureDir(path.join(dir, 'ppt', 'slides'));
  ensureDir(path.join(dir, 'ppt', 'slideMasters', '_rels'));
  ensureDir(path.join(dir, 'ppt', 'slideMasters'));
  ensureDir(path.join(dir, 'ppt', 'slideLayouts', '_rels'));
  ensureDir(path.join(dir, 'ppt', 'slideLayouts'));
  ensureDir(path.join(dir, 'ppt', 'theme'));

  const overrides = slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('');
  fs.writeFileSync(path.join(dir, '[Content_Types].xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${overrides}
</Types>`);

  fs.writeFileSync(path.join(dir, '_rels', '.rels'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);

  fs.writeFileSync(path.join(dir, 'docProps', 'core.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Isolation Project Deck</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-05-11T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-05-11T00:00:00Z</dcterms:modified>
</cp:coreProperties>`);

  fs.writeFileSync(path.join(dir, 'docProps', 'app.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex PPTX Generator</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slides.length}</Slides>
</Properties>`);

  const slideIds = slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('');
  fs.writeFileSync(path.join(dir, 'ppt', 'presentation.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${slideIds}</p:sldIdLst>
  <p:sldSz cx="${emu(SLIDE_W)}" cy="${emu(SLIDE_H)}" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);

  const presRels = [`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>`]
    .concat(slides.map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`))
    .join('');
  fs.writeFileSync(path.join(dir, 'ppt', '_rels', 'presentation.xml.rels'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presRels}</Relationships>`);

  fs.writeFileSync(path.join(dir, 'ppt', 'slideMasters', 'slideMaster1.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`);
  fs.writeFileSync(path.join(dir, 'ppt', 'slideMasters', '_rels', 'slideMaster1.xml.rels'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`);
  fs.writeFileSync(path.join(dir, 'ppt', 'slideLayouts', 'slideLayout1.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
  fs.writeFileSync(path.join(dir, 'ppt', 'slideLayouts', '_rels', 'slideLayout1.xml.rels'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`);
  fs.writeFileSync(path.join(dir, 'ppt', 'theme', 'theme1.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="CodexTheme"><a:themeElements><a:clrScheme name="Codex"><a:dk1><a:srgbClr val="101820"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1B263B"/></a:dk2><a:lt2><a:srgbClr val="F4F8FF"/></a:lt2><a:accent1><a:srgbClr val="37B7FF"/></a:accent1><a:accent2><a:srgbClr val="60D394"/></a:accent2><a:accent3><a:srgbClr val="FFD166"/></a:accent3><a:accent4><a:srgbClr val="EF476F"/></a:accent4><a:accent5><a:srgbClr val="8E7CFF"/></a:accent5><a:accent6><a:srgbClr val="06D6A0"/></a:accent6><a:hlink><a:srgbClr val="37B7FF"/></a:hlink><a:folHlink><a:srgbClr val="8E7CFF"/></a:folHlink></a:clrScheme><a:fontScheme name="Malgun"><a:majorFont><a:latin typeface="Malgun Gothic"/><a:ea typeface="Malgun Gothic"/></a:majorFont><a:minorFont><a:latin typeface="Malgun Gothic"/><a:ea typeface="Malgun Gothic"/></a:minorFont></a:fontScheme><a:fmtScheme name="Default"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme></a:themeElements></a:theme>`);

  slides.forEach((slide, i) => {
    fs.writeFileSync(path.join(dir, 'ppt', 'slides', `slide${i + 1}.xml`), slideXml(slide, i + 1));
    fs.writeFileSync(path.join(dir, 'ppt', 'slides', '_rels', `slide${i + 1}.xml.rels`), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`);
  });
}

function makeBullets(x, y, w, items, options = {}) {
  return {
    x, y, w, h: options.h ?? 4.8,
    text: items,
    size: options.size ?? 19,
    color: options.color ?? '#EAF6FF',
    fill: options.fill ?? null,
    line: options.line ?? null,
    bullet: true,
    valign: 'top',
    padX: 0.05,
    padY: 0.05,
  };
}

function makeDeck(slides, fileName) {
  ensureDir(outDir);
  const dir = path.join(tmpRoot, fileName.replace(/\.pptx$/, ''));
  rm(dir);
  ensureDir(dir);
  writeBaseParts(dir, slides);
  const zipPath = path.join(outDir, fileName);
  if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
  const tempZipPath = zipPath.replace(/\.pptx$/i, '.zip');
  if (fs.existsSync(tempZipPath)) fs.rmSync(tempZipPath, { force: true });
  const command = `Compress-Archive -Path "${dir}\\*" -DestinationPath "${tempZipPath}" -Force; Move-Item -Path "${tempZipPath}" -Destination "${zipPath}" -Force`;
  execFileSync('powershell', ['-NoProfile', '-Command', command], { stdio: 'inherit' });
  rm(dir);
  return zipPath;
}

const dark = '#101820';
const navy = '#13263A';
const blue = '#37B7FF';
const mint = '#60D394';
const yellow = '#FFD166';
const pink = '#EF476F';
const white = '#FFFFFF';
const pale = '#EAF6FF';

const presentationSlides = [
  {
    bg: dark, accent: blue, title: 'Isolation Project 발표 요약',
    shapes: [
      { x: 0.72, y: 1.45, w: 8.3, h: 1.2, text: ['DB · Backend · RAG 중심 구현 리뷰'], size: 30, bold: true, color: white, fill: null, line: null, valign: 'top' },
      { x: 0.78, y: 3.05, w: 4.0, h: 1.15, text: ['Aiven MySQL', '설문/응답/통계 데이터'], size: 18, color: dark, fill: blue, line: null, round: true },
      { x: 4.95, y: 3.05, w: 3.4, h: 1.15, text: ['Express API', '개인 결과 · 통계 · 채팅'], size: 18, color: dark, fill: mint, line: null, round: true },
      { x: 8.55, y: 3.05, w: 3.8, h: 1.15, text: ['RAG Moderation', 'Trie + GPT-4o mini'], size: 18, color: dark, fill: yellow, line: null, round: true },
      makeBullets(0.85, 5.0, 11.7, ['프론트는 시연 중심, 발표 자료는 데이터/백엔드 설계 중심', '쿠키 기반 개인화와 통계 API를 Step3 화면에 연결', '사용자 입력 채팅은 백엔드에서 검열 후 PASS만 노출'], { h: 1.5, size: 19 }),
    ],
  },
  {
    bg: navy, accent: mint, title: '전체 서비스 흐름',
    shapes: [
      { x: 0.7, y: 1.55, w: 2.1, h: 0.9, text: 'Step1 설문', size: 18, bold: true, color: dark, fill: blue, round: true },
      { x: 3.1, y: 1.55, w: 2.1, h: 0.9, text: 'DB 저장', size: 18, bold: true, color: dark, fill: mint, round: true },
      { x: 5.5, y: 1.55, w: 2.1, h: 0.9, text: '쿠키 발급', size: 18, bold: true, color: dark, fill: yellow, round: true },
      { x: 7.9, y: 1.55, w: 2.1, h: 0.9, text: 'Step2 개인화', size: 18, bold: true, color: dark, fill: blue, round: true },
      { x: 10.3, y: 1.55, w: 2.1, h: 0.9, text: 'Step3 결과', size: 18, bold: true, color: dark, fill: mint, round: true },
      makeBullets(0.85, 3.2, 5.6, ['survey_participants: 참여자 기본 정보, 총점, AI 분석', 'user_responses: scene_id별 응답 저장', 'scenes_metadata: 질문 라벨/타입/장면 코드 관리'], { h: 2.3 }),
      makeBullets(7.0, 3.2, 5.6, ['isolation_user_info 쿠키로 현재 사용자 식별', 'generation 값으로 B 콘텐츠 분기', '개인 결과/전체 통계/채팅 API를 Step3에서 조회'], { h: 2.3 }),
    ],
    arrows: [
      { x: 2.78, y: 1.98, w: 0.32, h: 0, color: pale },
      { x: 5.18, y: 1.98, w: 0.32, h: 0, color: pale },
      { x: 7.58, y: 1.98, w: 0.32, h: 0, color: pale },
      { x: 9.98, y: 1.98, w: 0.32, h: 0, color: pale },
    ],
  },
  {
    bg: dark, accent: yellow, title: 'DB 모델링 핵심',
    shapes: [
      { x: 0.8, y: 1.35, w: 2.8, h: 1.25, text: ['survey_participants', 'id, user_name, age, gender, total_score, result_analysis'], size: 15, color: dark, fill: blue, round: true },
      { x: 4.0, y: 1.35, w: 2.8, h: 1.25, text: ['user_responses', 'participant_id, scene_id, option_id, answer_text, feeling'], size: 15, color: dark, fill: mint, round: true },
      { x: 7.2, y: 1.35, w: 2.8, h: 1.25, text: ['scenes_metadata', 'scene_code, interaction_type, interaction_label'], size: 15, color: dark, fill: yellow, round: true },
      { x: 10.4, y: 1.35, w: 2.2, h: 1.25, text: ['scene_options', '선택형 보기 텍스트'], size: 15, color: dark, fill: '#F7F7F7', round: true },
      makeBullets(0.9, 3.35, 11.5, ['개인 결과: 쿠키 id -> participant -> response + scene + option 조인', '전체 통계: age 10단위, gender, scene, answer 기준으로 그룹화', '채팅: cheer_messages 테이블에서 PENDING/PASS/FAIL 상태 관리'], { h: 2.3 }),
    ],
  },
  {
    bg: navy, accent: blue, title: '개인 설문 결과 API',
    shapes: [
      makeBullets(0.8, 1.35, 5.7, ['GET /api/isolation/survey-results', '쿠키 isolation_user_info에서 participantId 추출', '현재 사용자 한 명의 질문/답변만 조회', 'total_score와 result_analysis를 함께 반환'], { h: 4.2 }),
      { x: 7.0, y: 1.42, w: 5.2, h: 1.0, text: '쿠키 id', size: 20, bold: true, color: dark, fill: blue, round: true },
      { x: 7.0, y: 2.75, w: 5.2, h: 1.0, text: 'survey_participants', size: 20, bold: true, color: dark, fill: mint, round: true },
      { x: 7.0, y: 4.08, w: 5.2, h: 1.0, text: 'user_responses + scenes_metadata', size: 18, bold: true, color: dark, fill: yellow, round: true },
      { x: 7.0, y: 5.42, w: 5.2, h: 1.0, text: '질문-답변 개인 리포트', size: 20, bold: true, color: dark, fill: white, round: true },
    ],
    arrows: [
      { x: 9.6, y: 2.43, w: 0, h: 0.32, color: pale },
      { x: 9.6, y: 3.76, w: 0, h: 0.32, color: pale },
      { x: 9.6, y: 5.09, w: 0, h: 0.32, color: pale },
    ],
  },
  {
    bg: dark, accent: mint, title: '전체 통계 API',
    shapes: [
      makeBullets(0.75, 1.25, 6.0, ['GET /api/isolation/statistics', 'age를 10단위 연령대로 묶고 gender와 함께 그룹화', 'choice는 option_id 기준 집계', 'input은 answer_text_feeling 값 G/B/S 기준 집계', 'count / totalResponses로 percentage 계산'], { h: 4.8 }),
      { x: 7.1, y: 1.32, w: 4.9, h: 1.05, text: ['graph', 'nodes / links'], size: 19, color: dark, fill: blue, round: true },
      { x: 7.1, y: 2.72, w: 4.9, h: 1.05, text: ['summary', 'questions / answers / percentage'], size: 18, color: dark, fill: mint, round: true },
      { x: 7.1, y: 4.12, w: 4.9, h: 1.05, text: ['step2Summary', 'ageGroup / gender / avgScore'], size: 18, color: dark, fill: yellow, round: true },
      { x: 7.1, y: 5.52, w: 4.9, h: 0.65, text: '한 API로 여러 시각화 재사용', size: 17, bold: true, color: white, fill: '#27435D', round: true },
    ],
  },
  {
    bg: navy, accent: pink, title: '따뜻한 한마디 RAG 검열 파이프라인',
    shapes: [
      { x: 0.75, y: 1.35, w: 2.2, h: 0.8, text: '입력 검증', size: 18, bold: true, color: dark, fill: white, round: true },
      { x: 3.25, y: 1.35, w: 2.2, h: 0.8, text: 'Trie 필터', size: 18, bold: true, color: dark, fill: yellow, round: true },
      { x: 5.75, y: 1.35, w: 2.2, h: 0.8, text: 'PENDING 저장', size: 18, bold: true, color: dark, fill: blue, round: true },
      { x: 8.25, y: 1.35, w: 2.2, h: 0.8, text: 'LLM RAG', size: 18, bold: true, color: dark, fill: mint, round: true },
      { x: 10.75, y: 1.35, w: 1.8, h: 0.8, text: 'DB 반영', size: 18, bold: true, color: dark, fill: white, round: true },
      makeBullets(0.9, 3.15, 11.4, ['1차 필터: slang.csv + LoL 필터 리스트 + 추가 금칙어를 fastscanner Trie로 검사', '2차 필터: messageRag.js 프롬프트와 GPT-4o mini로 문맥 분석', 'PASS 메시지만 목록 API에서 반환, 실패/파싱 오류는 안전하게 FAIL 처리'], { h: 2.4 }),
    ],
    arrows: [
      { x: 2.95, y: 1.75, w: 0.3, h: 0, color: pale },
      { x: 5.45, y: 1.75, w: 0.3, h: 0, color: pale },
      { x: 7.95, y: 1.75, w: 0.3, h: 0, color: pale },
      { x: 10.45, y: 1.75, w: 0.3, h: 0, color: pale },
    ],
  },
  {
    bg: dark, accent: blue, title: '검열 결과별 DB 처리',
    shapes: [
      { x: 0.85, y: 1.4, w: 3.6, h: 1.2, text: ['완전 통과', 'status = PASS'], size: 19, color: dark, fill: mint, round: true },
      { x: 4.85, y: 1.4, w: 3.6, h: 1.2, text: ['닉네임만 위반', '따뜻한마음 + PASS'], size: 19, color: dark, fill: yellow, round: true },
      { x: 8.85, y: 1.4, w: 3.6, h: 1.2, text: ['메시지 위반', 'status = FAIL'], size: 19, color: white, fill: pink, round: true },
      makeBullets(1.0, 3.45, 11.0, ['등록 API는 LLM 완료까지 기다리지 않고 202 Accepted 응답', '백그라운드 검열 완료 후 cheer_messages 상태 업데이트', '서버 시작 시 PENDING 메시지를 재처리해 중간 실패를 복구'], { h: 2.2 }),
    ],
  },
  {
    bg: navy, accent: yellow, title: '3D/인터랙션 프론트 설명',
    shapes: [
      makeBullets(0.85, 1.3, 5.8, ['Step2: 스크롤 상승 이벤트, 클릭 사운드, BGM, 전환 영상', '브라우저 자동재생 정책을 고려해 사용자 클릭 흐름에 오디오 연결', 'generation 쿠키 기반으로 B 콘텐츠 분기'], { h: 4.6 }),
      makeBullets(7.0, 1.3, 5.4, ['Step3 통계: 3D 그래프 아이디어를 모바일에 맞게 재해석', 'Matter.js로 참여자 1명당 입자 1개 생성', '문항별 상세는 원그래프로 응답 비율 표시'], { h: 4.6 }),
    ],
  },
  {
    bg: dark, accent: mint, title: '트러블슈팅 요약',
    shapes: [
      makeBullets(0.9, 1.2, 11.4, ['통계가 100개 예시 데이터로만 보이던 문제: API 실패 시에만 fallback 사용하도록 조건 분리', 'SCENE_0 개인정보 입력 문항 노출 문제: 통계/설문결과 화면에서 제외 처리', '주관식 통계 분산 문제: answer_text_feeling G/B/S로 정규화', 'LLM 실패/파싱 오류 문제: FAIL 기본값과 PENDING 복구 로직 적용', '소리 있는 미디어 자동재생 문제: 클릭 이벤트 기반 재생 흐름으로 전환'], { h: 5.2, size: 18 }),
    ],
  },
  {
    bg: navy, accent: blue, title: '발표 마무리',
    shapes: [
      { x: 0.9, y: 1.45, w: 11.4, h: 1.0, text: '데이터 저장 → API 재가공 → 개인화/통계/검열 UX로 연결', size: 27, bold: true, color: white, fill: null, line: null },
      makeBullets(1.0, 3.0, 11.0, ['DB/백엔드/RAG가 화면 시연의 근거가 되는 구조', '사용자 입력과 외부 AI API 실패를 고려한 안전한 상태 처리', '시각화는 모바일 시연에 맞춰 입자/원그래프 중심으로 최적화'], { h: 2.5, size: 20 }),
    ],
  },
];

const portfolioSlides = [
  {
    bg: '#0B1020', accent: blue, title: 'Portfolio Case Study',
    shapes: [
      { x: 0.8, y: 1.35, w: 10.8, h: 1.2, text: '설문 데이터 기반 인터랙티브 콘텐츠 플랫폼', size: 30, bold: true, color: white, fill: null, line: null },
      makeBullets(0.9, 3.0, 11.3, ['역할: DB 연동, 백엔드 API, RAG 검열, 통계 데이터 가공, 인터랙션 시각화 구현', '기술: React, Express, MySQL, OpenAI API, Matter.js, Three.js/React Three 기반 인터랙션', '성과: 개인화 결과/전체 통계/검열 채팅을 하나의 사용자 흐름으로 연결'], { h: 2.5, size: 19 }),
    ],
  },
  {
    bg: dark, accent: mint, title: '문제 정의와 해결 방향',
    shapes: [
      { x: 0.85, y: 1.35, w: 5.5, h: 4.7, text: ['문제', '설문 응답이 저장만 되고 서비스 경험으로 연결되지 않음', '주관식/선택형 데이터 구조가 달라 통계화가 어려움', '사용자 채팅 입력은 부적절 표현 노출 위험이 있음'], size: 20, color: white, fill: '#1D2E44', round: true, valign: 'top' },
      { x: 7.0, y: 1.35, w: 5.5, h: 4.7, text: ['해결', '쿠키 기반 개인화 API 설계', 'DB 조인 + 서비스 계층 가공으로 통계 payload 생성', 'Trie 필터 + GPT RAG 검열로 PASS 메시지만 노출'], size: 20, color: dark, fill: mint, round: true, valign: 'top' },
    ],
  },
  {
    bg: navy, accent: blue, title: '시스템 아키텍처',
    shapes: [
      { x: 0.7, y: 1.25, w: 2.2, h: 0.85, text: 'React Step UI', size: 17, bold: true, color: dark, fill: blue, round: true },
      { x: 3.55, y: 1.25, w: 2.2, h: 0.85, text: 'Express API', size: 17, bold: true, color: dark, fill: mint, round: true },
      { x: 6.4, y: 1.25, w: 2.2, h: 0.85, text: 'Aiven MySQL', size: 17, bold: true, color: dark, fill: yellow, round: true },
      { x: 9.25, y: 1.25, w: 2.2, h: 0.85, text: 'OpenAI API', size: 17, bold: true, color: dark, fill: white, round: true },
      makeBullets(0.9, 3.0, 11.0, ['프론트는 설문/개인화/통계/채팅 화면을 담당', '백엔드는 DB row를 목적별 응답 구조로 재가공', 'RAG 검열은 외부 AI API 실패를 고려해 fail-safe 정책 적용'], { h: 2.6 }),
    ],
    arrows: [
      { x: 2.9, y: 1.67, w: 0.65, h: 0, color: pale },
      { x: 5.75, y: 1.67, w: 0.65, h: 0, color: pale },
      { x: 8.6, y: 1.67, w: 0.65, h: 0, color: pale },
    ],
  },
  {
    bg: dark, accent: yellow, title: 'DB 모델링과 조인 전략',
    shapes: [
      makeBullets(0.75, 1.25, 6.0, ['survey_participants: 사용자 단위 결과 저장', 'user_responses: scene_id 기준 응답 저장', 'scenes_metadata: 질문 라벨과 interaction_type 관리', 'scene_options: 선택형 보기 텍스트 관리'], { h: 4.8 }),
      makeBullets(7.0, 1.25, 5.4, ['개인 결과는 participantId 기준으로 조인', '전체 통계는 age/gender/scene/answer 기준으로 그룹화', '입력용 장면과 통계 대상 장면을 분리'], { h: 4.8 }),
    ],
  },
  {
    bg: navy, accent: mint, title: '개인 설문 결과 API 설계',
    shapes: [
      { x: 0.85, y: 1.25, w: 3.0, h: 0.85, text: 'Cookie id', size: 18, bold: true, color: dark, fill: blue, round: true },
      { x: 4.15, y: 1.25, w: 3.0, h: 0.85, text: 'Participant', size: 18, bold: true, color: dark, fill: mint, round: true },
      { x: 7.45, y: 1.25, w: 3.0, h: 0.85, text: 'Answers', size: 18, bold: true, color: dark, fill: yellow, round: true },
      makeBullets(0.95, 3.0, 11.0, ['현재 사용자 한 명의 질문/답변만 조회', 'choice는 option_text, input은 answer_text로 응답값 반환', 'total_score와 result_analysis를 상단 리포트 데이터로 함께 제공'], { h: 2.6 }),
    ],
    arrows: [
      { x: 3.85, y: 1.67, w: 0.3, h: 0, color: pale },
      { x: 7.15, y: 1.67, w: 0.3, h: 0, color: pale },
    ],
  },
  {
    bg: dark, accent: blue, title: '통계 API와 데이터 가공',
    shapes: [
      makeBullets(0.85, 1.2, 11.2, ['SQL: 연령대/성별/장면/답변 단위 집계', 'Service: graph.nodes, graph.links, summary.questions 구조로 재가공', 'percentage: 질문 전체 응답 수 대비 선택 수로 계산', '프론트: 같은 응답으로 입자 시각화와 원그래프를 동시에 구성'], { h: 4.6, size: 20 }),
    ],
  },
  {
    bg: navy, accent: pink, title: 'RAG 하이브리드 검열',
    shapes: [
      { x: 0.8, y: 1.25, w: 3.0, h: 1.2, text: ['1차', 'Trie 리스트 필터'], size: 20, color: dark, fill: yellow, round: true },
      { x: 5.1, y: 1.25, w: 3.0, h: 1.2, text: ['2차', 'GPT-4o mini RAG'], size: 20, color: dark, fill: mint, round: true },
      { x: 9.4, y: 1.25, w: 3.0, h: 1.2, text: ['최종', 'DB 상태 반영'], size: 20, color: dark, fill: blue, round: true },
      makeBullets(0.9, 3.45, 11.1, ['명확한 금칙어는 LLM 비용 없이 즉시 차단', '애매한 문맥은 프롬프트 기준으로 JSON result/target 판정', '닉네임만 위반하면 대체 닉네임으로 메시지는 살림'], { h: 2.4 }),
    ],
    arrows: [
      { x: 3.8, y: 1.85, w: 1.3, h: 0, color: pale },
      { x: 8.1, y: 1.85, w: 1.3, h: 0, color: pale },
    ],
  },
  {
    bg: dark, accent: mint, title: '안정성 설계',
    shapes: [
      makeBullets(0.9, 1.2, 11.2, ['LLM API 실패, JSON.parse 실패, 네트워크 오류는 기본 FAIL 처리', '등록 응답은 빠르게 반환하고 검열은 백그라운드 비동기로 실행', '서버 재시작 시 PENDING 메시지를 재처리해 상태 불일치 복구', '목록 조회는 PASS만 반환해 부적절 메시지 노출 차단'], { h: 4.8, size: 20 }),
    ],
  },
  {
    bg: navy, accent: yellow, title: '개인화 기능',
    shapes: [
      makeBullets(0.85, 1.25, 5.6, ['isolation_user_info 쿠키 사용', 'id: 개인 설문 결과와 내 메시지 조회', 'generation: Step2 B 콘텐츠 분기', 'gender/name: 설문 흐름 정보 유지'], { h: 4.5 }),
      makeBullets(7.0, 1.25, 5.5, ['내 메시지는 오른쪽 정렬', '타인 메시지는 왼쪽 정렬', '내가 쓴 메시지 보기 모달 제공', '사용자는 익명성을 유지하면서 개인 작성 내역 확인'], { h: 4.5 }),
    ],
  },
  {
    bg: dark, accent: blue, title: '데이터 시각화',
    shapes: [
      { x: 0.9, y: 1.25, w: 5.2, h: 4.6, text: ['참여자 입자 시각화', '참여자 1명 = 입자 1개', 'Matter.js 물리 엔진', '위에서 떨어져 쌓이는 움직임', '전체 참여 규모 직관화'], size: 20, color: white, fill: '#1D2E44', round: true, valign: 'top' },
      { x: 7.1, y: 1.25, w: 5.2, h: 4.6, text: ['문항별 원그래프', 'choice: option별 비율', 'input: 긍정/부정/중립 비율', '썸네일 기반 문항 선택', '상세 수치와 percentage 표시'], size: 20, color: dark, fill: mint, round: true, valign: 'top' },
    ],
  },
  {
    bg: navy, accent: pink, title: '트러블슈팅',
    shapes: [
      makeBullets(0.85, 1.15, 11.3, ['API 실패와 fallback 데이터 혼용 문제: 성공 응답일 때만 DB 데이터 사용', 'SCENE_0 통계 노출 문제: 개인정보 입력 장면 제외', '주관식 통계 분산 문제: answer_text_feeling 도입', 'LLM 검열 중단 문제: PENDING 상태와 재처리 로직 추가', '오디오 자동재생 문제: 클릭 이벤트 체인에 연결'], { h: 5.2, size: 18 }),
    ],
  },
  {
    bg: dark, accent: yellow, title: '코드 좌표',
    shapes: [
      makeBullets(0.75, 1.05, 5.9, ['server/config/db.js', 'server/repositories/surveyResultRepository.js', 'server/services/surveyResultService.js', 'server/repositories/statisticsRepository.js', 'server/services/statisticsService.js'], { h: 5.3, size: 18 }),
      makeBullets(7.0, 1.05, 5.7, ['server/services/warmMessageService.js', 'server/prompts/messageRag.js', 'server/utils/fastscanner.js', 'server/controllers/warmMessageController.js', 'src/components/contents/stepC/Layering.jsx'], { h: 5.3, size: 18 }),
    ],
  },
  {
    bg: navy, accent: mint, title: '내가 구현한 핵심 가치',
    shapes: [
      makeBullets(0.9, 1.25, 11.2, ['데이터 저장에서 끝나는 설문이 아니라, 개인 결과/전체 통계/채팅으로 확장되는 구조 구현', 'AI API를 단순 호출하지 않고, 리스트 필터와 상태 머신을 결합해 운영 가능한 검열 흐름 설계', '시연 가능한 프론트 인터랙션과 백엔드 데이터 구조를 연결'], { h: 4.2, size: 21 }),
    ],
  },
  {
    bg: '#0B1020', accent: blue, title: '마무리',
    shapes: [
      { x: 0.9, y: 1.4, w: 11.4, h: 1.25, text: 'Full-stack data experience', size: 34, bold: true, color: white, fill: null, line: null },
      makeBullets(1.0, 3.25, 10.9, ['DB 설계와 API 가공', 'RAG 기반 사용자 입력 검열', '모바일 시연에 최적화된 데이터 시각화'], { h: 2.3, size: 23 }),
    ],
  },
];

const threeDSlides = [
  {
    bg: '#07111F', accent: blue, title: '3D Frontend Architecture',
    shapes: [
      { x: 0.8, y: 1.35, w: 11.0, h: 1.15, text: 'Step2 3D 인터랙션과 통계 시각화 설계', size: 31, bold: true, color: white, fill: null, line: null },
      makeBullets(0.9, 3.05, 11.1, ['Three.js 기반 WebGL 렌더링을 React 구조 안에 통합', 'React Three Fiber로 3D 씬을 컴포넌트처럼 선언', 'Drei의 ScrollControls/Environment로 스크롤과 분위기 연출', '통계는 3D 그래프 구조를 고려하되 모바일 시연성 때문에 Matter.js로 전환'], { h: 2.8, size: 20 }),
    ],
  },
  {
    bg: dark, accent: mint, title: '사용 라이브러리와 역할',
    shapes: [
      { x: 0.85, y: 1.25, w: 3.6, h: 1.25, text: ['three', '3D 오브젝트, 카메라, 조명, 머티리얼 기반'], size: 17, color: dark, fill: blue, round: true },
      { x: 4.85, y: 1.25, w: 3.6, h: 1.25, text: ['@react-three/fiber', 'React 컴포넌트 방식의 WebGL 씬 구성'], size: 17, color: dark, fill: mint, round: true },
      { x: 8.85, y: 1.25, w: 3.6, h: 1.25, text: ['@react-three/drei', 'ScrollControls, Environment 등 보조 기능'], size: 17, color: dark, fill: yellow, round: true },
      { x: 2.85, y: 3.3, w: 3.6, h: 1.25, text: ['react-force-graph-3d', '노드/링크 통계 그래프 확장 고려'], size: 17, color: dark, fill: white, round: true },
      { x: 6.85, y: 3.3, w: 3.6, h: 1.25, text: ['Matter.js', '최종 모바일 통계 입자 물리 시각화'], size: 17, color: white, fill: '#2D5B7C', round: true },
      makeBullets(1.0, 5.35, 11.0, ['코드 좌표: src/components/contents/stepB/Scrolling.jsx, src/components/contents/stepC/Layering.jsx'], { h: 0.7, size: 17 }),
    ],
  },
  {
    bg: navy, accent: blue, title: 'Step2 3D 씬 구성',
    shapes: [
      { x: 0.75, y: 1.25, w: 2.3, h: 0.85, text: 'Canvas', size: 18, bold: true, color: dark, fill: blue, round: true },
      { x: 3.55, y: 1.25, w: 2.3, h: 0.85, text: 'Camera', size: 18, bold: true, color: dark, fill: mint, round: true },
      { x: 6.35, y: 1.25, w: 2.3, h: 0.85, text: 'Lights', size: 18, bold: true, color: dark, fill: yellow, round: true },
      { x: 9.15, y: 1.25, w: 2.3, h: 0.85, text: 'Bubbles', size: 18, bold: true, color: dark, fill: white, round: true },
      makeBullets(0.9, 3.05, 11.3, ['Canvas가 WebGL 렌더링 영역을 생성', 'camera position, fov, near/far 값으로 수중 깊이감 구성', 'ambientLight, pointLight, Environment로 어두운 수중 분위기 연출', 'Bubbles 컴포넌트가 instancedMesh 기반 3D 입자를 담당'], { h: 2.8, size: 19 }),
    ],
    arrows: [
      { x: 3.05, y: 1.68, w: 0.5, h: 0, color: pale },
      { x: 5.85, y: 1.68, w: 0.5, h: 0, color: pale },
      { x: 8.65, y: 1.68, w: 0.5, h: 0, color: pale },
    ],
  },
  {
    bg: dark, accent: yellow, title: 'useFrame 기반 애니메이션',
    shapes: [
      makeBullets(0.85, 1.25, 5.9, ['useFrame은 매 렌더 프레임마다 실행', 'scroll.delta, wheel input, pointer motion을 합산', 'inputPower → targetEnergy → visibility 계산', '버블의 z/y 위치와 scale을 계속 갱신'], { h: 4.8, size: 19 }),
      { x: 7.0, y: 1.35, w: 4.8, h: 0.85, text: 'Input', size: 18, bold: true, color: dark, fill: blue, round: true },
      { x: 7.0, y: 2.55, w: 4.8, h: 0.85, text: 'Energy', size: 18, bold: true, color: dark, fill: mint, round: true },
      { x: 7.0, y: 3.75, w: 4.8, h: 0.85, text: 'Transform', size: 18, bold: true, color: dark, fill: yellow, round: true },
      { x: 7.0, y: 4.95, w: 4.8, h: 0.85, text: 'Render Update', size: 18, bold: true, color: dark, fill: white, round: true },
    ],
    arrows: [
      { x: 9.4, y: 2.2, w: 0, h: 0.34, color: pale },
      { x: 9.4, y: 3.4, w: 0, h: 0.34, color: pale },
      { x: 9.4, y: 4.6, w: 0, h: 0.34, color: pale },
    ],
  },
  {
    bg: navy, accent: mint, title: 'instancedMesh 성능 최적화',
    shapes: [
      { x: 0.85, y: 1.25, w: 5.6, h: 4.8, text: ['문제', '버블을 각각 mesh로 만들면 오브젝트 수만큼 draw 비용 증가', 'React 컴포넌트가 많아질수록 모바일 렌더링 부담 증가', '투명 구체는 겹침 처리도 비용이 커질 수 있음'], size: 20, color: white, fill: '#1D2E44', round: true, valign: 'top' },
      { x: 7.0, y: 1.25, w: 5.6, h: 4.8, text: ['해결', '같은 sphereGeometry와 material 공유', 'THREE.Object3D dummy로 transform 계산', 'mesh.setMatrixAt(index, matrix)로 인스턴스별 위치 갱신', 'instanceMatrix.needsUpdate로 GPU 반영'], size: 20, color: dark, fill: mint, round: true, valign: 'top' },
    ],
  },
  {
    bg: dark, accent: blue, title: '사용자 입력과 3D 반응 연결',
    shapes: [
      { x: 0.8, y: 1.25, w: 2.8, h: 0.9, text: '스크롤', size: 20, bold: true, color: dark, fill: blue, round: true },
      { x: 4.0, y: 1.25, w: 2.8, h: 0.9, text: '포인터', size: 20, bold: true, color: dark, fill: mint, round: true },
      { x: 7.2, y: 1.25, w: 2.8, h: 0.9, text: '클릭', size: 20, bold: true, color: dark, fill: yellow, round: true },
      { x: 10.4, y: 1.25, w: 2.0, h: 0.9, text: '전환', size: 20, bold: true, color: dark, fill: white, round: true },
      makeBullets(0.95, 3.05, 11.2, ['스크롤 속도가 빨라질수록 버블의 움직임과 visibility 증가', '마우스 위치에 따라 group rotation/position을 보간해 공간감 부여', '특정 클릭 이벤트에서 B_click.mp3를 재생하고 상승 이벤트 시작', '상승 이벤트 종료 후 C_B_VID.mp4를 재생하고 Step3로 이동'], { h: 2.8, size: 19 }),
    ],
  },
  {
    bg: navy, accent: yellow, title: '3D 그래프 설계와 전환 이유',
    shapes: [
      makeBullets(0.85, 1.2, 5.8, ['초기 요구: react-force-graph-3d 기반 포스 그래프', '백엔드: graph.nodes / graph.links 구조 제공', '연령대, 성별, 문항, 답변을 노드/링크로 표현 가능'], { h: 4.8, size: 19 }),
      makeBullets(7.0, 1.2, 5.5, ['최종 전환: 모바일 세로형 화면에서 3D 그래프는 정보 판독성이 낮음', '참여자 수는 Matter.js 입자로 직관화', '문항별 응답 비율은 원그래프로 명확하게 전달'], { h: 4.8, size: 19 }),
    ],
  },
  {
    bg: dark, accent: mint, title: '발표용 핵심 문장',
    shapes: [
      { x: 0.9, y: 1.25, w: 11.2, h: 1.35, text: 'Three.js를 직접 쓰기보다 React Three Fiber를 사용해 3D 씬을 React 컴포넌트 구조 안에 통합했습니다.', size: 22, bold: true, color: white, fill: '#1D2E44', round: true },
      { x: 0.9, y: 3.0, w: 11.2, h: 1.35, text: 'useFrame으로 스크롤, 휠, 포인터 입력을 매 프레임 계산해 3D 버블의 위치와 반응성을 제어했습니다.', size: 22, bold: true, color: dark, fill: mint, round: true },
      { x: 0.9, y: 4.75, w: 11.2, h: 1.35, text: '다수의 버블은 instancedMesh로 렌더링해 모바일 환경에서도 성능 부담을 줄였습니다.', size: 22, bold: true, color: dark, fill: yellow, round: true },
    ],
  },
  {
    bg: '#07111F', accent: blue, title: '코드 캡처 좌표',
    shapes: [
      makeBullets(0.85, 1.2, 11.3, ['src/components/contents/stepB/Scrolling.jsx: import Canvas, useFrame, useThree, THREE', 'src/components/contents/stepB/Scrolling.jsx: Bubbles 컴포넌트', 'src/components/contents/stepB/Scrolling.jsx: BubbleField Canvas 설정', 'src/components/contents/stepB/Scrolling.jsx: instancedMesh / sphereGeometry / meshPhysicalMaterial', 'src/components/contents/stepC/Layering.jsx: Matter.js 참여자 입자 시각화'], { h: 5.0, size: 19 }),
    ],
  },
];

rm(tmpRoot);
const made = [
  makeDeck(presentationSlides, 'isolation_presentation_deck.pptx'),
  makeDeck(portfolioSlides, 'isolation_portfolio_deck.pptx'),
  makeDeck(threeDSlides, 'isolation_3d_frontend_deck.pptx'),
];
rm(tmpRoot);

console.log(made.join('\n'));
