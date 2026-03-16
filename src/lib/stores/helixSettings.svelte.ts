// ★ 초기값 (리셋 버튼용)
export const DEFAULTS = {
	bloomStrength: 0.20,
	bloomRadius: 0.89,
	exposure: 1.00,
	emissiveIntensity: 0.05,
	strandAColor: '#6bcaad',
	strandBColor: '#e07a6b',
	roughness: 0.51,
	clearcoat: 1.00,
	metalness: 0.08,
	nodeColor: '#f0e050',
	nodeScale: 0.18,
	nodeHoverScale: 0.35,
	nodeEmissive: 2.33,
	nodeHoverEmissive: 3.5,
	nodeRoughness: 0.3,
	bgColor: '#0d0b1a',
	fogDensity: 0.022,
	ambientIntensity: 0.20,
	particleOpacity: 0.84,
} as const;

// ★ 비주얼 설정 — 사용자가 조절 가능한 값들
export const helixSettings = $state({ ...DEFAULTS });

// ★ 마우스 호버 — 어떤 가닥(0/1)에 올렸는지 구분
export const mouseHit = $state({
	active: false,
	strandIndex: -1 as number,  // 0 = 가닥A, 1 = 가닥B, -1 = 없음
	x: 0,
	y: 0,
	z: 0,
});
