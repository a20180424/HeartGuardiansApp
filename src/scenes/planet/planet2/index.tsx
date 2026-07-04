import { useNavigate } from "react-router-dom";
import Prologue from "./Prologue";

// Planet2 컨테이너. 현재는 시작점(프롤로그)만 존재한다.
// planet1 템플릿을 복제해 "일단 행성1과 동일하게" 구성. 미션이 생기면 planet1처럼
// prologue → mission1 → ... 상태 머신으로 확장한다.
export default function Planet2() {
  const nav = useNavigate();
  return (
    <Prologue
      // TODO(planet2): 미션 콘텐츠가 준비되면 첫 미션으로 전환. 지금은 시작점만.
      onStart={() => {}}
      onHome={() => nav("/home")}
    />
  );
}
