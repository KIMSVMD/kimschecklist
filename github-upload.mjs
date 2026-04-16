import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const OWNER = 'KIMSVMD';
const REPO = 'kimschecklist';
const BASE = process.cwd();

const IGNORE = new Set([
  'node_modules', '.git', '.cache', 'dist', 'build',
  'push-to-github.sh', 'github-upload.mjs',
  '.local', 'attached_assets', 'uploads'
]);

function getAllFiles(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) getAllFiles(full, files);
    else files.push(full);
  }
  return files;
}

async function apiCall(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok && res.status !== 404 && res.status !== 422) {
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  try { return JSON.parse(text); } catch { return null; }
}

// 파일 하나씩 올리는 방식 (빈 저장소에서도 동작)
async function uploadFile(path, content, existingSha = null) {
  const body = {
    message: `add ${path}`,
    content: Buffer.from(content).toString('base64'),
  };
  if (existingSha) body.sha = existingSha;
  return apiCall('PUT', `/repos/${OWNER}/${REPO}/contents/${path}`, body);
}

async function main() {
  console.log('GitHub에 업로드 시작...');

  // 저장소 확인 / 생성
  const repoInfo = await apiCall('GET', `/repos/${OWNER}/${REPO}`);
  if (!repoInfo || repoInfo.message === 'Not Found') {
    console.log('저장소 생성 중...');
    await apiCall('POST', `/user/repos`, { name: REPO, private: false, auto_init: true });
    await new Promise(r => setTimeout(r, 2000)); // 초기화 대기
  }

  const files = getAllFiles(BASE);
  console.log(`총 ${files.length}개 파일 업로드 중...`);

  let success = 0, fail = 0;
  for (let i = 0; i < files.length; i++) {
    const full = files[i];
    const rel = relative(BASE, full).replace(/\\/g, '/');
    process.stdout.write(`\r진행: ${i + 1}/${files.length} - ${rel.slice(0, 60).padEnd(60)}`);

    let content;
    try { content = readFileSync(full); }
    catch { fail++; continue; }

    // 기존 파일 SHA 확인 (업데이트 시 필요)
    let existingSha = null;
    const existing = await apiCall('GET', `/repos/${OWNER}/${REPO}/contents/${rel}`);
    if (existing && existing.sha) existingSha = existing.sha;

    try {
      await uploadFile(rel, content, existingSha);
      success++;
    } catch (e) {
      fail++;
    }
  }

  console.log(`\n\n✅ 완료! 성공: ${success}, 실패: ${fail}`);
  console.log(`👉 확인: https://github.com/${OWNER}/${REPO}`);
}

main().catch(err => { console.error('❌ 오류:', err.message); process.exit(1); });
