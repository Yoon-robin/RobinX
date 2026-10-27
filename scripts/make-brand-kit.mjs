// 브랜드 키트를 HTML 파일 하나로 만든다 (docs/brand/brand-kit.html). 로고·색·글로우 규격·글꼴·말투·tokens.css·GitHub 프로젝트가
// 모두 들어 있고, 그림과 글꼴은 파일 안에 넣어서 이 파일 하나만 보내면 된다 (인터넷 없이도 열린다).
//
//   node scripts/make-brand.mjs        # 먼저 로고 파일을 만들고
//   node scripts/make-brand-kit.mjs    # 그 파일들을 모아 HTML 하나로
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const dir = `${root}/docs/brand`
const read = (f) => readFileSync(`${dir}/${f}`)
const b64 = (buf) => Buffer.from(buf).toString("base64")
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const version = JSON.parse(readFileSync(`${root}/package.json`, "utf8")).version
const today = new Date().toISOString().slice(0, 10)
const REPO = "https://github.com/Yoon-robin/RobinX"
const SITE = "https://yoon-robin.github.io/RobinX/"

// 글꼴: Cascadia(라틴)만 넣는다. 한글은 쓰는 사람 PC의 Pretendard·맑은 고딕으로 그려진다 (앱도 같은 방식)
const fontFile = `${root}/website/node_modules/@fontsource-variable/cascadia-code/files/cascadia-code-latin-wght-normal.woff2`
const fontFace = existsSync(fontFile)
  ? `@font-face{font-family:"Cascadia Code";src:url(data:font/woff2;base64,${b64(readFileSync(fontFile))}) format("woff2");font-weight:200 700;font-display:swap}`
  : ""
if (!fontFace) console.warn("Cascadia 글꼴 파일이 없어서 넣지 않았어요 (pnpm --dir website install)")

const svgUri = (f) => `data:image/svg+xml;base64,${b64(read(f))}`
const pngUri = (f) => `data:image/png;base64,${b64(read(f))}`
const dl = (label, file, uri) => `<a class="btn" download="${file}" href="${uri}">${label}</a>`

// 첫 화면의 워드마크는 파일 그대로 넣는다 (글로우 필터 포함)
const heroSvg = read("wordmark-glow.svg")
  .toString("utf8")
  .replace(/<\?xml[^>]*>\s*/, "")
  .replace(/<!--[\s\S]*?-->\s*/g, "")
  .replace(/ width="\d+" height="\d+">/, ' role="img" aria-label="RobinX 워드마크">')
const tokens = read("tokens.css").toString("utf8")

const swatches = [
  ["페이지 바탕", "#070707", "페이지 전체. 그 위의 터미널 창 안쪽은 #0b0b0b"],
  ["터미널 창 · 로고 바탕", "#0b0b0b", "창 안쪽, 앱 아이콘 타일, 프로필 이미지 바탕"],
  ["카드", "#0e0e0e", "카드·패널"],
  ["눌린 면", "#1b1b1b", "보조 면, 누른 상태"],
  ["본문 글자", "#e8e8e8", "긴 글"],
  ["제목·강조", "#f2f2f2", "제목, 기본 단추 (가장 밝은 곳은 #ffffff)"],
  ["보조 글자", "#9e9e9e", "설명 글. 바탕에서 7:1 안팎"],
  ["흐린 줄", "#6f6f6f", "로그 태그 같은 장식. 작은 글자에는 쓰지 않는다"],
  ["로고 아래쪽", "#9a9a9a", "로고 색은 위 #ffffff에서 아래 #9a9a9a으로 한 번만 흐른다"],
  ["상태: 호박색", "#fbbf24", "NEW · 직접 확인. 상태를 알릴 때만"],
  ["상태: 빨강", "#f87171", "지우기 · 실패. 상태를 알릴 때만"],
]

const swatchHtml = swatches
  .map(
    ([name, hex, use]) => `
      <li><button type="button" class="sw" data-copy="${hex}" aria-label="${name} ${hex} 복사">
        <span class="chip" style="background:${hex}"></span>
        <span class="sw-text"><b>${name}</b><code>${hex}</code><small>${use}</small></span>
      </button></li>`,
  )
  .join("")

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>RobinX 브랜드 키트</title>
<style>
${fontFace}
:root{
  --page:#070707;--term:#0b0b0b;--card:#0e0e0e;--raised:#1b1b1b;
  --text:#e8e8e8;--strong:#f2f2f2;--dim:#9e9e9e;--faint:#6f6f6f;
  --line:rgb(255 255 255/14%);--line-win:rgb(255 255 255/16%);
  --amber:#fbbf24;--red:#f87171;--radius:.2rem;
  --term-font:"Cascadia Code","Cascadia Mono",Consolas,"D2Coding","Pretendard Variable",Pretendard,"Malgun Gothic",monospace;
  --body-font:"Pretendard Variable",Pretendard,-apple-system,"Segoe UI","Malgun Gothic",sans-serif;
  color-scheme:dark;
}
*{box-sizing:border-box}
html{background:var(--page)}
body{margin:0;background:var(--page);color:var(--text);font:400 16px/1.7 var(--body-font);-webkit-font-smoothing:antialiased;word-break:keep-all}
.wrap{width:100%;max-width:60rem;margin-inline:auto;padding-inline:clamp(1.25rem,4vw,2rem)}
code,pre,.mono{font-family:var(--term-font)}
a{color:var(--strong)}
h1,h2,h3{margin:0;color:var(--strong);font-family:var(--term-font);letter-spacing:-.02em;line-height:1.25}
h2{font-size:clamp(1.4rem,3.2vw,1.9rem);font-weight:700;margin-bottom:.5rem}
h2::before{content:"> ";color:var(--dim);font-weight:400}
h3{font-size:1rem;font-weight:700}
p{margin:0 0 .75rem}
.lead{color:var(--dim);max-width:44rem}
section{padding-block:clamp(2.75rem,7vw,4.5rem);border-top:1px solid var(--line)}
.cursor{display:inline-block;width:.5em;height:.95em;margin-left:.2em;vertical-align:-.08em;background:#e6e6e6;animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}

/* 첫 화면: 글로우는 이 워드마크 하나에만. 주사선과 가장자리 그늘도 이 장면에만 */
.hero{position:relative;overflow:hidden;background:var(--term);border-bottom:1px solid var(--line);padding-block:clamp(2.5rem,8vw,5rem)}
.hero::before,.hero::after{content:"";position:absolute;inset:0;pointer-events:none}
.hero::before{background:repeating-linear-gradient(to bottom,rgb(255 255 255/2.2%) 0 1px,transparent 1px 3px)}
.hero::after{background:radial-gradient(ellipse at center,transparent 55%,rgb(0 0 0/55%))}
.hero .wrap{position:relative;z-index:1}
.eyebrow{font:400 .8125rem/1.65 var(--term-font);color:var(--dim)}
.hero h1{font-size:clamp(1.5rem,4vw,2.25rem);margin-top:.25rem}
.hero h1::before{content:"> ";color:var(--dim);font-weight:400}
.wm{display:block;width:100%;max-width:46rem;height:auto;margin:.5rem auto 0}
.hero .lead{margin:.5rem auto 0;text-align:center;font-size:1.0625rem}
.meta{margin-top:1.5rem;display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;justify-content:center;font:400 .8125rem/1.6 var(--term-font);color:var(--dim)}

/* 단추: 가는 흰 테두리 */
.btn,.btn-main{display:inline-flex;align-items:center;gap:.4rem;min-height:2.5rem;padding:.35rem .9rem;border:1px solid var(--line-win);border-radius:var(--radius);background:transparent;color:var(--strong);font:600 .875rem/1.2 var(--body-font);text-decoration:none;cursor:pointer}
.btn:hover{background:var(--raised)}
.btn-main{background:var(--strong);color:#0b0b0b;border-color:var(--strong)}
.btn-main:hover{background:#fff}
:focus-visible{outline:2px solid var(--strong);outline-offset:2px}
.row{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem}

/* 로고 카드 */
.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr));margin-top:1.5rem;padding:0;list-style:none}
.card{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}
.preview{display:grid;place-items:center;aspect-ratio:16/10;background:var(--term);border-bottom:1px solid var(--line)}
.preview img{display:block;max-width:86%;max-height:86%}
.preview.square img{width:46%;max-width:none;max-height:none}
.card .body{padding:1rem;display:flex;flex-direction:column;gap:.35rem;flex:1}
.card small{color:var(--dim);font-size:.875rem;line-height:1.55}
.card .row{margin-top:auto;padding-top:.75rem}

/* 색 */
.sws{display:grid;gap:.5rem;grid-template-columns:repeat(auto-fill,minmax(17rem,1fr));margin:1.5rem 0 0;padding:0;list-style:none}
.sw{display:flex;align-items:center;gap:.85rem;width:100%;padding:.6rem;text-align:left;border:1px solid var(--line);border-radius:var(--radius);background:var(--card);color:var(--text);font:inherit;cursor:pointer}
.sw:hover{background:var(--raised)}
.chip{flex:none;width:2.75rem;height:2.75rem;border:1px solid var(--line-win);border-radius:var(--radius)}
.sw-text{display:grid;gap:0;min-width:0}
.sw-text b{font-size:.9375rem;color:var(--strong)}
.sw-text code{font-size:.8125rem;color:var(--text)}
.sw-text small{font-size:.8125rem;color:var(--dim);line-height:1.45}

/* 글로우 */
.two{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));margin-top:1.5rem}
.demo{display:grid;place-items:center;gap:.5rem;min-height:9rem;padding:1.25rem;background:var(--term);border:1px solid var(--line);border-radius:var(--radius);text-align:center}
.demo .tag{font:700 .8125rem/1 var(--term-font)}
.ok .tag{color:var(--strong)}.no .tag{color:var(--red)}
.glow-r{font:700 3rem/1 var(--term-font);color:#fff;filter:drop-shadow(0 0 10px rgb(255 255 255/22%))}
.bad-btn{padding:.5rem 1rem;border:1px solid var(--line-win);background:var(--card);color:var(--strong);font:600 .875rem var(--body-font);filter:drop-shadow(0 0 10px rgb(255 255 255/55%));border-radius:var(--radius)}
ul.rules{margin:1rem 0 0;padding-left:1.1rem}
ul.rules li{margin:.3rem 0}
ul.rules li::marker{color:var(--dim)}

/* 터미널 창 */
.term{background:var(--term);border:1px solid var(--line-win);border-radius:var(--radius);padding:1rem 1.1rem;font:400 .875rem/1.75 var(--term-font);overflow-x:auto}
.term .p{color:var(--strong);font-weight:700}
.term .d{color:var(--dim)}
.term .t{display:inline-block;min-width:6ch;text-align:center;font-weight:700}
.t.ok{color:#fff}.t.new{color:var(--amber)}.t.skip{color:var(--faint)}.t.fail{color:var(--red)}
.term .line{white-space:nowrap}

/* 글꼴 샘플 */
.type{margin-top:1.5rem;display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr))}
.type .box{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:1rem}
.type .big{font:700 1.5rem/1.35 var(--term-font);letter-spacing:-.02em;color:var(--strong)}
.type .body{font:400 1rem/1.7 var(--body-font);color:var(--text)}
.type .label{font:400 .8125rem/1.5 var(--term-font);color:var(--dim);margin-bottom:.5rem}

/* 코드 */
.code{position:relative;margin-top:1rem}
.code pre{margin:0;padding:1rem 1.1rem;background:var(--term);border:1px solid var(--line-win);border-radius:var(--radius);overflow:auto;max-height:26rem;font-size:.8125rem;line-height:1.65;color:var(--text);tab-size:2}
.code .btn{position:absolute;top:.6rem;right:.6rem;min-height:2rem;padding:.2rem .65rem;background:var(--card)}

/* GitHub */
.repo{margin-top:1.5rem;background:var(--term);border:1px solid var(--line-win);border-radius:var(--radius);overflow:hidden}
.repo .bar{display:flex;flex-wrap:wrap;gap:.25rem 1rem;justify-content:space-between;padding:.55rem 1rem;border-bottom:1px solid var(--line);font:400 .8125rem/1.6 var(--term-font);color:var(--dim)}
.repo .in{padding:1.25rem 1rem 1.1rem}
.repo h3{font-size:1.5rem}
.ver{display:inline-block;margin-left:.5rem;padding:.05rem .5rem;border:1px solid var(--line-win);border-radius:var(--radius);font:400 .8125rem/1.6 var(--term-font);color:var(--dim);vertical-align:.2em}
.kv{display:grid;grid-template-columns:max-content 1fr;gap:.2rem 1.25rem;margin:1rem 0 0;font:400 .875rem/1.7 var(--term-font)}
.kv dt{color:var(--dim)}.kv dd{margin:0;color:var(--text);min-width:0;word-break:break-word}

footer{padding-block:2.5rem 4rem;border-top:1px solid var(--line);color:var(--dim);font:400 .8125rem/1.7 var(--term-font)}
#toast{position:fixed;left:50%;bottom:1.5rem;translate:-50% 0;padding:.5rem .9rem;background:var(--strong);color:#0b0b0b;border-radius:var(--radius);font:600 .875rem var(--body-font);opacity:0;pointer-events:none;transition:opacity .15s}
#toast.on{opacity:1}
@media (prefers-reduced-motion:reduce){.cursor{animation:none}#toast{transition:none}}
</style>
</head>
<body>

<header class="hero">
  <div class="wrap">
    <p class="eyebrow">brand kit · ${today} · RobinX v${version}</p>
    <h1>브랜드 키트<span class="cursor" aria-hidden="true"></span></h1>
    ${heroSvg}
    <p class="lead">검정 바탕에 흰색과 회색만 쓰고, 화면에 하나뿐인 큰 요소만 흰 빛이 번지게 한다. 모든 것은 터미널처럼 <code>&gt;</code> 프롬프트와 네모 커서로 말한다.</p>
    <div class="meta"><span>글로우 + 블랙앤화이트</span><span>Cascadia + Pretendard</span><span>해요체 · 명사형 로그</span></div>
  </div>
</header>

<main>
<section id="logo"><div class="wrap">
  <h2>로고</h2>
  <p class="lead">워드마크는 5줄 × 28칸의 픽셀 글자이고 시작 화면의 글자와 같다. 색은 위 #ffffff에서 아래 #9a9a9a으로 한 번만 흐른다. 단추를 누르면 내려받는다.</p>
  <ul class="grid">
    <li class="card"><div class="preview"><img src="${svgUri("wordmark-glow.svg")}" alt="글로우가 든 RobinX 워드마크"></div>
      <div class="body"><h3>워드마크 · 글로우</h3><small>검은 바탕에서만. PNG는 2960×1080.</small>
      <div class="row">${dl("SVG", "robinx-wordmark-glow.svg", svgUri("wordmark-glow.svg"))}${dl("PNG 검정 바탕", "robinx-wordmark-glow-black.png", pngUri("wordmark-glow-black.png"))}${dl("PNG 투명", "robinx-wordmark-glow-transparent.png", pngUri("wordmark-glow-transparent.png"))}</div></div></li>
    <li class="card"><div class="preview"><img src="${svgUri("wordmark.svg")}" alt="글로우 없는 RobinX 워드마크"></div>
      <div class="body"><h3>워드마크 · 글로우 없음</h3><small>작은 크기, 인쇄, 글로우가 안 되는 곳. 밝은 바탕에서는 검정으로 바꿔 쓴다.</small>
      <div class="row">${dl("SVG", "robinx-wordmark.svg", svgUri("wordmark.svg"))}</div></div></li>
    <li class="card"><div class="preview square"><img src="${svgUri("logo-icon.svg")}" alt="RobinX 앱 아이콘"></div>
      <div class="body"><h3>앱 아이콘</h3><small>검은 타일 위의 R. 작업 표시줄·파비콘. 작은 크기에서 흐려지지 않게 글로우는 넣지 않는다.</small>
      <div class="row">${dl("SVG", "robinx-icon.svg", svgUri("logo-icon.svg"))}${dl("PNG 1024", "robinx-icon-1024.png", pngUri("logo-icon-1024.png"))}</div></div></li>
    <li class="card"><div class="preview square"><img src="${svgUri("avatar-glow.svg")}" alt="글로우 R 프로필 이미지"></div>
      <div class="body"><h3>프로필 이미지</h3><small>검정 바탕에 글로우 R. 원형으로 잘려도 R이 남는다.</small>
      <div class="row">${dl("SVG", "robinx-avatar-glow.svg", svgUri("avatar-glow.svg"))}${dl("PNG 1024", "robinx-avatar-glow-1024.png", pngUri("avatar-glow-1024.png"))}</div></div></li>
  </ul>
  <ul class="rules">
    <li>로고 둘레에 글자 높이의 절반 이상 비운다. 글로우가 잘리지 않게.</li>
    <li>하지 않는 것: 색 입히기, 흰색→회색 말고 다른 그라데이션, 둥글게 만들기, 다른 글꼴로 바꾸기, 글로우 두 번 얹기, 밝은 바탕 위에 올리기.</li>
  </ul>
</div></section>

<section id="color"><div class="wrap">
  <h2>색</h2>
  <p class="lead">검정, 흰색, 그 사이의 회색뿐이다. 상태색은 호박색과 빨강 둘이고 상태를 알릴 때만 쓴다. 초록·파랑·보라는 쓰지 않는다. 누르면 값이 복사된다.</p>
  <ul class="sws">${swatchHtml}
  </ul>
  <p class="lead" style="margin-top:1rem">선은 흰색 14%(창 틀은 16%)이다.</p>
</div></section>

<section id="glow"><div class="wrap">
  <h2>글로우</h2>
  <p class="lead">시작 화면 로고가 쓰는 값이다. 흰색만, 두 겹까지.</p>
  <div class="two">
    <div class="demo ok"><span class="glow-r" aria-hidden="true">R</span><span class="tag">○ 이렇게</span><small class="d">화면에 하나뿐인 큰 요소 (로고)</small></div>
    <div class="demo no"><button class="bad-btn" type="button" tabindex="-1">단추</button><span class="tag">× 이렇게 쓰지 않는다</span><small class="d">단추·카드·목록·본문에는 쓰지 않는다</small></div>
  </div>
  <ul class="rules">
    <li><b>흰색만.</b> 색이 있는 빛은 쓰지 않는다.</li>
    <li><b>화면에 하나뿐인 큰 요소에만.</b> 글로우가 흔해지면 아무것도 빛나지 않는다.</li>
    <li>상자에는 <code>box-shadow</code>가 아니라 <code>filter: drop-shadow</code>를 쓴다. 칸 모양을 따라 번진다.</li>
    <li>가끔 켜지는 것처럼 보여야 한다. 시작 화면에서는 로고가 한 줄씩(45ms 간격) 켜지며 빛난다.</li>
    <li>한 장면에만 주사선(3px마다 흰색 2.2%의 1px 줄)과 가장자리 그늘을 얹는다. 모든 화면에 깔지 않는다. 이 페이지에서는 맨 위가 그 장면이다.</li>
  </ul>
  <div class="code"><pre id="glow-css">.brand-glow     { filter: drop-shadow(0 0 10px rgb(255 255 255 / 22%)); }
.brand-glow-big { filter: drop-shadow(0 0 10px rgb(255 255 255 / 22%))
                         drop-shadow(0 0 28px rgb(255 255 255 / 10%)); }</pre>
    <button type="button" class="btn" data-copy-from="#glow-css">복사</button></div>
</div></section>

<section id="type"><div class="wrap">
  <h2>글꼴과 모양</h2>
  <div class="type">
    <div class="box"><div class="label">터미널 · 제목, 로그, 숫자, 코드</div>
      <div class="big">&gt; 프로그램 110개</div>
      <p class="mono" style="margin:.5rem 0 0;color:var(--dim);font-size:.875rem">Cascadia Mono / Code → Consolas → D2Coding. 한글은 Pretendard로. 제목은 700, 자간 -0.02em.</p></div>
    <div class="box"><div class="label">본문 · 긴 글</div>
      <div class="body">프로그램을 지운 뒤 남은 파일과 레지스트리를 찾아, 근거를 보고 고른 것만 백업한 뒤 정리해요.</div>
      <p style="margin:.5rem 0 0;color:var(--dim);font-size:.875rem">Pretendard 400.</p></div>
  </div>
  <ul class="rules">
    <li><b>모서리는 거의 각지게</b> 0.2rem. 둥근 알약 모양은 쓰지 않는다 (앱 아이콘 타일만 둥글다).</li>
    <li><b>창은 터미널 창처럼.</b> 가는 흰 테두리(16%), 안쪽은 #0b0b0b.</li>
    <li>제목은 프롬프트로 시작한다 (<code>&gt; 프로그램</code>). 끝에는 네모 커서가 1초 박자로 깜빡이고, 흐려지지 않고 켜졌다 꺼진다.</li>
  </ul>
</div></section>

<section id="voice"><div class="wrap">
  <h2>움직임과 말투</h2>
  <div class="term" role="img" aria-label="터미널 로그 예시">
    <div class="line"><span class="p">C:\\Users\\robin&gt;</span>robinx</div>
    <div class="line"><span class="d">[</span><span class="t ok">OK</span><span class="d">]</span> 설치된 프로그램 110개 (167ms)</div>
    <div class="line"><span class="d">[</span><span class="t ok">OK</span><span class="d">]</span> 업데이트 정보 받음 (0.6초)</div>
    <div class="line"><span class="d">[</span><span class="t new">NEW</span><span class="d">]</span> 새 버전 v${version} 있음</div>
    <div class="line"><span class="d">[</span><span class="t skip">SKIP</span><span class="d">]</span> <span class="d">업데이트 확인 못 함: 인터넷에 연결할 수 없어요</span></div>
    <div class="line"><span class="d">[</span><span class="t fail">FAIL</span><span class="d">]</span> 설치된 프로그램 읽기 실패</div>
    <div class="line"><span class="p">&gt;</span> <span class="cursor" aria-hidden="true"></span></div>
  </div>
  <ul class="rules">
    <li>앱·사이트 글은 <b>해요체</b>. 로그 줄은 <b>명사형</b>으로 짧게. 상태는 대괄호 태그 <code>[ OK ] [NEW] [SKIP] [FAIL]</code>.</li>
    <li>인터넷이 없는 것처럼 앱 잘못이 아닌 것은 FAIL이 아니라 SKIP.</li>
    <li>꾸밈말·감탄사·이모지를 쓰지 않는다. AI가 쓴 티가 나는 문장(대구, 맺음 문장)도 쓰지 않는다.</li>
    <li>움직임은 빠르고 한 번에. 창 열림은 0.9→1배로 0.52초, 곡선 <code>cubic-bezier(0.22, 1, 0.36, 1)</code>. 꺼질 때는 브라운관처럼 세로로 접혀 밝은 한 줄이 됐다가 가로로 사라진다(0.42초). 글자는 치듯이 나타난다.</li>
    <li><b>움직임 줄이기를 켠 사람에게는 움직임을 끈다</b> (<code>prefers-reduced-motion</code>). 예외 없음.</li>
  </ul>
</div></section>

<section id="tokens"><div class="wrap">
  <h2>tokens.css</h2>
  <p class="lead">새 프로젝트에 그대로 붙여 쓰는 값이다.</p>
  <div class="code"><pre id="tokens-css">${esc(tokens)}</pre>
    <button type="button" class="btn" data-copy-from="#tokens-css">복사</button></div>
  <div class="row">${dl("tokens.css 내려받기", "tokens.css", `data:text/css;base64,${b64(tokens)}`)}</div>
</div></section>

<section id="project"><div class="wrap">
  <h2>GitHub 프로젝트</h2>
  <p class="lead">이 아이덴티티를 처음 쓴 프로젝트예요. 소스 코드는 공개예요.</p>
  <div class="repo">
    <div class="bar"><span>github.com/Yoon-robin/RobinX</span><span>Apache-2.0 · 공개</span></div>
    <div class="in">
      <h3>RobinX<span class="ver">v${version}</span></h3>
      <p style="margin:.6rem 0 0">프로그램을 지운 뒤 남은 파일과 레지스트리를 찾아, 근거를 보고 고른 것만 백업한 뒤 정리하는 무료 Windows 앱이에요. 저장공간 정리와 시작프로그램 관리도 들어 있고, 바꾼 것은 되돌릴 수 있어요.</p>
      <dl class="kv">
        <dt>저장소</dt><dd><a href="${REPO}">${REPO}</a></dd>
        <dt>소개 사이트</dt><dd><a href="${SITE}">${SITE}</a></dd>
        <dt>내려받기</dt><dd><a href="${REPO}/releases/latest">${REPO}/releases/latest</a></dd>
        <dt>기술</dt><dd>Tauri 2 · React · TypeScript · Rust</dd>
        <dt>지원</dt><dd>Windows 10 / 11 (x64)</dd>
        <dt>라이선스</dt><dd>Apache License 2.0</dd>
      </dl>
      <div class="row">
        <a class="btn-main" href="${REPO}">저장소 열기</a>
        <a class="btn" href="${SITE}">소개 사이트</a>
        <a class="btn" href="${REPO}/releases/latest">내려받기</a>
        <button type="button" class="btn" data-copy="git clone ${REPO}.git">git clone 복사</button>
      </div>
    </div>
  </div>
</div></section>
</main>

<footer><div class="wrap">RobinX brand kit · ${today} · 규격서 docs/BRAND.md · 이 파일 하나에 그림과 글꼴이 모두 들어 있다</div></footer>

<div id="toast" role="status" aria-live="polite"></div>
<script>
(function () {
  var toast = document.getElementById("toast"), timer;
  function say(text) {
    toast.textContent = text; toast.classList.add("on");
    clearTimeout(timer); timer = setTimeout(function () { toast.classList.remove("on"); }, 1400);
  }
  function copy(text) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); say("복사했어요"); } catch (e) { say("복사하지 못했어요"); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { say("복사했어요"); }, fallback);
    } else fallback();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy],[data-copy-from]");
    if (!b) return;
    var text = b.getAttribute("data-copy");
    if (text == null) text = document.querySelector(b.getAttribute("data-copy-from")).textContent;
    copy(text);
  });
})();
</script>
</body>
</html>
`

const out = `${dir}/brand-kit.html`
writeFileSync(out, html)
console.log(`${out} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`)
