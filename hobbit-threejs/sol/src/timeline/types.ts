export type NarrativeCue = Readonly<{
  index: number;
  text: string;
  start: number;
  end: number;
  progressStart: number;
  progressEnd: number;
}>;
