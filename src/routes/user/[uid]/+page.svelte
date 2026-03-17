<script lang="ts">
	import { page } from '$app/state';
	import { getUserById, getProjectsByUser, createProject, deleteProject, updateProject } from '$lib/services/firebase';
	import { uploadThumbnails, validateImageFiles, MAX_FILES } from '$lib/services/storage';
	import { getCurrentUser } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import type { User, Project, ProjectType } from '$lib/types';

	let user = $state<User | null>(null);
	let projects = $state<Project[]>([]);
	let isLoading = $state(true);
	let isTestMode = $state(false);

	// ★ 내 페이지인지 확인 (테스트 모드면 항상 owner)
	// getCurrentUser()를 별도 $derived로 분리해야 auth 상태 변화 추적이 확실함
	let currentUser = $derived(getCurrentUser());
	let isOwner = $derived(
		isTestMode ||
		(!!user && !!currentUser && currentUser.uid === user.uid)
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

	// ★ 새 프로젝트 이미지 상태 (여러 장)
	let newImageFiles = $state<File[]>([]);
	let newImagePreviews = $state<string[]>([]);
	let newImageError = $state('');
	let isUploading = $state(false);

	// ★ 수정 폼 이미지 상태
	let editImageFiles = $state<File[]>([]);
	let editImagePreviews = $state<string[]>([]);
	let editExistingThumbnails = $state<string[]>([]);
	let editImageError = $state('');

	// ★ 드래그 상태 (시각 피드백용)
	let isDraggingNew = $state(false);
	let isDraggingEdit = $state(false);

	// ★ 라이트박스 상태
	let lightboxImages = $state<string[]>([]);
	let lightboxIndex = $state(0);
	let lightboxOpen = $state(false);

	// ★ 테스트 유저용 가짜 이름 목록
	const TEST_NAMES = ['김민수', '이서연', '박지호', '최유진', '정도윤', '강하은', '윤시우', '한소율', '임준서', '오다은'];
	const BASES: ('A' | 'T' | 'G' | 'C')[] = ['A', 'T', 'G', 'C'];

	onMount(async () => {
		const uid = page.params.uid ?? '';
		if (!uid) { isLoading = false; return; }

		const urlParams = new URLSearchParams(window.location.search);
		isTestMode = urlParams.get('test') === '1' && uid.startsWith('test-');

		if (isTestMode) {
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
				thumbnails: [],
				createdAt: new Date(),
			}];
		} else {
			user = await getUserById(uid);
			if (user) projects = await getProjectsByUser(uid);
		}
		isLoading = false;
	});

	// ── 이미지 핸들러 (여러 장) ──

	function handleNewImages(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		if (files.length === 0) return;
		processNewImages(files);
		// ★ input value 리셋 — 같은 파일 재선택 가능하게
		input.value = '';
	}

	function processNewImages(files: File[]) {
		newImageError = '';
		const error = validateImageFiles(files, newImageFiles.length);
		if (error) {
			newImageError = error;
			return;
		}
		newImageFiles = [...newImageFiles, ...files];
		newImagePreviews = [...newImagePreviews, ...files.map(f => URL.createObjectURL(f))];
	}

	function removeNewImage(index: number) {
		URL.revokeObjectURL(newImagePreviews[index]);
		newImageFiles = newImageFiles.filter((_, i) => i !== index);
		newImagePreviews = newImagePreviews.filter((_, i) => i !== index);
		newImageError = '';
	}

	function handleEditImages(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		if (files.length === 0) return;
		processEditImages(files);
		input.value = '';
	}

	function processEditImages(files: File[]) {
		editImageError = '';
		const totalCount = editExistingThumbnails.length + editImageFiles.length;
		const error = validateImageFiles(files, totalCount);
		if (error) {
			editImageError = error;
			return;
		}
		editImageFiles = [...editImageFiles, ...files];
		editImagePreviews = [...editImagePreviews, ...files.map(f => URL.createObjectURL(f))];
	}

	function removeEditNewImage(index: number) {
		URL.revokeObjectURL(editImagePreviews[index]);
		editImageFiles = editImageFiles.filter((_, i) => i !== index);
		editImagePreviews = editImagePreviews.filter((_, i) => i !== index);
		editImageError = '';
	}

	function removeEditExisting(index: number) {
		editExistingThumbnails = editExistingThumbnails.filter((_, i) => i !== index);
	}

	// ── 드래그 앤 드롭 ──

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleNewDrop(event: DragEvent) {
		event.preventDefault();
		isDraggingNew = false;
		const files = Array.from(event.dataTransfer?.files ?? []);
		if (files.length > 0) processNewImages(files);
	}

	function handleEditDrop(event: DragEvent) {
		event.preventDefault();
		isDraggingEdit = false;
		const files = Array.from(event.dataTransfer?.files ?? []);
		if (files.length > 0) processEditImages(files);
	}

	// ── 라이트박스 ──

	function openLightbox(images: string[], index: number) {
		lightboxImages = images;
		lightboxIndex = index;
		lightboxOpen = true;
	}

	function closeLightbox() {
		lightboxOpen = false;
	}

	function lightboxPrev() {
		lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
	}

	function lightboxNext() {
		lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
	}

	function handleLightboxKey(event: KeyboardEvent) {
		if (!lightboxOpen) return;
		if (event.key === 'Escape') closeLightbox();
		else if (event.key === 'ArrowLeft') lightboxPrev();
		else if (event.key === 'ArrowRight') lightboxNext();
	}

	// ── CRUD ──

	async function handleCreate() {
		if (!user || !newTitle.trim() || isSubmitting) return;
		isSubmitting = true;

		if (isTestMode) {
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
				thumbnails: newImagePreviews.length > 0 ? [...newImagePreviews] : [],
				createdAt: new Date(),
			}];
		} else {
			const projectId = await createProject({
				userId: user.uid,
				title: newTitle.trim(),
				description: newDesc.trim(),
				week: newWeek,
				type: newType,
				demoURL: newDemoURL.trim() || null,
				githubURL: newGithubURL.trim() || null,
				finalURL: newFinalURL.trim() || null,
				thumbnails: []
			});

			if (newImageFiles.length > 0) {
				isUploading = true;
				try {
					const urls = await uploadThumbnails(user.uid, projectId, newImageFiles, 0);
					await updateProject(projectId, { thumbnails: urls });
				} catch (e) {
					console.error('이미지 업로드 실패:', e);
				}
				isUploading = false;
			}
			projects = await getProjectsByUser(user.uid);
		}

		// 폼 초기화
		newTitle = ''; newDesc = ''; newDemoURL = ''; newGithubURL = ''; newFinalURL = '';
		newImageFiles = []; newImagePreviews = []; newImageError = '';
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
		editExistingThumbnails = [...(project.thumbnails ?? [])];
		editImageFiles = [];
		editImagePreviews = [];
		editImageError = '';
	}

	function cancelEdit() {
		editingId = null;
		editImageFiles = [];
		editImagePreviews = [];
		editImageError = '';
		editExistingThumbnails = [];
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
				thumbnails: [...editExistingThumbnails, ...editImagePreviews],
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

			let finalThumbnails = [...editExistingThumbnails];

			if (editImageFiles.length > 0) {
				isUploading = true;
				try {
					const startIdx = editExistingThumbnails.length;
					const newUrls = await uploadThumbnails(user.uid, editingId, editImageFiles, startIdx);
					finalThumbnails = [...finalThumbnails, ...newUrls];
				} catch (e) {
					console.error('이미지 업로드 실패:', e);
				}
				isUploading = false;
			}

			updates.thumbnails = finalThumbnails;
			await updateProject(editingId, updates);
			projects = await getProjectsByUser(user.uid);
		}
		editingId = null;
		editImageFiles = [];
		editImagePreviews = [];
		editImageError = '';
		editExistingThumbnails = [];
	}

	async function handleDelete(id: string) {
		if (!confirm('정말 삭제할까요?')) return;
		if (isTestMode) {
			projects = projects.filter(p => p.id !== id);
			return;
		}
		await deleteProject(id, user?.uid);
		if (user) projects = await getProjectsByUser(user.uid);
	}
</script>

<!-- ★ 키보드 이벤트 리스너 (라이트박스용) -->
<svelte:window onkeydown={handleLightboxKey} />

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

		<!-- ★ 새 프로젝트 폼 -->
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

					<!-- ★ 이미지 업로드 (여러 장) -->
					<div class="form-full">
						<label class="form-label">스크린샷 ({newImagePreviews.length}/{MAX_FILES})</label>

						<!-- 미리보기 그리드 -->
						{#if newImagePreviews.length > 0}
							<div class="preview-grid">
								{#each newImagePreviews as preview, i}
									<div class="preview-item" style="animation-delay: {i * 60}ms">
										<img src={preview} alt="미리보기 {i + 1}" class="preview-img" />
										<button class="preview-remove" onclick={() => removeNewImage(i)} type="button">
											<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
										</button>
									</div>
								{/each}
							</div>
						{/if}

						<!-- 업로드 영역 (MAX_FILES 미만일 때만 표시) -->
						{#if newImagePreviews.length < MAX_FILES}
							<label
								class="upload-zone"
								class:upload-zone--compact={newImagePreviews.length > 0}
								class:upload-zone--drag={isDraggingNew}
								ondragover={handleDragOver}
								ondragenter={() => isDraggingNew = true}
								ondragleave={() => isDraggingNew = false}
								ondrop={handleNewDrop}
							>
								<input
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif"
									multiple
									onchange={handleNewImages}
									class="upload-input"
								/>
								{#if newImagePreviews.length === 0}
									<div class="upload-icon">
										<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
											<path d="M16 22V10M16 10l-5 5M16 10l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
											<path d="M6 20v4a2 2 0 002 2h16a2 2 0 002-2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										</svg>
									</div>
									<span class="upload-text">이미지를 드래그하거나 클릭 (최대 {MAX_FILES}장)</span>
									<span class="upload-hint">JPG, PNG, WebP, GIF · 각 2MB 이하</span>
								{:else}
									<span class="upload-text-sm">+ 이미지 추가 ({MAX_FILES - newImagePreviews.length}장 가능)</span>
								{/if}
							</label>
						{/if}

						{#if newImageError}
							<p class="error-text">{newImageError}</p>
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

								<!-- ★ 수정 폼 이미지 -->
								<div class="form-full">
									<label class="form-label">스크린샷 ({editExistingThumbnails.length + editImagePreviews.length}/{MAX_FILES})</label>

									<!-- 기존 이미지 -->
									{#if editExistingThumbnails.length > 0 || editImagePreviews.length > 0}
										<div class="preview-grid">
											{#each editExistingThumbnails as url, i}
												<div class="preview-item">
													<img src={url} alt="기존 이미지 {i + 1}" class="preview-img" />
													<button class="preview-remove" onclick={() => removeEditExisting(i)} type="button">
														<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
													</button>
												</div>
											{/each}
											{#each editImagePreviews as preview, i}
												<div class="preview-item" style="animation-delay: {i * 60}ms">
													<img src={preview} alt="새 이미지 {i + 1}" class="preview-img" />
													<button class="preview-remove" onclick={() => removeEditNewImage(i)} type="button">
														<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
													</button>
												</div>
											{/each}
										</div>
									{/if}

									{#if editExistingThumbnails.length + editImagePreviews.length < MAX_FILES}
										<label
											class="upload-zone"
											class:upload-zone--compact={editExistingThumbnails.length + editImagePreviews.length > 0}
											class:upload-zone--drag={isDraggingEdit}
											ondragover={handleDragOver}
											ondragenter={() => isDraggingEdit = true}
											ondragleave={() => isDraggingEdit = false}
											ondrop={handleEditDrop}
										>
											<input
												type="file"
												accept="image/jpeg,image/png,image/webp,image/gif"
												multiple
												onchange={handleEditImages}
												class="upload-input"
											/>
											{#if editExistingThumbnails.length + editImagePreviews.length === 0}
												<div class="upload-icon">
													<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
														<path d="M16 22V10M16 10l-5 5M16 10l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
														<path d="M6 20v4a2 2 0 002 2h16a2 2 0 002-2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
													</svg>
												</div>
												<span class="upload-text">이미지를 드래그하거나 클릭 (최대 {MAX_FILES}장)</span>
												<span class="upload-hint">JPG, PNG, WebP, GIF · 각 2MB 이하</span>
											{:else}
												<span class="upload-text-sm">+ 이미지 추가 ({MAX_FILES - editExistingThumbnails.length - editImagePreviews.length}장 가능)</span>
											{/if}
										</label>
									{/if}

									{#if editImageError}
										<p class="error-text">{editImageError}</p>
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

							<!-- ★ 이미지 갤러리 -->
							{#if project.thumbnails && project.thumbnails.length > 0}
								<div
									class="gallery"
									class:gallery--single={project.thumbnails.length === 1}
									class:gallery--duo={project.thumbnails.length === 2}
									class:gallery--multi={project.thumbnails.length >= 3}
								>
									{#each project.thumbnails as thumb, ti}
										<button
											class="gallery-item"
											class:gallery-item--hero={project.thumbnails.length >= 3 && ti === 0}
											onclick={() => openLightbox(project.thumbnails, ti)}
											type="button"
										>
											<img
												src={thumb}
												alt="{project.title} 스크린샷 {ti + 1}"
												class="gallery-img"
												loading="lazy"
											/>
											<div class="gallery-shine"></div>
											<!-- 여러 장일 때 마지막 아이템에 +N 표시 (5장 이상) -->
											{#if project.thumbnails.length > 4 && ti === 3}
												<div class="gallery-more">+{project.thumbnails.length - 4}</div>
											{/if}
										</button>
										<!-- 4장까지만 그리드에 표시 -->
										{#if ti >= 3 && project.thumbnails.length > 4}
											<!-- 나머지는 라이트박스에서만 볼 수 있음 -->
										{/if}
									{/each}
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

<!-- ★ 라이트박스 모달 -->
{#if lightboxOpen}
	<div class="lightbox" onclick={closeLightbox} role="dialog" aria-modal="true">
		<div class="lightbox-content" onclick={(e) => e.stopPropagation()}>
			<img
				src={lightboxImages[lightboxIndex]}
				alt="확대 이미지 {lightboxIndex + 1}"
				class="lightbox-img"
			/>

			<!-- 닫기 버튼 -->
			<button class="lightbox-close" onclick={closeLightbox} aria-label="닫기">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
				</svg>
			</button>

			<!-- 좌우 화살표 (여러 장일 때) -->
			{#if lightboxImages.length > 1}
				<button class="lightbox-arrow lightbox-arrow--left" onclick={lightboxPrev} aria-label="이전 이미지">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
						<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
				<button class="lightbox-arrow lightbox-arrow--right" onclick={lightboxNext} aria-label="다음 이미지">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
						<path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>

				<!-- 인디케이터 점 -->
				<div class="lightbox-dots">
					{#each lightboxImages as _, di}
						<button
							class="lightbox-dot"
							class:lightbox-dot--active={di === lightboxIndex}
							onclick={() => lightboxIndex = di}
							aria-label="이미지 {di + 1}"
						></button>
					{/each}
				</div>
			{/if}

			<!-- 카운터 -->
			<div class="lightbox-counter">{lightboxIndex + 1} / {lightboxImages.length}</div>
		</div>
	</div>
{/if}

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

	/* ── 이미지 갤러리 (카드 내) ── */
	.gallery {
		display: grid;
		gap: 6px;
		margin-bottom: 16px;
		border-radius: 12px;
		overflow: hidden;
		animation: thumbReveal 0.5s ease both;
	}

	@keyframes thumbReveal {
		from { opacity: 0; transform: scale(0.97); }
		to { opacity: 1; transform: scale(1); }
	}

	.gallery--single {
		grid-template-columns: 1fr;
	}

	.gallery--duo {
		grid-template-columns: 1fr 1fr;
	}

	.gallery--multi {
		grid-template-columns: 1fr 1fr;
		grid-template-rows: auto auto;
	}

	.gallery-item {
		position: relative;
		overflow: hidden;
		border-radius: 10px;
		border: 1px solid rgba(167, 139, 250, 0.1);
		cursor: pointer;
		padding: 0;
		background: none;
		transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
	}

	.gallery-item:hover {
		border-color: rgba(107, 202, 173, 0.35);
		box-shadow: 0 0 16px rgba(107, 202, 173, 0.1);
		transform: scale(1.01);
	}

	.gallery-item--hero {
		grid-column: 1 / -1;
	}

	.gallery-img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.4s ease;
	}

	.gallery--single .gallery-img {
		max-height: 260px;
	}

	.gallery--duo .gallery-img {
		height: 160px;
	}

	.gallery--multi .gallery-item--hero .gallery-img {
		max-height: 220px;
	}

	.gallery--multi .gallery-item:not(.gallery-item--hero) .gallery-img {
		height: 120px;
	}

	.gallery-item:hover .gallery-img {
		transform: scale(1.03);
	}

	/* 호버 시 빛 반사 효과 */
	.gallery-shine {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			105deg,
			transparent 40%,
			rgba(107, 202, 173, 0.06) 45%,
			rgba(167, 139, 250, 0.08) 50%,
			transparent 55%
		);
		opacity: 0;
		transform: translateX(-100%);
		pointer-events: none;
	}
	.gallery-item:hover .gallery-shine {
		opacity: 1;
		animation: shinePass 0.7s ease forwards;
	}
	@keyframes shinePass {
		to { transform: translateX(100%); }
	}

	/* +N 더보기 오버레이 */
	.gallery-more {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(13, 11, 26, 0.65);
		backdrop-filter: blur(4px);
		color: var(--text-primary, #f0f0f8);
		font-size: 18px;
		font-weight: 700;
		letter-spacing: 0.02em;
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

	/* ── 미리보기 그리드 (폼 내) ── */
	.preview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 8px;
		margin-bottom: 8px;
	}

	.preview-item {
		position: relative;
		border-radius: 10px;
		overflow: hidden;
		aspect-ratio: 4 / 3;
		animation: previewIn 0.3s ease both;
	}

	@keyframes previewIn {
		from { opacity: 0; transform: scale(0.9); }
		to { opacity: 1; transform: scale(1); }
	}

	.preview-img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		border: 1px solid rgba(167, 139, 250, 0.15);
		border-radius: 10px;
	}

	.preview-remove {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 22px;
		height: 22px;
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
	.preview-remove:hover {
		background: rgba(224, 122, 107, 0.25);
		border-color: rgba(224, 122, 107, 0.6);
		transform: scale(1.15);
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
		background: radial-gradient(circle at 50% 50%, rgba(167, 139, 250, 0.06) 0%, transparent 70%);
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

	.upload-zone:hover::before { opacity: 1; }

	.upload-zone--drag {
		border-color: #6bcaad !important;
		border-style: solid !important;
		background:
			radial-gradient(ellipse at 50% 50%, rgba(107, 202, 173, 0.12) 0%, transparent 70%),
			rgba(13, 11, 26, 0.6) !important;
		box-shadow: 0 0 30px rgba(107, 202, 173, 0.1), inset 0 0 30px rgba(107, 202, 173, 0.03) !important;
		transform: scale(1.01);
	}

	.upload-zone--compact {
		padding: 14px 16px;
		flex-direction: row;
		gap: 10px;
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

	/* ══════════════════════════════════════════
	   라이트박스
	   ══════════════════════════════════════════ */
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(5, 3, 15, 0.88);
		backdrop-filter: blur(20px);
		animation: lbFadeIn 0.25s ease;
		cursor: pointer;
	}

	@keyframes lbFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.lightbox-content {
		position: relative;
		max-width: 92vw;
		max-height: 88vh;
		cursor: default;
		animation: lbZoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes lbZoomIn {
		from { opacity: 0; transform: scale(0.92); }
		to { opacity: 1; transform: scale(1); }
	}

	.lightbox-img {
		display: block;
		max-width: 92vw;
		max-height: 84vh;
		object-fit: contain;
		border-radius: 12px;
		box-shadow:
			0 0 60px rgba(107, 202, 173, 0.08),
			0 0 120px rgba(167, 139, 250, 0.05),
			0 25px 50px rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(167, 139, 250, 0.12);
	}

	.lightbox-close {
		position: absolute;
		top: -40px;
		right: 0;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid rgba(240, 240, 248, 0.15);
		background: rgba(13, 11, 26, 0.7);
		backdrop-filter: blur(12px);
		color: var(--text-primary, #f0f0f8);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
		padding: 0;
	}
	.lightbox-close:hover {
		background: rgba(224, 122, 107, 0.2);
		border-color: rgba(224, 122, 107, 0.4);
		transform: scale(1.1);
	}

	.lightbox-arrow {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1px solid rgba(240, 240, 248, 0.1);
		background: rgba(13, 11, 26, 0.6);
		backdrop-filter: blur(12px);
		color: var(--text-primary, #f0f0f8);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
		padding: 0;
	}
	.lightbox-arrow:hover {
		background: rgba(107, 202, 173, 0.15);
		border-color: rgba(107, 202, 173, 0.35);
		box-shadow: 0 0 16px rgba(107, 202, 173, 0.12);
		transform: translateY(-50%) scale(1.08);
	}

	.lightbox-arrow--left { left: -56px; }
	.lightbox-arrow--right { right: -56px; }

	/* 모바일에서 화살표 위치 조정 */
	@media (max-width: 640px) {
		.lightbox-arrow--left { left: 8px; }
		.lightbox-arrow--right { right: 8px; }
		.lightbox-arrow {
			width: 36px;
			height: 36px;
			background: rgba(13, 11, 26, 0.8);
		}
	}

	.lightbox-dots {
		position: absolute;
		bottom: -32px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 8px;
	}

	.lightbox-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 1px solid rgba(167, 139, 250, 0.3);
		background: rgba(167, 139, 250, 0.1);
		cursor: pointer;
		padding: 0;
		transition: all 0.25s;
	}

	.lightbox-dot--active {
		background: #6bcaad;
		border-color: #6bcaad;
		box-shadow: 0 0 8px rgba(107, 202, 173, 0.4);
		transform: scale(1.25);
	}

	.lightbox-dot:hover:not(.lightbox-dot--active) {
		background: rgba(167, 139, 250, 0.3);
		border-color: rgba(167, 139, 250, 0.5);
	}

	.lightbox-counter {
		position: absolute;
		top: -36px;
		left: 0;
		font-size: 12px;
		color: var(--text-secondary, #8880a8);
		font-weight: 500;
		letter-spacing: 0.04em;
	}
</style>
