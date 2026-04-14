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
                              동아일보
                              <i className="logo">
                                  <svg>
                                      <use href="#ic-logo" />
                                  </svg>
                              </i>
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
                                              <svg>
                                                  <use href="#ic-search" />
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
                                              <svg>
                                                  <use href="#ic-member" />
                                              </svg>
                                          </i>
                                          <span className="is_blind">마이페이지</span>
                                      </a>
                                  </li>
                                  <li role="presentation">
                                      <button type="button" role="menuitem" aria-label="전체메뉴 펼치기">
                                          <i className="ic">
                                              <svg>
                                                  <use href="#ic-menu" />
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