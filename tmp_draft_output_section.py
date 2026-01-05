from pathlib import Path
lines=Path('components/draft-output.tsx').read_text(encoding='utf-8').splitlines()
for i,line in enumerate(lines[40:120], start=41):
    print(f'{i}: {line}')
