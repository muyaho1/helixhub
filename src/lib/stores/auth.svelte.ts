// 인증 상태 관리 — 현재 로그인된 유저 정보
import { onAuthStateChanged } from 'firebase/auth';
import { getAuthInstance, getUserById } from '$lib/services/firebase';
import { browser } from '$app/environment';
import type { User } from '$lib/types';

let currentUser = $state<User | null>(null);
let isLoading = $state(true);
let isInitialized = $state(false);

/** Firebase Auth 상태 리스너 시작 (브라우저에서만) */
export function initAuth() {
	if (!browser || isInitialized) return;
	isInitialized = true;

	const auth = getAuthInstance();
	onAuthStateChanged(auth, async (firebaseUser) => {
		if (firebaseUser) {
			const user = await getUserById(firebaseUser.uid);
			currentUser = user;
		} else {
			currentUser = null;
		}
		isLoading = false;
	});
}

export function getCurrentUser() {
	return currentUser;
}

export function getIsLoading() {
	return isLoading;
}

export function setCurrentUser(user: User | null) {
	currentUser = user;
}
