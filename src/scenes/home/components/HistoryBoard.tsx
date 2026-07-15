import type { ClassBoardResponse } from "../../../lib/classBoard";
import { openExternal } from "../../../lib/openExternal";

// 탐험 일지 팝업 내용: 학급 게시판(행성1~3) 링크. 로그인 시 세션에 받아둔 board를 표시한다.
// board가 없거나(조회 실패) 각 URL이 null이면 "등록된 게시판이 없어요"로 대체.

interface HistoryBoardProps {
  board: ClassBoardResponse | null;
}

const PLANETS: { key: keyof ClassBoardResponse; label: string }[] = [
  { key: "planet1_url", label: "행성 1" },
  { key: "planet2_url", label: "행성 2" },
  { key: "planet3_url", label: "행성 3" },
];

export default function HistoryBoard({ board }: HistoryBoardProps) {
  return (
    <div className="home-history">
      <h2 className="home-history__title">탐험 일지</h2>
      <ul className="home-history__list">
        {PLANETS.map(({ key, label }) => {
          const url = board?.[key] ?? null;
          return (
            <li key={key} className="home-history__item">
              <span className="home-history__label">{label}</span>
              {url ? (
                <a
                  className="home-history__link"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  // APK(WebView)에서는 target=_blank가 무시되므로 클릭을 가로채 시스템
                  // 브라우저로 연다. href는 웹 폴백/접근성(우클릭·미리보기)용으로 남긴다.
                  onClick={(e) => {
                    e.preventDefault();
                    openExternal(url);
                  }}
                >
                  {url}
                </a>
              ) : (
                <span className="home-history__empty">등록된 게시판이 없어요</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
