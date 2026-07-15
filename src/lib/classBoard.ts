// Class board URLs (authenticated). See API spec: /api/class-board
// 학생의 학교·학년·반에 등록된 행성 게시판 URL 3개(planet1~3). 자주 바뀌지 않는 값이라
// 로그인 시 한 번 받아 세션에 보관하고, Home 등에서 재사용한다.

import { request, authHeaders } from "./api";

export interface ClassBoardResponse {
  planet1_url: string | null;
  planet2_url: string | null;
  planet3_url: string | null;
}

/** 요청 학생의 학교·학년·반에 등록된 행성 게시판 URL 3개(없으면 각 필드가 null). */
export function getClassBoard(): Promise<ClassBoardResponse> {
  return request<ClassBoardResponse>("/api/class-board", { headers: authHeaders() });
}
