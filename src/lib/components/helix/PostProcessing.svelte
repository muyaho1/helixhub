<script lang="ts">
	import { useThrelte, useTask } from '@threlte/core';
	import { onDestroy } from 'svelte';
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
	import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
	import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
	import * as THREE from 'three';
	import { helixSettings } from '$lib/stores/helixSettings.svelte';

	const { renderer, scene, camera, autoRender, size } = useThrelte();
	const prevToneMapping = renderer.toneMapping;
	const prevExposure = renderer.toneMappingExposure;

	let composer: EffectComposer | null = null;
	let bloomPass: UnrealBloomPass | null = null;
	let renderPass: RenderPass | null = null;
	let initialized = false;

	function initComposer(width: number, height: number) {
		if (initialized || width <= 0 || height <= 0 || !camera.current) return;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = helixSettings.exposure;
		autoRender.set(false);

		composer = new EffectComposer(renderer);
		renderPass = new RenderPass(scene, camera.current);
		composer.addPass(renderPass);
		bloomPass = new UnrealBloomPass(
			new THREE.Vector2(width, height),
			helixSettings.bloomStrength, helixSettings.bloomRadius, 0.12
		);
		composer.addPass(bloomPass);
		composer.addPass(new OutputPass());
		composer.setSize(width, height);
		initialized = true;
	}

	$effect(() => { if (renderPass && camera.current) renderPass.camera = camera.current; });
	$effect(() => {
		const { width, height } = size.current;
		if (initialized && composer && bloomPass && width > 0 && height > 0) {
			composer.setSize(width, height);
			bloomPass.resolution.set(width, height);
		}
	});

	// ★ 매 프레임: settings 값을 실시간 반영
	useTask(() => {
		if (!initialized) { initComposer(size.current.width, size.current.height); return; }
		if (bloomPass) {
			bloomPass.strength = helixSettings.bloomStrength;
			bloomPass.radius = helixSettings.bloomRadius;
		}
		renderer.toneMappingExposure = helixSettings.exposure;
		try { composer?.render(); } catch { /* */ }
	});

	onDestroy(() => {
		autoRender.set(true);
		renderer.toneMapping = prevToneMapping;
		renderer.toneMappingExposure = prevExposure;
		composer?.dispose(); composer = null;
		initialized = false;
	});
</script>
