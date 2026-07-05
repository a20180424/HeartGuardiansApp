import { nicknameFor } from "../home.logic";
import plateUrl from "../assets/PlayerButton.png";
import maleFace from "../assets/AvatarFaceMale.png";
import femaleFace from "../assets/AvatarFaceFemale.png";

// 성별별 얼굴.
const FACES = { male: maleFace, female: femaleFace } as const;

interface ProfileCardProps {
  name: string;
  progress: number;
  gender?: keyof typeof FACES;
}

export default function ProfileCard({ name, progress, gender = "male" }: ProfileCardProps) {
  return (
    <div className="home-profile" style={{ backgroundImage: `url(${plateUrl})` }}>
      <img className="home-profile__face" src={FACES[gender]} alt="" />
      <div className="home-profile__info">
        <span className="home-profile__level">
          Lv{progress + 1} {nicknameFor(progress)}
        </span>
        <span className="home-profile__name">{name}</span>
      </div>
    </div>
  );
}
