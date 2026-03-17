// Firebase Storage — 프로젝트 스크린샷 업로드/삭제 (여러 장 지원)
// ⚠️ Firebase Console에서 Storage를 활성화하고 규칙을 설정해야 합니다!

import {
	getStorage,
	ref,
	uploadBytes,
	getDownloadURL,
	deleteObject,
	listAll,
	type FirebaseStorage
} from 'firebase/storage';
import { browser } from '$app/environment';

let _storage: FirebaseStorage | null = null;

function getFirebaseStorage(): FirebaseStorage {
	if (!_storage) {
		_storage = getStorage();
	}
	return _storage;
}

// ── 허용 파일 형식 + 크기 제한 ──

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB per file
const MAX_FILES = 5; // 최대 5장

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

/** 여러 파일 검증 — 개수 + 각 파일 검증
 * @param currentCount 이미 업로드된 이미지 수
 * @returns 에러 메시지 (null이면 통과) */
export function validateImageFiles(files: File[], currentCount: number = 0): string | null {
	if (currentCount + files.length > MAX_FILES) {
		return `이미지는 최대 ${MAX_FILES}장까지 업로드할 수 있습니다. (현재 ${currentCount}장)`;
	}
	for (const file of files) {
		const error = validateImageFile(file);
		if (error) return error;
	}
	return null;
}

/** 단일 이미지 업로드 → 다운로드 URL 반환
 * 파일명에 타임스탬프를 넣어 여러 장 구분 */
export async function uploadThumbnail(
	userId: string,
	projectId: string,
	file: File,
	index: number = 0
): Promise<string> {
	if (!browser) throw new Error('브라우저에서만 업로드 가능');

	const storage = getFirebaseStorage();
	// Storage 경로: thumbnails/{userId}/{projectId}/{index}
	const storageRef = ref(storage, `thumbnails/${userId}/${projectId}/${index}`);

	await uploadBytes(storageRef, file, { contentType: file.type });
	return getDownloadURL(storageRef);
}

/** 여러 이미지 업로드 → URL 배열 반환 */
export async function uploadThumbnails(
	userId: string,
	projectId: string,
	files: File[],
	startIndex: number = 0
): Promise<string[]> {
	const urls: string[] = [];
	for (let i = 0; i < files.length; i++) {
		const url = await uploadThumbnail(userId, projectId, files[i], startIndex + i);
		urls.push(url);
	}
	return urls;
}

/** 프로젝트의 모든 썸네일 삭제 — 프로젝트 삭제 시 호출 */
export async function deleteAllThumbnails(
	userId: string,
	projectId: string
): Promise<void> {
	if (!browser) return;

	try {
		const storage = getFirebaseStorage();
		const folderRef = ref(storage, `thumbnails/${userId}/${projectId}`);
		const list = await listAll(folderRef);
		await Promise.all(list.items.map((item) => deleteObject(item)));
	} catch (error: any) {
		if (error?.code !== 'storage/object-not-found') {
			console.error('썸네일 전체 삭제 실패:', error);
		}
	}
}

/** 하위 호환: 기존 단일 thumbnail 경로 삭제 */
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
		if (error?.code !== 'storage/object-not-found') {
			console.error('썸네일 삭제 실패:', error);
		}
	}
}

export { MAX_FILES };
