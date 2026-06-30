import "./Prologue.css";

// Planet1 프롤로그 subscene. 지금은 배경 + 시작 버튼만. 내용은 추후 채운다.
export default function Prologue({ onStart }: { onStart: () => void }) {
  return (
    <div className="prologue">
      <button type="button" className="btn prologue__start" onClick={onStart}>
        탐험 시작!
      </button>
    </div>
  );
}
