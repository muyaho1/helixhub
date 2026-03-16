<script lang="ts">
	// 가로 연결선 (base pair) — 장식용, 라벤더 반투명
	import { T } from '@threlte/core';
	import * as THREE from 'three';

	let {
		from = [0, 0, 0] as [number, number, number],
		to = [0, 0, 0] as [number, number, number]
	}: {
		from?: [number, number, number];
		to?: [number, number, number];
	} = $props();

	let midpoint = $derived<[number, number, number]>([
		(from[0] + to[0]) / 2,
		(from[1] + to[1]) / 2,
		(from[2] + to[2]) / 2
	]);

	let length = $derived(
		Math.sqrt(
			(to[0] - from[0]) ** 2 +
			(to[1] - from[1]) ** 2 +
			(to[2] - from[2]) ** 2
		)
	);

	let rotation = $derived(() => {
		const dir = new THREE.Vector3(
			to[0] - from[0],
			to[1] - from[1],
			to[2] - from[2]
		).normalize();
		const quaternion = new THREE.Quaternion();
		quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
		const euler = new THREE.Euler().setFromQuaternion(quaternion);
		return [euler.x, euler.y, euler.z] as [number, number, number];
	});
</script>

<T.Mesh position={midpoint} rotation={rotation()}>
	<!-- 더 가늘게 (0.03 → 0.015) -->
	<T.CylinderGeometry args={[0.015, 0.015, length, 4]} />
	<T.MeshStandardMaterial
		color="#b8a5e0"
		transparent
		opacity={0.4}
		emissive="#9b8ec4"
		emissiveIntensity={0.15}
		roughness={0.3}
		metalness={0.1}
	/>
</T.Mesh>
