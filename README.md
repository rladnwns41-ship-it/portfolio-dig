# dig Portfolio

압축을 풀고 index.html을 여세요. 정적 웹 호스팅에도 폴더 전체를 그대로 업로드하면 됩니다.

- index.html: 화면 구조와 템플릿
- css/style.css: 레이아웃, 모바일 스타일, 애니메이션
- js/app.js: 언어 전환, 작품, 공지 및 로그인 동작
- js/vendor/: React, Firebase, 기존 템플릿 렌더러
- assets/icons/: 컬러 SVG 로고 45종
- assets/fonts/: 원본 폰트 16개

아이콘과 폰트, 기존에 포함되어 있던 JS 라이브러리는 로컬 파일로 분리되어 있습니다. Firebase 로그인·공지 등 서버 기능은 인터넷과 기존 Firebase 설정이 필요합니다.

템플릿의 {{ ... }}, sc-for, sc-if는 기존 렌더러가 처리합니다. 화면 구조를 수정할 때 유지하세요.

아이콘 원본: Simple Icons (https://simpleicons.org/). 브랜드 로고의 상표 권리는 각 소유자에게 있습니다. vendor 파일은 원본의 라이선스 주석을 유지했습니다.
