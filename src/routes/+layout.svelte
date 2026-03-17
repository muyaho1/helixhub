<script lang="ts">
	// 루트 레이아웃 — 반투명 네비게이션 바 + 슬롯
	import '../app.css';
	import { initAuth, getCurrentUser } from '$lib/stores/auth.svelte';
	import { loginWithGoogle, logout } from '$lib/services/firebase';
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	// Firebase Auth 리스너 시작
	initAuth();

	// 반응형으로 현재 유저 가져오기
	let user = $derived(getCurrentUser());

	// ★ 인앱 브라우저 감지 (카카오톡, 인스타, 페이스북, 네이버 등)
	function isInAppBrowser(): boolean {
		if (typeof navigator === 'undefined') return false;
		const ua = navigator.userAgent || '';
		return /KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line|Daum/i.test(ua);
	}

	// ★ 외부 브라우저로 열기
	function openInExternalBrowser() {
		const url = window.location.href;
		// 안드로이드: intent 스킴으로 Chrome 강제 실행
		if (/Android/i.test(navigator.userAgent)) {
			window.location.href = `intent://${url.replace(/https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
		}
		// iOS: Safari로 유도 (직접 열기는 불가 → 안내)
		// 범용: 새 탭으로 시도
		window.open(url, '_system');
	}

	let showInAppWarning = $state(false);

	let loginLoading = $state(false);

	async function handleLogin() {
		if (isInAppBrowser()) {
			showInAppWarning = true;
			return;
		}
		loginLoading = true;
		try {
			const result = await loginWithGoogle();
			if (result) {
				goto('/profile');
			}
			// result가 null이면 redirect 중 (페이지 새로고침됨)
		} catch (err) {
			console.error('로그인 에러:', err);
			alert('로그인에 실패했습니다. 다시 시도해주세요.');
		} finally {
			loginLoading = false;
		}
	}

	async function handleLogout() {
		await logout();
		goto('/');
	}

	// ★ 전체화면 토글
	let isFullscreen = $state(false);

	async function toggleFullscreen() {
		try {
			if (!document.fullscreenElement) {
				await document.documentElement.requestFullscreen();
				isFullscreen = true;
			} else {
				await document.exitFullscreen();
				isFullscreen = false;
			}
		} catch (e) {
			console.warn('전체화면 전환 실패:', e);
		}
	}

	// ★ ESC 등으로 전체화면 해제 시 상태 동기화
	function handleFullscreenChange() {
		isFullscreen = !!document.fullscreenElement;
	}
</script>

<svelte:document onfullscreenchange={handleFullscreenChange} />

<svelte:head>
	<title>HelixHub</title>
	<meta name="description" content="DNA 이중나선으로 탐색하는 프로젝트 갤러리" />
</svelte:head>

<!-- 반투명 네비게이션 바 -->
<nav class="glass-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3">
	<a href="/" class="text-lg font-bold tracking-wider text-white no-underline hover:text-white">
		HelixHub
	</a>

	<div class="flex items-center gap-4">
		<!-- ★ 전체화면 토글 버튼 -->
		<button onclick={toggleFullscreen} class="fullscreen-btn" aria-label={isFullscreen ? '전체화면 해제' : '전체화면'}>
			{#if isFullscreen}
				<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M6 2v4H2M12 2v4h4M6 16v-4H2M12 16v-4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{:else}
				<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 6V2h4M12 2h4v4M2 12v4h4M16 12v4h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</button>
		{#if user}
			<a href="/profile" class="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-lavender)]">
				{user.name}
			</a>
			<button onclick={handleLogout} class="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-lavender)]">
				로그아웃
			</button>
		{:else}
			<button onclick={handleLogin} class="btn-primary text-sm" disabled={loginLoading}>
				{loginLoading ? '로그인 중...' : 'Google 로그인'}
			</button>
		{/if}
	</div>
</nav>

<!-- ★ 인앱 브라우저 경고 -->
{#if showInAppWarning}
	<div class="inapp-overlay" onclick={() => showInAppWarning = false}>
		<div class="inapp-modal" onclick={(e) => e.stopPropagation()}>
			<h3>외부 브라우저에서 열어주세요</h3>
			<p>카카오톡·인스타 등의 인앱 브라우저에서는<br/>Google 로그인이 제한됩니다.</p>
			<div class="inapp-steps">
				<p><strong>Android:</strong> 우측 상단 ⋮ → "Chrome으로 열기"</p>
				<p><strong>iPhone:</strong> 우측 하단 Safari 아이콘 클릭</p>
			</div>
			<button class="inapp-btn" onclick={openInExternalBrowser}>
				외부 브라우저로 열기
			</button>
			<button class="inapp-close" onclick={() => showInAppWarning = false}>
				닫기
			</button>
		</div>
	</div>
{/if}

<!-- 페이지 콘텐츠 -->
<main class="pt-14">
	{@render children()}
</main>

<style>
	.inapp-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}
	.inapp-modal {
		background: #1a1030;
		border: 1px solid rgba(167, 139, 250, 0.2);
		border-radius: 20px;
		padding: 28px 24px;
		max-width: 340px;
		text-align: center;
		color: #e0d8f0;
	}
	.inapp-modal h3 {
		font-size: 17px;
		font-weight: 700;
		margin: 0 0 10px;
		color: #fff;
	}
	.inapp-modal p {
		font-size: 13px;
		color: #9890b0;
		line-height: 1.6;
		margin: 0 0 16px;
	}
	.inapp-steps {
		background: rgba(107, 202, 173, 0.08);
		border-radius: 12px;
		padding: 12px 16px;
		margin-bottom: 16px;
		text-align: left;
	}
	.inapp-steps p {
		font-size: 12px;
		margin: 0 0 6px;
		color: #b0a8c8;
	}
	.inapp-steps p:last-child { margin: 0; }
	.inapp-steps strong { color: #6bcaad; }
	.inapp-btn {
		width: 100%;
		padding: 12px;
		border-radius: 12px;
		border: none;
		background: linear-gradient(135deg, #6bcaad, #a78bfa);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		margin-bottom: 8px;
	}
	.inapp-close {
		background: none;
		border: none;
		color: #685d88;
		font-size: 13px;
		cursor: pointer;
	}

	/* ── 전체화면 버튼 ── */
	.fullscreen-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: 1px solid rgba(167, 139, 250, 0.15);
		background: rgba(167, 139, 250, 0.06);
		color: var(--text-secondary, #8880a8);
		cursor: pointer;
		transition: all 0.2s;
		padding: 0;
	}
	.fullscreen-btn:hover {
		background: rgba(167, 139, 250, 0.15);
		border-color: rgba(167, 139, 250, 0.35);
		color: #a78bfa;
	}
</style>
