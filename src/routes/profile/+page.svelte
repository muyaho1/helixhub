<script lang="ts">
	// 내 프로필 + 프로젝트 관리 페이지
	import { getCurrentUser, setCurrentUser } from '$lib/stores/auth.svelte';
	import {
		updateUserProfile,
		getProjectsByUser,
		createProject,
		deleteProject
	} from '$lib/services/firebase';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { Project, ProjectType } from '$lib/types';

	let user = $derived(getCurrentUser());

	// 프로필 편집
	let editName = $state('');
	let editBio = $state('');
	let isSaving = $state(false);

	// 프로젝트 목록
	let projects = $state<Project[]>([]);
	let isLoadingProjects = $state(true);

	// 새 프로젝트 폼
	let showForm = $state(false);
	let newTitle = $state('');
	let newDescription = $state('');
	let newWeek = $state(1);
	let newType = $state<ProjectType>('web');
	let newDemoURL = $state('');
	let newGithubURL = $state('');

	onMount(async () => {
		// 로그인 안 했으면 메인으로
		if (!user) {
			goto('/');
			return;
		}
		editName = user.name;
		editBio = user.bio || '';
		await loadProjects();
	});

	async function loadProjects() {
		if (!user) return;
		isLoadingProjects = true;
		projects = await getProjectsByUser(user.uid);
		isLoadingProjects = false;
	}

	async function saveProfile() {
		if (!user) return;
		isSaving = true;
		await updateUserProfile(user.uid, { name: editName, bio: editBio });
		setCurrentUser({ ...user, name: editName, bio: editBio });
		isSaving = false;
	}

	async function handleCreateProject() {
		if (!user || !newTitle.trim()) return;
		await createProject({
			userId: user.uid,
			title: newTitle.trim(),
			description: newDescription.trim(),
			week: newWeek,
			type: newType,
			demoURL: newDemoURL.trim() || null,
			githubURL: newGithubURL.trim() || null,
			finalURL: null,
			thumbnail: null
		});
		// 폼 초기화
		newTitle = '';
		newDescription = '';
		newDemoURL = '';
		newGithubURL = '';
		showForm = false;
		await loadProjects();
	}

	async function handleDeleteProject(projectId: string) {
		if (!confirm('정말 삭제할까요?')) return;
		await deleteProject(projectId);
		await loadProjects();
	}
</script>

<div class="mx-auto max-w-2xl px-4 py-8">
	{#if !user}
		<p class="text-center text-[var(--text-secondary)]">로그인이 필요합니다.</p>
	{:else}
		<!-- 프로필 카드 -->
		<div class="glass-card p-6 mb-8">
			<h2 class="text-lg font-semibold mb-4">내 프로필</h2>
			<div class="space-y-4">
				<div>
					<label class="block text-sm text-[var(--text-secondary)] mb-1">이름</label>
					<input
						type="text"
						bind:value={editName}
						class="w-full rounded-lg bg-[rgba(13,11,26,0.5)] border border-[rgba(155,142,196,0.2)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-lavender)]"
					/>
				</div>
				<div>
					<label class="block text-sm text-[var(--text-secondary)] mb-1">한 줄 소개</label>
					<input
						type="text"
						bind:value={editBio}
						placeholder="예: 의생명 3학년, 웹 초보"
						class="w-full rounded-lg bg-[rgba(13,11,26,0.5)] border border-[rgba(155,142,196,0.2)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-lavender)]"
					/>
				</div>
				<button onclick={saveProfile} class="btn-primary" disabled={isSaving}>
					{isSaving ? '저장 중...' : '저장'}
				</button>
			</div>
		</div>

		<!-- 프로젝트 목록 -->
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-semibold">내 프로젝트</h2>
			<button onclick={() => (showForm = !showForm)} class="btn-primary text-sm">
				{showForm ? '취소' : '+ 새 프로젝트'}
			</button>
		</div>

		<!-- 새 프로젝트 폼 -->
		{#if showForm}
			<div class="glass-card p-6 mb-4">
				<div class="space-y-3">
					<div>
						<label class="block text-sm text-[var(--text-secondary)] mb-1">프로젝트 이름 *</label>
						<input
							type="text"
							bind:value={newTitle}
							placeholder="예: YourMap"
							class="w-full rounded-lg bg-[rgba(13,11,26,0.5)] border border-[rgba(155,142,196,0.2)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-lavender)]"
						/>
					</div>
					<div>
						<label class="block text-sm text-[var(--text-secondary)] mb-1">설명</label>
						<textarea
							bind:value={newDescription}
							placeholder="프로젝트에 대한 간단한 설명"
							rows="2"
							class="w-full rounded-lg bg-[rgba(13,11,26,0.5)] border border-[rgba(155,142,196,0.2)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-lavender)] resize-none"
						></textarea>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-sm text-[var(--text-secondary)] mb-1">주차</label>
							<input
								type="number"
								bind:value={newWeek}
								min="1"
								max="16"
								class="w-full rounded-lg bg-[rgba(13,11,26,0.5)] border border-[rgba(155,142,196,0.2)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-lavender)]"
							/>
						</div>
						<div>
							<label class="block text-sm text-[var(--text-secondary)] mb-1">종류</label>
							<select
								bind:value={newType}
								class="w-full rounded-lg bg-[rgba(13,11,26,0.5)] border border-[rgba(155,142,196,0.2)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-lavender)]"
							>
								<option value="web">Web</option>
								<option value="app">App</option>
								<option value="tool">Tool</option>
								<option value="other">Other</option>
							</select>
						</div>
					</div>
					<div>
						<label class="block text-sm text-[var(--text-secondary)] mb-1">데모 URL</label>
						<input
							type="url"
							bind:value={newDemoURL}
							placeholder="https://..."
							class="w-full rounded-lg bg-[rgba(13,11,26,0.5)] border border-[rgba(155,142,196,0.2)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-lavender)]"
						/>
					</div>
					<div>
						<label class="block text-sm text-[var(--text-secondary)] mb-1">GitHub URL</label>
						<input
							type="url"
							bind:value={newGithubURL}
							placeholder="https://github.com/..."
							class="w-full rounded-lg bg-[rgba(13,11,26,0.5)] border border-[rgba(155,142,196,0.2)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-lavender)]"
						/>
					</div>
					<button
						onclick={handleCreateProject}
						class="btn-primary w-full"
						disabled={!newTitle.trim()}
					>
						등록
					</button>
				</div>
			</div>
		{/if}

		<!-- 프로젝트 리스트 -->
		{#if isLoadingProjects}
			<p class="text-center text-[var(--text-secondary)] text-sm">불러오는 중...</p>
		{:else if projects.length === 0}
			<p class="text-center text-[var(--text-secondary)] text-sm">아직 등록한 프로젝트가 없어요.</p>
		{:else}
			<div class="space-y-3">
				{#each projects as project}
					<div class="glass-card p-4 flex items-center justify-between">
						<div>
							<div class="flex items-center gap-2">
								<span class="font-medium">{project.title}</span>
								<span class="text-xs px-2 py-0.5 rounded-full bg-[rgba(196,181,253,0.15)] text-[var(--accent-lavender)]">
									{project.type}
								</span>
							</div>
							<p class="text-sm text-[var(--text-secondary)] mt-1">
								Week {project.week}
								{#if project.description}
									· {project.description}
								{/if}
							</p>
							<div class="flex gap-3 mt-2">
								{#if project.demoURL}
									<a href={project.demoURL} target="_blank" class="text-xs">데모</a>
								{/if}
								{#if project.githubURL}
									<a href={project.githubURL} target="_blank" class="text-xs">GitHub</a>
								{/if}
							</div>
						</div>
						<button
							onclick={() => handleDeleteProject(project.id)}
							class="text-xs text-[var(--error)] hover:underline ml-4"
						>
							삭제
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- 나선으로 돌아가기 -->
		<div class="mt-8 text-center">
			<a href="/" class="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-lavender)]">
				← 나선으로 돌아가기
			</a>
		</div>
	{/if}
</div>
