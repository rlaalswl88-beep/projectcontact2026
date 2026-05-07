import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const prevent = (e) => {
    e.preventDefault();
};

function TopStories() {
    const { topStories } = useSelector((state) => state);
    return (
        <div>
            <div className="top_menu">
                <h2 className="title">
                    <a href="#" onClick={prevent}>
                        <img
                            src="https://image.donga.com/theoriginal/2022/pc/images/common/img_tit.png"
                            alt="히어로콘텐츠"
                        />
                    </a>
                </h2>
                <ul className="menu_list">
                    <li>
                        <a href="#" onClick={prevent}>
                            Project
                        </a>
                    </li>
                    <li>
                        <a href="#" onClick={prevent}>
                            Inside
                        </a>
                    </li>
                    <li>
                        <a href="#" onClick={prevent}>
                            About
                        </a>
                    </li>
                </ul>
            </div>
            <div className="main_top">
                <div className="thumb_cont">
                    <Link to="/isolation/step1">
                        <div className="thumb top_visual_thumb" style={{width: '690px', height: '380px', overflow: 'hidden' }}>
                            <img style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                                src={`${import.meta.env.BASE_URL}img/top/20260424_112804731.png`}
                                alt=""
                            />
                        </div>
                        <div className="cont_info top_visual_info">
                            <span className="sub_tit" />
                            <span className="tit">고립,그리고 연결</span>
                            <span className="txt"></span>
                        </div>
                        <span className="date top_visual_date">2026.04.24</span>
                    </Link>
                </div>
                <div className="list_cont">
                    <ul className="thumb_list">
                        {topStories.map(({ tit, thumb, txt }, item) => (
                            <li key={tit}>
                                <a href="#" onClick={prevent}>
                                    <div className="thumb">
                                        <img src={`${import.meta.env.BASE_URL}img/top/${thumb}`} alt="" />
                                    </div>
                                    <div className="cont_info">
                                        <span className="sub_tit" />
                                        <span className="tit">{tit}</span>
                                        <span className="txt">{txt}</span>
                                    </div>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="img_the">
                <img
                    src="https://image.donga.com/theoriginal/2022/pc/images/common/img_ban.jpg"
                    alt="동아일보의 레거시를 디지털로 담아낸 보도를 선보입니다."
                />
            </div>
        </div>
    );
}

export default TopStories;