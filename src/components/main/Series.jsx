const prevent = (e) => {
    e.preventDefault();
};
function Series() {
  return (
      <div className="main_series">
          <div className="tit_cont">
              <span className="tit">시리즈</span>
              <a href="#" onClick={prevent} className="btn_more">
                  더보기
              </a>
          </div>
          <div className="list_type01">
              <div className="series_cont">
                  <div className="top_cont">
                      <a href="#" onClick={prevent}>
                          <div className="thumb">
                              <img
                                  src="https://dimg.donga.com/ugc/CDB/ORIGINAL/Article/69/3b/99/03/693b990303fbd2739e10.jpg"
                                  alt=""
                              />
                          </div>
                          <div className="cont_info">
                              <span className="tit">헌트: 치매 머니 사냥</span>
                              <span className="txt">
                                  치매에 걸리고 흐릿해진 기억과 판단력, 그 틈새를 파고들어 ‘자산’을 노리는 ‘사냥꾼’들이 있습니다. 우리 사회는 ‘치매 머니 사냥&apos;에 대비하고 있을까요. 36명의 치매 노인과 그 가족들을 만나고 내린 답은
                                  “아니다”였습니다.{' '}
                              </span>
                          </div>
                      </a>
                  </div>
                  <div className="btm_cont">
                      <div className="slide_cont">
                          <ul className="slide_list img_one">
                              <li>
                                  <a href="#" onClick={prevent}>
                                      <div className="thumb">
                                          <img
                                              src="https://dimg.donga.com/ugc/CDB/ORIGINAL/Article/69/3f/b6/6c/693fb66c00f0d2739e10.jpg"
                                              alt=""
                                          />
                                      </div>
                                      <div className="cont_info">
                                          <span className="tit">
                                              사회<span className="txt_bar">|</span>헌트: 치매 머니 사냥
                                          </span>
                                          <span className="txt">
                                              헌트: 치매머니 사냥 평생을 가족만 보며 일했다그러나 아무것도 남지 않았다돈도, 기억도 사라졌다나는 내 삶을 사냥
                                              당했다＜챕터1. 아들이 날 가뒀다＞2022년 봄. 아들은 나(당시 70세)를 요양원에 보냈다. 좁고 작은 요양원 방 …
                                          </span>
                                          <span className="date">2025.12.15</span>
                                      </div>
                                  </a>
                              </li>
                          </ul>
                      </div>
                  </div>
              </div>

              <div className="series_cont">
                  <div className="top_cont">
                      <a href="#" onClick={prevent}>
                          <div className="thumb">
                              <img
                                  src="https://dimg.donga.com/ugc/CDB/ORIGINAL/Article/68/5a/64/f8/685a64f810fcd2739e10.jpg"
                                  alt=""
                              />
                          </div>
                          <div className="cont_info">
                              <span className="tit">크랙 : 땅은 이미 경고를 보냈다</span>
                              <span className="txt">
                                  우리 동네는 싱크홀에서 얼마나 안전할까요. 서울 도심 싱크홀 위험요소를 동단위로 분석한 ‘서울시 싱크홀 안전지도’에서 확인해보세요. 전문가들과 지도를 만들어 사고 원인 요소, 굴착공사장 안전 문제 등을
                                  파헤쳤습니다.
                              </span>
                          </div>
                      </a>
                  </div>
                  <div className="btm_cont">
                      <div className="slide_cont">
                          <ul className="slide_list img_two">
                              <li>
                                  <a href="#" onClick={prevent}>
                                      <div className="thumb">
                                          <img
                                              src="https://dimg.donga.com/ugc/CDB/ORIGINAL/Article/68/55/13/ad/685513ad14acd2739e10.png"
                                              alt=""
                                          />
                                      </div>
                                      <div className="cont_info">
                                          <span className="tit">
                                              사회<span className="txt_bar">|</span>서울시 싱크홀 안전지도
                                          </span>
                                          <span className="txt">
                                              서울 싱크홀 안전지도히어로콘텐츠팀 소개히어로콘텐츠는 깊이 있는 취재를 혁신적인 디지털 콘텐츠로 함께 전달하는 동아일보의 대표 시리즈입니다.우리 동네는 싱크홀에서 얼마나 안전할까요. 지면·인터랙티브 기사로
                                              살펴보세요.버튼을 조정해 등…
                                          </span>
                                          <span className="date">2025.06.24</span>
                                      </div>
                                  </a>
                              </li>
                              <li>
                                  <a href="#" onClick={prevent}>
                                      <div className="thumb">
                                          <img
                                              src="https://dimg.donga.com/ugc/CDB/ORIGINAL/Article/68/5a/70/21/685a702123f2d2739e10.png"
                                              alt=""
                                          />
                                      </div>
                                      <div className="cont_info">
                                          <span className="tit">
                                              사회<span className="txt_bar">|</span>땅은 이미 경고를 보냈다
                                          </span>
                                          <span className="txt">
                                              크랙: 땅은 이미 경고를 보냈다2024년 8월 서울 서대문구 연희동 도로침하 사망 1명, 부상 1명2025년 3월 서울 강동구 명일동 도로침하 사망 1명, 부상 1명지난해 연희동, 올해 명일동. 서울 도심 한복판에서 땅이
                                              꺼져 사람…
                                          </span>
                                          <span className="date">2025.06.25</span>
                                      </div>
                                  </a>
                              </li>
                          </ul>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
}

export default Series;