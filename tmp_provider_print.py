from pathlib import Path
lines=Path('lib/ai/provider.ts').read_text(encoding='utf-8').splitlines()
for i,line in enumerate(lines[70:130], start=71):
    print(f'{i}: {line}')
