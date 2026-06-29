import { Routes, Route, Navigate } from "react-router-dom";
import Intro from "./scenes/intro";
import Auth from "./scenes/auth";
import Home from "./scenes/home";
import Planet1 from "./scenes/planet/planet1";
import Planet2 from "./scenes/planet/planet2";
import Planet3 from "./scenes/planet/planet3";
import Planet4 from "./scenes/planet/planet4";
import Outro from "./scenes/Outro";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/intro" replace />} />
      <Route path="/intro" element={<Intro />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/home" element={<Home />} />
      <Route path="/planet/1" element={<Planet1 />} />
      <Route path="/planet/2" element={<Planet2 />} />
      <Route path="/planet/3" element={<Planet3 />} />
      <Route path="/planet/4" element={<Planet4 />} />
      <Route path="/outro" element={<Outro />} />
    </Routes>
  );
}
