<script lang="ts">
	import { helixSettings } from '$lib/stores/helixSettings.svelte';
	let isOpen = $state(false);
</script>

<!-- 토글 버튼 — 패널 닫혀있을 때만 보임 -->
{#if !isOpen}
	<button class="toggle-btn" onclick={() => isOpen = true} aria-label="설정 열기">
		<span class="icon">⚙</span>
	</button>
{/if}

<!-- 패널 -->
{#if isOpen}
	<aside class="panel">
		<div class="panel-inner">
			<div class="panel-header">
				<h3 class="title">Visual Settings</h3>
				<button class="close-btn" onclick={() => isOpen = false} aria-label="닫기">✕</button>
			</div>

			<!-- Bloom -->
			<div class="section">
				<span class="section-label">Bloom</span>
				<label class="row">
					<span class="lbl">강도</span>
					<input type="range" min="0" max="4" step="0.05" bind:value={helixSettings.bloomStrength} />
					<span class="val">{helixSettings.bloomStrength.toFixed(2)}</span>
				</label>
				<label class="row">
					<span class="lbl">퍼짐</span>
					<input type="range" min="0" max="1" step="0.01" bind:value={helixSettings.bloomRadius} />
					<span class="val">{helixSettings.bloomRadius.toFixed(2)}</span>
				</label>
				<label class="row">
					<span class="lbl">노출</span>
					<input type="range" min="0.3" max="2.5" step="0.05" bind:value={helixSettings.exposure} />
					<span class="val">{helixSettings.exposure.toFixed(2)}</span>
				</label>
			</div>

			<!-- 뼈대 -->
			<div class="section">
				<span class="section-label">뼈대</span>
				<label class="row">
					<span class="lbl">발광</span>
					<input type="range" min="0" max="1.5" step="0.01" bind:value={helixSettings.emissiveIntensity} />
					<span class="val">{helixSettings.emissiveIntensity.toFixed(2)}</span>
				</label>
				<label class="row">
					<span class="lbl">거칠기</span>
					<input type="range" min="0" max="1" step="0.01" bind:value={helixSettings.roughness} />
					<span class="val">{helixSettings.roughness.toFixed(2)}</span>
				</label>
				<label class="row">
					<span class="lbl">코팅</span>
					<input type="range" min="0" max="1" step="0.01" bind:value={helixSettings.clearcoat} />
					<span class="val">{helixSettings.clearcoat.toFixed(2)}</span>
				</label>
				<label class="row">
					<span class="lbl">금속감</span>
					<input type="range" min="0" max="1" step="0.01" bind:value={helixSettings.metalness} />
					<span class="val">{helixSettings.metalness.toFixed(2)}</span>
				</label>
				<label class="row color-row">
					<span class="lbl">가닥 A</span>
					<input type="color" bind:value={helixSettings.strandAColor} />
				</label>
				<label class="row color-row">
					<span class="lbl">가닥 B</span>
					<input type="color" bind:value={helixSettings.strandBColor} />
				</label>
			</div>

			<!-- 노드 -->
			<div class="section">
				<span class="section-label">노드</span>
				<label class="row color-row">
					<span class="lbl">색상</span>
					<input type="color" bind:value={helixSettings.nodeColor} />
				</label>
				<label class="row">
					<span class="lbl">크기</span>
					<input type="range" min="0.03" max="0.4" step="0.01" bind:value={helixSettings.nodeScale} />
					<span class="val">{helixSettings.nodeScale.toFixed(2)}</span>
				</label>
				<label class="row">
					<span class="lbl">hover 크기</span>
					<input type="range" min="0.1" max="0.8" step="0.01" bind:value={helixSettings.nodeHoverScale} />
					<span class="val">{helixSettings.nodeHoverScale.toFixed(2)}</span>
				</label>
				<label class="row">
					<span class="lbl">발광</span>
					<input type="range" min="0" max="3" step="0.01" bind:value={helixSettings.nodeEmissive} />
					<span class="val">{helixSettings.nodeEmissive.toFixed(2)}</span>
				</label>
				<label class="row">
					<span class="lbl">hover 발광</span>
					<input type="range" min="0" max="5" step="0.1" bind:value={helixSettings.nodeHoverEmissive} />
					<span class="val">{helixSettings.nodeHoverEmissive.toFixed(1)}</span>
				</label>
				<label class="row">
					<span class="lbl">거칠기</span>
					<input type="range" min="0" max="1" step="0.01" bind:value={helixSettings.nodeRoughness} />
					<span class="val">{helixSettings.nodeRoughness.toFixed(2)}</span>
				</label>
			</div>

			<!-- 씬 -->
			<div class="section">
				<span class="section-label">씬</span>
				<label class="row color-row">
					<span class="lbl">배경색</span>
					<input type="color" bind:value={helixSettings.bgColor} />
				</label>
				<label class="row">
					<span class="lbl">안개</span>
					<input type="range" min="0" max="0.08" step="0.001" bind:value={helixSettings.fogDensity} />
					<span class="val">{helixSettings.fogDensity.toFixed(3)}</span>
				</label>
				<label class="row">
					<span class="lbl">앰비언트</span>
					<input type="range" min="0" max="0.5" step="0.01" bind:value={helixSettings.ambientIntensity} />
					<span class="val">{helixSettings.ambientIntensity.toFixed(2)}</span>
				</label>
				<label class="row">
					<span class="lbl">파티클</span>
					<input type="range" min="0" max="1" step="0.01" bind:value={helixSettings.particleOpacity} />
					<span class="val">{helixSettings.particleOpacity.toFixed(2)}</span>
				</label>
			</div>

			<p class="hint">나선 위에 마우스를 올려보세요</p>
		</div>
	</aside>
{/if}

<style>
	.toggle-btn {
		position: fixed;
		top: 60px;
		right: 16px;
		z-index: 9999;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		border: 1px solid rgba(167, 139, 250, 0.25);
		background: rgba(13, 11, 26, 0.7);
		backdrop-filter: blur(12px);
		color: #c4b5fd;
		font-size: 18px;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.toggle-btn:hover {
		background: rgba(167, 139, 250, 0.2);
		border-color: rgba(167, 139, 250, 0.5);
	}
	.icon { line-height: 1; }

	.panel {
		position: fixed;
		top: 0;
		right: 0;
		z-index: 9998;
		width: 260px;
		height: 100vh;
		background: rgba(10, 8, 20, 0.88);
		backdrop-filter: blur(24px);
		border-left: 1px solid rgba(167, 139, 250, 0.12);
		animation: slideIn 0.25s ease;
		overflow: hidden;
	}

	.panel-inner {
		height: 100%;
		overflow-y: auto;
		padding: 100px 18px 24px;
		scrollbar-width: thin;
		scrollbar-color: rgba(167, 139, 250, 0.2) transparent;
	}

	@keyframes slideIn {
		from { transform: translateX(260px); }
		to { transform: translateX(0); }
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.title {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #a78bfa;
		margin: 0;
	}

	.close-btn {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		border: 1px solid rgba(167, 139, 250, 0.2);
		background: rgba(167, 139, 250, 0.08);
		color: #a78bfa;
		font-size: 14px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
		flex-shrink: 0;
	}
	.close-btn:hover {
		background: rgba(167, 139, 250, 0.2);
	}

	.section {
		margin-bottom: 18px;
		padding-bottom: 14px;
		border-bottom: 1px solid rgba(167, 139, 250, 0.08);
	}

	.section-label {
		display: block;
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: #685d88;
		margin-bottom: 10px;
	}

	.row {
		display: grid;
		grid-template-columns: 52px 1fr 38px;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
		cursor: default;
	}

	.color-row {
		grid-template-columns: 52px 32px;
	}

	.lbl {
		font-size: 10px;
		color: #9890b0;
		white-space: nowrap;
	}

	.val {
		font-size: 10px;
		color: #6bcaad;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 3px;
		border-radius: 2px;
		background: rgba(167, 139, 250, 0.12);
		outline: none;
		cursor: pointer;
	}
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #6bcaad;
		border: 2px solid rgba(10, 8, 20, 0.9);
		cursor: pointer;
	}
	input[type='range']::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #6bcaad;
		border: 2px solid rgba(10, 8, 20, 0.9);
		cursor: pointer;
	}

	input[type='color'] {
		-webkit-appearance: none;
		appearance: none;
		width: 28px;
		height: 28px;
		border: 2px solid rgba(167, 139, 250, 0.2);
		border-radius: 8px;
		background: transparent;
		cursor: pointer;
		padding: 0;
	}
	input[type='color']::-webkit-color-swatch-wrapper { padding: 2px; }
	input[type='color']::-webkit-color-swatch { border-radius: 5px; border: none; }

	.hint {
		font-size: 9px;
		color: #4a4260;
		text-align: center;
		margin: 8px 0 0 0;
		font-style: italic;
	}
</style>
