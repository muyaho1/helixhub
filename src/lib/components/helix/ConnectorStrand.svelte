<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import { helixSettings } from '$lib/stores/helixSettings.svelte';

	let {
		nodeCount = 10, radius = 1.2, pitch = 4.0, strandOffset = Math.PI * 0.833
	}: { nodeCount?: number; radius?: number; pitch?: number; strandOffset?: number; } = $props();

	const SPHERE_RADIUS = 0.07;
	const SPHERES_PER_BAR = 14;
	const CONNECTOR_DENSITY = 1.2;
	const TUBE_THICKNESS = 0.06;
	const LAYERS = 3;

	function getConnectorEndpoints(index: number) {
		const totalTurns = nodeCount / 10 + 0.5;
		const totalAngle = totalTurns * Math.PI * 2;
		const height = nodeCount * pitch / 10;
		const t = index / Math.floor(nodeCount * CONNECTOR_DENSITY);
		const y = t * height;
		const angleA = t * totalAngle;
		return {
			pointA: new THREE.Vector3(Math.cos(angleA) * radius, y, Math.sin(angleA) * radius),
			pointB: new THREE.Vector3(Math.cos(angleA + strandOffset) * radius, y, Math.sin(angleA + strandOffset) * radius)
		};
	}

	function generateHalf(side: 'mint' | 'coral'): THREE.Matrix4[] {
		const matrices: THREE.Matrix4[] = [];
		const total = Math.floor(nodeCount * CONNECTOR_DENSITY);
		let seed = side === 'mint' ? 4444 : 5555;
		function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

		for (let i = 0; i < total; i++) {
			const { pointA, pointB } = getConnectorEndpoints(i);
			const dir = new THREE.Vector3().subVectors(pointB, pointA).normalize();
			const perp1 = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
			const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();
			const tStart = side === 'mint' ? 0.05 : 0.50;
			const tEnd = side === 'mint' ? 0.50 : 0.95;
			const halfCount = Math.floor(SPHERES_PER_BAR / 2);
			for (let j = 0; j < halfCount; j++) {
				const t = tStart + (j / (halfCount - 1)) * (tEnd - tStart);
				const bx = pointA.x + (pointB.x - pointA.x) * t;
				const by = pointA.y + (pointB.y - pointA.y) * t;
				const bz = pointA.z + (pointB.z - pointA.z) * t;
				for (let layer = 0; layer < LAYERS; layer++) {
					const a = rand() * Math.PI * 2;
					const r = (layer / LAYERS) * TUBE_THICKNESS + rand() * 0.02;
					const s = 0.8 + rand() * 0.4;
					const m = new THREE.Matrix4();
					m.makeTranslation(
						bx + perp1.x * Math.cos(a) * r + perp2.x * Math.sin(a) * r,
						by + perp1.y * Math.cos(a) * r + perp2.y * Math.sin(a) * r,
						bz + perp1.z * Math.cos(a) * r + perp2.z * Math.sin(a) * r
					);
					m.scale(new THREE.Vector3(s, s, s));
					matrices.push(m);
				}
			}
		}
		return matrices;
	}

	let mintMatrices = $derived(generateHalf('mint'));
	let coralMatrices = $derived(generateHalf('coral'));
	let mintRef: THREE.InstancedMesh | undefined = $state();
	let coralRef: THREE.InstancedMesh | undefined = $state();
	let mintMatRef: THREE.MeshPhysicalMaterial | undefined = $state();
	let coralMatRef: THREE.MeshPhysicalMaterial | undefined = $state();

	let time = $state(0);
	useTask((delta) => {
		time += delta;
		const base = helixSettings.emissiveIntensity + 0.05;
		if (mintMatRef) mintMatRef.emissiveIntensity = base + Math.sin(time * 1.2) * 0.15;
		if (coralMatRef) coralMatRef.emissiveIntensity = base + Math.sin(time * 1.2 + Math.PI) * 0.15;
	});

	$effect(() => { if (mintRef && mintMatrices.length > 0) { mintMatrices.forEach((m, i) => mintRef!.setMatrixAt(i, m)); mintRef.instanceMatrix.needsUpdate = true; } });
	$effect(() => { if (coralRef && coralMatrices.length > 0) { coralMatrices.forEach((m, i) => coralRef!.setMatrixAt(i, m)); coralRef.instanceMatrix.needsUpdate = true; } });
</script>

{#if mintMatrices.length > 0}
	<T.InstancedMesh bind:ref={mintRef} args={[undefined, undefined, mintMatrices.length]}>
		<T.SphereGeometry args={[SPHERE_RADIUS, 10, 8]} />
		<T.MeshPhysicalMaterial bind:ref={mintMatRef}
			color={helixSettings.strandAColor} roughness={helixSettings.roughness} metalness={helixSettings.metalness}
			clearcoat={helixSettings.clearcoat} clearcoatRoughness={0.5}
			sheen={0.4} sheenRoughness={0.6} sheenColor={helixSettings.strandAColor}
			emissive={helixSettings.strandAColor} emissiveIntensity={0.55}
		/>
	</T.InstancedMesh>
{/if}

{#if coralMatrices.length > 0}
	<T.InstancedMesh bind:ref={coralRef} args={[undefined, undefined, coralMatrices.length]}>
		<T.SphereGeometry args={[SPHERE_RADIUS, 10, 8]} />
		<T.MeshPhysicalMaterial bind:ref={coralMatRef}
			color={helixSettings.strandBColor} roughness={helixSettings.roughness} metalness={helixSettings.metalness}
			clearcoat={helixSettings.clearcoat} clearcoatRoughness={0.5}
			sheen={0.4} sheenRoughness={0.6} sheenColor={helixSettings.strandBColor}
			emissive={helixSettings.strandBColor} emissiveIntensity={0.55}
		/>
	</T.InstancedMesh>
{/if}
