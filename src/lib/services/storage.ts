// Firebase Storage — 프로젝트 썸네일 업로드/삭제
// ⚠️ Firebase Console에서 Storage를 활성화하고 규칙을 설정해야 합니다!
// 규칙 예시:
//   allow read: if true;
//   allow write: if request.auth != null
//     && request.auth.uid == userId
//     && request.resource.size < 2 * 1024 * 1024
//     && request.resource.contentType.matches('image/.*');

import {
	getStorage,
	ref,
	uploadBytes,
	getDownloadURL,
	deleteObject,
	type FirebaseStorage
} from 'firebase/storage';
import { browser } from '$app/environment';

// ★ firebase.ts와 같은 앱 인스턴스를 재사용하기 위해 lazy init
let _storage: FirebaseStorage | null = null;

function getFirebaseStorage(): FirebaseStorage {
	if (!_storage) {
		// getStorage()는 이미 초기화된 기본 앱을 자동으로 사용함
		_storage = getStorage();
	}
	return _storage;
}

// ── 허용 파일 형식 + 크기 제한 ──

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

/** 이미지 파일 검증 — 형식 + 크기 체크
 * @returns 에러 메시지 (null이면 통과) */
export function validateImageFile(file: File): string | null {
	if (!ALLOWED_TYPES.includes(file.type)) {
		return 'JPG, PNG, WebP, GIF 형식만 업로드할 수 있습니다.';
	}
	if (file.size > MAX_SIZE_BYTES) {
		const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
		return `파일 크기가 ${sizeMB}MB입니다. 2MB 이하만 가능합니다.`;
	}
	return null;
}

/** 썸네일 업로드 → 다운로드 URL 반환
 * 같은 경로에 재업로드하면 자동 덮어쓰기 (고아 파일 방지) */
export async function uploadThumbnail(
	userId: string,
	projectId: string,
	file: File
): Promise<string> {
	if (!browser) throw new Error('브라우저에서만 업로드 가능');

	const storage = getFirebaseStorage();
	// Storage 경로: thumbnails/{userId}/{projectId}
	const storageRef = ref(storage, `thumbnails/${userId}/${projectId}`);

	// ★ contentType을 명시해야 Storage 규칙에서 contentType 체크 가능
	await uploadBytes(storageRef, file, { contentType: file.type });
	return getDownloadURL(storageRef);
}

/** 썸네일 삭제 — 프로젝트 삭제 시 호출
 * 파일이 없으면 무시 (에러 안 남) */
export async function deleteThumbnail(
	userId: string,
	projectId: string
): Promise<void> {
	if (!browser) return;

	try {
		const storage = getFirebaseStorage();
		const storageRef = ref(storage, `thumbnails/${userId}/${projectId}`);
		await deleteObject(storageRef);
	} catch (error: any) {
		// 'storage/object-not-found'면 이미 없는 것이므로 무시
		if (error?.code !== 'storage/object-not-found') {
			console.error('썸네일 삭제 실패:', error);
		}
	}
}
