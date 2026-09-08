import fs from 'fs';
import path from 'path';

const isEphemeralTmpPath = (raw: string): boolean => {
  const normalized = path.resolve(raw).replace(/\\/g, '/').toLowerCase();
  return (
    normalized === '/tmp' ||
    normalized.startsWith('/tmp/') ||
    normalized.endsWith('/tmp') ||
    /\/tmp\/uploads\/?$/.test(normalized)
  );
};

const isOnRailway = (): boolean =>
  Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID
  );

/**
 * 업로드 파일 디스크 루트.
 * 공개 URL은 계속 `/uploads/...` 이고, 디스크만 영구 볼륨/로컬 경로로 해석한다.
 *
 * 우선순위:
 * 1) Railway Volume 마운트 (`RAILWAY_VOLUME_MOUNT_PATH`)
 * 2) `UPLOAD_PATH` (단, `/tmp/...` 는 Railway에서 무시 — 재배포 시 삭제됨)
 * 3) 로컬/기본: `<cwd>/uploads`
 */
export function getUploadRoot(): string {
  const railwayMount = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  const explicit = process.env.UPLOAD_PATH?.trim();

  if (railwayMount) {
    if (explicit && path.isAbsolute(explicit) && !isEphemeralTmpPath(explicit)) {
      const resolved = path.resolve(explicit);
      const mount = path.resolve(railwayMount);
      if (resolved === mount || resolved.startsWith(mount + path.sep)) {
        return resolved;
      }
    }
    return path.resolve(railwayMount);
  }

  if (explicit && !isEphemeralTmpPath(explicit)) {
    return path.resolve(explicit);
  }

  // Railway인데 볼륨 미연결 + /tmp 설정인 경우라도 컨테이너 앱 경로에 기록
  // (볼륨을 /app/uploads 에 마운트하면 이 경로가 영속화됨)
  if (isOnRailway()) {
    return path.resolve('/app/uploads');
  }

  return path.resolve(process.cwd(), 'uploads');
}

export function ensureUploadRoot(): string {
  const root = getUploadRoot();
  fs.mkdirSync(root, { recursive: true });
  return root;
}

/** 하위 폴더를 만들고 절대 경로를 반환 */
export function ensureUploadSubdir(...parts: string[]): string {
  const dir = path.join(getUploadRoot(), ...parts);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * 저장된 pdf_path가 깨져도 `/uploads/...` URL로 디스크 경로를 재해석한다.
 */
export function resolveStoredUploadPath(
  pdfPath?: string | null,
  pdfUrl?: string | null
): string | null {
  const abs = String(pdfPath || '').trim();
  if (abs && fs.existsSync(abs)) return abs;

  const url = String(pdfUrl || abs || '')
    .trim()
    .replace(/\\/g, '/');
  const match = url.match(/\/uploads\/(.+)$/i) || url.match(/^uploads\/(.+)$/i);
  if (!match?.[1]) return abs && fs.existsSync(abs) ? abs : null;

  const candidate = path.join(getUploadRoot(), ...match[1].split('/').filter(Boolean));
  if (fs.existsSync(candidate)) return candidate;
  return null;
}

/** PDF 매직 헤더(%PDF) 확인 */
export function bufferLooksLikePdf(buf: Buffer): boolean {
  if (!buf || buf.length < 5) return false;
  return buf.subarray(0, 5).toString('utf8') === '%PDF-';
}
