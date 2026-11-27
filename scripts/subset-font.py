"""按站点实际用字裁剪中文字体。

用法：python scripts/subset-font.py
- 读取 dist/ 下所有 HTML 的可见文本与属性，加上 ASCII 与常用标点，生成字符集；
- 用 fontTools 生成 woff2 子集，覆盖到 src/assets/fonts/NotoSansSC-subset.woff2。

笔记新增生僻字后重新执行一次即可；字体缺失的字会自动回落到系统字体。
"""
import glob
import html
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src/assets/fonts/NotoSansSC-full.woff2'
OUT = ROOT / 'src/assets/fonts/NotoSansSC-subset.woff2'

def main():
    source = SRC if SRC.exists() else OUT
    chars = set(chr(c) for c in range(0x20, 0x7F))
    chars.update('　、。！？：；「」『』（）【】《》〈〉—…·×÷≈≠≤≥←→↑↓↗↘✦☾☀⌕✓✗§¶†‡•‰′″€£¥©®™°±')
    for p in glob.glob(str(ROOT / 'dist/**/*.html'), recursive=True):
        text = pathlib.Path(p).read_text(encoding='utf-8')
        text = re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>', ' ', text)
        chars.update(html.unescape(text))
    chars.discard('\n'); chars.discard('\r'); chars.discard('\t')
    chars = {c for c in chars if c.strip()}
    charfile = ROOT / '.font-chars.txt'
    charfile.write_text(''.join(sorted(chars)), encoding='utf-8')
    before = source.stat().st_size
    subprocess.run([sys.executable, '-m', 'fontTools.subset', str(source),
                    f'--text-file={charfile}', '--flavor=woff2',
                    '--layout-features=*', '--no-hinting', '--desubroutinize',
                    f'--output-file={OUT}'], check=True)
    charfile.unlink()
    after = OUT.stat().st_size
    print(f'chars={len(chars)}  {before/1024:.0f}KB -> {after/1024:.0f}KB  ({OUT.relative_to(ROOT)})')

if __name__ == '__main__':
    main()
