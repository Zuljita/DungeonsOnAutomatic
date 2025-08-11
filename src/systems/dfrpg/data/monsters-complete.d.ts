export interface RawMonster {
  Description: string;
  Class?: string;
  SM?: number | null;
  Subclass?: string;
  [key: string]: unknown;
}

declare const monsters: RawMonster[];
export default monsters;
