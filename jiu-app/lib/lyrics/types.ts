export type LyricsMode = 'write' | 'continue';

export type LyricsGenerateInput = {
  mode: LyricsMode;
  theme?: string;
  lyrics?: string;
  genre?: string;
  mood?: string;
};

export type LyricsProviderName = 'ark' | 'template';

export interface LyricsProvider {
  readonly name: LyricsProviderName;
  generate(input: LyricsGenerateInput): Promise<string>;
}

export type LyricsGeneration = {
  lyrics: string;
  provider: LyricsProviderName;
};
