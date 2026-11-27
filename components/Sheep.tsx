// 옆줄 아래쪽의 그림: 문구 두 줄과 반짝이는 별, 언덕 위의 양 한 마리. 선으로만 직접 그렸습니다.
// 꾸밈이라 화면 읽기 프로그램에는 읽히지 않게 합니다. 놓이는 자리와 색은 globals.css 의 "틀" 부분(.side-art)에 있습니다
export default function Sheep() {
  return (
    <div className="side-art" aria-hidden="true">
      <p>지금, 더 나은<br />내일을 위한 기록</p>
      {/* 네 갈래로 반짝이는 별 */}
      <svg className="twinkle" viewBox="0 0 24 24"><path d="M12 2Q12 12 22 12Q12 12 12 22Q12 12 2 12Q12 12 12 2Z" /></svg>
      <svg className="sheep" viewBox="0 0 160 96">
        {/* 언덕, 다리 넷, 몽실한 몸, 얼굴(몸의 선을 가리도록 바탕색으로 채웁니다), 귀와 눈 */}
        <path d="M6 92Q70 70 154 64" />
        <path d="M62 63v13M70 65v10M84 65v8M91 62v9.5" />
        <path d="M48 52a8 8 0 0 1 4-14a9 9 0 0 1 14-7a10 10 0 0 1 17-1a9 9 0 0 1 13 7a8 8 0 0 1 2 15a8 8 0 0 1-9 9a10 10 0 0 1-16 2a10 10 0 0 1-15-1a8 8 0 0 1-10-10z" />
        <ellipse className="face" cx="101" cy="42" rx="8.5" ry="7.5" />
        <path d="M95 37c-2-3-5.5-2-5 .5" />
        <circle className="eye" cx="99" cy="41.5" r="1" />
        <circle className="eye" cx="104" cy="41.5" r="1" />
      </svg>
    </div>
  );
}
