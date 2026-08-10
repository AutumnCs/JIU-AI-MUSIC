import type { LyricsGenerateInput, LyricsProvider } from './types.ts';

const CHILD_SAFE_TEMPLATE = `[Verse]
A bright new adventure lights the way today
We share a hopeful melody

[Chorus]
Sing along, bright and kind
Little dreams can soar and shine
Together we will find our way
With gentle music every day`;

export class TemplateLyricsProvider implements LyricsProvider {
  readonly name = 'template' as const;

  async generate(input: LyricsGenerateInput): Promise<string> {
    void input;
    return CHILD_SAFE_TEMPLATE;
  }
}
