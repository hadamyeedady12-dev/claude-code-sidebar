# Claude Code Sidebar

Obsidian에서 Claude Code CLI를 사이드바 터미널로 실행하는 플러그인입니다.

## 기능

- Obsidian 사이드바에서 Claude Code CLI 실행
- 전체 터미널 에뮬레이션 (xterm.js 기반)
- 256색 지원 및 링크 클릭 가능
- 터미널 크기 자동 조절
- 세션 재시작 기능

## 스크린샷

![Claude Code Sidebar](https://github.com/hadamyeedady12-dev/claude-code-sidebar/raw/main/screenshot.png)

## 설치 방법

### 방법 1: BRAT 사용 (권장)

1. [BRAT](https://github.com/TfTHacker/obsidian42-brat) 플러그인 설치
2. BRAT 설정에서 "Add Beta plugin" 클릭
3. `hadamyeedady12-dev/claude-code-sidebar` 입력
4. 플러그인 활성화

### 방법 2: 수동 설치

1. [Releases](https://github.com/hadamyeedady12-dev/claude-code-sidebar/releases) 페이지에서 최신 버전 다운로드
2. `main.js`, `manifest.json`, `styles.css` 파일을 Vault의 `.obsidian/plugins/claude-code-sidebar/` 폴더에 복사
3. Obsidian 설정 > Community plugins에서 "Claude Code Sidebar" 활성화

## 사전 요구사항

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 설치 필요
  ```bash
  # Homebrew (macOS)
  brew install claude-code

  # npm
  npm install -g @anthropic-ai/claude-code
  ```

## 사용 방법

1. 왼쪽 리본에서 터미널 아이콘 클릭 또는
2. Command Palette (`Cmd/Ctrl + P`) → "Open Claude Code Terminal" 실행
3. 사이드바에서 Claude Code와 대화

### 단축키

| 기능 | 단축키 |
|------|--------|
| 터미널 열기 | 리본 아이콘 클릭 |
| 세션 재시작 | Restart 버튼 |
| 설정 | 톱니바퀴 아이콘 |

## 변경 로그

### v1.0.2 (2026-01-13)

**버그 수정:**
- Obsidian monospace 폰트 자동 적용으로 글리프/폭 계산 안정화
- 창 전환/리사이즈 시 숨김 상태 fit 방지 및 재시도 안정화
- 활성 leaf 전환 시 자동 re-fit 추가
- PTY 리사이즈에 SIGWINCH 전달로 CLI 리플로우 개선
- 컨테이너 flex 레이아웃으로 반응형 안정화

### v1.0.1 (2026-01-13)

**버그 수정:**
- 터미널 스크롤 위치가 어긋나는 버그 수정
- 리사이즈 후 `scrollToBottom()` 호출 추가
- 세션 시작/재시작 시 `reset()` 사용으로 버퍼 완전 클리어
- 화면에 이전 내용 잔상이 남는 문제 해결

### v1.0.0

- 초기 릴리스
- xterm.js 기반 터미널 에뮬레이션
- Claude Code CLI 통합
- 자동 터미널 크기 조절

## 알려진 이슈

- Windows에서는 제한적으로 동작할 수 있음
- `isDesktopOnly: true` - 모바일에서는 사용 불가

## 감사의 말

이 프로젝트는 [@reallygood83](https://github.com/reallygood83)님의 [Master of OpenCode](https://github.com/reallygood83/master-of-opencode)를 기반으로 Claude Code용으로 재구성되었습니다.

원본 프로젝트를 만들어주신 **문정**님께 진심으로 감사드립니다.

## 기여자

- [@reallygood83](https://github.com/reallygood83) (문정) - 원본 프로젝트 제작

## 라이선스

MIT License

## 기여

버그 리포트나 기능 제안은 [Issues](https://github.com/hadamyeedady12-dev/claude-code-sidebar/issues)에 등록해주세요.

---

Made with Claude Code
