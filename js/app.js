window.__resources = {};
// Portfolio behavior. Templates and layout are in index.html and css/style.css.
window.createPortfolioComponent = function (DCLogic) {

class Component extends DCLogic {
  state = {
    lang: 'ko', expanded: false, mounted: false,
    isAdmin: false, authed: false, loaded: false,
    notices: [], dismissed: {},
    email: '', pw: '', draft: '', error: '',
    workOff: {}, workClicks: {}, archiveAll: false, toast: '',
    extra: [], nwTitle: '', nwTag: '', nwStack: '', nwYear: '', nwHref: '', nwDesc: '',
  };

  initFirebase() {
    if (this._fb) return;
    if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') {
      this._fbTries = (this._fbTries || 0) + 1;
      if (this._fbTries < 40) setTimeout(() => this.initFirebase(), 150);
      return;
    }
    const cfg = {
      apiKey: "AIzaSyAZVnGsBwmxvYlbmen_4FFLNoy8nTpkNI0",
      authDomain: "game-3-495eb.firebaseapp.com",
      projectId: "game-3-495eb",
      storageBucket: "game-3-495eb.firebasestorage.app",
      messagingSenderId: "253912114906",
      appId: "1:253912114906:web:70a3ee2285f8b0574b67e3",
    };
    try {
      this._fb = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
      this._db = firebase.firestore();
      this._auth = firebase.auth();
      this._auth.onAuthStateChanged(u => this.setState({ authed: !!u }));
      this._db.collection('announcements').orderBy('createdAt', 'desc').onSnapshot(snap => {
        const notices = snap.docs.map(d => {
          const v = d.data();
          const ts = v.createdAt && v.createdAt.toDate ? v.createdAt.toDate() : new Date();
          return { id: d.id, text: v.text || '', date: `${ts.getFullYear()}.${String(ts.getMonth()+1).padStart(2,'0')}.${String(ts.getDate()).padStart(2,'0')}` };
        });
        this.setState({ notices });
      }, err => console.warn('notices error', err));
      this._db.collection('workStates').onSnapshot(snap => {
        const workOff = {};
        const workClicks = {};
        snap.docs.forEach(d => {
          const v = d.data() || {};
          if (v.disabled) workOff[d.id] = true;
          workClicks[d.id] = Number(v.clicks) || 0;
        });
        this.setState({ workOff, workClicks });
      }, err => console.warn('workStates error', err));
      this._db.collection('works').orderBy('createdAt', 'asc').onSnapshot(snap => {
        const extra = snap.docs.map(d => {
          const v = d.data() || {};
          return {
            id: d.id,
            title: v.title || '(제목 없음)',
            tag: v.tag || 'Project',
            stack: v.stack || '',
            year: v.year || '',
            href: v.href || '#',
            desc: v.desc || '',
            download: /export=download/.test(v.href || ''),
            isExtra: true,
          };
        });
        this.setState({ extra });
      }, err => console.warn('works error', err));
    } catch (e) { console.warn('firebase init failed', e); }
  }

  _observeReveal() {
    if (!this._io) return;
    document.querySelectorAll('[data-reveal]').forEach(el => {
      this._io.observe(el);
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
    });
  }

  _bump(key) {
    if (!this._db) return;
    this._db.collection('workStates').doc(key)
      .set({ clicks: firebase.firestore.FieldValue.increment(1) }, { merge: true })
      .catch(err => console.warn('click count failed', err));
  }

  syncRoute() {
    const h = (location.hash || '').toLowerCase();
    const p = (location.pathname || '').toLowerCase();
    this.setState({ isAdmin: h.includes('auth-admin') || p.includes('auth-admin') });
  }

  _login() {
    if (!this._auth) { this.setState({ error: 'Firebase 연결 대기 중입니다. 잠시 후 다시 시도하세요.' }); return; }
    const { email, pw } = this.state;
    if (!email || !pw) { this.setState({ error: '이메일과 비밀번호를 입력하세요.' }); return; }
    this.setState({ error: '' });
    this._auth.signInWithEmailAndPassword(email.trim(), pw)
      .then(() => this.setState({ pw: '', error: '' }))
      .catch(err => this.setState({ error: '로그인 실패: ' + (err.code || err.message) }));
  }

  setLang(next) {
    if (next === this.state.lang) return;
    document.body.classList.remove('lang-flip');
    void document.body.offsetWidth;
    document.body.classList.add('lang-flip');
    setTimeout(() => this.setState({ lang: next }), 220);
  }

  componentDidMount() {
    this.heroRef = React.createRef();
    this.stackRef = React.createRef();
    this.cursorRef = React.createRef();
    this.progressRef = React.createRef();

    // fake progress → hide loader
    let pct = 0;
    const step = () => {
      pct = Math.min(100, pct + Math.random() * 14 + 6);
      const bar = this.loaderBarRef?.current;
      const txt = this.loaderPctRef?.current;
      if (bar) bar.style.width = pct + '%';
      if (txt) txt.textContent = String(Math.floor(pct)).padStart(2, '0');
      if (pct < 100) setTimeout(step, 120);
      else setTimeout(() => this.setState({ loaded: true }), 300);
    };
    setTimeout(step, 100);

    this.initFirebase();
    this.syncRoute();
    this._onHash = () => this.syncRoute();
    window.addEventListener('hashchange', this._onHash);
    window.addEventListener('popstate', this._onHash);

    // rAF-throttled scroll handler
    let ticking = false;
    let lastY = 0;
    const apply = () => {
      ticking = false;
      const y = lastY;
      const el = this.heroRef?.current;
      if (el) {
        if (y > 800) {
          el.style.opacity = 0;
        } else {
          el.style.transform = `scale(${1 + Math.min(y / 600, 2.2)}) translateZ(0)`;
          el.style.opacity = Math.max(1 - y / 700, 0);
        }
      }
      const pb = this.progressRef?.current;
      if (pb) {
        const host = document.body;
        const max = host.scrollHeight - host.clientHeight;
        const pct = max > 0 ? (y / max) * 100 : 0;
        pb.style.width = pct + '%';
      }
    };
    this._onScroll = () => {
      lastY = document.body.scrollTop || window.scrollY;
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    };
    document.body.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('scroll', this._onScroll, { passive: true });

    // reveal observer
    this._io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.05, root: document.body });
    requestAnimationFrame(() => this._observeReveal());



    this.forceUpdate();
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this._onScroll);
    document.body.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('hashchange', this._onHash);
    window.removeEventListener('popstate', this._onHash);

    this._io?.disconnect();
  }

  renderVals() {
    const lang = this.state.lang;
    const T = {
      ko: {
        heroKicker: '포트폴리오 · 2022',
        heroTag: '나 그렇게 똑똑한 사람 아니고요.',
        scroll: 'Scroll',
        aboutTitle: '코드를 쓰는 것보다\n딸깍 하는 걸 좋아합니다.',
        aboutP1: '안녕하세요 dig입니다. 코딩을 해서 돈을 좀 벌면 좋겠는데 못 벌고 있고요. 도메인 없어서 눈물 나고요. 잘 짜여진 코드 보면 침 흘리고요.',
        aboutP2: '프로젝트 한 10개 했었던 것 같고요. 절실하게 돈이 필요한 사람입니다.',
        stat1: 'Years shipping',
        stat2: 'Projects',
        stat3: 'Curiosity',
        stat4: 'Clients',
        workTitle: 'Fifteen\nof my favorites.',
        workHint: '카드에 마우스를 올리면 겹쳐있던 프로젝트가 부채꼴로 펼쳐집니다.',
        archiveTitle: '전체 작업물\n한 눈에.',
        hoverHint: 'Hover to unfold',
        caseTitle: '학생이라 아직\n10만 유저는 없고요.',
        caseSubtitle: '지금은 배우는 중이고요.',
        caseBody: '큰 프로젝트는 아직이고요. 한 줄씩 쌓아가고 있고요. 도메인 살 돈이 생기면 배포도 할 거고요.',
        caseM1: '진행 중',
        caseM2: '학년',
        caseM3: '커피/일',
        stackTitle: '툴은 계속 바뀌고,\n원칙만 남습니다.',
        timelineTitle: '지금까지의 궤적.',
        contactLine1: '연락하기.',
        contactLine2: '뭔가',
        contactLine3: '만들어요.',
        contactBody: '궁금한 점이나 나누고 싶은 이야기가 있다면 메일로 남겨주세요.',
        available: '2026 Q4 프로젝트 예약 가능',
        sendMail: '메일 보내기',
        copyOr: '또는 눌러서 복사',
        openToWork: '새 기회에 열려있음',
        services: '05 — 제공하는 것',
        trusted: '함께한 팀',
        trustedTitle: '작지만 좋은 팀들과\n오래 일해왔습니다.',
        quote: '사랑은 언제나 눈물이 되며 돈만 쓰고 떠난다',
        footer: 'Designed & built with care.',
      },
      en: {
        heroKicker: 'Portfolio · 2022',
        heroTag: 'Full-stack builder who digs a little too deep.',
        scroll: 'Scroll',
        aboutTitle: 'I like taking code away\nmore than writing it.',
        aboutP1: "Hi, I'm dig. I move across frontend and backend because I want to understand the whole product. Thin interfaces, clear logic — that's what I believe in.",
        aboutP2: 'Lately I care about realtime collaboration, 3D interaction, and well-composed system design. Just a slightly odd person.',
        stat1: 'Years shipping',
        stat2: 'Projects',
        stat3: 'Curiosity',
        stat4: 'Clients',
        workTitle: 'Fifteen\nof my favorites.',
        workHint: 'Hover the stack — cards fan out like a deck of files.',
        archiveTitle: 'Everything,\nin one view.',
        hoverHint: 'Hover to unfold',
        caseTitle: 'A realtime finance dashboard,\n100k users in two weeks.',
        caseSubtitle: 'Complex financial data, one glance.',
        caseBody: 'Three months of re-architecting with the CTO. SSR on the front, event sourcing on the back. Results speak in numbers.',
        caseM1: 'Monthly growth',
        caseM2: 'LCP',
        caseM3: 'Lighthouse',
        stackTitle: 'Tools change,\nprinciples remain.',
        timelineTitle: 'The trajectory.',
        contactLine1: "Get in touch.",
        contactLine2: 'make',
        contactLine3: 'something.',
        contactBody: 'Interesting projects, odd ideas, serious offers — all welcome. Email is the fastest way.',
        available: 'Available for 2026 Q4',
        sendMail: 'Send an email',
        copyOr: 'or click to copy',
        openToWork: 'Open to opportunities',
        services: '05 — What I offer',
        trusted: 'Trusted by',
        trustedTitle: 'Small teams,\nlong relationships.',
        quote: 'Good interfaces disappear. The work is what stays.',
        footer: 'Designed & built with care.',
      }
    }[lang];

    const heroWord = lang === 'ko' ? 'dig' : 'dig';

    const workTitles = [
      { title: '메챠 카멜레온', tag: '3D · Multi', stack: 'Web · 3D · Multiplayer', year: '2026', href: 'https://meccha-chameleon-km4t.onrender.com', desc: '웹에서 돌아가게 작게 만들어봤고요. 3D고요 멀티고요.' },
      { title: 'PR51', tag: 'Pixel RPG', stack: '2D · Multi', year: '2026', href: 'https://pr51.onrender.com', desc: '픽셀 2D RPG고요 멀티고요 아기자기하고요.' },
      { title: 'DOTVERSE', tag: 'Block · Database', stack: 'Visual Blocks · Realtime DB', year: '2026', href: 'https://dotevers.onrender.com/', desc: '블록 코딩으로 작품을 만들고 실시간 데이터베이스까지 다루는 제작 플랫폼이고요.' },
      { title: 'Coop', tag: 'Messenger · Download', stack: 'Desktop · 1:1 Realtime', year: '2026', href: 'https://drive.usercontent.google.com/download?id=19MTgeIjDL3cLoIMRGYAb-zxCvBJIpFPW&export=download&confirm=t', download: true, desc: '단 한 사람과만 대화하며 같이 나무를 키우는 메신저고요. 누르면 바로 다운로드되고요.' },
      { title: 'SecLite', tag: 'Security · Download', stack: 'Hardened · Isolated Browser', year: '2026', href: 'https://drive.google.com/drive/folders/1HbKlQEwGvwStandZxj3cuKdcSgR79qDY', desc: '격리랑 하드닝으로 보안 개쩌는 브라우저고요. 눌러서 받으시고요.' },
    ].concat(this.state.extra || []);

    const workKey = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9\uac00-\ud7a3]+/g, '-').replace(/^-+|-+$/g, '');
    const workOff = this.state.workOff || {};
    const workClicks = this.state.workClicks || {};
    const clicksOf = (title) => workClicks[workKey(title)] || 0;
    const showToast = (msg) => {
      this.setState({ toast: msg });
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => this.setState({ toast: '' }), 2600);
    };

    // 카드마다 겹치지 않는 색 (황금각 간격 색상)
    const cardBg = (i) => {
      const h = Math.round((i * 137.508 + 345) % 360);
      return `linear-gradient(135deg, hsl(${h},48%,17%), hsl(${h},40%,7%))`;
    };

    const n = workTitles.length;
    const expanded = this.state.expanded;

    const works = workTitles.map((w, i) => {
      const centerIdx = (n - 1) / 2;
      const rel = i - centerIdx; // -7..7
      // stacked pose (slight offset)
      const stackedX = rel * 2;
      const stackedY = i * 1.2;
      const stackedRot = rel * 0.6;
      // fan pose (arc)
      const fanX = rel * 62;
      const fanY = Math.abs(rel) * 6;
      const fanRot = rel * 4.2;
      const fanRY = rel * -1.5;

      const dx = expanded ? fanX : stackedX;
      const dy = expanded ? fanY : stackedY;
      const rz = expanded ? fanRot : stackedRot;
      const ry = expanded ? fanRY : 0;

      const z = expanded ? i : (n - Math.abs(rel));
      const wk = workKey(w.title);
      const off = !!workOff[wk];
      const hits = workClicks[wk] || 0;

      return {
        ...w,
        num: 'NO. ' + String(i + 1).padStart(2, '0'),
        badgeStyle: off
          ? 'position:absolute; inset:0; border-radius:20px; background:rgba(8,8,9,0.72); backdrop-filter:blur(2px); display:flex; align-items:center; justify-content:center; text-align:center; padding:20px; font-size:12px; letter-spacing:0.12em; color:#d8d8d8; line-height:1.6;'
          : 'display:none;',
        badgeText: '지금은 비활성화되어 있습니다',
        clickLabel: hits + ' clicks',
        open: () => {
          if (off) { showToast(w.title + ' — 지금은 비활성화되어 있습니다'); return; }
          this._bump(wk);
          if (w.download) {
            const a = document.createElement('a');
            a.href = w.href;
            a.rel = 'noopener';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => a.remove(), 2000);
            return;
          }
          window.open(w.href, '_blank', 'noopener,noreferrer');
        },
        enter: () => {},
        leave: () => {},
        style: `position:absolute; left:50%; top:50%; width:240px; height:340px; border-radius:20px; background:${cardBg(i)}; ${off ? 'filter:grayscale(1) brightness(0.65);' : ''} border:1px solid rgba(255,255,255,0.12); box-shadow:0 20px 40px rgba(0,0,0,0.4); transform: translate(-50%,-50%) translateX(${dx}px) translateY(${dy}px) rotateZ(${rz}deg) rotateY(${ry}deg); transform-style:preserve-3d; z-index:${z}; transition: transform 0.85s cubic-bezier(.22,.61,.36,1), box-shadow 0.5s cubic-bezier(.22,.61,.36,1); --dx:${dx}px; --dy:${dy}px; --rz:${rz}deg; --ry:${ry}deg; will-change: transform;`
      };
    });

    const archiveSorted = workTitles
      .map((w, i) => ({ w, i }))
      .sort((a, b) => (clicksOf(b.w.title) - clicksOf(a.w.title)) || (a.i - b.i))
      .map(x => x.w);
    const archiveShown = this.state.archiveAll ? archiveSorted : archiveSorted.slice(0, 3);

    const btnBase = 'background:transparent; border:none; color:#f5f5f5; font-family:inherit; font-size:11px; padding:6px 12px; border-radius:100px; cursor:pointer; letter-spacing:0.08em; transition:all .3s;';
    const btnActive = 'background:#f5f5f5; color:#0a0a0a; ' + btnBase.replace('color:#f5f5f5;','');
    const koBtnStyle = lang === 'ko' ? 'background:#f5f5f5; color:#0a0a0a; border:none; font-family:inherit; font-size:11px; padding:6px 12px; border-radius:100px; cursor:pointer; letter-spacing:0.08em; transition:all .3s;' : btnBase + ' color:#888;';
    const enBtnStyle = lang === 'en' ? 'background:#f5f5f5; color:#0a0a0a; border:none; font-family:inherit; font-size:11px; padding:6px 12px; border-radius:100px; cursor:pointer; letter-spacing:0.08em; transition:all .3s;' : btnBase + ' color:#888;';

    const scrollToId = (id) => (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const target = document.getElementById(id);
      if (!target) return;
      const host = (document.body.scrollHeight > document.body.clientHeight + 4) ? document.body : (document.scrollingElement || document.documentElement);
      const startY = host.scrollTop;
      const hostTop = host.getBoundingClientRect().top;
      const endY = target.getBoundingClientRect().top - hostTop + startY - 60;
      const dist = endY - startY;
      const dur = Math.min(1400, 600 + Math.abs(dist) * 0.3);
      const t0 = performance.now();
      const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        host.scrollTop = startY + dist * ease(p);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const iconRow1 = [], iconRow2 = [], iconRow3 = [];

    const tickerData = [
      { name: 'TypeScript', tag: 'lang' }, { name: 'React', tag: 'ui' }, { name: 'Next.js', tag: 'framework' },
      { name: 'Remix', tag: 'framework' }, { name: 'Node', tag: 'runtime' }, { name: 'Go', tag: 'lang' },
      { name: 'Rust', tag: 'lang' }, { name: 'Postgres', tag: 'db' }, { name: 'Redis', tag: 'cache' },
      { name: 'Three.js', tag: 'gl' }, { name: 'GSAP', tag: 'motion' }, { name: 'Figma', tag: 'design' },
    ];
    const tickerLoop = [...tickerData, ...tickerData];
    const tickerLoop2 = ['systems', 'realtime', 'interaction', 'observability', 'performance', 'craft', 'motion', 'accessibility', 'systems', 'realtime', 'interaction', 'observability', 'performance', 'craft', 'motion', 'accessibility'];

    const s = { width: 28, height: 28 };
    const logos = [
      { name: 'TypeScript', svg: `<svg width="28" height="28" viewBox="0 0 128 128"><rect width="128" height="128" rx="18" fill="#3178C6"/><path fill="#fff" d="M74.5 96V83.7h13.9v-8.2H50v8.2h13.9V96zM89 71.4c-2 3-6.2 5.1-11.6 5.1-5.5 0-10-1.7-13-4.4l3.6-6.3c2.4 2 5.3 3.4 8.6 3.4 3.1 0 4.9-1.2 4.9-3.1 0-2.2-2.4-2.9-6.1-4-6.5-1.9-10.6-4.3-10.6-10.1 0-5.9 4.7-9.9 12.3-9.9 4.8 0 8.7 1.4 11.5 3.8L84.9 52c-2.1-1.6-4.7-2.7-7.3-2.7-2.9 0-4.4 1.2-4.4 2.9 0 2.1 2.5 2.8 6.6 4 6.8 2 10.5 4.7 10.5 10.3 0 2-.4 3.7-1.3 4.9z"/></svg>` },
      { name: 'React', svg: `<svg width="30" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2" fill="#61DAFB"/><g stroke="#61DAFB" stroke-width="1" fill="none"><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></g></svg>` },
      { name: 'Next.js', svg: `<svg width="28" height="28" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#000"/><path fill="#fff" d="M76 34h8v60l-46-60h-9v60h7V45l45 59h9V34z"/></svg>` },
      { name: 'Node.js', svg: `<svg width="30" height="28" viewBox="0 0 128 128"><path fill="#83CD29" d="M64 4L10 34v60l54 30 54-30V34L64 4zm0 8l45 25v50l-45 25-45-25V37l45-25z"/><path fill="#83CD29" d="M64 44c-8 0-14 3-14 9 0 5 4 7 12 9l4 1c8 1 10 3 10 6s-3 5-9 5-9-2-10-6h-7c1 8 7 12 17 12s16-5 16-11c0-6-4-8-13-10l-4-1c-7-1-9-2-9-5s3-4 8-4c6 0 8 2 9 5h7c-1-6-6-10-16-10z"/></svg>` },
      { name: 'Go', svg: `<svg width="34" height="28" viewBox="0 0 128 96"><path fill="#00ADD8" d="M8 40c-1 0-1 0-1-1l3-4h50v5H8zm-8 12c-1 0-1-1 0-1l4-5h64v5H0zm12 12c-1 0-1 0 0-1l3-4h28v4H12zm60-24c-9 2-15 3-24 5-2 0-2 1-1 3 6 8 6 15 3 25-4 12-13 20-25 22-20 3-33-9-32-27 1-17 12-30 28-33 15-3 27 2 33 15 4 7 3 14-1 20l-6-1c4-6 5-11 1-17-4-6-13-8-21-6-11 3-19 12-19 24 0 12 10 21 22 19 8-1 15-6 18-14 1-2 0-3-1-3l-13 1c-1 0-1-1-1-2l3-4c1-1 2-1 3-1h32c1 0 2 0 1 2-1 4-4 8-6 10 5 3 11 5 18 5s13-3 17-8c3-4 4-9 4-14 0-14-13-22-27-19z"/></svg>` },
      { name: 'Rust', svg: `<svg width="30" height="28" viewBox="0 0 128 128"><g fill="#DEA584"><circle cx="64" cy="64" r="52" fill="#DEA584"/><path fill="#000" d="M64 20L52 34h-14v14L24 60v8l14 12v14h14l12 14 12-14h14v-14l14-12v-8l-14-12V34h-14L64 20zm0 10l8 10h10v10l10 8v6l-10 8v10h-10l-8 10-8-10h-10v-10l-10-8v-6l10-8V40h10l8-10z"/></g></svg>` },
      { name: 'Postgres', svg: `<svg width="28" height="28" viewBox="0 0 128 128"><path fill="#336791" d="M64 8c-32 0-56 20-56 48 0 32 26 64 56 64s56-32 56-64c0-28-24-48-56-48z"/><path fill="#fff" d="M44 50c0-6 5-10 12-10 5 0 9 2 11 5-2 1-3 3-3 5 0 3 2 5 5 5s5-2 5-5c0-8-8-14-18-14-13 0-22 8-22 20 0 14 12 24 26 24 3 0 5 0 8-1v-8c-3 1-5 2-8 2-9 0-16-6-16-14 0-5 4-9 10-9zm40 0v40h-7V50h7z"/></svg>` },
      { name: 'Redis', svg: `<svg width="30" height="28" viewBox="0 0 128 128"><path fill="#DC382D" d="M126 76c0 4-6 8-16 12-9 4-32 10-48 10s-39-6-49-10c-9-4-15-8-15-12V52c0 4 6 8 15 12 10 4 33 10 49 10s39-6 48-10c10-4 16-8 16-12v24z"/><path fill="#912626" d="M126 52c0 4-6 8-16 12-9 4-32 10-48 10s-39-6-49-10c-9-4-15-8-15-12s6-8 15-12c10-4 33-10 49-10s39 6 48 10c10 4 16 8 16 12z"/></svg>` },
      { name: 'Three.js', svg: `<svg width="28" height="28" viewBox="0 0 128 128"><path fill="#eaeaea" d="M64 8L10 116l108-30L64 8zm0 24l32 62-58 15L64 32z"/></svg>` },
      { name: 'GraphQL', svg: `<svg width="28" height="28" viewBox="0 0 128 128"><path fill="#E10098" d="M64 4L14 32v64l50 28 50-28V32L64 4zm0 12l40 22v52l-40 22-40-22V38l40-22z"/><circle cx="64" cy="16" r="6" fill="#E10098"/><circle cx="112" cy="32" r="6" fill="#E10098"/><circle cx="112" cy="96" r="6" fill="#E10098"/><circle cx="64" cy="112" r="6" fill="#E10098"/><circle cx="16" cy="96" r="6" fill="#E10098"/><circle cx="16" cy="32" r="6" fill="#E10098"/></svg>` },
      { name: 'Docker', svg: `<svg width="34" height="28" viewBox="0 0 128 96"><path fill="#2496ED" d="M120 40c-3-2-9-3-14-2-1-4-3-8-6-11l-2-2-2 2c-4 4-6 10-5 15 1 3 3 6 5 8-4 2-11 3-13 3H8c-1 0-2 1-2 2-1 8 1 17 6 24 6 8 15 12 27 12 26 0 45-12 54-33 3 0 10 0 13-6l1-2-2-2c-1 0-4-2-6-3zM24 40h13v11H24V40zm16 0h13v11H40V40zm16 0h12v11H56V40zm16 0h12v11H72V40zM40 24h13v11H40V24zm16 0h12v11H56V24zm16 0h12v11H72V24zm0-16h12v11H72V8z"/></svg>` },
      { name: 'Figma', svg: `<svg width="20" height="28" viewBox="0 0 90 128"><path fill="#F24E1E" d="M22 0h23v43H22C10 43 0 33 0 22S10 0 22 0z"/><path fill="#A259FF" d="M45 43h23c12 0 22-10 22-22S80 0 68 0H45v43z"/><path fill="#0ACF83" d="M45 86h23c12 0 22-10 22-22s-10-22-22-22H45v44z"/><path fill="#FF7262" d="M22 86h23V43H22C10 43 0 53 0 64s10 22 22 22z"/><circle cx="67" cy="107" r="21" fill="#1ABCFE"/></svg>` },
    ];
    const logosDsi = logos.map(l => ({ ...l, dsi: { __html: l.svg } }));
    const logoLoop = [...logosDsi, ...logosDsi];

    const stackCats = [
      { label: 'Frontend', count: '05', list: ['React', 'Next.js', 'Remix', 'Svelte', 'Astro'] },
      { label: 'Backend', count: '05', list: ['Node', 'Go', 'Elixir', 'Rust', 'Python'] },
      { label: 'Data', count: '04', list: ['Postgres', 'Redis', 'Kafka', 'ClickHouse'] },
      { label: 'Craft', count: '05', list: ['Figma', 'GSAP', 'Three.js', 'WebGL', 'Motion'] },
    ];

    const d = new Date();
    const localTime = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

    const services = lang === 'ko' ? [
      { num: '01', title: '백엔드', desc: '서버 만들고 API 붙이고 굴러가게 해드리고요.', duration: 'ANY', price: 'OPEN' },
      { num: '02', title: '데이터베이스', desc: '데이터 저장하고 꺼내고 잘 정리해드리고요.', duration: 'ANY', price: 'OPEN' },
      { num: '03', title: '디자인', desc: '눈에 예뻐 보이게 대충 잘 만들어드리고요.', duration: 'ANY', price: 'OPEN' },
    ] : [
      { num: '01', title: 'Product engineering', desc: 'Across frontend and backend, from MVP to scale — I stay through the whole arc.', duration: '3-12 months', price: 'RETAINER' },
      { num: '02', title: 'Interaction & 3D', desc: 'Motion for brand sites and products with GSAP, Three.js and WebGL.', duration: '4-8 weeks', price: 'FIXED' },
      { num: '03', title: 'System re-architecture', desc: 'Rewriting slow codebases so teams move fast again.', duration: '6-16 weeks', price: 'SCOPED' },
    ];

    const trustedLogos = ['Ledger.io', 'Orbit', 'Studio Rho', 'Northshore', 'Paperlane', 'Kite', 'Halo', 'Ivy'];

    const timeline = [
      { year: '2026', role: '데이터베이스', desc: '데이터를 저장하고 꺼내는 법을 배우는 중이고요.' },
      { year: '2025', role: 'HTML · Python', desc: '진짜 코드를 만지기 시작한 해고요.' },
      { year: '2024', role: '구글 사이트', desc: '드래그로 뭐든 만들 수 있다는 걸 알게 됐고요.' },
      { year: '2023', role: '스크래치', desc: '블록 코딩으로 논리의 맛을 봤고요.' },
      { year: '2022', role: '엔트리 시작', desc: '여기가 진짜 처음이고요.' },
    ];

    return {
      t: T,
      heroWord1: heroWord,
      langLabel: lang === 'ko' ? 'EN' : 'KO',
      toggleLang: () => this.setLang(lang === 'ko' ? 'en' : 'ko'),
      setKo: () => this.setLang('ko'),
      setEn: () => this.setLang('en'),
      koBtnStyle,
      enBtnStyle,
      navWork: scrollToId('work'),
      navArchive: scrollToId('archive'),
      navAbout: scrollToId('about'),
      navStack: scrollToId('stack'),
      navTimeline: scrollToId('timeline'),
      navContact: scrollToId('contact'),
      tickerLoop,
      tickerLoop2,
      iconRow1,
      iconRow2,
      iconRow3,
      hideIcon: (e) => { const tile = e.target.closest('div'); if (tile) tile.style.display = 'none'; },
      services,
      trustedLogos,
      works,
      logoLoop,
      stackCats,
      archive: archiveShown.map((w, i) => ({
        ...w,
        num: String(i + 1).padStart(2, '0') + ' / ' + String(workTitles.length).padStart(2, '0'),
        clickLabel: clicksOf(w.title) + ' clicks',
        hit: (e) => {
          const k = workKey(w.title);
          if (workOff[k]) {
            if (e && e.preventDefault) e.preventDefault();
            showToast(w.title + ' \u2014 \uc9c0\uae08\uc740 \ube44\ud65c\uc131\ud654\ub418\uc5b4 \uc788\uc2b5\ub2c8\ub2e4');
            return;
          }
          this._bump(k);
        },
      })),
      archiveCount: String(workTitles.length).padStart(2, '0'),
      archiveShownCount: String(archiveShown.length).padStart(2, '0'),
      moreLabel: this.state.archiveAll ? '\uc811\uae30' : '\ub354\ubcf4\uae30 (' + (workTitles.length - archiveShown.length) + ')',
      moreStyle: workTitles.length > 3
        ? 'margin:48px auto 0; display:block; padding:14px 32px; border-radius:100px; background:transparent; border:1px solid rgba(255,255,255,0.15); color:#aaa; font-family:inherit; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; cursor:pointer; transition:all .3s;'
        : 'display:none;',
      toggleArchive: () => {
        this.setState({ archiveAll: !this.state.archiveAll });
        requestAnimationFrame(() => this._observeReveal());
        setTimeout(() => this._observeReveal(), 80);
        setTimeout(() => this._observeReveal(), 320);
      },
      timeline,
      localTime,
      heroRef: this.heroRef,
      stackRef: this.stackRef,
      cursorRef: this.cursorRef,
      loaderStyle: this.state.loaded
        ? 'opacity:0; visibility:hidden; pointer-events:none;'
        : 'opacity:1; visibility:visible; pointer-events:auto;',
      loaderRef: this.loaderRef = this.loaderRef || React.createRef(),
      loaderBarRef: this.loaderBarRef = this.loaderBarRef || React.createRef(),
      loaderPctRef: this.loaderPctRef = this.loaderPctRef || React.createRef(),

      // notices (public banner) — hide dismissed
      notices: this.state.notices
        .filter(n => !this.state.dismissed[n.id])
        .map(n => ({
          ...n,
          dismiss: () => this.setState(s => ({ dismissed: { ...s.dismissed, [n.id]: true } })),
          remove: () => { if (this._db) this._db.collection('announcements').doc(n.id).delete(); },
        })),
      hasNotices: this.state.notices.filter(n => !this.state.dismissed[n.id]).length > 0,
      noticeCount: String(this.state.notices.length).padStart(2, '0'),

      // toast
      hasToast: !!this.state.toast,
      toastMsg: this.state.toast,

      // admin — work visibility
      nwTitle: this.state.nwTitle, nwTag: this.state.nwTag, nwStack: this.state.nwStack,
      nwYear: this.state.nwYear, nwHref: this.state.nwHref, nwDesc: this.state.nwDesc,
      onNwTitle: (e) => this.setState({ nwTitle: e.target.value }),
      onNwTag: (e) => this.setState({ nwTag: e.target.value }),
      onNwStack: (e) => this.setState({ nwStack: e.target.value }),
      onNwYear: (e) => this.setState({ nwYear: e.target.value }),
      onNwHref: (e) => this.setState({ nwHref: e.target.value }),
      onNwDesc: (e) => this.setState({ nwDesc: e.target.value }),
      addWork: () => {
        const title = (this.state.nwTitle || '').trim();
        const href = (this.state.nwHref || '').trim();
        if (!this._db) { this.setState({ error: 'Firebase 연결 대기 중입니다.' }); return; }
        if (!title || !href) { this.setState({ error: '제목과 링크는 필수입니다.' }); return; }
        this._db.collection('works').add({
          title,
          href,
          tag: (this.state.nwTag || '').trim() || 'Project',
          stack: (this.state.nwStack || '').trim(),
          year: (this.state.nwYear || '').trim() || String(new Date().getFullYear()),
          desc: (this.state.nwDesc || '').trim(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        }).then(() => this.setState({ nwTitle: '', nwTag: '', nwStack: '', nwYear: '', nwHref: '', nwDesc: '', error: '' }))
          .catch(err => this.setState({ error: '작품 추가 실패: ' + err.message }));
      },

      workAdmin: workTitles.map((w) => {
        const k = workKey(w.title);
        const off = !!workOff[k];
        return {
          title: w.title,
          stateLabel: off ? '비활성' : '활성',
          stateStyle: off
            ? 'flex-shrink:0; font-family:\'JetBrains Mono\',monospace; font-size:9px; letter-spacing:0.18em; padding:3px 8px; border-radius:100px; background:rgba(255,80,80,0.15); color:#ff8080;'
            : 'flex-shrink:0; font-family:\'JetBrains Mono\',monospace; font-size:9px; letter-spacing:0.18em; padding:3px 8px; border-radius:100px; background:rgba(80,220,140,0.15); color:#6ee7a8;',
          btnLabel: off ? '활성화' : '비활성화',
          delStyle: w.isExtra
            ? 'flex-shrink:0; background:transparent; border:1px solid rgba(255,255,255,0.15); color:#888; font-family:inherit; font-size:11px; padding:6px 10px; border-radius:100px; cursor:pointer;'
            : 'display:none;',
          remove: () => { if (this._db && w.isExtra && w.id) this._db.collection('works').doc(w.id).delete(); },
          btnStyle: off
            ? 'flex-shrink:0; background:transparent; border:1px solid rgba(110,231,168,0.4); color:#6ee7a8; font-family:inherit; font-size:11px; padding:6px 12px; border-radius:100px; cursor:pointer;'
            : 'flex-shrink:0; background:transparent; border:1px solid rgba(255,255,255,0.15); color:#aaa; font-family:inherit; font-size:11px; padding:6px 12px; border-radius:100px; cursor:pointer;',
          toggle: () => {
            if (!this._db) { this.setState({ error: 'Firebase 연결 대기 중입니다.' }); return; }
            this._db.collection('workStates').doc(k).set({
              disabled: !off,
              title: w.title,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            }, { merge: true }).catch(err => this.setState({ error: '작품 상태 변경 실패: ' + err.message }));
          },
        };
      }),

      // admin
      isAdmin: this.state.isAdmin,
      authed: this.state.authed,
      notAuthed: !this.state.authed,
      hasError: !!this.state.error,
      errorMsg: this.state.error,
      emailVal: this.state.email,
      pwVal: this.state.pw,
      draftVal: this.state.draft,
      onEmail: (e) => this.setState({ email: e.target.value }),
      onPw: (e) => this.setState({ pw: e.target.value }),
      onPwKey: (e) => { if (e.key === 'Enter') this._login(); },
      onDraft: (e) => this.setState({ draft: e.target.value }),
      doLogin: () => this._login(),
      doLogout: () => { if (this._auth) this._auth.signOut(); },
      closeAdmin: (e) => { if (e && e.preventDefault) e.preventDefault(); location.hash = ''; this.setState({ isAdmin: false }); },
      postNotice: () => {
        const text = (this.state.draft || '').trim();
        if (!text || !this._db) return;
        this._db.collection('announcements').add({ text, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
          .then(() => this.setState({ draft: '' }))
          .catch(err => this.setState({ error: '공지 등록 실패: ' + err.message }));
      },
      progressRef: this.progressRef,
      expandStack: () => this.setState({ expanded: true }),
      collapseStack: () => this.setState({ expanded: false }),
    };
  }
}

  return Component;
};
