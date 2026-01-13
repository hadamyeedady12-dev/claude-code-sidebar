# Claude Code Sidebar

Obsidian 사이드바에서 Claude Code CLI를 직접 실행할 수 있는 플러그인입니다. 완전한 터미널 에뮬레이션을 지원합니다.

## 기능

- xterm.js를 사용한 완전한 터미널 에뮬레이션
- 색상 지원 (256색 + 트루컬러)
- 자동 터미널 크기 조정
- 크로스 플랫폼 지원 (macOS, Linux, Windows)
- Claude CLI 경로 자동 감지

## 설치 방법

### BRAT을 통한 설치 (권장)

1. [BRAT](https://github.com/TfTHacker/obsidian42-brat) 플러그인 설치
2. 베타 플러그인 추가: `hadamyeedady12-dev/claude-code-sidebar`
3. 커뮤니티 플러그인 설정에서 플러그인 활성화

### 수동 설치

1. 최신 릴리스에서 `main.js`, `manifest.json`, `styles.css` 다운로드
2. 폴더 생성: `.obsidian/plugins/claude-code-sidebar/`
3. 다운로드한 파일을 해당 폴더에 복사
4. Obsidian 설정에서 플러그인 활성화

## 요구 사항

- [Claude CLI](https://docs.anthropic.com/en/docs/claude-cli) 설치 필요
- macOS, Linux 또는 Windows
- Python 3 (macOS/Linux PTY 지원용)

## 사용 방법

1. 왼쪽 리본의 터미널 아이콘 클릭, 또는
2. 명령 팔레트 사용: "Open Claude Code Terminal"

## 설정

설정 → Claude Code Sidebar에서 설정 가능:

- **Claude CLI 경로**: Claude CLI 사용자 지정 경로 (기본값: 자동 감지)

## 플랫폼별 참고 사항

### macOS / Linux
Python PTY를 사용하여 색상 및 크기 조정을 포함한 완전한 터미널 지원을 제공합니다.

### Windows
- `node-pty` 설치 시 최상의 경험 제공
- node-pty를 사용할 수 없는 경우 기본 파이프로 대체

## 개발

```bash
# 의존성 설치
npm install

# 빌드 (프로덕션)
npm run build

# 빌드 (감시 모드)
npm run dev
```

## 라이선스

MIT
