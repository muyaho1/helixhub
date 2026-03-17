<script lang="ts">
	import { page } from '$app/state';
	import { getUserById, getProjectsByUser, createProject, deleteProject, updateProject } from '$lib/services/firebase';
	import { uploadThumbnail, validateImageFile } from '$lib/services/storage';
	import { getCurrentUser } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import type { User, Project, ProjectType } from '$lib/types';

	let user = $state<User | null>(null);
	let projects = $state<Project[]>([]);
	let isLoading = $state(true);
	let isTestMode = $state(false);

	// ★ 내 페이지인지 확인 (테스트 모드면 항상 owner)
	let isOwner = $derived(
		isTestMode ||
		(!!user && !!getCurrentUser() && getCurrentUser()!.uid === user.uid)
	);

	// ★ 새 프로젝트 폼
	let showForm = $state(false);
	let newTitle = $state('');
	let newDesc = $state('');
	let newWeek = $state(1);
	let newType = $state<ProjectType>('web');
	let newDemoURL = $state('');
	let newGithubURL = $state('');
	let newFinalURL = $state('');
	let isSubmitting = $state(false);

	// ★ 새 프로젝트 썸네일 상태
	let newThumbnailFile = $state<File | null>(null);
	let newThumbnailPreview = $state('');
	let thumbnailError = $state('');
	let isUploading = $state(false);

	// ★ 수정 폼 썸네일 상태
	let editThumbnailFile = $state<File | null>(null);
	let editThumbnailPreview = $state('');
	let editThumbnailError = $state('');

	// ★ 드래그 상태 (시각 피드백용)
	let isDraggingNew = $state(false);
	let isDraggingEdit = $state(false);

	// ★ 테스트 유저용 가짜 이름 목록
	const TEST_NAMES = ['김민수', '이서연', '박지호', '최유진', '정도윤', '강하은', '윤시우', '한소율', '임준서', '오다은'];
	const BASES: ('A' | 'T' | 'G' | 'C')[] = ['A', 'T', 'G', 'C'];

	onMount(async () => {
		const uid = page.params.uid ?? '';
		if (!uid) { isLoading = false; return; }

		// ★ 테스트 모드 감지
		const urlParams = new URLSearchParams(window.location.search);
		isTestMode = urlParams.get('test') === '1' && uid.startsWith('test-');

		if (isTestMode) {
			// 가짜 유저 데이터 생성
			const idx = parseInt(uid.replace('test-', ''));
			user = {
				uid,
				name: TEST_NAMES[idx % TEST_NAMES.length],
				email: `test${idx}@test.com`,
				photoURL: null,
				bio: `테스트 유저 ${idx + 1} — 의생명공학과`,
				color: BASES[idx % 4],
				position: idx + 1,
				createdAt: new Date(),
			};
			// 가짜 프로젝트 1개
			projects = [{
				id: 'test-proj-1',
				userId: uid,
				title: 'My Awesome Project',
				description: '바이브 코딩으로 만든 첫 프로젝트',
				week: 3,
				type: 'web',
				demoURL: 'https://example.com',
				githubURL: 'https://github.com/example',
				finalURL: 'https://example.com/final',
				thumbnail: null,
				createdAt: new Date(),
			}];
		} else {
			user = await getUserById(uid);
			if (user) projects = await getProjectsByUser(uid);
		}
		isLoading = false;
	});

	// ── 썸네일 핸들러 ──

	/** 새 프로젝트 폼: 파일 선택/드롭 시 검증 + 미리보기 */
	function handleNewThumbnail(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		processNewThumbnail(file);
	}

	function processNewThumbnail(file: File) {
		thumbnailError = '';
		const error = validateImageFile(file);
		if (error) {
			thumbnailError = error;
			newThumbnailFile = null;
			newThumbnailPreview = '';
			return;
		}
		newThumbnailFile = file;
		newThumbnailPreview = URL.createObjectURL(file);
	}

	/** 수정 폼: 파일 선택/드롭 시 검증 + 미리보기 */
	function handleEditThumbnail(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		processEditThumbnail(file);
	}

	function processEditThumbnail(file: File) {
		editThumbnailError = '';
		const error = validateImageFile(file);
		if (error) {
			editThumbnailError = error;
			editThumbnailFile = null;
			editThumbnailPreview = '';
			return;
		}
		editThumbnailFile = file;
		editThumbnailPreview = URL.createObjectURL(file);
	}

	/** 새 프로젝트 미리보기 제거 */
	function clearNewThumbnail() {
		newThumbnailFile = null;
		newThumbnailPreview = '';
		thumbnailError = '';
	}

	/** 수정 폼 미리보기 제거 */
	function clearEditThumbnail() {
		editThumbnailFile = null;
		editThumbnailPreview = '';
		editThumbnailError = '';
	}

	// ── 드래그 앤 드롭 ──

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleNewDrop(event: DragEvent) {
		event.preventDefault();
		isDraggingNew = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) processNewThumbnail(file);
	}

	function handleEditDrop(event: DragEvent) {
		event.preventDefault();
		isDraggingEdit = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) processEditThumbnail(file);
	}

	// ── CRUD 핸들러 (썸네일 업로드 통합) ──

	async function handleCreate() {
		if (!user || !newTitle.trim() || isSubmitting) return;
		isSubmitting = true;

		if (isTestMode) {
			// ★ 테스트: Firebase 안 쓰고 로컬에 추가
			projects = [...projects, {
				id: `test-proj-${Date.now()}`,
				userId: user.uid,
				title: newTitle.trim(),
				description: newDesc.trim(),
				week: newWeek,
				type: newType,
				demoURL: newDemoURL.trim() || null,
				githubURL: newGithubURL.trim() || null,
				finalURL: newFinalURL.trim() || null,
				thumbnail: newThumbnailPreview || null,
				createdAt: new Date(),
			}];
		} else {
			// 1단계: 프로젝트 생성 (thumbnail: null)
			const projectId = await createProject({
				userId: user.uid,
				title: newTitle.trim(),
				description: newDesc.trim(),
				week: newWeek,
				type: newType,
				demoURL: newDemoURL.trim() || null,
				githubURL: newGithubURL.trim() || null,
				finalURL: newFinalURL.trim() || null,
				thumbnail: null
			});

			// 2단계: 파일이 있으면 업로드 후 thumbnail URL 저장
			if (newThumbnailFile) {
				isUploading = true;
				try {
					const url = await uploadThumbnail(user.uid, projectId, newThumbnailFile);
					await updateProject(projectId, { thumbnail: url });
				} catch (e) {
					console.error('썸네일 업로드 실패:', e);
					// ⚠️ 프로젝트는 이미 생성됨 — 썸네일만 실패
				}
				isUploading = false;
			}
			projects = await getProjectsByUser(user.uid);
		}

		// 폼 초기화 (썸네일 상태 포함)
		newTitle = ''; newDesc = ''; newDemoURL = ''; newGithubURL = ''; newFinalURL = '';
		newThumbnailFile = null; newThumbnailPreview = ''; thumbnailError = '';
		showForm = false;
		isSubmitting = false;
	}

	// ★ 수정 모드
	let editingId = $state<string | null>(null);
	let editTitle = $state('');
	let editDesc = $state('');
	let editWeek = $state(1);
	let editType = $state<ProjectType>('web');
	let editDemoURL = $state('');
	let editGithubURL = $state('');
	let editFinalURL = $state('');

	function startEdit(project: Project) {
		editingId = project.id;
		editTitle = project.title;
		editDesc = project.description;
		editWeek = project.week;
		editType = project.type;
		editDemoURL = project.demoURL || '';
		editGithubURL = project.githubURL || '';
		editFinalURL = project.finalURL || '';
		// 썸네일 수정 상태 초기화
		editThumbnailFile = null;
		editThumbnailPreview = '';
		editThumbnailError = '';
	}

	function cancelEdit() {
		editingId = null;
		editThumbnailFile = null;
		editThumbnailPreview = '';
		editThumbnailError = '';
	}

	async function handleSaveEdit() {
		if (!editingId || !editTitle.trim() || !user) return;
		if (isTestMode) {
			projects = projects.map(p => p.id === editingId ? {
				...p,
				title: editTitle.trim(),
				description: editDesc.trim(),
				week: editWeek,
				type: editType,
				demoURL: editDemoURL.trim() || null,
				githubURL: editGithubURL.trim() || null,
				finalURL: editFinalURL.trim() || null,
				thumbnail: editThumbnailPreview || p.thumbnail,
			} : p);
		} else {
			const updates: Record<string, any> = {
				title: editTitle.trim(),
				description: editDesc.trim(),
				week: editWeek,
				type: editType,
				demoURL: editDemoURL.trim() || null,
				githubURL: editGithubURL.trim() || null,
				finalURL: editFinalURL.trim() || null,
			};

			// ★ 새 파일 선택 시 업로드 후 URL 반영
			if (editThumbnailFile) {
				isUploading = true;
				try {
					const url = await uploadThumbnail(user.uid, editingId, editThumbnailFile);
					updates.thumbnail = url;
				} catch (e) {
					console.error('썸네일 업로드 실패:', e);
				}
				isUploading = false;
			}

			await updateProject(editingId, updates);
			projects = await getProjectsByUser(user.uid);
		}
		editingId = null;
		editThumbnailFile = null;
		editThumbnailPreview = '';
		editThumbnailError = '';
	}

	async function handleDelete(id: string) {
		if (!confirm('정말 삭제할까요?')) return;
		if (isTestMode) {
			projects = projects.filter(p => p.id !== id);
			return;
		}
		// ★ userId 전달하여 Storage 썸네일도 함께 삭제
		await deleteProject(id, user?.uid);
		if (user) projects = await getProjectsByUser(user.uid);
	}
</script>

<div class="page">
	<a href="/" class="back-link">
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
		나선으로 돌아가기
	</a>

	{#if isLoading}
		<div class="center"><div class="spinner"></div></div>
	{:else if !user}
		<div class="center"><p class="muted">유저를 찾을 수 없습니다.</p></div>
	{:else}
		{#if isTestMode}
			<div class="test-banner">🧪 테스트 모드 — Firebase 저장 안 됨</div>
		{/if}

		<!-- 프로필 헤더 -->
		<header class="profile-header">
			<div class="avatar-ring">
				{#if user.photoURL}
					<img src={user.photoURL} alt={user.name} class="avatar" />
				{:else}
					<div class="avatar-placeholder">{user.name[0]}</div>
				{/if}
			</div>
			<h1 class="name">{user.name}</h1>
			{#if user.bio}
				<p class="bio">{user.bio}</p>
			{/if}
			<div class="badge-row">
				<span class="badge base-badge">염기 {user.color}</span>
				<span class="badge pos-badge">#{user.position}</span>
			</div>
		</header>

		<!-- 프로젝트 헤더 + 추가 버튼 -->
		<div class="section-header">
			<h2 class="section-title">프로젝트</h2>
			{#if isOwner}
				<button class="add-btn" onclick={() => showForm = !showForm}>
					{showForm ? '취소' : '+ 새 프로젝트'}
				</button>
			{/if}
		</div>

		<!-- ★ 새 프로젝트 폼 (본인만 보임) -->
		{#if isOwner && showForm}
			<div class="form-card">
				<div class="form-grid">
					<div class="form-full">
						<label class="form-label">프로젝트 이름 *</label>
						<input type="text" bind:value={newTitle} placeholder="예: YourMap" class="form-input" />
					</div>
					<div class="form-full">
						<label class="form-label">설명</label>
						<textarea bind:value={newDesc} placeholder="프로젝트에 대한 간단한 설명" rows="2" class="form-input form-textarea"></textarea>
					</div>
					<div>
						<label class="form-label">주차</label>
						<input type="number" bind:value={newWeek} min="1" max="16" class="form-input" />
					</div>
					<div>
						<label class="form-label">종류</label>
						<select bind:value={newType} class="form-input">
							<option value="web">Web</option>
							<option value="app">App</option>
							<option value="tool">Tool</option>
							<option value="other">Other</option>
						</select>
					</div>
					<div class="form-full">
						<label class="form-label">데모 URL</label>
						<input type="url" bind:value={newDemoURL} placeholder="https://..." class="form-input" />
					</div>
					<div class="form-full">
						<label class="form-label">GitHub URL</label>
						<input type="url" bind:value={newGithubURL} placeholder="https://github.com/..." class="form-input" />
					</div>
					<div class="form-full">
						<label class="form-label">최종본 URL</label>
						<input type="url" bind:value={newFinalURL} placeholder="https://... (배포된 최종 버전)" class="form-input" />
					</div>

					<!-- ★ 썸네일 업로드 영역 -->
					<div class="form-full">
						<label class="form-label">스크린샷 / 썸네일</label>
						{#if newThumbnailPreview}
							<!-- 미리보기 -->
							<div class="thumb-preview-wrap">
								<img src={newThumbnailPreview} alt="미리보기" class="thumb-preview" />
								<button class="thumb-remove" onclick={clearNewThumbnail} type="button" aria-label="미리보기 제거">
									<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
								</button>
							</div>
						{:else}
							<!-- 드래그 앤 드롭 / 클릭 업로드 영역 -->
							<label
								class="upload-zone"
								class:upload-zone--drag={isDraggingNew}
								role="button"
								tabindex="0"
								ondragover={handleDragOver}
								ondragenter={() => isDraggingNew = true}
								ondragleave={() => isDraggingNew = false}
								ondrop={handleNewDrop}
							>
								<input
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif"
									onchange={handleNewThumbnail}
									class="upload-input"
								/>
								<div class="upload-icon">
									<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
										<path d="M16 22V10M16 10l-5 5M16 10l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										<path d="M6 20v4a2 2 0 002 2h16a2 2 0 002-2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
								</div>
								<span class="upload-text">이미지를 드래그하거나 클릭</span>
								<span class="upload-hint">JPG, PNG, WebP, GIF · 최대 2MB</span>
							</label>
						{/if}
						{#if thumbnailError}
							<p class="error-text">{thumbnailError}</p>
						{/if}
					</div>

					<div class="form-full">
						<button
							class="submit-btn"
							onclick={handleCreate}
							disabled={!newTitle.trim() || isSubmitting || isUploading}
						>
							{#if isUploading}
								<span class="btn-spinner"></span> 업로드 중...
							{:else if isSubmitting}
								등록 중...
							{:else}
								등록
							{/if}
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- 프로젝트 카드들 -->
		{#if projects.length === 0 && !showForm}
			<div class="empty-state">
				<div class="empty-icon">🧬</div>
				<p>아직 등록한 프로젝트가 없어요</p>
				{#if isOwner}
					<button class="add-btn-empty" onclick={() => showForm = true}>첫 프로젝트 추가하기</button>
				{/if}
			</div>
		{:else}
			<div class="projects">
				{#each projects as project, i}
					<article class="project-card" style="animation-delay: {i * 80}ms">
						{#if editingId === project.id}
							<!-- ★ 수정 모드 -->
							<div class="form-grid">
								<div class="form-full">
									<label class="form-label">프로젝트 이름</label>
									<input type="text" bind:value={editTitle} class="form-input" />
								</div>
								<div class="form-full">
									<label class="form-label">설명</label>
									<textarea bind:value={editDesc} rows="2" class="form-input form-textarea"></textarea>
								</div>
								<div>
									<label class="form-label">주차</label>
									<input type="number" bind:value={editWeek} min="1" max="16" class="form-input" />
								</div>
								<div>
									<label class="form-label">종류</label>
									<select bind:value={editType} class="form-input">
										<option value="web">Web</option>
										<option value="app">App</option>
										<option value="tool">Tool</option>
										<option value="other">Other</option>
									</select>
								</div>
								<div class="form-full">
									<label class="form-label">데모 URL</label>
									<input type="url" bind:value={editDemoURL} placeholder="https://..." class="form-input" />
								</div>
								<div class="form-full">
									<label class="form-label">GitHub URL</label>
									<input type="url" bind:value={editGithubURL} placeholder="https://github.com/..." class="form-input" />
								</div>
								<div class="form-full">
									<label class="form-label">최종본 URL</label>
									<input type="url" bind:value={editFinalURL} placeholder="https://... (배포된 최종 버전)" class="form-input" />
								</div>

								<!-- ★ 수정 폼 썸네일 업로드 -->
								<div class="form-full">
									<label class="form-label">스크린샷 / 썸네일</label>
									{#if editThumbnailPreview}
										<div class="thumb-preview-wrap">
											<img src={editThumbnailPreview} alt="미리보기" class="thumb-preview" />
											<button class="thumb-remove" onclick={clearEditThumbnail} type="button" aria-label="미리보기 제거">
												<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
											</button>
										</div>
									{:else if project.thumbnail}
										<!-- 기존 썸네일 표시 + 변경 가능 -->
										<div class="thumb-preview-wrap">
											<img src={project.thumbnail} alt="현재 썸네일" class="thumb-preview" />
											<span class="thumb-current-label">현재 이미지</span>
										</div>
										<label
											class="upload-zone upload-zone--compact"
											class:upload-zone--drag={isDraggingEdit}
											role="button"
											tabindex="0"
											ondragover={handleDragOver}
											ondragenter={() => isDraggingEdit = true}
											ondragleave={() => isDraggingEdit = false}
											ondrop={handleEditDrop}
										>
											<input
												type="file"
												accept="image/jpeg,image/png,image/webp,image/gif"
												onchange={handleEditThumbnail}
												class="upload-input"
											/>
											<span class="upload-text-sm">다른 이미지로 변경</span>
										</label>
									{:else}
										<label
											class="upload-zone"
											class:upload-zone--drag={isDraggingEdit}
											role="button"
											tabindex="0"
											ondragover={handleDragOver}
											ondragenter={() => isDraggingEdit = true}
											ondragleave={() => isDraggingEdit = false}
											ondrop={handleEditDrop}
										>
											<input
												type="file"
												accept="image/jpeg,image/png,image/webp,image/gif"
												onchange={handleEditThumbnail}
												class="upload-input"
											/>
											<div class="upload-icon">
												<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
													<path d="M16 22V10M16 10l-5 5M16 10l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
													<path d="M6 20v4a2 2 0 002 2h16a2 2 0 002-2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
												</svg>
											</div>
											<span class="upload-text">이미지를 드래그하거나 클릭</span>
											<span class="upload-hint">JPG, PNG, WebP, GIF · 최대 2MB</span>
										</label>
									{/if}
									{#if editThumbnailError}
										<p class="error-text">{editThumbnailError}</p>
									{/if}
								</div>

								<div class="form-full edit-btns">
									<button
										class="submit-btn"
										onclick={handleSaveEdit}
										disabled={!editTitle.trim() || isUploading}
									>
										{#if isUploading}
											<span class="btn-spinner"></span> 업로드 중...
										{:else}
											저장
										{/if}
									</button>
									<button class="cancel-btn" onclick={cancelEdit}>취소</button>
								</div>
							</div>
						{:else}
							<!-- 보기 모드 -->
							<div class="card-top">
								<span class="week">Week {project.week}</span>
								<span class="type-tag">{project.type}</span>
								{#if isOwner}
									<button class="edit-btn" onclick={() => startEdit(project)}>수정</button>
									<button class="delete-btn" onclick={() => handleDelete(project.id)}>삭제</button>
								{/if}
							</div>
							<h2 class="project-title">{project.title}</h2>
							{#if project.description}
								<p class="project-desc">{project.description}</p>
							{/if}

							<!-- ★ 프로젝트 썸네일 표시 -->
							{#if project.thumbnail}
								<div class="card-thumbnail-wrap">
									<img
										src={project.thumbnail}
										alt="{project.title} 스크린샷"
										class="card-thumbnail"
										loading="lazy"
									/>
									<div class="card-thumbnail-shine"></div>
								</div>
							{/if}

							<div class="link-buttons">
								{#if project.demoURL}
									<a href={project.demoURL} target="_blank" rel="noopener" class="link-btn demo-btn">
										<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2h8v8M14 2L6 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
										데모 보기
									</a>
								{/if}
								{#if project.githubURL}
									<a href={project.githubURL} target="_blank" rel="noopener" class="link-btn github-btn">
										<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
										GitHub
									</a>
								{/if}
								{#if project.finalURL}
									<a href={project.finalURL} target="_blank" rel="noopener" class="link-btn final-btn">
										<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
										최종본
									</a>
								{/if}
								{#if !project.demoURL && !project.githubURL && !project.finalURL}
									<span class="no-links">링크 없음</span>
								{/if}
							</div>
						{/if}
					</article>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.page {
		max-width: 600px;
		margin: 0 auto;
		padding: 24px 20px 48px;
		min-height: 100vh;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		color: var(--text-secondary, #8880a8);
		text-decoration: none;
		margin-bottom: 32px;
		transition: color 0.2s;
	}
	.back-link:hover { color: #a78bfa; }

	.test-banner {
		text-align: center;
		padding: 8px 16px;
		border-radius: 10px;
		background: rgba(107, 202, 173, 0.1);
		border: 1px solid rgba(107, 202, 173, 0.25);
		color: #6bcaad;
		font-size: 12px;
		margin-bottom: 20px;
	}

	.center {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 40vh;
	}
	.muted { color: var(--text-secondary, #8880a8); }

	.spinner {
		width: 28px;
		height: 28px;
		border: 2px solid rgba(167, 139, 250, 0.2);
		border-top-color: #a78bfa;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	/* ── 프로필 헤더 ── */
	.profile-header {
		text-align: center;
		margin-bottom: 40px;
	}

	.avatar-ring {
		width: 80px;
		height: 80px;
		margin: 0 auto 16px;
		border-radius: 50%;
		padding: 3px;
		background: linear-gradient(135deg, #6bcaad, #a78bfa, #e07a6b);
		animation: ringGlow 3s ease-in-out infinite alternate;
	}
	@keyframes ringGlow {
		from { box-shadow: 0 0 12px rgba(107, 202, 173, 0.3); }
		to { box-shadow: 0 0 20px rgba(167, 139, 250, 0.4); }
	}

	.avatar {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
		display: block;
	}

	.avatar-placeholder {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: rgba(13, 11, 26, 0.9);
		color: #a78bfa;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
		font-weight: 700;
	}

	.name {
		font-size: 24px;
		font-weight: 700;
		color: var(--text-primary, #f0f0f8);
		margin: 0 0 6px;
		letter-spacing: -0.02em;
	}

	.bio {
		font-size: 14px;
		color: var(--text-secondary, #8880a8);
		margin: 0 0 12px;
	}

	.badge-row {
		display: flex;
		justify-content: center;
		gap: 8px;
	}

	.badge {
		font-size: 11px;
		padding: 3px 10px;
		border-radius: 20px;
		font-weight: 500;
	}

	.base-badge {
		background: rgba(107, 202, 173, 0.12);
		color: #6bcaad;
		border: 1px solid rgba(107, 202, 173, 0.2);
	}

	.pos-badge {
		background: rgba(167, 139, 250, 0.12);
		color: #a78bfa;
		border: 1px solid rgba(167, 139, 250, 0.2);
	}

	/* ── 빈 상태 ── */
	.empty-state {
		text-align: center;
		padding: 48px 0;
		color: var(--text-secondary, #8880a8);
		font-size: 14px;
	}
	.empty-icon { font-size: 32px; margin-bottom: 8px; }

	/* ── 프로젝트 카드 ── */
	.projects {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.project-card {
		background: rgba(13, 11, 26, 0.6);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(167, 139, 250, 0.1);
		border-radius: 16px;
		padding: 20px;
		animation: cardIn 0.4s ease both;
		transition: border-color 0.3s, box-shadow 0.3s;
	}
	.project-card:hover {
		border-color: rgba(107, 202, 173, 0.25);
		box-shadow: 0 4px 24px rgba(107, 202, 173, 0.06);
	}

	@keyframes cardIn {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.card-top {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.week {
		font-size: 11px;
		color: var(--text-secondary, #8880a8);
		font-weight: 500;
	}

	.type-tag {
		font-size: 10px;
		padding: 2px 8px;
		border-radius: 12px;
		background: rgba(167, 139, 250, 0.1);
		color: #a78bfa;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.project-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--text-primary, #f0f0f8);
		margin: 0 0 4px;
	}

	.project-desc {
		font-size: 13px;
		color: var(--text-secondary, #8880a8);
		margin: 0 0 16px;
		line-height: 1.5;
	}

	/* ── 카드 내 썸네일 이미지 ── */
	.card-thumbnail-wrap {
		position: relative;
		margin-bottom: 16px;
		border-radius: 12px;
		overflow: hidden;
		animation: thumbReveal 0.5s ease both;
	}

	@keyframes thumbReveal {
		from { opacity: 0; transform: scale(0.97); }
		to { opacity: 1; transform: scale(1); }
	}

	.card-thumbnail {
		display: block;
		width: 100%;
		max-height: 240px;
		object-fit: cover;
		border-radius: 12px;
		border: 1px solid rgba(167, 139, 250, 0.12);
		transition: transform 0.4s ease, box-shadow 0.4s ease;
	}

	.card-thumbnail-wrap:hover .card-thumbnail {
		transform: scale(1.015);
		box-shadow:
			0 0 20px rgba(107, 202, 173, 0.12),
			0 0 40px rgba(167, 139, 250, 0.06);
	}

	/* ★ 미세한 빛 반사 효과 — 호버 시 빛이 스캔하듯 지나감 */
	.card-thumbnail-shine {
		position: absolute;
		inset: 0;
		border-radius: 12px;
		background: linear-gradient(
			105deg,
			transparent 40%,
			rgba(107, 202, 173, 0.07) 45%,
			rgba(167, 139, 250, 0.1) 50%,
			transparent 55%
		);
		opacity: 0;
		transform: translateX(-100%);
		transition: opacity 0.3s;
		pointer-events: none;
	}
	.card-thumbnail-wrap:hover .card-thumbnail-shine {
		opacity: 1;
		animation: shinePass 0.8s ease forwards;
	}
	@keyframes shinePass {
		to { transform: translateX(100%); }
	}

	/* ── 링크 버튼들 ── */
	.link-buttons {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.link-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 500;
		padding: 8px 16px;
		border-radius: 10px;
		text-decoration: none;
		transition: all 0.2s;
	}

	.demo-btn {
		background: rgba(107, 202, 173, 0.12);
		color: #6bcaad;
		border: 1px solid rgba(107, 202, 173, 0.2);
	}
	.demo-btn:hover {
		background: rgba(107, 202, 173, 0.22);
		border-color: rgba(107, 202, 173, 0.4);
		box-shadow: 0 0 12px rgba(107, 202, 173, 0.15);
	}

	.github-btn {
		background: rgba(167, 139, 250, 0.12);
		color: #c4b5fd;
		border: 1px solid rgba(167, 139, 250, 0.2);
	}
	.github-btn:hover {
		background: rgba(167, 139, 250, 0.22);
		border-color: rgba(167, 139, 250, 0.4);
		box-shadow: 0 0 12px rgba(167, 139, 250, 0.15);
	}

	.final-btn {
		background: rgba(240, 224, 80, 0.12);
		color: #f0e050;
		border: 1px solid rgba(240, 224, 80, 0.2);
	}
	.final-btn:hover {
		background: rgba(240, 224, 80, 0.22);
		border-color: rgba(240, 224, 80, 0.4);
		box-shadow: 0 0 12px rgba(240, 224, 80, 0.15);
	}

	.no-links {
		font-size: 12px;
		color: var(--text-secondary, #685d88);
		font-style: italic;
	}

	/* ── 섹션 헤더 ── */
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}
	.section-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #f0f0f8);
		margin: 0;
	}

	.add-btn {
		font-size: 12px;
		font-weight: 600;
		padding: 6px 14px;
		border-radius: 8px;
		border: 1px solid rgba(107, 202, 173, 0.3);
		background: rgba(107, 202, 173, 0.1);
		color: #6bcaad;
		cursor: pointer;
		transition: all 0.2s;
	}
	.add-btn:hover {
		background: rgba(107, 202, 173, 0.2);
		border-color: rgba(107, 202, 173, 0.5);
	}

	.add-btn-empty {
		margin-top: 12px;
		font-size: 13px;
		font-weight: 500;
		padding: 8px 20px;
		border-radius: 10px;
		border: 1px dashed rgba(107, 202, 173, 0.3);
		background: rgba(107, 202, 173, 0.05);
		color: #6bcaad;
		cursor: pointer;
		transition: all 0.2s;
	}
	.add-btn-empty:hover {
		background: rgba(107, 202, 173, 0.12);
		border-style: solid;
	}

	.edit-btn {
		margin-left: auto;
		font-size: 10px;
		color: #a78bfa;
		background: rgba(167, 139, 250, 0.08);
		border: 1px solid rgba(167, 139, 250, 0.15);
		border-radius: 6px;
		padding: 2px 8px;
		cursor: pointer;
		transition: all 0.2s;
	}
	.edit-btn:hover {
		background: rgba(167, 139, 250, 0.2);
		border-color: rgba(167, 139, 250, 0.4);
	}

	.edit-btns {
		display: flex;
		gap: 8px;
	}

	.cancel-btn {
		flex: 1;
		padding: 10px;
		border-radius: 10px;
		border: 1px solid rgba(167, 139, 250, 0.2);
		background: transparent;
		color: #9890b0;
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s;
	}
	.cancel-btn:hover {
		background: rgba(167, 139, 250, 0.08);
	}

	.delete-btn {
		font-size: 10px;
		color: #e07a6b;
		background: rgba(224, 122, 107, 0.08);
		border: 1px solid rgba(224, 122, 107, 0.15);
		border-radius: 6px;
		padding: 2px 8px;
		cursor: pointer;
		transition: all 0.2s;
	}
	.delete-btn:hover {
		background: rgba(224, 122, 107, 0.2);
		border-color: rgba(224, 122, 107, 0.4);
	}

	/* ── 폼 ── */
	.form-card {
		background: rgba(13, 11, 26, 0.6);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(107, 202, 173, 0.15);
		border-radius: 16px;
		padding: 20px;
		margin-bottom: 20px;
		animation: cardIn 0.3s ease;
	}
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.form-full { grid-column: 1 / -1; }

	.form-label {
		display: block;
		font-size: 11px;
		color: var(--text-secondary, #8880a8);
		margin-bottom: 4px;
		font-weight: 500;
	}
	.form-input {
		width: 100%;
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid rgba(167, 139, 250, 0.15);
		background: rgba(13, 11, 26, 0.5);
		color: var(--text-primary, #f0f0f8);
		font-size: 13px;
		outline: none;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}
	.form-input:focus { border-color: #6bcaad; }
	.form-input::placeholder { color: var(--text-secondary, #685d88); }
	.form-textarea { resize: none; }

	.submit-btn {
		width: 100%;
		padding: 10px;
		border-radius: 10px;
		border: none;
		background: linear-gradient(135deg, rgba(107, 202, 173, 0.3), rgba(167, 139, 250, 0.3));
		color: #f0f0f8;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
	.submit-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, rgba(107, 202, 173, 0.45), rgba(167, 139, 250, 0.45));
	}
	.submit-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* ── 업로드 영역 ── */
	.upload-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 28px 20px;
		border-radius: 12px;
		border: 1.5px dashed rgba(167, 139, 250, 0.25);
		background:
			radial-gradient(ellipse at 50% 0%, rgba(107, 202, 173, 0.04) 0%, transparent 70%),
			rgba(13, 11, 26, 0.4);
		cursor: pointer;
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	.upload-zone::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 12px;
		background: radial-gradient(
			circle at 50% 50%,
			rgba(167, 139, 250, 0.06) 0%,
			transparent 70%
		);
		opacity: 0;
		transition: opacity 0.3s;
	}

	.upload-zone:hover,
	.upload-zone:focus-within {
		border-color: rgba(107, 202, 173, 0.45);
		background:
			radial-gradient(ellipse at 50% 0%, rgba(107, 202, 173, 0.08) 0%, transparent 70%),
			rgba(13, 11, 26, 0.5);
		box-shadow: 0 0 24px rgba(107, 202, 173, 0.06);
	}

	.upload-zone:hover::before {
		opacity: 1;
	}

	.upload-zone--drag {
		border-color: #6bcaad !important;
		border-style: solid !important;
		background:
			radial-gradient(ellipse at 50% 50%, rgba(107, 202, 173, 0.12) 0%, transparent 70%),
			rgba(13, 11, 26, 0.6) !important;
		box-shadow:
			0 0 30px rgba(107, 202, 173, 0.1),
			inset 0 0 30px rgba(107, 202, 173, 0.03) !important;
		transform: scale(1.01);
	}

	.upload-zone--compact {
		padding: 12px 16px;
		flex-direction: row;
		gap: 10px;
		margin-top: 8px;
	}

	.upload-input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
		width: 100%;
		height: 100%;
	}

	.upload-icon {
		color: var(--text-secondary, #8880a8);
		transition: color 0.3s, transform 0.3s;
	}
	.upload-zone:hover .upload-icon {
		color: #6bcaad;
		transform: translateY(-2px);
	}
	.upload-zone--drag .upload-icon {
		color: #6bcaad;
		transform: translateY(-4px) scale(1.1);
	}

	.upload-text {
		font-size: 13px;
		color: var(--text-secondary, #8880a8);
		font-weight: 500;
		transition: color 0.3s;
	}
	.upload-zone:hover .upload-text { color: var(--text-primary, #f0f0f8); }

	.upload-text-sm {
		font-size: 12px;
		color: var(--text-secondary, #8880a8);
		font-weight: 500;
		transition: color 0.3s;
		position: relative;
		z-index: 1;
	}
	.upload-zone:hover .upload-text-sm { color: #6bcaad; }

	.upload-hint {
		font-size: 11px;
		color: var(--text-secondary, #685d88);
	}

	/* ── 썸네일 미리보기 (폼 내) ── */
	.thumb-preview-wrap {
		position: relative;
		border-radius: 12px;
		overflow: hidden;
		animation: previewIn 0.35s ease both;
	}

	@keyframes previewIn {
		from { opacity: 0; transform: scale(0.95); }
		to { opacity: 1; transform: scale(1); }
	}

	.thumb-preview {
		display: block;
		width: 100%;
		max-height: 200px;
		object-fit: cover;
		border-radius: 12px;
		border: 1px solid rgba(167, 139, 250, 0.15);
	}

	.thumb-remove {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid rgba(224, 122, 107, 0.3);
		background: rgba(13, 11, 26, 0.85);
		backdrop-filter: blur(8px);
		color: #e07a6b;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
		padding: 0;
	}
	.thumb-remove:hover {
		background: rgba(224, 122, 107, 0.2);
		border-color: rgba(224, 122, 107, 0.6);
		transform: scale(1.1);
	}

	.thumb-current-label {
		position: absolute;
		bottom: 8px;
		left: 8px;
		font-size: 10px;
		padding: 3px 8px;
		border-radius: 6px;
		background: rgba(13, 11, 26, 0.8);
		backdrop-filter: blur(8px);
		color: var(--text-secondary, #8880a8);
		border: 1px solid rgba(167, 139, 250, 0.15);
	}

	/* ── 에러 메시지 ── */
	.error-text {
		margin: 6px 0 0;
		font-size: 12px;
		color: #e07a6b;
		display: flex;
		align-items: center;
		gap: 4px;
		animation: errorShake 0.35s ease;
	}
	.error-text::before {
		content: '!';
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: rgba(224, 122, 107, 0.15);
		font-size: 10px;
		font-weight: 700;
		flex-shrink: 0;
	}

	@keyframes errorShake {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-4px); }
		40% { transform: translateX(4px); }
		60% { transform: translateX(-2px); }
		80% { transform: translateX(2px); }
	}

	/* ── 버튼 내 스피너 ── */
	.btn-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(240, 240, 248, 0.2);
		border-top-color: #f0f0f8;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
</style>
