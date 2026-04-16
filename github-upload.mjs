import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const OWNER = 'KIMSVMD';
const REPO = 'kimschecklist';
const BASE = process.cwd();

const IGNORE = new Set([
  'node_modules', '.git', '.cache', 'dist', 'build',
  'push-to-github.sh', 'github-upload.mjs',
  '.local', 'attached_assets'
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
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`GitHub API ${res.status}: ${err}`);
  }
  return res.status === 404 ? null : res.json();
}

async function createBlob(content) {
  const result = await apiCall('POST', `/repos/${OWNER}/${REPO}/git/blobs`, {
    content: Buffer.from(content).toString('base64'),
    encoding: 'base64',
  });
  return result.sha;
}

async function main() {
  console.log('GitHub에 업로드 시작...');

  // 저장소 확인
  const repoInfo = await apiCall('GET', `/repos/${OWNER}/${REPO}`);
  if (!repoInfo) {
    // 저장소 생성
    console.log('저장소 생성 중...');
    await apiCall('POST', `/user/repos`, { name: REPO, private: false });
  }

  const files = getAllFiles(BASE);
  console.log(`총 ${files.length}개 파일 업로드 중...`);

  // 블롭 생성
  const treeItems = [];
  for (let i = 0; i < files.length; i++) {
    const full = files[i];
    const rel = relative(BASE, full);
    process.stdout.write(`\r진행: ${i + 1}/${files.length} - ${rel.slice(0, 50)}`);
    
    let content;
    try {
      content = readFileSync(full);
    } catch {
      continue;
    }
    
    const sha = await createBlob(content);
    treeItems.push({ path: rel, mode: '100644', type: 'blob', sha });
  }
  console.log('\n트리 생성 중...');

  // 현재 커밋 가져오기
  let parentSha = null;
  const ref = await apiCall('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/main`);
  if (ref) parentSha = ref.object.sha;

  // 트리 생성
  const tree = await apiCall('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
    tree: treeItems,
    ...(parentSha ? { base_tree: (await apiCall('GET', `/repos/${OWNER}/${REPO}/git/commits/${parentSha}`)).tree.sha } : {}),
  });

  // 커밋 생성
  const commit = await apiCall('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
    message: '킴스클럽 매장 점검 체크리스트 앱',
    tree: tree.sha,
    ...(parentSha ? { parents: [parentSha] } : { parents: [] }),
  });

  // ref 업데이트 또는 생성
  if (ref) {
    await apiCall('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/main`, {
      sha: commit.sha, force: true,
    });
  } else {
    await apiCall('POST', `/repos/${OWNER}/${REPO}/git/refs`, {
      ref: 'refs/heads/main', sha: commit.sha,
    });
  }

  console.log(`\n✅ 완료! 확인: https://github.com/${OWNER}/${REPO}`);
}

main().catch(err => { console.error('❌ 오류:', err.message); process.exit(1); });
