import type { LyricsGenerateInput, LyricsProvider } from './types.ts';

const SAFE_DEFAULT_THEME = 'a bright new adventure';
const UNSAFE_THEME = /adult|sexual|色情|裸体|暴力|自杀/i;

export class TemplateLyricsProvider implements LyricsProvider {
  readonly name = 'template' as const;

  async generate(input: LyricsGenerateInput): Promise<string> {
    const theme = safeTheme(input.theme);
    const previous = input.mode === 'continue' ? `${input.lyrics!.trim()}\n\n` : '';
    return `${previous}[Verse]\n${theme} lights the way today\nWe share a hopeful melody\n\n[Chorus]\nSing along, bright and kind\nLittle dreams can soar and shine\nTogether we will find our way\nWith gentle music every day`;
  }
}

function safeTheme(theme: string | undefined): string {
  const trimmed = theme?.trim();
  return trimmed && !UNSAFE_THEME.test(trimmed) ? trimmed : SAFE_DEFAULT_THEME;
}
