import { useSelector } from 'react-redux';

const prevent = (e) => {
    e.preventDefault();
};

function Header() {
    const { nav } = useSelector((state) => state);
  return (
      <header id="header_adaptive" className="header_type2">
          <div className="main_head">
              <div className="inner">
                  <section className="logo_sec">
                      <h1>
                          <a href="#" onClick={prevent} aria-label="동아일보">
                              <span className="header_brand_text">동아일보</span>
                          </a>
                      </h1>
                      <section className="gnb_sec">
                          <nav id="gnb">
                              <ul className="main_nav_wrap news_menu_list" role="menu">
                                  {nav.map((label) => (
                                      <li key={label} className="nav_node" role="presentation">
                                          <a href="#" onClick={prevent} className="nav_item" role="menuitem">
                                              <span>{label}</span>
                                          </a>
                                      </li>
                                  ))}
                              </ul>
                          </nav>
                      </section>
                      <section className="option_sec01">
                          <nav className="option_menu">
                              <ul role="menu">
                                  <li role="presentation" className="search">
                                      <button type="button" role="menuitem" aria-label="통합검색">
                                          <i className="ic">
                                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                                  <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
                                                  <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                              </svg>
                                          </i>
                                          <span className="is_blind">통합검색</span>
                                      </button>
                                  </li>
                                  <li role="presentation" className="langs">
                                      <button type="button" role="menuitem" className="lang_btn" aria-label="언어선택">
                                          <i className="ic">
                                              <svg>
                                                  <use href="#ic-language" />
                                              </svg>
                                          </i>
                                          <span className="is_blind">언어선택</span>
                                      </button>
                                  </li>
                                  <li role="presentation" className="login">
                                      <a href="#" onClick={prevent} role="menuitem" className="login_btn" aria-label="마이페이지">
                                          <i className="ic">
                                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                                  <circle cx="12" cy="8.2" r="3.6" fill="none" stroke="currentColor" strokeWidth="2" />
                                                  <path d="M4.5 19c1.9-3.2 4.4-4.8 7.5-4.8s5.6 1.6 7.5 4.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                              </svg>
                                          </i>
                                          <span className="is_blind">마이페이지</span>
                                      </a>
                                  </li>
                                  <li role="presentation">
                                      <button type="button" role="menuitem" aria-label="전체메뉴 펼치기">
                                          <i className="ic">
                                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                                  <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                  <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                  <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                              </svg>
                                          </i>
                                          <span className="is_blind">전체메뉴 펼치기</span>
                                      </button>
                                  </li>
                              </ul>
                          </nav>
                      </section>
                  </section>
              </div>
          </div>
      </header>
  );
}

export default Header;