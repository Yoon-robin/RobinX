// 첫 화면에 넣는 실제 앱 시연: 앱의 화면 코드(src/)를 그대로 빌드하고, 엔진 대신 가짜 응답과
// 저절로 누르며 도는 순서(demo.js)를 붙여 website/public/app/에 둔다. 사이트는 이것을 iframe으로 띄운다.
//
//   (저장소 루트에서) pnpm exec vite build --config website/app-demo/vite.config.mjs
//
// 사이트를 배포할 때(website/scripts/deploy.sh) 먼저 만든다. 결과는 저장소에 넣지 않는다.
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
// 앱 시작 화면(index.html의 %VITE_APP_VERSION%)에 보이는 버전
process.env.VITE_APP_VERSION = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version

export default defineConfig({
  root,
  // 사이트의 어느 주소 아래에 두어도 읽히게
  base: "./",
  // 앱의 public/은 창 아이콘 등이라 시연에는 필요 없다
  publicDir: false,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "robinx-demo",
      // 가짜 응답과 시연 순서를 앱 코드보다 먼저 읽는다 (같은 순서로 실행되는 모듈 스크립트).
      // Vite가 스크립트를 묶기 전에 넣어야 하므로 "pre"
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          const main = '<script type="module" src="/src/main.tsx"></script>'
          if (!html.includes(main)) throw new Error("index.html에서 main.tsx 스크립트를 찾지 못했어요")
          return html.replace(main, `<script type="module" src="/website/app-demo/demo.js"></script>\n    ${main}`)
        },
      },
    },
  ],
  resolve: { alias: { "@": path.join(root, "src") } },
  build: {
    outDir: path.join(root, "website", "public", "app"),
    emptyOutDir: true,
    // 앱의 설치·제거 화면 등 시연에 쓰지 않는 조각도 함께 나오지만, 부르지 않으면 받지 않는다
    chunkSizeWarningLimit: 2000,
  },
})
