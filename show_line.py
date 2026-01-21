import itertools
with open('hooks/use-locale.tsx','r',encoding='utf-8') as f:
    for idx,line in enumerate(f,1):
        if idx == 96:
            print(repr(line))
