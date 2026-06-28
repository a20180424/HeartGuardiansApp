// 비밀번호 입력 자릿수를 ● ○ 로 표시(4자리).
interface Props {
  length: number;
  total?: number;
}

export default function PinDots({ length, total = 4 }: Props) {
  return (
    <div className="pin-dots" aria-label={`비밀번호 ${length}자리 입력됨`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`pin-dots__dot${i < length ? " is-filled" : ""}`} />
      ))}
    </div>
  );
}
