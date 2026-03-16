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

	async function handleLogin() {
		// ★ 인앱 브라우저면 외부 브라우저 유도
		if (isInAppBrowser()) {
			showInAppWarning = true;
			return;
		}
		const result = await loginWithGoogle();
		if (result) {
			goto('/profile');
		}
	}

	async function handleLogout() {
		await logout();
		goto('/');
	}
</script>

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
		{#if user}
			<a href="/profile" class="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-lavender)]">
				{user.name}
			</a>
			<button onclick={handleLogout} class="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-lavender)]">
				로그아웃
			</button>
		{:else}
			<button onclick={handleLogin} class="btn-primary text-sm">
				Google 로그인
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
</style>
