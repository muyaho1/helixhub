<script lang="ts">
	import { T, useThrelte, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import { helixSettings, mouseHit } from '$lib/stores/helixSettings.svelte';

	let {
		color = '#6bcaad', strandIndex = 0, nodeCount = 10,
		radius = 2, pitch = 1.5, strandOffset = strandIndex * Math.PI
	}: {
		color?: string; strandIndex?: 0 | 1; nodeCount?: number;
		radius?: number; pitch?: number; strandOffset?: number;
	} = $props();

	const SPHERE_RADIUS = 0.07;
	const SPHERES_PER_UNIT = 18;
	const TUBE_THICKNESS = 0.06;
	const LAYERS = 3;

	function getHelixPoints(): THREE.Vector3[] {
		const points: THREE.Vector3[] = [];
		const totalTurns = nodeCount / 10 + 0.5;
		const totalAngle = totalTurns * Math.PI * 2;
		const height = nodeCount * pitch / 10;
		const steps = Math.max(200, nodeCount * 30);
		for (let i = 0; i <= steps; i++) {
			const t = i / steps;
			const angle = t * totalAngle + strandOffset;
			points.push(new THREE.Vector3(Math.cos(angle) * radius, t * height, Math.sin(angle) * radius));
		}
		return points;
	}

	interface SphereData { baseX: number; baseY: number; baseZ: number; scale: number; }

	function generateSphereData(): { matrices: THREE.Matrix4[]; spheres: SphereData[] } {
		const curve = new THREE.CatmullRomCurve3(getHelixPoints());
		const sphereCount = Math.floor(curve.getLength() * SPHERES_PER_UNIT);
		const matrices: THREE.Matrix4[] = [];
		const spheres: SphereData[] = [];
		let seed = strandIndex * 1000 + 42;
		function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

		for (let i = 0; i < sphereCount; i++) {
			const t = i / sphereCount;
			const point = curve.getPointAt(t);
			const tangent = curve.getTangentAt(t);
			const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
			const binormal = new THREE.Vector3().crossVectors(tangent, normal);
			for (let layer = 0; layer < LAYERS; layer++) {
				const a = rand() * Math.PI * 2;
				const r = (layer / LAYERS) * TUBE_THICKNESS + rand() * 0.02;
				const pos = point.clone()
					.add(normal.clone().multiplyScalar(Math.cos(a) * r))
					.add(binormal.clone().multiplyScalar(Math.sin(a) * r));
				const s = 0.8 + rand() * 0.4;
				const m = new THREE.Matrix4();
				m.makeTranslation(pos.x, pos.y, pos.z);
				m.scale(new THREE.Vector3(s, s, s));
				matrices.push(m);
				spheres.push({ baseX: pos.x, baseY: pos.y, baseZ: pos.z, scale: s });
			}
		}
		return { matrices, spheres };
	}

	let data = $derived(generateSphereData());
	let meshRef: THREE.InstancedMesh | undefined = $state();
	let matRef: THREE.MeshPhysicalMaterial | undefined = $state();

	$effect(() => {
		if (meshRef && data.matrices.length > 0) {
			data.matrices.forEach((m, i) => meshRef!.setMatrixAt(i, m));
			meshRef.instanceMatrix.needsUpdate = true;
		}
	});

	// ★ 이 가닥에 마우스 올리면 → mouseHit에 strandIndex 기록
	function handlePointerMove(e: any) {
		if (e.point) {
			mouseHit.active = true;
			mouseHit.strandIndex = strandIndex;
			mouseHit.x = e.point.x;
			mouseHit.y = e.point.y;
			mouseHit.z = e.point.z;
		}
	}
	function handlePointerLeave() {
		// 이 가닥에서 벗어난 경우에만 비활성화
		if (mouseHit.strandIndex === strandIndex) {
			mouseHit.active = false;
			mouseHit.strandIndex = -1;
		}
	}

	let time = $state(0);
	const tmpMatrix = new THREE.Matrix4();
	const tmpVec = new THREE.Vector3();
	// ★ 부드러운 전환을 위한 현재 ripple 강도 (lerp)
	let currentRippleStrength = 0;

	useTask((delta) => {
		time += delta;
		if (!meshRef || !matRef) return;

		// ★ 이 가닥이 호버 중인지 확인
		const isThisStrandHovered = mouseHit.active && mouseHit.strandIndex === strandIndex;
		const isOtherStrandHovered = mouseHit.active && mouseHit.strandIndex !== strandIndex && mouseHit.strandIndex >= 0;

		// ★ emissive: 호버 시 밝게, 다른 가닥 호버 시 약간 어둡게
		const phase = strandIndex * Math.PI * 0.5;
		const baseEmissive = helixSettings.emissiveIntensity;
		if (isThisStrandHovered) {
			matRef.emissiveIntensity = THREE.MathUtils.lerp(
				matRef.emissiveIntensity, baseEmissive + 0.4, 0.08
			);
		} else if (isOtherStrandHovered) {
			matRef.emissiveIntensity = THREE.MathUtils.lerp(
				matRef.emissiveIntensity, baseEmissive * 0.6, 0.05
			);
		} else {
			matRef.emissiveIntensity = baseEmissive + Math.sin(time * 0.8 + phase) * 0.15;
		}

		// ★ 물결 효과 — 이 가닥에 호버 중일 때만
		// 부드럽게 강도 전환 (lerp)
		const targetStrength = isThisStrandHovered ? 1.0 : 0.0;
		currentRippleStrength = THREE.MathUtils.lerp(currentRippleStrength, targetStrength, 0.08);

		if (currentRippleStrength > 0.01) {
			const hitX = mouseHit.x;
			const hitY = mouseHit.y;
			const hitZ = mouseHit.z;
			const RIPPLE_RADIUS = 2.5;
			const RIPPLE_MAX = 0.18 * currentRippleStrength;

			for (let i = 0; i < data.spheres.length; i++) {
				const s = data.spheres[i];
				const dx = s.baseX - hitX;
				const dy = s.baseY - hitY;
				const dz = s.baseZ - hitZ;
				const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

				let ox = 0, oy = 0, oz = 0;
				if (dist < RIPPLE_RADIUS) {
					// ★ 부드러운 falloff: cubic ease-out
					const t = 1 - dist / RIPPLE_RADIUS;
					const ease = t * t * (3 - 2 * t); // smoothstep
					// 나선 축에서 방사 방향으로 부드러운 파동
					const wave = Math.sin(dist * 4 - time * 4) * ease * RIPPLE_MAX;
					const radial = Math.sqrt(s.baseX * s.baseX + s.baseZ * s.baseZ);
					if (radial > 0.01) {
						ox = (s.baseX / radial) * wave;
						oz = (s.baseZ / radial) * wave;
					}
					// Y 방향으로 미세한 호흡
					oy = ease * Math.sin(dist * 3 - time * 3) * RIPPLE_MAX * 0.5;
				}

				tmpMatrix.makeTranslation(s.baseX + ox, s.baseY + oy, s.baseZ + oz);
				tmpMatrix.scale(tmpVec.set(s.scale, s.scale, s.scale));
				meshRef!.setMatrixAt(i, tmpMatrix);
			}
			meshRef.instanceMatrix.needsUpdate = true;
		}
	});
</script>

{#if data.matrices.length > 0}
	<!-- ★ 각 가닥의 InstancedMesh에 직접 포인터 이벤트 → 가닥별 인식 -->
	<T.InstancedMesh
		bind:ref={meshRef}
		args={[undefined, undefined, data.matrices.length]}
		onpointermove={handlePointerMove}
		onpointerleave={handlePointerLeave}
	>
		<T.SphereGeometry args={[SPHERE_RADIUS, 10, 8]} />
		<T.MeshPhysicalMaterial
			bind:ref={matRef}
			color={color} roughness={helixSettings.roughness} metalness={helixSettings.metalness}
			clearcoat={helixSettings.clearcoat} clearcoatRoughness={0.5}
			sheen={0.4} sheenRoughness={0.6} sheenColor={color}
			emissive={color} emissiveIntensity={0.5}
		/>
	</T.InstancedMesh>
{/if}
