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

	async function handleLogin() {
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

<!-- 페이지 콘텐츠 -->
<main class="pt-14">
	{@render children()}
</main>
