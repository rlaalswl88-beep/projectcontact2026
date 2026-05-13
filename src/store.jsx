import { configureStore, createSlice } from "@reduxjs/toolkit";

const nav = createSlice({
    name: 'nav',
    initialState: [
        '오피니언',
        '정치',
        '경제',
        '국제',
        '사회',
        '문화',
        '연예',
        '스포츠',
        '헬스동아',
        '트렌드뉴스',
    ],
    reducers: {}
});

const topStories = createSlice({
    name: 'topStories',
    initialState: [
        {
            thumb: '693f52e31a10d2739e10.png',
            tit: '헌트: 치매머니 사냥',
            txt: '나는 삶을 사냥당했다.',
        },
        {
            thumb: '6902c5db06f0d2739e10.png',
            tit: '보이스피싱 탐지력 테스트 : 미끼 문자를 찾아라!',
            txt: '2023년 발송된 스미싱 문자는 약 50만 건. 당신은 소중한 개인정보를 지킬 수 있을까요?',
        },
        {
            thumb: '685a61b42565d2739e10.jpg',
            tit: '서울시 싱크홀 안전지도',
            txt: '우리동네, 싱크홀 안전도를 확인해보세요.',
        },
    ],
    reducers: {}
});


const shortList = createSlice({
    name: 'shortList',
    initialState: [
        {
            thumb: '68fec32305c2d2739e10.jpg',
            sub: '사회',
            tit: '나는 말하지 않았다',
            txt: "10초. 인공지능(AI)이 당신의 목소리를 복제하는 데 걸리는 시간입니다.납치된 딸, 급전이 필요한 친구, 투자를 권유하는 유명인으로 둔갑한 '딥보이스'는또 다른 내가 되어, 우리의 일상 곳곳에 침투합니다.진짜와 가짜의 경계가 허물…",
            date: '2025.10.27',
        },
        {
            thumb: '680f36642701d2739e10.jpg',
            sub: '국제',
            tit: '트럼프 2.0 폴리시 맵',
            txt: "'트럼프 2.0 시대' 한국에 미칠 영향은?도널드 트럼프 미국 대통령은 취임 직후부터 글로벌 정세에 영향을 미치는 정책들을 쏟아내고 있습니다. 트럼프 취임 100일(4월 30일)을 계기로 동아일보 기사를 활용해 트럼프 2기 행정부의…",
            date: '2025.04.30',
        },
        {
            thumb: '672315c025e7d2739e10.jpg',
            sub: '사회',
            tit: '두 의사의 진료실, 누가 얼마나 벌까요',
            txt: "정부는 올 초 이른바 '응급실 표류', '소아과 오픈런' 등의 문제를 해결하겠다며 의대 2000명 증원을 발표했습니다. 의사가 늘어나면 응급의학과, 소아청소년과 등 필수의료 분야 의사가 늘어날 것이고 국내 어디서든 필요한 진료를 받…",
            date: '2024.11.05',
        },
        {
            thumb: '668fa1411fc3d2739e10.jpg',
            sub: '과학',
            tit: '별들의 이야기를 듣다: 제임스 웹, 2년간의 발견',
            txt: '‘인류가 만든 가장 강력한 망원경’. 제임스 웹 우주망원경(JWST)이 촬영한 우주 사진이 처음으로 공개된 2022년 7월로부터 2년이 지났다. 뛰어난 해상도, 그리고 인간의 눈으로 볼 수 없는 적외선을 감지하는 능력으로 제임스 웹…',
            date: '2024.07.12',
        },
    ],
    reducers: {}
});


const insideList = createSlice({
    name: 'insideList',
    initialState: [
        {
            thumb: '6965d70805e7d2739e10.jpg',
            report: '17657768340.png',
            sub: '',
            tit: '생성형 AI 시대의 언론사와 디자이너',
            txt: "히어로 콘텐츠 11기의 주제는 '치매머니 사냥'이었다. 치매에 걸린 노인의 흐릿해진 기억과 판단력을 노려 재산을 갈취하는 범죄를 다룬 기획이다.취재 속 피해자 강대용 씨는 평생 가족을 위해 일해왔다. 하지만 치매가 찾아온 뒤 그의 …",
            date: '2026.01.13',
            name: '정시은 UI/UX 디자이너',
        },
        {
            thumb: '696448b12428d2739e10.jpg',
            report: '16796368440.jpg',
            sub: '',
            tit: '왜 ‘치매머니 사냥’이었냐면',
            txt: '현재에도, 그리고 미래에도 유효한 문제를 다루고 싶었다. 은밀하게 벌어지고 있지만 우리 사회가 제대로 대비하지 못하고 있는 일들, 그래서 시간이 흐를수록 더욱 심각해질 문제들. 처음 ‘치매 머니’를 아이템을 후보에 올린 건 그런 이…',
            date: '2026.01.12',
            name: '이상환 기자',
        },
        {
            thumb: '6957894401c4d2739e10.jpg',
            report: '17673428420.jpg',
            sub: '헌트: 치매 머니 사냥',
            tit: '우리는 모두 나이가 든다',
            txt: '취재가 끝났지만, 아직도 귓가에 쟁쟁한 목소리가 있다.‘치매머니 사냥’을 주제로 정하고, 취재에 착수한 지 석 달. 취재팀의 가장 큰 고민은 ‘주인공 찾기’였다. 소외된 이웃, 숨은 영웅을 다루는 히어로콘텐츠의 취지에 맞게 기사의 …',
            date: '2026.01.02',
            name: '전혜진 기자',
        },
    ],
    reducers: {}
});


export default configureStore({
    reducer: {
        nav: nav.reducer,
        topStories: topStories.reducer,
        shortList: shortList.reducer,
        insideList: insideList.reducer
    },
});