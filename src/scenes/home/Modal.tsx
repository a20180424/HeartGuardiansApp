interface ModalProps {
  open: boolean;
  onClose: () => void;
  plateUrl: string;
  slice?: number;
  children?: React.ReactNode;
}

/** 공용 팝업: 딤 배경 클릭 또는 ✕로 닫힘. 내용 영역 클릭은 닫히지 않음.
 *  배경 plate는 border-image(9-slice)로 그린다. */
export default function Modal({ open, onClose, plateUrl, slice = 44, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="home-modal" onClick={onClose}>
      <div
        className="home-modal__panel"
        style={{ borderImage: `url(${plateUrl}) ${slice} fill / 28px / 0 stretch` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="home-modal__close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <div className="home-modal__body">{children}</div>
      </div>
    </div>
  );
}
