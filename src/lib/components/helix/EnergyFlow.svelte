<script lang="ts">
	// 나선을 따라 흐르는 생체 에너지 — 은은한 발광 입자
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';

	let {
		radius = 0.8, pitch = 5.5, nodeCount = 20, strandOffset = Math.PI * 0.833
	}: { radius?: number; pitch?: number; nodeCount?: number; strandOffset?: number; } = $props();

	const FLOW_COUNT = 80;

	function getHelixPos(t: number, strand: number): [number, number, number] {
		const totalAngle = (nodeCount / 10 + 0.5) * Math.PI * 2;
		const height = nodeCount * pitch / 10;
		const angle = t * totalAngle + (strand === 0 ? 0 : strandOffset);
		return [Math.cos(angle) * (radius + 0.05), t * height, Math.sin(angle) * (radius + 0.05)];
	}

	const flowData = Array.from({ length: FLOW_COUNT }, () => ({
		strand: Math.random() > 0.5 ? 1 : 0,
		t: Math.random(),
		speed: 0.03 + Math.random() * 0.05,
	}));

	const posArray = new Float32Array(FLOW_COUNT * 3);
	const colorArray = new Float32Array(FLOW_COUNT * 3);

	const mintGlow = new THREE.Color('#a0e8d0');
	const coralGlow = new THREE.Color('#f0b0a0');
	const whiteGlow = new THREE.Color('#f0e8ff');

	for (let i = 0; i < FLOW_COUNT; i++) {
		const r = Math.random();
		const c = r < 0.15 ? whiteGlow : (flowData[i].strand === 0 ? mintGlow : coralGlow);
		colorArray[i * 3] = c.r; colorArray[i * 3 + 1] = c.g; colorArray[i * 3 + 2] = c.b;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
	geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

	const material = new THREE.PointsMaterial({
		size: 0.08, vertexColors: true, transparent: true, opacity: 0.8,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});

	let pointsRef: THREE.Points | undefined = $state();

	useTask((delta) => {
		if (!pointsRef) return;
		const arr = pointsRef.geometry.attributes.position.array as Float32Array;
		for (let i = 0; i < FLOW_COUNT; i++) {
			const d = flowData[i];
			d.t += d.speed * delta;
			if (d.t > 1) d.t -= 1;
			const [x, y, z] = getHelixPos(d.t, d.strand);
			arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
		}
		pointsRef.geometry.attributes.position.needsUpdate = true;
	});
</script>

<T.Points bind:ref={pointsRef} args={[geometry, material]} />
