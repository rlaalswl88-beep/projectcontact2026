const prevent = (e) => {
    e.preventDefault();
};
function Footer() {
  return (
      <footer id="footer" className="adaptive">
          <div className="da_corp_area">
              <div className="inner">
                  <div className="da_corp_head">
                      <h2 className="logo">
                          동아일보
                          <i className="logo">
                              <svg>
                                  <use href="#ic-logo" />
                              </svg>
                          </i>
                      </h2>
                  </div>
                  <div className="da_corp_body">
                      <div className="info_list_wrap address_list">
                          <div className="address_area">
                              <div>
                                  <h3>
                                      <a href="#" onClick={prevent}>
                                          동아일보
                                      </a>
                                  </h3>
                                  <div className="address">
                                      <p>주소 서울특별시 종로구 청계천로 1</p>
                                      <p>전화번호 02-2020-0114</p>
                                  </div>
                              </div>
                              <div className="sns_wrap">
                                  <ul>
                                      <li className="naver">
                                          <a href="#" onClick={prevent}>
                                              네이버
                                          </a>
                                      </li>
                                      <li className="facebook">
                                          <a href="#" onClick={prevent}>
                                              페이스북
                                          </a>
                                      </li>
                                      <li className="instagram">
                                          <a href="#" onClick={prevent}>
                                              인스타그램
                                          </a>
                                      </li>
                                      <li className="x">
                                          <a href="#" onClick={prevent}>
                                              엑스
                                          </a>
                                      </li>
                                      <li className="threads">
                                          <a href="#" onClick={prevent}>
                                              스레드
                                          </a>
                                      </li>
                                  </ul>
                              </div>
                              <div>
                                  <h3>
                                      <a href="#" onClick={prevent}>
                                          동아닷컴
                                      </a>
                                  </h3>
                                  <div className="address">
                                      <p>주소 서울특별시 서대문구 충정로 29</p>
                                      <p>전화번호 02-360-0400</p>
                                      <p>등록번호 서울아00741</p>
                                      <p>발행일자 1996.06.18</p>
                                      <p>등록일자 2009.01.16</p>
                                      <p>발행·편집인 신석호</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="da_corp_foot">
                      <ul className="info_list_wrap">
                          <li className="info_list_node">
                              <a href="#" onClick={prevent}>
                                  고객센터
                              </a>
                          </li>
                          <li className="info_list_node">
                              <a href="#" onClick={prevent}>
                                  이용약관
                              </a>
                          </li>
                          <li className="info_list_node">
                              <a href="#" onClick={prevent}>
                                  <b>개인정보처리방침</b>
                              </a>
                          </li>
                          <li className="info_list_node">
                              <a href="#" onClick={prevent}>
                                  청소년보호정책(책임자:구민회)
                              </a>
                          </li>
                          <li className="info_list_node">
                              <a href="#" onClick={prevent}>
                                  사이트맵
                              </a>
                          </li>
                          <li className="info_list_node">
                              <a href="#" onClick={prevent}>
                                  저작물 사용
                              </a>
                          </li>
                          <li className="info_list_node">
                              <a href="#" onClick={prevent}>
                                  제휴안내
                              </a>
                          </li>
                          <li className="info_list_node">
                              <a href="#" onClick={prevent}>
                                  기사의견·제보
                              </a>
                          </li>
                          <li className="info_list_node">
                              <a href="#" onClick={prevent}>
                                  정정보도신청
                              </a>
                          </li>
                          <li className="info_list_node">
                              <a href="#" onClick={prevent}>
                                  광고안내
                              </a>
                          </li>
                          <li className="info_list_node">
                              <a href="#" onClick={prevent}>
                                  RSS
                              </a>
                          </li>
                      </ul>
                      <p className="copyright">© dongA.com All rights reserved. 무단 전재, 재배포 및 AI학습 이용 금지</p>
                      <a href="#" onClick={prevent} className="sponsor">
                          <img
                              src="https://image.donga.com/donga_v1/images/logo_sponsor1.png"
                              alt="고려사이버대학교 THE CYBER UNIVERSITY OF KOREA"
                          />
                      </a>
                  </div>
              </div>
          </div>
      </footer>
  );
}

export default Footer;