# 프로젝트 발표 기반 자료

## 1. 프로젝트 핵심 요약

본 프로젝트는 사용자가 설문에 참여한 뒤, 쿠키와 DB 데이터를 기반으로 개인화된 콘텐츠, 개인 설문 결과, 전체 통계, 따뜻한 한마디 채팅방을 제공하는 인터랙티브 웹 콘텐츠입니다.

프론트엔드는 시연 중심으로 구성하고, 백엔드는 Aiven MySQL에 저장된 설문 참여자/응답/장면 메타데이터를 조인하여 개인 결과와 전체 통계를 API로 제공합니다. 또한 채팅 메시지는 욕설 리스트 기반 1차 필터와 LLM RAG 기반 2차 필터를 거쳐 DB에 저장되며, 통과한 메시지만 화면에 노출되도록 설계했습니다.

발표에서 강조할 수 있는 기술 포인트는 다음과 같습니다.

- MySQL 기반 설문 데이터 모델링 및 조인 API 구성
- 쿠키의 `isolation_user_info` 값을 활용한 개인화 조회
- 연령대/성별/문항/답변 유형별 통계 집계
- 주관식 감정 태그 `G/B/S`를 긍정/부정/중립 통계로 변환
- RAG 프롬프트와 OpenAI API를 활용한 하이브리드 메시지 검열
- 비동기 검열 상태 처리 및 서버 재시작 시 `PENDING` 메시지 복구
- Three.js, React Three Fiber, Drei 기반 Step2 3D 인터랙션
- Matter.js 기반 참여자 수 시각화와 통계 원그래프 UI
- Step2 3D 인터랙션, 오디오, 전환 영상, Step3 콘텐츠 모달 연동

---

## 2. 전체 데이터 흐름

### 사용자 진입 흐름

1. 사용자는 Step1에서 설문을 진행합니다.
2. 설문 참여자 정보가 `survey_participants`에 저장됩니다.
3. 각 장면별 응답은 `user_responses`에 저장됩니다.
4. 프론트는 `isolation_user_info` 쿠키에 저장된 `id`, `name`, `generation`, `gender` 값을 기준으로 개인 데이터를 조회합니다.
5. Step2에서는 `generation` 값에 따라 B 콘텐츠를 다르게 보여줍니다.
6. Step3에서는 설문 결과, 전체 통계, 채팅 메시지를 API로 불러옵니다.

### 주요 DB 테이블

| 테이블 | 역할 |
|---|---|
| `survey_participants` | 설문 참여자 기본 정보, 총점, AI 분석 결과 저장 |
| `user_responses` | 참여자별 장면 응답 저장 |
| `scenes_metadata` | 장면 번호, 질문 라벨, 입력 타입 메타데이터 저장 |
| `scene_options` | 선택형 문항의 보기 텍스트 저장 |
| `cheer_messages` | 따뜻한 한마디 메시지와 검열 상태 저장 |

---

## 3. 백엔드 구조

### 서버 진입점

코드 위치: `server/index.js`

Express 서버는 기능별 라우트를 분리해 등록합니다.

- `/api/health`: 서버 및 DB 상태 확인
- `/api/scenes`: 장면 메타데이터 조회
- `/api/isolation`: 설문 분석, 개인 결과, 전체 통계 API
- `/api/content-b`: B 콘텐츠 데이터 API
- `/api/warm`: 따뜻한 한마디 채팅 API

서버 시작 시 `reprocessPendingWarmMessages()`를 실행해, 이전 실행 중 LLM 검열이 끝나지 않고 `PENDING` 상태로 남은 메시지를 다시 처리합니다. 이 구조는 서버 재시작이나 API 실패 후에도 데이터 상태가 방치되지 않도록 만든 복구 로직입니다.

### DB 연결

코드 위치: `server/config/db.js`

MySQL 연결은 `mysql2/promise` 기반 커넥션 풀로 구성했습니다. DB 접속 정보는 `.env` 값을 우선 사용하고, 없을 경우 Aiven 기본 접속 정보를 fallback으로 사용합니다.

발표 포인트:

- 단일 커넥션이 아니라 pool을 사용해 여러 API 요청을 안정적으로 처리
- `async/await` 기반 쿼리 실행
- SSL 옵션을 사용해 Aiven MySQL 접속 지원

---

## 4. 개인 설문 결과 API

### API 목적

Step3의 설문 결과 화면에서 “현재 쿠키에 등록된 사용자 한 명”의 응답만 조회합니다.

API 위치:

- 라우트: `server/routes/isolationRoutes.js`
- 컨트롤러: `server/controllers/surveyResultController.js`
- 서비스: `server/services/surveyResultService.js`
- 쿼리: `server/repositories/surveyResultRepository.js`

### 처리 흐름

1. `isolation_user_info` 쿠키를 읽습니다.
2. 쿠키 안의 `id` 값을 `participantId`로 변환합니다.
3. `survey_participants`에서 참여자 이름, 나이, 성별, 총점, AI 분석 결과를 조회합니다.
4. `scenes_metadata`, `user_responses`, `scene_options`를 조인합니다.
5. `interaction_type`이 `none`인 장면은 제외하고, 실제 질문/답변만 반환합니다.
6. 프론트는 `SCENE_0`처럼 개인정보 입력용 장면을 추가로 제외해 발표용 설문 카드에 표시하지 않습니다.

### 주요 쿼리 설명

코드 위치: `server/repositories/surveyResultRepository.js`

`findSurveyResultRowsByParticipantId(participantId)`는 다음 데이터를 한 번에 가져옵니다.

- 장면 정보: `scene_id`, `scene_code`, `scene_title`
- 질문 정보: `interaction_type`, `interaction_key`, `interaction_label`
- 응답 정보: `option_id`, `option_text`, `answer_text`
- 참여자 정보: `user_name`, `age`, `gender`, `total_score`, `result_analysis`

### 발표용 문장

개인 설문 결과는 전체 응답을 단순히 나열하는 방식이 아니라, 쿠키의 사용자 ID를 기준으로 `survey_participants`와 `user_responses`를 조인해 현재 사용자의 응답만 재구성했습니다. 선택형 문항은 `scene_options.option_text`를, 주관식 문항은 `answer_text`를 반환하도록 분기하여 질문-답변 형태의 개인 리포트를 만들었습니다.

---

## 5. 전체 통계 API

### API 목적

전체 통계 화면에서 연령대, 성별, 문항, 답변 유형별 응답 분포를 조회하고, 프론트에서 입자 시각화와 원그래프를 그릴 수 있는 데이터를 제공합니다.

API 위치:

- 라우트: `server/routes/isolationRoutes.js`
- 컨트롤러: `server/controllers/statisticsController.js`
- 서비스: `server/services/statisticsService.js`
- 쿼리: `server/repositories/statisticsRepository.js`

### DB 집계 기준

코드 위치: `server/repositories/statisticsRepository.js`

`findSurveyStatisticsRows()`는 다음 기준으로 데이터를 집계합니다.

- `survey_participants.age`를 10단위 연령대로 그룹화
- `survey_participants.gender`와 함께 그룹화
- `user_responses`와 `scenes_metadata`를 조인
- 선택형(`choice`)은 `option_id` 기준으로 집계
- 주관식(`input`)은 `answer_text_feeling` 기준으로 집계
- `answer_text_feeling` 값은 `G`, `B`, `S`를 각각 긍정, 부정, 중립으로 해석

### 백엔드 가공 로직

코드 위치: `server/services/statisticsService.js`

`buildStatisticsPayload()`는 SQL 결과 row를 프론트에서 바로 쓰기 좋은 구조로 변환합니다.

반환 데이터는 크게 두 가지입니다.

- `graph`: 노드/링크 기반 시각화용 데이터
- `summary`: 질문별 원그래프와 상세 통계용 데이터

`aggregateQuestionAnswers()`는 같은 질문의 같은 답변을 합산하고, 각 답변 비율을 계산합니다.

비율 계산 방식:

```text
percentage = 해당 답변 선택 수 / 해당 질문 전체 응답 수 * 100
```

### 발표용 문장

전체 통계 API는 단순한 SELECT 결과를 그대로 내려주지 않고, DB에서 1차 집계한 결과를 서비스 계층에서 다시 노드 그래프와 질문별 요약 통계로 재구성했습니다. 이를 통해 같은 API 응답으로 참여자 입자 시각화, 문항별 원그래프, 연령대/성별 기반 요약 데이터를 동시에 사용할 수 있도록 설계했습니다.

---

## 6. 주관식 감정 통계 처리

### 문제 상황

주관식 답변은 텍스트가 자유롭게 입력되기 때문에, 선택형 문항처럼 동일한 보기 기준으로 바로 통계를 내기 어렵습니다.

### 해결 방식

`user_responses.answer_text_feeling` 컬럼을 추가하고, 주관식 답변의 감정 분류 값을 저장했습니다.

분류 기준:

| 저장 값 | 의미 |
|---|---|
| `G` | 긍정 |
| `B` | 부정 |
| `S` | 중립 |

통계 API는 `input` 타입 문항일 경우 `answer_text` 자체를 집계하지 않고, `answer_text_feeling` 값을 기준으로 집계합니다.

### 발표용 문장

주관식 응답은 원문 텍스트를 그대로 집계하면 답변이 모두 흩어지는 문제가 있었습니다. 그래서 `answer_text_feeling` 컬럼을 통해 주관식 답변을 긍정, 부정, 중립으로 정규화하고, 선택형 문항과 동일한 통계 구조 안에서 비율을 계산할 수 있게 만들었습니다.

---

## 7. 따뜻한 한마디 RAG 검열 시스템

### 기능 목적

사용자가 채팅방에 메시지를 남길 때, 부적절한 닉네임이나 메시지가 화면에 노출되지 않도록 자동 검열합니다.

API 위치:

- 라우트: `server/routes/warmMessageRoutes.js`
- 컨트롤러: `server/controllers/warmMessageController.js`
- 서비스: `server/services/warmMessageService.js`
- 레포지토리: `server/repositories/warmMessageRepository.js`
- 프롬프트: `server/prompts/messageRag.js`
- Trie 유틸: `server/utils/fastscanner.js`

### 전체 처리 순서

1. 프론트에서 닉네임과 메시지를 입력합니다.
2. 백엔드에서 빈 문자열을 먼저 검사합니다.
3. `fastscanner` 기반 1차 리스트 필터가 닉네임과 메시지를 검사합니다.
4. 리스트에 걸리면 LLM 호출 없이 즉시 `FAIL` 처리합니다.
5. 리스트를 통과한 메시지만 DB에 `PENDING` 상태로 저장합니다.
6. 백그라운드에서 GPT-4o mini 기반 RAG 검열을 실행합니다.
7. LLM 결과에 따라 DB 상태를 `PASS` 또는 `FAIL`로 업데이트합니다.
8. 프론트는 `PASS` 메시지만 조회해 화면에 표시합니다.

### 1차 필터: Trie 리스트 필터

코드 위치: `server/services/warmMessageService.js`, `server/utils/fastscanner.js`

사용 데이터:

- `server/data/slang.csv`
- `server/data/리그오브레전드_필터링리스트_2020.txt`
- 서비스 내부 추가 필터 단어 목록

Trie 기반 검색을 사용한 이유:

- 금칙어 리스트가 많아져도 문자열 포함 여부를 빠르게 검사할 수 있습니다.
- 명확하게 부적절한 표현은 LLM 비용 없이 즉시 차단할 수 있습니다.
- 닉네임과 메시지를 분리 검사해 서로 다른 경고 문구를 줄 수 있습니다.

처리 결과:

- 닉네임 위반: `사용할 수 없는 닉네임입니다`
- 메시지 위반: `커뮤니티 가이드라인에 맞지 않는 표현이 포함되어 있습니다.`

### 2차 필터: LLM RAG 문맥 분석

코드 위치: `server/services/warmMessageService.js`, `server/prompts/messageRag.js`

리스트 필터를 통과한 메시지는 GPT-4o mini로 문맥 검열을 수행합니다.

사용 방식:

- `WARM_CHAT_FILTER_SYSTEM_PROMPT`로 검열 기준 설정
- `buildWarmFilterPrompt()`로 닉네임/메시지/RAG 기준 문맥 삽입
- OpenAI Chat Completions API 호출
- `response_format: { type: 'json_object' }`로 JSON 응답 강제
- `JSON.parse()`로 `result`, `target` 추출

기대 응답 형식:

```json
{
  "result": "PASS",
  "target": "none"
}
```

### DB 업데이트 정책

코드 위치: `server/services/warmMessageService.js`

| 케이스 | 처리 |
|---|---|
| 완전 통과 | `status = PASS` |
| 닉네임만 위반 | 닉네임을 `따뜻한마음`으로 교체하고 `status = PASS` |
| 메시지 위반 | `status = FAIL` |
| 닉네임과 메시지 모두 위반 | `status = FAIL` |
| LLM API 실패 또는 JSON 파싱 실패 | 안전하게 `FAIL` |

### 비동기 처리 구조

메시지 등록 API는 사용자의 응답 속도를 위해 LLM 검열 완료까지 기다리지 않습니다.

처리 방식:

1. 리스트 필터를 통과하면 메시지를 `PENDING`으로 DB에 저장합니다.
2. 클라이언트에는 `202 Accepted`와 함께 등록 접수 결과를 반환합니다.
3. 서버 백그라운드에서 LLM 검열을 수행합니다.
4. 검열 완료 후 DB 상태만 업데이트합니다.
5. 목록 조회 API는 `PASS` 메시지만 반환합니다.

### 발표용 문장

따뜻한 한마디 채팅방은 단순한 프론트 필터가 아니라, 백엔드에서 리스트 기반 정적 필터와 LLM 기반 문맥 필터를 결합한 하이브리드 검열 구조로 설계했습니다. 명확한 금칙어는 Trie 검색으로 빠르게 차단하고, 애매한 문맥은 RAG 프롬프트를 사용한 GPT-4o mini 분석으로 판별했습니다. 또한 LLM 장애나 파싱 실패 시에는 안전하게 `FAIL`로 처리해 부적절한 메시지가 노출되지 않도록 했습니다.

---

## 8. 따뜻한 한마디 개인화 조회

### 기능 목적

채팅방에서 내가 쓴 메시지와 다른 사람이 쓴 메시지를 구분하고, 내가 작성한 메시지만 따로 조회할 수 있게 했습니다.

관련 코드:

- 백엔드 쿠키 파싱: `server/controllers/warmMessageController.js`
- 메시지 저장/조회: `server/repositories/warmMessageRepository.js`
- 프론트 채팅 UI: `src/components/contents/stepC/Layering.jsx`

### 처리 방식

- `isolation_user_info` 쿠키에서 `id`를 읽어 `user_id`로 저장합니다.
- 전체 메시지 목록은 `PASS` 상태만 반환합니다.
- 내 메시지 조회 API는 쿠키의 `user_id`와 일치하는 메시지만 반환합니다.
- 프론트는 `userId === currentUserId`일 경우 오른쪽 정렬, 타인 메시지는 왼쪽 정렬합니다.

### 발표용 문장

채팅 메시지는 단순히 전체 목록을 보여주는 것이 아니라, 설문 참여 시 생성된 쿠키의 사용자 ID와 DB의 `cheer_messages.user_id`를 매칭해 내 메시지와 타인 메시지를 구분했습니다. 이를 통해 익명 커뮤니티 구조 안에서도 개인 작성 내역 조회와 메시지 정렬을 구현했습니다.

---

## 9. Step2 개인화 콘텐츠

### 기능 목적

Step2에서는 쿠키의 `generation` 값에 따라 B 콘텐츠를 다르게 파싱해 보여줍니다.

관련 코드:

- `src/components/contents/stepB/Scrolling.jsx`
- `src/components/contents/stepB/B_deta.json`

### 처리 방식

- `isolation_user_info` 쿠키에서 `generation` 값을 읽습니다.
- 유효 값은 `YB`, `OB`로 제한합니다.
- `B_deta.json`에서 해당 세대에 맞는 콘텐츠만 필터링합니다.
- 필터링된 콘텐츠를 Step2 스크롤/시각 요소에 반영합니다.

### 발표용 문장

Step2는 모든 사용자에게 같은 콘텐츠를 보여주는 방식이 아니라, Step1에서 저장된 쿠키의 세대 정보를 읽어 `YB`, `OB` 기준으로 콘텐츠를 분기했습니다. 이를 통해 설문 응답 데이터가 다음 콘텐츠 경험에 영향을 주는 개인화 흐름을 만들었습니다.

---

## 10. 3D 및 인터랙션 프론트 설명

### 사용한 3D 기반 라이브러리

관련 의존성:

- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `react-force-graph-3d`
- `matter-js`

관련 코드:

- `src/components/contents/stepB/Scrolling.jsx`
- `src/components/contents/stepC/Layering.jsx`
- `package.json`

### 라이브러리 선택 이유

Three.js는 WebGL을 직접 다루지 않고도 브라우저에서 3D 오브젝트, 카메라, 조명, 머티리얼을 구성할 수 있는 대표적인 3D 렌더링 라이브러리입니다. 이 프로젝트에서는 Three.js를 직접 DOM처럼 다루는 대신, React 환경에 맞게 `@react-three/fiber`를 사용했습니다.

`@react-three/fiber`를 사용한 이유:

- React 컴포넌트 구조 안에서 3D 씬을 선언적으로 구성할 수 있습니다.
- `useFrame()`으로 매 프레임마다 오브젝트 위치, 회전, 스케일을 제어할 수 있습니다.
- React 상태, ref, 이벤트 흐름과 3D 애니메이션을 자연스럽게 연결할 수 있습니다.
- Vite/React 프로젝트 구조 안에 3D 요소를 별도 엔진처럼 분리하지 않고 통합할 수 있습니다.

`@react-three/drei`를 사용한 이유:

- `ScrollControls`, `Environment`처럼 자주 쓰는 3D 보조 기능을 빠르게 적용할 수 있습니다.
- 직접 구현하면 복잡한 스크롤-3D 동기화, 환경광 설정 등을 더 안정적으로 구성할 수 있습니다.

`react-force-graph-3d`는 통계 데이터를 노드와 링크로 표현하기 위해 검토한 라이브러리입니다. 백엔드 통계 API가 `graph.nodes`, `graph.links` 구조를 반환하도록 설계된 이유도 이 3D 그래프 시각화를 염두에 둔 것입니다. 다만 최종 시연 화면에서는 모바일 세로형 UX와 가독성을 우선해, 3D 포스 그래프 대신 Matter.js 기반 평면 입자 시각화와 원그래프를 사용했습니다.

### Step2 3D형 인터랙션

Step2는 사용자의 스크롤과 클릭 이벤트에 따라 시각 요소가 움직이는 체험형 페이지입니다.

관련 코드:

- `src/components/contents/stepB/Scrolling.jsx`
- `src/components/contents/stepB/Scrolling.css`

구현 요소:

- `Canvas`로 WebGL 렌더링 영역 구성
- `useFrame()`으로 매 프레임 버블 위치와 스케일 업데이트
- `THREE.Object3D` 더미 객체와 `instancedMesh`를 사용해 다수의 버블을 효율적으로 렌더링
- `sphereGeometry`와 `meshPhysicalMaterial`로 물방울 느낌의 3D 입자 구현
- `ScrollControls`와 `useScroll()`로 스크롤 입력을 3D 움직임에 반영
- `Environment`와 조명 설정으로 수중 분위기 연출
- 스크롤 기반 상승 이벤트
- 클릭 이벤트 시 `B_click.mp3` 재생
- 배경음악 `deepSea.mp3`
- 상승 이벤트 종료 후 `C_B_VID.mp4` 전환 영상 재생
- 영상 종료 후 Step3로 페이지 이동

브라우저 정책상 소리가 있는 영상/오디오는 사용자 제스처 없이 자동 재생이 제한됩니다. 그래서 클릭 이벤트와 연결된 오디오 재생 구조로 설계했습니다.

### Step2 3D 구현 상세

코드 위치: `src/components/contents/stepB/Scrolling.jsx`

Step2의 3D 버블 효과는 `BubbleField`와 `Bubbles` 컴포넌트로 나누어 구현했습니다.

`BubbleField` 역할:

- `<Canvas>`로 3D 렌더링 컨텍스트를 생성합니다.
- 카메라 위치, FOV, near/far 값을 설정해 수중 깊이감을 만듭니다.
- ambient light, point light, environment를 배치해 어두운 수중 공간 안에서 입자가 보이도록 합니다.
- `ScrollControls`로 스크롤 입력을 3D 씬과 연결합니다.

`Bubbles` 역할:

- `BUBBLE_COUNT`만큼의 버블 데이터를 생성합니다.
- `instancedMesh`를 사용해 여러 개의 구체를 하나의 draw call에 가깝게 렌더링합니다.
- `useFrame()`에서 스크롤 속도, 휠 입력, 포인터 움직임을 합산해 버블의 에너지를 계산합니다.
- 버블이 카메라 가까이 지나가면 다시 먼 z축 위치로 재배치해, 계속 떠오르는 듯한 루프를 만듭니다.
- 마우스 위치에 따라 그룹 회전과 위치를 보간해 화면이 사용자의 움직임에 반응하는 느낌을 줍니다.

### 3D 성능 최적화 포인트

3D 입자를 각각 별도 mesh로 렌더링하면 오브젝트 수가 늘어날수록 렌더링 비용이 커집니다. 이 프로젝트에서는 `instancedMesh`를 사용해 같은 geometry와 material을 공유하면서 각 버블의 위치와 스케일만 매 프레임 업데이트했습니다.

발표에서 강조할 수 있는 부분:

- 86개의 버블을 개별 React 컴포넌트로 렌더링하지 않고 instancing 방식으로 처리
- `dummy.updateMatrix()`와 `mesh.setMatrixAt()`로 인스턴스별 transform만 갱신
- `mesh.instanceMatrix.needsUpdate = true`로 GPU에 변경 사항 전달
- `dpr={[1, 1.5]}`로 모바일/데스크톱 렌더링 품질과 성능 균형 조절
- 투명 머티리얼과 depthWrite 설정으로 수중 입자의 겹침 표현 조정

### 3D 인터랙션 설계 의도

Step2의 목적은 단순 정보 전달이 아니라, 사용자가 깊은 바닷속을 지나 다음 단계로 이동하는 듯한 감각을 만드는 것입니다. 그래서 스크롤, 포인터 움직임, 클릭 이벤트를 모두 3D 입자의 반응과 연결했습니다.

사용자 입력과 3D 반응의 연결:

- 스크롤 속도가 빨라지면 버블 움직임이 강해집니다.
- 포인터 움직임이 커지면 버블 에너지가 올라갑니다.
- 마우스 위치에 따라 버블 그룹이 약하게 회전합니다.
- 상승 이벤트가 끝나면 전환 영상이 재생되고 Step3로 넘어갑니다.

### 발표용 문장

Step2에서는 Three.js를 React에서 선언적으로 사용할 수 있는 React Three Fiber를 적용했습니다. `Canvas` 안에 카메라, 조명, 환경광, 버블 입자를 구성하고, `useFrame()`으로 매 프레임 스크롤 속도와 포인터 움직임을 계산해 3D 입자가 반응하도록 만들었습니다. 또한 다수의 구체를 효율적으로 렌더링하기 위해 `instancedMesh`를 사용했고, 이를 통해 모바일 환경에서도 비교적 안정적인 3D 효과를 구현했습니다.

### Step3 통계 시각화

관련 코드:

- `src/components/contents/stepC/Layering.jsx`
- `src/components/contents/stepC/Layering.css`

초기 요구사항은 3D 포스 그래프였지만, 모바일 세로 화면에서 사용자가 직관적으로 이해할 수 있도록 현재 시연 화면은 평면 입자 시각화와 원그래프로 정리했습니다.

백엔드 통계 API는 3D 그래프 확장을 고려해 `graph.nodes`, `graph.links` 구조를 함께 반환합니다. 이 구조는 `react-force-graph-3d` 같은 3D 네트워크 그래프 라이브러리와 바로 연결할 수 있는 형태입니다. 즉, 최종 UI는 평면 시각화로 정리했지만 데이터 설계는 3D 노드 그래프 확장 가능성을 남겨두었습니다.

통계 시각화 구성:

- 참여자 1명당 입자 1개 생성
- Matter.js 물리 엔진으로 위에서 아래로 떨어지고 쌓이는 움직임 구현
- 전체 참여자 수를 입자의 개수로 직관화
- 질문별 썸네일 카드 제공
- 문항 선택 시 원그래프로 응답 비율 표시
- 선택형은 보기별 비율, 주관식은 긍정/부정/중립 비율 표시

### 발표용 문장

통계 화면은 기존 3D 그래프 아이디어를 유지하되, 모바일 시연에서 정보 전달력이 떨어지는 문제를 해결하기 위해 Matter.js 기반 평면 물리 시각화로 전환했습니다. 다만 백엔드 응답은 `nodes`와 `links` 구조를 포함해 3D 포스 그래프 확장이 가능한 형태로 설계했습니다. 최종 UI에서는 참여자 한 명을 하나의 입자로 표현하고, 질문별 상세 통계는 원그래프로 제공해 전체 규모와 문항별 응답 분포를 동시에 보여주도록 구성했습니다.

---

## 11. 주요 API 정리

| API | Method | 역할 |
|---|---|---|
| `/api/health` | GET | 서버 상태 확인 |
| `/api/health/db` | GET | DB 연결 상태 확인 |
| `/api/isolation/survey-results` | GET | 쿠키 기준 개인 설문 결과 조회 |
| `/api/isolation/statistics` | GET | 전체 통계 및 그래프 데이터 조회 |
| `/api/warm/messages` | GET | 검열 통과 메시지 목록 조회 |
| `/api/warm/messages` | POST | 메시지 등록 및 검열 파이프라인 실행 |
| `/api/warm/messages/mine` | GET | 쿠키 기준 내 메시지 목록 조회 |

---

## 12. 트러블슈팅 사례

### 1. DB는 정상인데 프론트에 통계가 안 뜨는 문제

문제:

백엔드 API는 정상 응답하지만 프론트에서 예시 데이터 100개가 계속 표시되는 문제가 있었습니다.

원인:

프론트가 통계 API 데이터를 받지 못했을 때 fallback 데이터를 사용하도록 되어 있었고, 서버 초기화나 fetch 실패 시 실제 DB 데이터 대신 예시 데이터가 노출되었습니다.

해결:

API 응답이 정상일 때만 DB 데이터를 사용하고, 데이터 수신 실패 시에만 fallback을 사용하도록 조건을 분리했습니다.

발표 포인트:

단순히 화면에 보이는 데이터만 보는 것이 아니라, API 응답 상태와 fallback 조건을 분리해 실제 데이터와 예시 데이터가 섞이지 않도록 점검했습니다.

### 2. 전체 통계에서 개인정보 입력 장면이 함께 노출되는 문제

문제:

`SCENE_0` 또는 첫 개인정보 입력 문항이 전체 통계 목록에 함께 표시되었습니다.

원인:

DB에는 입력 장면도 `input` 타입으로 저장되어 있어 통계 집계 대상에 포함될 수 있었습니다.

해결:

프론트 통계/설문결과 화면에서 `sceneCode !== 'SCENE_0'` 조건으로 개인정보 입력 장면을 제외했습니다.

발표 포인트:

분석 대상 데이터와 운영상 필요한 입력 데이터를 분리해, 사용자에게 보여줄 통계에는 실제 설문 문항만 남기도록 처리했습니다.

### 3. 주관식 통계가 의미 없이 흩어지는 문제

문제:

주관식 원문을 그대로 집계하면 답변이 거의 모두 다른 값으로 처리되어 통계 의미가 약했습니다.

해결:

`answer_text_feeling` 컬럼을 추가하고, 주관식 답변을 `G/B/S`로 정규화해 긍정/부정/중립 비율로 보여주었습니다.

발표 포인트:

자유 입력 데이터를 바로 시각화하지 않고, 분석 가능한 분류값으로 변환해 통계 품질을 높였습니다.

### 4. 채팅 메시지가 부적절한 표현을 포함해도 노출될 수 있는 문제

문제:

프론트 단에서만 필터링하면 우회가 가능하고, DB에는 부적절한 메시지가 그대로 저장/노출될 위험이 있었습니다.

해결:

백엔드에서 리스트 필터와 LLM 문맥 필터를 모두 수행하고, `PASS` 상태의 메시지만 조회 API에서 반환하도록 했습니다.

발표 포인트:

보안/검열 로직을 프론트가 아니라 백엔드에 배치해 우회 가능성을 줄였습니다.

### 5. LLM 검열 실패 시 메시지 상태가 애매하게 남는 문제

문제:

LLM API 실패, 네트워크 오류, JSON 파싱 실패가 발생하면 메시지 상태가 불명확해질 수 있었습니다.

해결:

예외 발생 시 기본값을 `FAIL`로 처리하고, 서버 시작 시 `PENDING` 메시지를 다시 검열 큐에 넣는 복구 로직을 추가했습니다.

발표 포인트:

AI API는 외부 의존성이므로 실패 가능성을 전제로 설계했고, 장애 시 안전한 방향으로 데이터 상태를 정리했습니다.

### 6. 브라우저 자동 재생 정책 문제

문제:

Step2 영상과 배경음악을 자동 재생하려고 했지만, 브라우저 정책상 소리 있는 미디어는 사용자 제스처 없이 재생되지 않았습니다.

해결:

클릭 이벤트와 연결된 오디오 재생 구조로 변경하고, Step2 상승 이벤트 이후 전환 영상을 재생한 뒤 Step3로 이동하도록 설계했습니다.

발표 포인트:

브라우저 정책을 우회하려고 하지 않고, 사용자 인터랙션 흐름 안에 오디오/영상 재생을 자연스럽게 배치했습니다.

---

## 13. 포트폴리오에서 강조할 만한 구현 포인트 10개

1. Aiven MySQL과 Express API를 연결한 풀스택 데이터 흐름 구현
2. 쿠키 기반 사용자 식별과 개인 설문 결과 조회
3. `scenes_metadata`, `user_responses`, `scene_options` 조인을 통한 질문-답변 복원
4. 연령대/성별/문항/답변 유형별 통계 집계 API
5. 주관식 응답 감정값 `G/B/S` 기반 통계 정규화
6. 노드/링크 데이터와 요약 통계를 동시에 반환하는 통계 API 설계
7. Trie 기반 금칙어 필터와 LLM RAG 필터를 결합한 메시지 검열
8. `PENDING`, `PASS`, `FAIL` 상태를 사용한 비동기 검열 처리
9. 쿠키 사용자 ID를 활용한 내 메시지 조회 및 정렬
10. React Three Fiber 기반 3D 버블 인터랙션과 Matter.js 통계 입자 시각화 구현

---

## 14. 발표 마무리 문장 예시

이 프로젝트에서 가장 중점적으로 구현한 부분은 설문 응답 데이터를 단순 저장하는 데서 끝내지 않고, 개인 결과와 전체 통계, 채팅 검열, 콘텐츠 개인화까지 연결한 데이터 기반 사용자 경험입니다.

백엔드는 MySQL 데이터를 목적별 API로 재가공하고, 프론트는 이 데이터를 시각적 인터랙션으로 보여주는 구조를 가집니다. 특히 따뜻한 한마디 기능은 리스트 기반 필터와 LLM RAG 검열을 결합해, 사용자 입력이 많은 서비스에서 필요한 안정성과 사용자 경험을 함께 고려했습니다.

또한 Step2에서는 Three.js 기반 3D 입자 인터랙션을 통해 사용자의 스크롤과 포인터 움직임이 화면 반응으로 이어지도록 만들었습니다. 통계 화면은 3D 그래프 아이디어를 모바일 환경에 맞게 재해석해, 참여자 수는 입자 물리 시각화로, 문항별 응답은 원그래프로 표현했습니다. 이를 통해 데이터가 단순 숫자가 아니라 사용자가 체감할 수 있는 결과물로 전달되도록 설계했습니다.

---

## 15. 발표 준비 시 캡처 추천 코드 위치

| 주제 | 파일 |
|---|---|
| 서버 라우트 구조 | `server/index.js` |
| DB 연결 | `server/config/db.js` |
| 개인 설문 결과 조인 | `server/repositories/surveyResultRepository.js` |
| 개인 설문 결과 가공 | `server/services/surveyResultService.js` |
| 전체 통계 SQL | `server/repositories/statisticsRepository.js` |
| 통계 payload 가공 | `server/services/statisticsService.js` |
| RAG 검열 프롬프트 | `server/prompts/messageRag.js` |
| 하이브리드 검열 로직 | `server/services/warmMessageService.js` |
| 채팅 메시지 DB 처리 | `server/repositories/warmMessageRepository.js` |
| Step2 세대별 콘텐츠 파싱 및 3D 버블 인터랙션 | `src/components/contents/stepB/Scrolling.jsx` |
| Step3 통계/채팅/설문결과 UI | `src/components/contents/stepC/Layering.jsx` |
