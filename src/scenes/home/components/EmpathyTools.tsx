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

/** 공감 도구 도감 팝업. 이미지 자체에 프레임·제목·X가 그려져 있으므로
 *  공용 Modal(plate 프레임)을 쓰지 않고 이미지만 띄운다.
 *  닫기: 딤 배경 클릭 + 이미지에 그려진 X 위의 투명 버튼. */
export default function EmpathyTools({ progress, onClose }: EmpathyToolsProps) {
  const idx = Math.max(0, Math.min(TOOLS.length - 1, progress));
  return (
    <div className="empathy" onClick={onClose}>
      <div className="empathy__panel" onClick={(e) => e.stopPropagation()}>
        <img className="empathy__img" src={TOOLS[idx]} alt="공감 도구 도감" />
        {/* 이미지 우측 상단에 그려진 X 위에 투명 클릭영역을 얹는다 */}
        <button
          type="button"
          className="empathy__close"
          onClick={onClose}
          aria-label="닫기"
        />
      </div>
    </div>
  );
}
