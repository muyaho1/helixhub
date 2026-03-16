<script lang="ts">
	// 메인 페이지 — 3D 이중나선 (전체 화면)
	import { Canvas } from '@threlte/core';
	import DoubleHelix from '$lib/components/helix/DoubleHelix.svelte';
	import { getAllUsers } from '$lib/services/firebase';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { User } from '$lib/types';
	import SettingsPanel from '$lib/components/helix/SettingsPanel.svelte';

	let users = $state<User[]>([]);
	let isLoading = $state(true);
	let hasWebGL = $state(true);

	// ★ 테스트 모드
	let testMode = $state(false);
	let testUserCount = $state(0);
	const BASES: ('A' | 'T' | 'G' | 'C')[] = ['A', 'T', 'G', 'C'];
	const TEST_NAMES = ['김민수', '이서연', '박지호', '최유진', '정도윤', '강하은', '윤시우', '한소율', '임준서', '오다은', '송예준', '배수빈', '조은호', '신하린', '류태민', '문지아', '황서준', '권나윤', '안현우', '홍채원'];

	function generateTestUsers(count: number): User[] {
		return Array.from({ length: count }, (_, i) => ({
			uid: `test-${i}`,
			name: TEST_NAMES[i % TEST_NAMES.length],
			email: `test${i}@test.com`,
			photoURL: null,
			bio: `테스트 유저 ${i + 1}`,
			color: BASES[i % 4],
			position: i + 1,
			createdAt: new Date(),
		}));
	}

	let realUsers = $state<User[]>([]);

	$effect(() => {
		if (testMode) {
			users = [...realUsers, ...generateTestUsers(testUserCount)];
		} else {
			users = realUsers;
		}
	});

	onMount(async () => {
		try {
			const canvas = document.createElement('canvas');
			hasWebGL = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
		} catch {
			hasWebGL = false;
		}

		try {
			realUsers = await getAllUsers();
			users = realUsers;
		} catch (error) {
			console.error('유저 목록 로드 실패:', error);
		}
		isLoading = false;
	});

	function handleNodeClick(uid: string) {
		if (uid.startsWith('test-') && testMode) {
			// 테스트 유저 → 쿼리 파라미터로 테스트 모드 전달
			goto(`/user/${uid}?test=1`);
			return;
		}
		goto(`/user/${uid}`);
	}
</script>

<div class="helix-container">
	<!-- ★ 사이버펑크 시각효과 레이어 -->
	<div class="vignette"></div>
	{#if !hasWebGL}
		<!-- WebGL 미지원 폴백 -->
		<div class="fallback">
			<p>이 브라우저에서는 3D를 표시할 수 없습니다.</p>
			<p class="text-sm text-[var(--text-secondary)]">Chrome, Firefox, Safari 최신 버전을 사용해주세요.</p>
		</div>
	{:else if isLoading}
		<!-- 로딩 중 -->
		<div class="fallback">
			<div class="spinner"></div>
			<p class="text-sm text-[var(--text-secondary)] mt-4">나선을 불러오는 중...</p>
		</div>
	{:else}
		<!-- 3D 이중나선 캔버스 -->
		<Canvas>
			<DoubleHelix {users} onNodeClick={handleNodeClick} />
		</Canvas>
	{/if}

	<!-- 하단 안내 텍스트 -->
	<div class="bottom-info">
		{#if users.length > 0}
			<p>총 {users.length}명의 학우가 참여 중</p>
		{:else if !isLoading}
			<p>아직 아무도 없어요. 첫 번째 염기가 되어보세요!</p>
		{/if}
	</div>

	<!-- ★ 테스트 모드 패널 (좌하단) -->
	<div class="test-panel">
		<label class="test-toggle">
			<input type="checkbox" bind:checked={testMode} />
			<span>테스트 모드</span>
		</label>
		{#if testMode}
			<div class="test-controls">
				<label class="test-row">
					<span>가짜 유저 수</span>
					<input type="range" min="0" max="20" step="1" bind:value={testUserCount} />
					<span class="test-val">{testUserCount}</span>
				</label>
				<div class="test-info">
					<p>실제 유저: {realUsers.length}명</p>
					<p>테스트 유저: {testUserCount}명</p>
					<p>총: {users.length}명</p>
				</div>
				<div class="test-btns">
					<button onclick={() => testUserCount = 1}>1명</button>
					<button onclick={() => testUserCount = 5}>5명</button>
					<button onclick={() => testUserCount = 10}>10명</button>
					<button onclick={() => testUserCount = 20}>20명</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- ★ 패널은 컨테이너 밖 (overflow:hidden에 안 가림) -->
<SettingsPanel />

<style>
	.helix-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}

	.fallback {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--text-primary);
		font-size: 18px;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(196, 181, 253, 0.2);
		border-top-color: var(--accent-lavender);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* ★ 부드러운 비네팅 — 세포 내부 깊이감 */
	.vignette {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 5;
		background: radial-gradient(
			ellipse 70% 60% at 50% 50%,
			transparent 40%,
			rgba(8, 5, 18, 0.5) 100%
		);
	}


	/* ★ 테스트 모드 패널 */
	.test-panel {
		position: fixed;
		bottom: 16px;
		left: 16px;
		z-index: 9999;
		font-size: 12px;
	}
	.test-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		color: #685d88;
		cursor: pointer;
		user-select: none;
	}
	.test-toggle input {
		accent-color: #6bcaad;
	}
	.test-controls {
		margin-top: 8px;
		padding: 12px;
		border-radius: 12px;
		background: rgba(10, 8, 20, 0.88);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(167, 139, 250, 0.12);
		min-width: 200px;
		animation: slideUp 0.2s ease;
	}
	@keyframes slideUp {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.test-row {
		display: grid;
		grid-template-columns: 70px 1fr 24px;
		align-items: center;
		gap: 6px;
		color: #9890b0;
		margin-bottom: 8px;
	}
	.test-row input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		height: 3px;
		border-radius: 2px;
		background: rgba(167, 139, 250, 0.15);
		outline: none;
	}
	.test-row input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 12px; height: 12px; border-radius: 50%;
		background: #6bcaad; border: 2px solid #0a0814; cursor: pointer;
	}
	.test-val {
		color: #6bcaad;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.test-info {
		color: #685d88;
		font-size: 10px;
		line-height: 1.6;
		margin-bottom: 8px;
	}
	.test-info p { margin: 0; }
	.test-btns {
		display: flex;
		gap: 4px;
	}
	.test-btns button {
		flex: 1;
		padding: 4px;
		border-radius: 6px;
		border: 1px solid rgba(107, 202, 173, 0.2);
		background: rgba(107, 202, 173, 0.06);
		color: #6bcaad;
		font-size: 11px;
		cursor: pointer;
		transition: background 0.15s;
	}
	.test-btns button:hover {
		background: rgba(107, 202, 173, 0.15);
	}

	.bottom-info {
		position: fixed;
		bottom: 24px;
		left: 0;
		right: 0;
		text-align: center;
		color: var(--text-secondary);
		font-size: 14px;
		pointer-events: none;
		z-index: 10;
	}
</style>
