import BookPopup from "./BookPopup";
import gem0 from "../assets/GemBook0.png";
import gem1 from "../assets/GemBook1.png";
import gem2 from "../assets/GemBook2.png";
import gem3 from "../assets/GemBook3.png";
import gem4 from "../assets/GemBook4.png";

// progress(0~4, 완료한 Planet 수)에 따라 모은 원석 수가 다른 도감 이미지.
const GEMS = [gem0, gem1, gem2, gem3, gem4];

interface GemBookProps {
  progress: number;
  onClose: () => void;
}

/** 원석 도감 팝업(원석 도감 메뉴). */
export default function GemBook({ progress, onClose }: GemBookProps) {
  return <BookPopup images={GEMS} progress={progress} alt="원석 도감" onClose={onClose} />;
}
