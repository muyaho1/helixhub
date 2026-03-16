<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { OrbitControls, interactivity } from '@threlte/extras';
	import * as THREE from 'three';
	import HelixStrand from './HelixStrand.svelte';
	import BaseNode from './BaseNode.svelte';
	import ConnectorStrand from './ConnectorStrand.svelte';
	import Particles from './Particles.svelte';
	import EnergyFlow from './EnergyFlow.svelte';
	import PostProcessing from './PostProcessing.svelte';
	import { helixSettings } from '$lib/stores/helixSettings.svelte';
	import type { User } from '$lib/types';

	interactivity();

	let { users = [], onNodeClick = (_uid: string) => {} }: {
		users: User[];
		onNodeClick?: (uid: string) => void;
	} = $props();

	const HELIX_RADIUS = 0.8;
	const HELIX_PITCH = 5.5;
	const STRAND_OFFSET = Math.PI * 0.833;
	const MIN_NODE_COUNT = 20;

	let effectiveNodeCount = $derived(
		Math.max(MIN_NODE_COUNT, users.length > 0 ? Math.max(...users.map(u => u.position)) : MIN_NODE_COUNT)
	);

	const totalTurns = $derived(effectiveNodeCount / 10 + 0.5);
	const totalAngle = $derived(totalTurns * Math.PI * 2);
	const helixHeight = $derived(effectiveNodeCount * HELIX_PITCH / 10);

	let helixGroup: THREE.Group | undefined = $state();
	let autoRotate = $state(true);
	let lastInteraction = $state(0);

	useTask((delta) => {
		if (!helixGroup) return;
		if (!autoRotate && Date.now() - lastInteraction > 3000) autoRotate = true;
		if (autoRotate) helixGroup.rotateY(delta * 0.06);
	});

	function getNodePosition(position: number, strandIndex: 0 | 1): [number, number, number] {
		const centerPos = effectiveNodeCount / 2;
		const nodeIndex = position - 1;
		const offset_from_center = Math.ceil(nodeIndex / 2) * (nodeIndex % 2 === 0 ? 1 : -1);
		const actualPos = centerPos + offset_from_center;
		const t = actualPos / effectiveNodeCount;
		const angle = t * totalAngle + (strandIndex === 0 ? 0 : STRAND_OFFSET);
		return [Math.cos(angle) * HELIX_RADIUS, t * helixHeight, Math.sin(angle) * HELIX_RADIUS];
	}

	function handleInteractionStart() { autoRotate = false; lastInteraction = Date.now(); }
	function handleInteractionEnd() { lastInteraction = Date.now(); }

</script>

<T.PerspectiveCamera makeDefault position={[4, helixHeight * 0.6, 9]} fov={40}>
	<OrbitControls
		enableDamping dampingFactor={0.08} enableZoom minDistance={3} maxDistance={20}
		target.x={0} target.y={helixHeight * 0.5} target.z={0}
		enablePan={false} minPolarAngle={0} maxPolarAngle={Math.PI}
		onstart={handleInteractionStart} onend={handleInteractionEnd}
	/>
</T.PerspectiveCamera>

<!-- ★ 생체 조명: 따뜻한 키 + 차가운 림 = 유기체 입체감 -->
<T.DirectionalLight position={[5, 12, 5]} intensity={1.8} color="#ffd4a0" />
<T.DirectionalLight position={[-5, 8, -6]} intensity={0.9} color="#7eb8e0" />
<T.PointLight position={[0, -3, 3]} intensity={0.5} color="#c084fc" />
<T.AmbientLight intensity={helixSettings.ambientIntensity} color="#b8a9d4" />

<T.Color args={[helixSettings.bgColor]} attach="background" />
<T.FogExp2 args={[helixSettings.bgColor, helixSettings.fogDensity]} attach="fog" />

<T.Group bind:ref={helixGroup}>
	<!-- ★ PRD 원래 색상: 민트 그린 + 코랄 핑크 -->
	<HelixStrand color={helixSettings.strandAColor} strandIndex={0} nodeCount={effectiveNodeCount} radius={HELIX_RADIUS} pitch={HELIX_PITCH} strandOffset={0} />
	<HelixStrand color={helixSettings.strandBColor} strandIndex={1} nodeCount={effectiveNodeCount} radius={HELIX_RADIUS} pitch={HELIX_PITCH} strandOffset={STRAND_OFFSET} />

	<ConnectorStrand nodeCount={effectiveNodeCount} radius={HELIX_RADIUS} pitch={HELIX_PITCH} strandOffset={STRAND_OFFSET} />

	{#each users as user}
		{@const strandIndex = (user.position % 2 === 0 ? 1 : 0) as 0 | 1}
		{@const pos = getNodePosition(user.position, strandIndex)}
		<BaseNode position={pos} {user} onClick={() => onNodeClick(user.uid)} />
	{/each}
</T.Group>

<Particles />
<EnergyFlow radius={HELIX_RADIUS} pitch={HELIX_PITCH} nodeCount={effectiveNodeCount} strandOffset={STRAND_OFFSET} />
<PostProcessing />
