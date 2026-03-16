<script lang="ts">
	// 배경 파티클 — 세포 속 미립자처럼 떠다니는 빛
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import { helixSettings } from '$lib/stores/helixSettings.svelte';

	const COUNT = 400;
	const posArray = new Float32Array(COUNT * 3);
	const colorArray = new Float32Array(COUNT * 3);
	const velocities = new Float32Array(COUNT * 3);

	// ★ 유기체 팔레트: 라벤더, 민트, 코랄, 피치, 소프트 골드
	const palette = [
		new THREE.Color('#a78bfa'),
		new THREE.Color('#6bcaad'),
		new THREE.Color('#e07a6b'),
		new THREE.Color('#f0c8a0'),
		new THREE.Color('#c4b5fd'),
		new THREE.Color('#80d0b8'),
	];

	for (let i = 0; i < COUNT; i++) {
		const i3 = i * 3;
		posArray[i3] = (Math.random() - 0.5) * 24;
		posArray[i3 + 1] = (Math.random() - 0.5) * 18;
		posArray[i3 + 2] = (Math.random() - 0.5) * 24;
		velocities[i3] = (Math.random() - 0.5) * 0.006;
		velocities[i3 + 1] = (Math.random() - 0.5) * 0.005;
		velocities[i3 + 2] = (Math.random() - 0.5) * 0.006;
		const c = palette[Math.floor(Math.random() * palette.length)];
		colorArray[i3] = c.r; colorArray[i3 + 1] = c.g; colorArray[i3 + 2] = c.b;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
	geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

	const material = new THREE.PointsMaterial({
		size: 0.1, vertexColors: true, transparent: true, opacity: 0.6,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});

	let ref: THREE.Points | undefined = $state();
	let time = 0;

	useTask((delta) => {
		if (!ref) return;
		time += delta;
		const arr = ref.geometry.attributes.position.array as Float32Array;
		for (let i = 0; i < COUNT; i++) {
			const i3 = i * 3;
			arr[i3] += velocities[i3]; arr[i3 + 1] += velocities[i3 + 1]; arr[i3 + 2] += velocities[i3 + 2];
			if (Math.abs(arr[i3]) > 12) arr[i3] *= -0.95;
			if (Math.abs(arr[i3 + 1]) > 9) arr[i3 + 1] *= -0.95;
			if (Math.abs(arr[i3 + 2]) > 12) arr[i3 + 2] *= -0.95;
		}
		ref.geometry.attributes.position.needsUpdate = true;
		material.opacity = helixSettings.particleOpacity * (0.8 + Math.sin(time * 1.2) * 0.2);
	});
</script>

<T.Points bind:ref={ref} args={[geometry, material]} />
