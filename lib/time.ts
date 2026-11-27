// 시간 화면과 메인이 같이 쓰는 것들: 하루를 칸으로 나누는 방법, 영역의 색, 하루치 기록을 묶는 계산
import type { TimeTask } from "./data";
import { p2, type Area } from "./util";

export const START = 4; // 하루가 시작하는 시각 (새벽 4시부터 다음 날 새벽 3시까지)
export const PER = 6; // 한 시간을 10분씩 여섯 칸으로
export const ALL = 24 * PER; // 하루의 칸 수
export const NEXT = (24 - START) * PER; // 이 칸부터는 다음 날 새벽입니다
export const GREEN = "#5FCB8E", YELLOW = "#FFC533", BLUE = "#8FB8F0", RED = "#FF8F8F", GRAY = "#B9C0C8";
export const COLORS = [GREEN, YELLOW, BLUE, RED, GRAY];
// 계획 탭의 영역 이름마다 정해 둔 색. 영역 이름을 바꾸면 여기도 같이 바꿔 주세요.
export const AREA_COLORS: Record<string, string> = {
  "건강관리": GREEN,
  "꾸준한성장": YELLOW,
  "경제적성장": BLUE,
  "자기계발": RED,
};
export const areaColor = (name: string) => AREA_COLORS[name.replace(/\s/g, "")] ?? GRAY;
// 색의 이름은 그 색을 쓰는 영역의 이름입니다. 회색과 주인 없는 색은 기타
export const colorName = (color: string, areas: Area[]) => (color === GRAY ? "기타"
  : areas.find((a) => areaColor(a.name) === color)?.name || Object.keys(AREA_COLORS).find((k) => AREA_COLORS[k] === color) || "기타");
// 집중 시간으로 세는 영역. 이 영역의 색으로 적은 시간을 집중 시간으로 봅니다
export const FOCUS_AREA = "자기계발", FOCUS = areaColor(FOCUS_AREA);

export const fmt = (cells: number) => {
  const h = Math.floor(cells / PER), m = (cells % PER) * 10;
  return h ? `${h}시간${m ? ` ${m}분` : ""}` : `${m}분`;
};
export const hourOf = (i: number) => (START + Math.floor(i / PER)) % 24;
export const clock = (i: number) => `${p2(hourOf(i))}:${p2((i % PER) * 10)}`; // 칸 번호를 07:30 같은 시각으로

// 하루치 기록에서 집중 시간으로 세는 칸의 수 (집중 영역의 색으로 적은 칸)
export function focusCells(tasks: TimeTask[], slots: Record<string, string>) {
  const focus = new Set(tasks.filter((t) => t.color === FOCUS).map((t) => t.id));
  return Object.values(slots).filter((id) => focus.has(id)).length;
}

export type Block = { id: string; from: number; len: number }; // 같은 일로 이어진 칸 한 덩어리
// 하루치 기록을 그리기 좋게 정리합니다: 칸마다 어느 일인지(at), 일마다 쓴 칸 수(totals), 모두 쓴 칸 수(used),
// 같은 일로 이어진 덩어리(blocks). 지워진 일을 가리키는 칸은 빈칸으로 봅니다
export function dayLayout(tasks: TimeTask[], slots: Record<string, string>) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const at = (i: number) => (byId.has(slots[i]) ? slots[i] : "");
  const totals = new Map<string, number>(), blocks: Block[] = [];
  let used = 0;
  for (let i = 0; i < ALL; ) {
    const id = at(i); let e = i + 1;
    if (id) {
      while (e < ALL && at(e) === id) e++;
      blocks.push({ id, from: i, len: e - i });
      totals.set(id, (totals.get(id) ?? 0) + e - i); used += e - i;
    }
    i = e;
  }
  return { byId, at, totals, used, blocks };
}
