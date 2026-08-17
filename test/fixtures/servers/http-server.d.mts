/** Types for the hand-written HTTP fixture server. */
export type FixtureMode = 'legacy' | 'modern' | 'strict-params' | 'strict-headers';

export interface HttpFixture {
  url: string;
  close(): Promise<void>;
}

export function startHttpFixture(mode: FixtureMode): Promise<HttpFixture>;
