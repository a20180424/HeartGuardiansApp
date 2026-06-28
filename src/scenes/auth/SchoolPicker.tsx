// 학교 선택. 학교가 1개여도 항상 표시한다(나중에 학교가 늘어도 UI가 그대로).
import type { School } from "../../lib/auth";

interface Props {
  schools: School[];
  value: string | null;
  onChange: (id: string) => void;
}

export default function SchoolPicker({ schools, value, onChange }: Props) {
  return (
    <label className="field field--school">
      <span className="field__label">학교</span>
      <select
        className="field__select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
