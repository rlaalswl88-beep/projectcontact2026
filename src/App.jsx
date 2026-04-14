import { useSelector } from 'react-redux';
import Nav from "./components/main/Header";
import TopStories from "./components/main/TopStories";
import Series from "./components/main/Series";
import ShortList from "./components/main/ShortList";
import InsideList from "./components/main/InsideList";
import Footer from "./components/share/Footer";
import Step1 from "./components/contents/typeA/step1";
import { Routes, Route } from 'react-router-dom';

const prevent = (e) => {
    e.preventDefault();
};
function App() {
    return (
        <div id="wrapper" className="adaptive">
            <Nav />
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
                        <Route path="/step1" element={<Step1 />} />
                    </Routes>
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default App;
