import { useSelector } from 'react-redux';

const prevent = (e) => {
    e.preventDefault();
};
function InsideList() {
    const { insideList } = useSelector((state) => state);
    return (
        <div className="main_inside">
            <div className="tit_cont">
                <span className="tit">Inside</span>
                <a href="#" onClick={prevent} className="btn_more">
                    더보기
                </a>
            </div>
            <div className="list_type03">
                <div className="inside_cont">
                    <ul className="inside_list">
                        {insideList.map((item) => (
                            <li key={item.tit}>
                                <a href="#" onClick={prevent}>
                                    <div className="thumb">
                                        <img src={`${import.meta.env.BASE_URL}img/inside/thumb/${item.thumb}`} alt="" />
                                        <span className="report">
                                            <img src={`${import.meta.env.BASE_URL}img/inside/report/${item.report}`} alt="" />
                                        </span>
                                    </div>
                                    <div className="cont_info">
                                        {item.sub ? <span className="sub_tit">{item.sub}</span> : <span className="sub_tit" />}
                                        <span className="tit">{item.tit}</span>
                                        <span className="txt">{item.txt}</span>
                                        <div className="btm_cont">
                                            <span className="date">{item.date}</span>
                                            <span className="mid_dot">&middot;</span>
                                            <span className="name">{item.name}</span>
                                        </div>
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

export default InsideList;