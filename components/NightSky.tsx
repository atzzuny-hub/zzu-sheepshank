// 소개 화면 맨 위의 밤하늘 그림. 별과 별똥별, 언덕, 양쪽의 소나무를 직접 그렸습니다.
// 꾸밈이라 화면 읽기 프로그램에는 읽히지 않게 합니다(aria-hidden). 색은 globals.css 의 "about" 부분에 있습니다.

import { useId } from "react";

// 별: [가로, 세로, 크기]. 그림 폭 1200, 높이 420 기준
const STARS: [number, number, number][] = [
  [60, 40, 1.4], [130, 96, 1], [214, 30, 1.2], [300, 74, 0.9], [384, 36, 1.3], [470, 92, 1], [540, 24, 1.1], [640, 60, 0.9],
  [722, 30, 1.4], [790, 104, 1], [864, 44, 1.2], [960, 84, 1], [1040, 28, 1.3], [1112, 70, 1], [1160, 134, 1.1],
  [90, 174, 0.9], [250, 150, 1], [420, 164, 0.8], [612, 140, 0.9], [820, 172, 0.8], [1012, 160, 1], [170, 232, 0.8], [984, 236, 0.8],
];
// 네 갈래로 반짝이는 큰 별
const SPARKS: [number, number, number][] = [[96, 54, 11], [152, 122, 6], [1078, 196, 6], [322, 206, 5]];
const spark = (x: number, y: number, s: number) =>
  `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;

// 소나무 한 그루: 세모 세 단과 줄기. x 는 가운데, base 는 밑동의 높이, h 는 키
function pine(x: number, base: number, h: number) {
  const w = h * 0.26, n = (v: number) => v.toFixed(1);
  const tier = (top: number, bottom: number, half: number) => `M${n(x)} ${n(base - h * top)}L${n(x + half)} ${n(base - h * bottom)}H${n(x - half)}Z`;
  return tier(1, 0.6, w * 0.55) + tier(0.74, 0.32, w * 0.8) + tier(0.48, 0.06, w)
    + `M${n(x - w * 0.12)} ${n(base - h * 0.07)}h${n(w * 0.24)}V${base}h${n(-w * 0.24)}Z`;
}
const PINES = [[30, 150], [78, 108], [122, 172], [170, 96], [206, 70]].map(([x, h]) => pine(x, 190, h)).join("");

export default function NightSky() {
  // 이 그림은 소개 화면과 메인의 소개 카드, 두 군데에 놓입니다. 별똥별의 색 이름이 겹치지 않게 그림마다 따로 짓습니다
  const shoot = `shoot${useId().replace(/[^\w-]/g, "")}`;
  return (
    <>
      <svg className="ab-stars" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={shoot} gradientUnits="userSpaceOnUse" x1="1010" y1="58" x2="884" y2="126">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} opacity={0.45 + ((i * 37) % 50) / 100} />)}
        {SPARKS.map(([x, y, s], i) => <path key={i} d={spark(x, y, s)} />)}
        <line x1="1010" y1="58" x2="884" y2="126" stroke={`url(#${shoot})`} strokeWidth="2.2" strokeLinecap="round" />
        <g className="cloud">
          <ellipse cx="1040" cy="262" rx="92" ry="20" /><ellipse cx="1104" cy="250" rx="60" ry="22" /><ellipse cx="980" cy="270" rx="56" ry="14" />
          <ellipse cx="150" cy="286" rx="70" ry="14" /><ellipse cx="204" cy="278" rx="44" ry="15" />
        </g>
      </svg>
      <svg className="ab-hills" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
        <path className="far" d="M0 66C200 18 360 30 560 60S960 96 1200 38V120H0Z" />
        <path className="mid" d="M0 88C240 52 420 96 660 86S1020 52 1200 84V120H0Z" />
      </svg>
      <svg className="ab-trees ab-l" viewBox="0 0 230 190" aria-hidden="true"><path d={PINES} /></svg>
      <svg className="ab-trees ab-r" viewBox="0 0 230 190" aria-hidden="true"><path d={PINES} /></svg>
      {/* 맨 앞의 언덕은 따로 그리지 않습니다. 그림 아래쪽을 언덕 모양으로 잘라(globals.css 의 --ab-edge) 그 아래로 페이지 바탕이 그대로 이어지게 합니다 */}
    </>
  );
}
