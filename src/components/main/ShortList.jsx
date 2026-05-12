import { useSelector } from 'react-redux';

const prevent = (e) => {
    e.preventDefault();
};
function ShortList() {
    const shortList = useSelector((state) => state.shortList);
    return (
        <div className="main_short">
            <div className="tit_cont">
                <span className="tit">단편</span>
                <a href="#" onClick={prevent} className="btn_more">
                    더보기
                </a>
            </div>
            <div className="list_type02">
                <div className="short_cont">
                    <ul className="short_list">
                        {shortList.map(({ tit, thumb, sub, txt, date }, item) => (
                            <li key={tit}>
                                <a href="#" onClick={prevent}>
                                    <div className="thumb">
                                        <img src={`${import.meta.env.BASE_URL}img/short/${thumb}`} alt="" />
                                    </div>
                                    <div className="cont_info">
                                        <span className="sub_tit">{sub}</span>
                                        <span className="tit">{tit}</span>
                                        <span className="txt">{txt}</span>
                                        <span className="date">{date}</span>
                                    </div>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default ShortList;