import Link from "next/link";
import Knot from "./Knot";

export default function About({ loggedOut }: { loggedOut?: boolean }) {
  const to = (href: string) => (loggedOut ? "/login" : href);
  return (
    <section>
      <div className="ab-hero">
        <Knot className="ab-knot" draw />
        <h1>Sheepshank</h1>
        <p className="ab-tag">팽팽할 때만 버티는 매듭</p>
        <p className="ab-lead">
          십생크는 줄을 자르지 않고 길이를 줄이는 매듭입니다. 줄이 팽팽할 때는 단단히 버티고, 느슨해지면 스르륵 풀립니다.
          되고 싶은 나까지의 거리도 그렇습니다. 매일 조금씩 당겨 두어야 줄어듭니다.
        </p>
        <p className="ab-cta">
          {loggedOut ? (
            <Link className="btn primary" href="/login">로그인하고 시작하기</Link>
          ) : (
            <>
              <Link className="btn primary" href="/">오늘 시작하기</Link>
              <Link className="btn" href="/plan">계획부터 세우기</Link>
            </>
          )}
        </p>
      </div>

      <section className="blk">
        <h2>이렇게 이어집니다</h2>
        <ol className="ab-flow">
          <li><b>계획</b><p>되고 싶은 날의 나를 가운데에 두고, 영역별로 할 일을 적습니다. 그중 가장 중요한 일에 별표를 누르면 매일 지킬 일이 됩니다.</p><Link href={to("/plan")}>계획 열기</Link></li>
          <li><b>노트</b><p>하루가 한 줄입니다. 그날 기억할 한 줄을 적고, 지킨 일에 X를 긋습니다. 옆에 실천 그래프가 저절로 그려집니다.</p><Link href={to("/note")}>노트 열기</Link></li>
          <li><b>모멘텀</b><p>마음이 엉킨 날에는 글로 풀어 매듭짓습니다. 쏟아내고, 알아주고, 가르치는 세 단계로 씁니다.</p><Link href={to("/momentum")}>모멘텀 열기</Link></li>
          <li><b>메인</b><p>오늘의 한 줄과 지킬 일, 이번 달 그래프와 영역별 실천율을 한 화면에서 봅니다. 매일 여기서 시작하면 됩니다.</p><Link href={to("/")}>메인 열기</Link></li>
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

      <p className="ab-note">적은 한 줄과 일기는 본인만 볼 수 있게 저장됩니다.</p>
    </section>
  );
}
