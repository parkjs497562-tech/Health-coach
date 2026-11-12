# 🏋️ AI Health Coach

**AI 기반 개인 맞춤형 건강 관리 웹 서비스**

AI 기술을 활용하여 사용자의 건강 관리와 운동 습관 형성을 돕는 웹 프로젝트입니다.

다크 테마 기반의 직관적인 UI를 통해 건강 관리 정보를 확인하고, AI를 활용한 개인 맞춤형 건강 관리 서비스로 확장하는 것을 목표로 합니다.

## 📌 프로젝트 소개

AI Health Coach는 식단, 운동, 체중 등 개인 건강 정보를 체계적으로 관리하고 분석할 수 있도록 기획한 웹 서비스입니다.

단순한 건강 정보 제공을 넘어 AI를 활용하여 사용자에게 적합한 건강 관리 방향을 제안하는 서비스를 지향합니다.

## ✨ 주요 특징

- **Dark Mode UI**: 어두운 배경 기반의 프리미엄 디자인
- **Health Dashboard**: 건강 관리 정보를 한눈에 확인하는 대시보드
- **AI Health Coach**: AI 기반 맞춤형 건강 관리 기능
- **Responsive Design**: 다양한 화면 크기를 고려한 UI 구성
- **Health Management**: 식단 및 운동 관리 기능 확장

※ 세부 기능은 실제 구현 및 API 연동 상태에 따라 업데이트할 예정입니다.

## 🛠️ 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python (기존 프로젝트 기반, 현재 구성 확인 필요) |
| AI | AI API 연동 확장 |
| Version Control | Git, GitHub |
| Development Tool | Visual Studio Code, OpenAI Codex |

## 📂 프로젝트 구조

```text
Health-coach/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── api/
└── README.md
```

## 🚀 실행 방법

1. GitHub 저장소 Clone

```bash
git clone https://github.com/parkjs497562-tech/Health-coach.git
```

2. 프로젝트 폴더 이동

```bash
cd Health-coach
```

3. `.env.example`을 복사해 `.env` 파일을 만들고, 파일을 열어 Google AI Studio에서 발급한 키를 입력합니다.

```bash
cp .env.example .env
```

4. Forma 서버 실행 (Python 3 필요)

```bash
python3 api/server.py
```

5. 브라우저 접속

```text
http://127.0.0.1:8000
```

## 🔐 환경 변수 및 보안

- API 키와 개인정보는 GitHub에 공개하지 않습니다.
- Gemini API 키는 서버에서만 읽으며 브라우저 코드로 전달하지 않습니다.
- 식단 생성에 입력한 건강 정보는 Gemini API로 전송됩니다. 전송 동의를 받은 뒤 요청합니다.
- `.env` 파일은 `.gitignore`에 등록합니다.
- 개발 서버는 기본적으로 이 컴퓨터(localhost)에서만 접속할 수 있습니다.

## 🎯 프로젝트 목표

- AI 기반 개인 맞춤형 건강 관리 기능 구현
- 사용자 건강 데이터의 체계적인 기록 및 분석
- 직관적이고 사용하기 편리한 UI/UX 구현
- 지속적으로 기능을 개선하여 완성도 높은 웹 서비스 제작

## 👨‍💻 개발

- Project: AI Health Coach
- Repository: https://github.com/parkjs497562-tech/Health-coach
- Development: VS Code, OpenAI Codex
