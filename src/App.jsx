import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Nav from "./components/main/Header";
import TopStories from "./components/main/TopStories";
import Series from "./components/main/Series";
import ShortList from "./components/main/ShortList";
import InsideList from "./components/main/InsideList";
import Footer from "./components/share/Footer";
import Branch from "./components/contents/stepA/Branch";
import Scrolling from "./components/contents/stepB/Scrolling";
import Layering from "./components/contents/stepC/Layering";
import { Routes, Route, useLocation } from 'react-router-dom';

const prevent = (e) => {
    e.preventDefault();
};
function App() {
    const location = useLocation();
    const isStep1 = location.pathname.endsWith("/isolation/step1");
    const isStep2 = location.pathname.endsWith("/isolation/step2");
    const isStep3 = location.pathname.endsWith("/isolation/step3");
    const [isMobileViewport, setIsMobileViewport] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 768px)");
        const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

        syncViewport();
        mediaQuery.addEventListener("change", syncViewport);

        return () => mediaQuery.removeEventListener("change", syncViewport);
    }, []);

    const hideNav = isStep2 || (isStep3 && isMobileViewport);
    const hideFooter = isStep1 || isStep2 || (isStep3 && isMobileViewport);

    return (
        <div id="wrapper" className="adaptive">
            {!hideNav && <Nav />}
            <div id="container">
                <div id="content" className="main_content">
                    <Routes>
                        <Route path="/" element={
                            <>
                                <TopStories />
                                <Series />
                                <ShortList />
                                <InsideList />
                            </>
                        } />
                        <Route path="/isolation/step1" element={<Branch />} />
                        <Route path="/isolation/step2" element={<Scrolling />} />
                        <Route path="/isolation/step3" element={<Layering />} />
                        <Route path="/dongaProject/isolation/step1" element={<Branch />} />
                        <Route path="/dongaProject/isolation/step2" element={<Scrolling />} />
                        <Route path="/dongaProject/isolation/step3" element={<Layering />} />
                    </Routes>
                </div>
            </div>
            {!hideFooter && <Footer />}
        </div>
    );
}

export default App;
