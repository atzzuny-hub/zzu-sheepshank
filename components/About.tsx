import Link from "next/link";
import Knot from "./Knot";
import NightSky from "./NightSky";
import Icon, { type IconName } from "./Icons";

// 화면이 이어지는 순서. 카드에는 짧은 한 줄(line)을, 아래 사용 가이드에는 자세한 설명(guide)을 씁니다
const FLOW: { href: string; icon: IconName; name: string; line: string; guide: string }[] = [
  { href: "/plan", icon: "plan", name: "계획", line: "되고 싶은 나를 그려요",
    guide: "되고 싶은 날의 나를 정하고, 영역별로 할 일을 적습니다. 그중 가장 중요한 일에 별표를 누르면 매일 지킬 일이 됩니다." },
  { href: "/note", icon: "note", name: "노트", line: "하루를 기록하고 돌아봐요",
    guide: "하루가 한 줄입니다. 그날 기억할 한 줄을 적고, 지킨 일에 X를 긋습니다. 폰에서는 달력으로, 넓은 화면에서는 한 달 표와 실천 그래프로 봅니다." },
  { href: "/momentum", icon: "momentum", name: "모멘텀", line: "마음을 비우고 정리해요",
    guide: "마음이 엉킨 날에는 글로 풀어 매듭짓습니다. 쏟아내고, 알아주고, 가르치는 세 단계로 씁니다." },
  { href: "/time", icon: "time", name: "시간", line: "하루를 어떻게 썼는지 적어요",
    guide: "한 일마다 시작 시각과 길이를 남기면 무엇에 얼마나 썼는지 보입니다. 계획의 지킬 일을 불러와 적으면 그 일의 체크도 같이 됩니다." },
  { href: "/", icon: "home", name: "메인", line: "오늘의 실천을 한눈에 봐요",
    guide: "오늘의 한 줄과 지킬 일, 이번 달 그래프와 영역별 실천율을 한 화면에서 봅니다. 매일 여기서 시작하면 됩니다." },
];

export default function About({ loggedOut }: { loggedOut?: boolean }) {
  const to = (href: string) => (loggedOut ? "/login" : href);
  return (
    <section>
      <div className="ab-hero">
        {/* 밤하늘 그림 위에 로고와 문구를 가운데로 올립니다. 그림이 어두워서 글자색은 테마와 상관없이 밝게 고정합니다 */}
        <div className="ab-sky">
          <NightSky />
          <div className="ab-brand"><Knot className="ab-knot" draw /><h1>Sheepshank</h1></div>
          <p className="ab-tag">지금, 더 나은 내일을 위한 기록</p>
          {/* 넓은 화면에서는 네 줄로 끊고, 폰에서는 이어서 흐르게 합니다 */}
          <p className="ab-lead">
            <span>Sheepshank는 </span><span>오늘을 기록하고, 내일을 준비하며, </span>
            <span>조금 더 나은 방향으로 나아가도록 돕는 </span><span>개인 성장 기록 서비스입니다.</span>
          </p>
        </div>
        <p className="ab-cta">
          <Link className="btn primary" href={loggedOut ? "/login" : "/"}>{loggedOut ? "로그인하고 시작하기" : "오늘 시작하기"}<Icon name="play" /></Link>
          <a className="btn" href="#guide">사용 가이드<Icon name="book" /></a>
        </p>
      </div>

      <section className="ab-sec">
        <h2>이렇게 이어집니다</h2>
        <ol className="ab-cards">
          {FLOW.map((f) => (
            <li key={f.href}>
              <Link href={to(f.href)}><Icon name={f.icon} /><b>{f.name}</b><span>{f.line}</span></Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="blk" id="guide">
        <h2>사용 가이드 <small>화면마다 하는 일</small></h2>
        <ol className="ab-flow">
          {FLOW.map((f) => (
            <li key={f.href}><b>{f.name}</b><p>{f.guide}</p><Link href={to(f.href)}>{f.name} 열기</Link></li>
          ))}
        </ol>
      </section>

      <section className="blk">
        <h2>모멘텀 글쓰기 <small>세 사람이 되어 차례로 씁니다</small></h2>
        <div className="ab-roles">
          <div><b>내면아이</b><h3>쏟아내기</h3><p>15분 동안 멈추지 않고 안에 있는 말을 다 적습니다. 순서도 표현도 신경 쓰지 않고 날것 그대로 적습니다.</p></div>
          <div><b>친구</b><h3>알아주기</h3><p>쏟아낸 글을 따라 쓰며 그 마음을 알아줍니다. 고치거나 판단하지 않고 “그랬구나”까지만 합니다.</p></div>
          <div><b>현자</b><h3>가르치기</h3><p>마음을 바르게 고쳐먹고, 오늘 일을 지혜롭게 매듭짓는 결론까지 씁니다. 물음표로 끝내지 않습니다.</p></div>
        </div>
      </section>

      <section className="blk">
        <h2>이름의 뜻 <small>팽팽할 때만 버티는 매듭</small></h2>
        <p className="ab-story">
          십생크는 줄을 자르지 않고 길이를 줄이는 매듭입니다. 줄이 팽팽할 때는 단단히 버티고, 느슨해지면 스르륵 풀립니다.
          되고 싶은 나까지의 거리도 그렇습니다. 매일 조금씩 당겨 두어야 줄어듭니다.
        </p>
      </section>

      <p className="ab-note">적은 한 줄과 일기는 본인만 볼 수 있게 저장됩니다.</p>
    </section>
  );
}
