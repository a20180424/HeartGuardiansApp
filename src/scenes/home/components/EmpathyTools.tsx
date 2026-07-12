import BookPopup from "./BookPopup";
import tool0 from "../assets/EmpathyTool0.png";
import tool1 from "../assets/EmpathyTool1.png";
import tool2 from "../assets/EmpathyTool2.png";
import tool3 from "../assets/EmpathyTool3.png";
import tool4 from "../assets/EmpathyTool4.png";

// progress(0~4, 완료한 Planet 수)에 따라 켜진 공감 도구 수가 다른 도감 이미지.
const TOOLS = [tool0, tool1, tool2, tool3, tool4];

interface EmpathyToolsProps {
  progress: number;
  onClose: () => void;
}

/** 공감 도구 도감 팝업(가디언즈 가방). */
export default function EmpathyTools({ progress, onClose }: EmpathyToolsProps) {
  return <BookPopup images={TOOLS} progress={progress} alt="공감 도구 도감" onClose={onClose} />;
}
