// Firebase 초기화 — Auth + Firestore
// 브라우저에서만 초기화됨 (SSR 안전)

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type Auth } from 'firebase/auth';
import {
	getFirestore,
	doc,
	setDoc,
	getDoc,
	getDocs,
	collection,
	query,
	where,
	deleteDoc,
	addDoc,
	updateDoc,
	serverTimestamp,
	type Firestore
} from 'firebase/firestore';
import { browser } from '$app/environment';
import type { User, Project, BaseType } from '$lib/types';

// Firebase 설정
const firebaseConfig = {
	apiKey: 'AIzaSyDqnVhSYWcTKDrDltNfs-mOrEgShDkGpi4',
	authDomain: 'helixhub-c5bbe.firebaseapp.com',
	projectId: 'helixhub-c5bbe',
	storageBucket: 'helixhub-c5bbe.firebasestorage.app',
	messagingSenderId: '734583241716',
	appId: '1:734583241716:web:b3299ab21eae3310e957a1'
};

// Lazy 초기화 — 브라우저에서 처음 호출될 때만 생성
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getFirebaseApp(): FirebaseApp {
	if (!_app) {
		_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
	}
	return _app;
}

function getFirebaseAuth(): Auth {
	if (!_auth) {
		_auth = getAuth(getFirebaseApp());
	}
	return _auth;
}

function getFirebaseDb(): Firestore {
	if (!_db) {
		_db = getFirestore(getFirebaseApp());
	}
	return _db;
}

// 외부에서 접근할 때 사용 (브라우저에서만 호출됨)
export { getFirebaseAuth as getAuthInstance, getFirebaseDb as getDbInstance };

const googleProvider = new GoogleAuthProvider();

// ============================================================
// 인증 (Auth)
// ============================================================

/** Google 로그인 팝업. 최초 로그인 시 Firestore에 유저 문서 생성. */
export async function loginWithGoogle(): Promise<User | null> {
	if (!browser) return null;
	try {
		const auth = getFirebaseAuth();
		const db = getFirebaseDb();
		const result = await signInWithPopup(auth, googleProvider);
		const firebaseUser = result.user;

		// Firestore에 유저가 있는지 확인
		const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

		if (!userDoc.exists()) {
			// 최초 가입 → 새 염기 생성!
			const usersSnapshot = await getDocs(collection(db, 'users'));
			const nextPosition = usersSnapshot.size + 1;

			// A/T/G/C 중 순서대로 돌아가며 배정
			const bases: BaseType[] = ['A', 'T', 'G', 'C'];
			const assignedColor = bases[(nextPosition - 1) % 4];

			const newUser: Omit<User, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
				uid: firebaseUser.uid,
				name: firebaseUser.displayName || '이름 없음',
				email: firebaseUser.email || '',
				photoURL: firebaseUser.photoURL,
				bio: '',
				color: assignedColor,
				position: nextPosition,
				createdAt: serverTimestamp()
			};

			await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
			return { ...newUser, createdAt: new Date() } as User;
		}

		return userDoc.data() as User;
	} catch (error) {
		console.error('로그인 실패:', error);
		return null;
	}
}

/** 로그아웃 */
export async function logout(): Promise<void> {
	if (!browser) return;
	await signOut(getFirebaseAuth());
}

// ============================================================
// 유저 (Users)
// ============================================================

/** 모든 유저 목록 가져오기 (나선 렌더링용) */
export async function getAllUsers(): Promise<User[]> {
	if (!browser) return [];
	const db = getFirebaseDb();
	const snapshot = await getDocs(collection(db, 'users'));
	return snapshot.docs.map((d) => {
		const data = d.data();
		return {
			...data,
			createdAt: data.createdAt?.toDate?.() || new Date()
		} as User;
	});
}

/** 특정 유저 정보 가져오기 */
export async function getUserById(uid: string): Promise<User | null> {
	if (!browser) return null;
	const db = getFirebaseDb();
	const userDoc = await getDoc(doc(db, 'users', uid));
	if (!userDoc.exists()) return null;
	const data = userDoc.data();
	return {
		...data,
		createdAt: data.createdAt?.toDate?.() || new Date()
	} as User;
}

/** 유저 프로필 업데이트 (이름, 소개) */
export async function updateUserProfile(
	uid: string,
	updates: { name?: string; bio?: string }
): Promise<void> {
	if (!browser) return;
	const db = getFirebaseDb();
	await updateDoc(doc(db, 'users', uid), updates);
}

// ============================================================
// 프로젝트 (Projects)
// ============================================================

/** 특정 유저의 프로젝트 목록 가져오기 */
export async function getProjectsByUser(userId: string): Promise<Project[]> {
	if (!browser) return [];
	const db = getFirebaseDb();
	const q = query(collection(db, 'projects'), where('userId', '==', userId));
	const snapshot = await getDocs(q);
	return snapshot.docs
		.map((d) => {
			const data = d.data();
			return {
				...data,
				id: d.id,
				createdAt: data.createdAt?.toDate?.() || new Date()
			} as Project;
		})
		.sort((a, b) => b.week - a.week);
}

/** 프로젝트 등록 */
export async function createProject(
	project: Omit<Project, 'id' | 'createdAt'>
): Promise<string> {
	const db = getFirebaseDb();
	const docRef = await addDoc(collection(db, 'projects'), {
		...project,
		createdAt: serverTimestamp()
	});
	return docRef.id;
}

/** 프로젝트 수정 */
export async function updateProject(
	projectId: string,
	updates: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
	const db = getFirebaseDb();
	await updateDoc(doc(db, 'projects', projectId), updates);
}

/** 프로젝트 삭제 */
export async function deleteProject(projectId: string): Promise<void> {
	const db = getFirebaseDb();
	await deleteDoc(doc(db, 'projects', projectId));
}
