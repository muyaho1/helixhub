// HelixHub 타입 정의

/** User = 이중나선의 염기 1개. 가입하면 자동으로 나선에 추가됨. */
export interface User {
	uid: string; // Google 로그인 UID
	name: string; // 이름 또는 닉네임
	email: string; // 구글 이메일
	photoURL: string | null; // 프로필 사진 (구글에서 가져옴)
	bio: string; // 한 줄 소개
	color: BaseType; // 염기 색상 (A/T/G/C)
	position: number; // 나선 위 위치 순번 (자동 배정)
	createdAt: Date; // 가입 날짜
}

/** 프로젝트 종류 */
export type ProjectType = 'web' | 'app' | 'tool' | 'other';

/** 염기 종류 (A/T/G/C) — Phase 1에서는 자동 배정 */
export type BaseType = 'A' | 'T' | 'G' | 'C';

/** Project = 학생이 매주 만든 프로젝트 하나 */
export interface Project {
	id: string; // 자동 생성 ID
	userId: string; // 소유자 UID
	title: string; // 프로젝트 이름
	description: string; // 설명
	week: number; // 몇 주차 프로젝트인지
	type: ProjectType; // web / app / tool / other
	demoURL: string | null; // 데모 링크
	githubURL: string | null; // 깃허브 링크
	thumbnail: string | null; // 썸네일 이미지 URL (Phase 3)
	createdAt: Date; // 등록 날짜
}

/** 나선 위 염기 노드의 3D 위치 계산에 필요한 정보 */
export interface HelixNode {
	user: User;
	// 3D 좌표는 position 값으로 계산됨 (helix 컴포넌트에서 처리)
}
