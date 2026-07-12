import BookPopup from "./BookPopup";
import goalImg from "../assets/LearningGoal.png";

interface GoalBookProps {
  onClose: () => void;
}

/** 학습 로드맵(학습 목표) 팝업. 이미지에 프레임·X가 그려진 단일 이미지. */
export default function GoalBook({ onClose }: GoalBookProps) {
  return <BookPopup images={[goalImg]} progress={0} alt="학습 로드맵" onClose={onClose} />;
}
