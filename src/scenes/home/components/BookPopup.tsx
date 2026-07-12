interface BookPopupProps {
  /** progress 0~4에 대응하는 단계별 도감 이미지 5장. */
  images: string[];
  progress: number;
  alt: string;
  onClose: () => void;
}

/**
 * 단계별 도감 팝업(공감 도구 / 원석 도감 공용).
 * 이미지 자체에 프레임·제목·X가 그려져 있으므로 공용 Modal(plate 프레임)을 쓰지 않고
 * 이미지만 띄운다. 닫기: 딤 배경 클릭 + 이미지에 그려진 X 위의 투명 버튼.
 */
export default function BookPopup({ images, progress, alt, onClose }: BookPopupProps) {
  const idx = Math.max(0, Math.min(images.length - 1, progress));
  return (
    <div className="book-popup" onClick={onClose}>
      <div className="book-popup__panel" onClick={(e) => e.stopPropagation()}>
        <img className="book-popup__img" src={images[idx]} alt={alt} />
        {/* 이미지 우측 상단에 그려진 X 위에 투명 클릭영역을 얹는다 */}
        <button
          type="button"
          className="book-popup__close"
          onClick={onClose}
          aria-label="닫기"
        />
      </div>
    </div>
  );
}
