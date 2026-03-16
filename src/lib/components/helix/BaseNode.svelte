<script lang="ts">
	// 학생 노드 — 따뜻한 골드빛, hover 시 부드러운 확장
	import { T, useTask } from '@threlte/core';
	import { HTML } from '@threlte/extras';
	import * as THREE from 'three';
	import { helixSettings } from '$lib/stores/helixSettings.svelte';
	import type { User } from '$lib/types';

	let {
		position = [0, 0, 0] as [number, number, number],
		user, onClick = () => {}
	}: { position?: [number, number, number]; user: User; onClick?: () => void; } = $props();

	let isHovered = $state(false);
	let targetScale = $derived(isHovered ? helixSettings.nodeHoverScale : helixSettings.nodeScale);
	let currentScale = $state(0.12);
	let yOffset = $state(0);
	let targetY = $derived(isHovered ? 0.2 : 0);
	let pulseTime = $state(0);
	let emissiveIntensity = $state(0.8);
	let meshRef: THREE.Mesh | undefined = $state();
	let ringScale = $state(0.5);
	let ringOpacity = $state(0);
	let idleTime = $state(0);

	useTask((delta) => {
		currentScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
		yOffset = THREE.MathUtils.lerp(yOffset, targetY, 0.1);

		if (isHovered) {
			pulseTime += delta * 4;
			emissiveIntensity = helixSettings.nodeHoverEmissive + Math.sin(pulseTime) * 0.5;
			ringScale = 0.5 + (Math.sin(pulseTime * 0.8) * 0.5 + 0.5) * 0.6;
			ringOpacity = 0.3 - (Math.sin(pulseTime * 0.8) * 0.5 + 0.5) * 0.15;
		} else {
			idleTime += delta;
			emissiveIntensity = helixSettings.nodeEmissive + Math.sin(idleTime * 1.5) * 0.15;
			pulseTime = 0;
			ringScale = THREE.MathUtils.lerp(ringScale, 0.5, 0.15);
			ringOpacity = THREE.MathUtils.lerp(ringOpacity, 0, 0.15);
		}

		if (meshRef?.material && 'emissiveIntensity' in meshRef.material) {
			(meshRef.material as THREE.MeshPhysicalMaterial).emissiveIntensity = emissiveIntensity;
		}
	});

	function handlePointerEnter() { isHovered = true; document.body.style.cursor = 'pointer'; }
	function handlePointerLeave() { isHovered = false; document.body.style.cursor = 'default'; }
</script>

<T.Group position={[position[0], position[1] + yOffset, position[2]]}>
	<T.Mesh bind:ref={meshRef}
		onpointerenter={handlePointerEnter} onpointerleave={handlePointerLeave}
		onclick={onClick} scale={currentScale}
	>
		<T.SphereGeometry args={[1, 32, 32]} />
		<T.MeshPhysicalMaterial
			color={isHovered ? '#fff8e8' : '#f0e050'}
			emissive={isHovered ? '#ffffff' : helixSettings.nodeColor}
			emissiveIntensity={emissiveIntensity}
			roughness={helixSettings.nodeRoughness} metalness={0.1}
			clearcoat={0.3} clearcoatRoughness={0.3}
			sheen={0.6} sheenRoughness={0.3}
			sheenColor={isHovered ? '#ffffff' : helixSettings.nodeColor}
		/>
	</T.Mesh>

	{#if ringOpacity > 0.01}
		<T.Mesh scale={ringScale}>
			<T.SphereGeometry args={[1, 16, 16]} />
			<T.MeshBasicMaterial color="#c4b5fd" transparent opacity={ringOpacity}
				blending={THREE.AdditiveBlending} depthWrite={false} />
		</T.Mesh>
	{/if}

	{#if isHovered}
		<HTML position={[0, 0.6, 0]} center>
			<div class="node-label"><span class="node-name">{user.name}</span></div>
		</HTML>
	{/if}
</T.Group>

<style>
	.node-label {
		background: rgba(26, 16, 53, 0.85);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(196, 181, 253, 0.3);
		border-radius: 8px;
		padding: 4px 12px;
		white-space: nowrap;
		pointer-events: none;
		user-select: none;
	}
	.node-name {
		color: #f0f0f8;
		font-size: 13px;
		font-weight: 500;
		font-family: 'Pretendard', sans-serif;
	}
</style>
