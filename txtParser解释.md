# 计算token数的函数的代码在rag/utils/__init__.py路径下

encoder = tiktoken.get_encoding("cl100k_base")
# 使用"gpt-3.5-turbo"或"gpt-4"对于纯文本效果更好

def num_tokens_from_string(string: str) -> int:
    """Returns the number of tokens in a text string."""
    try:
        return len(encoder.encode(string))
    except Exception:
        return 0

# 以下是txtParser中内容

import re

from deepdoc.parser.utils import get_text
from rag.nlp import num_tokens_from_string
# 逆天import ，最初的起源很难找，可以通过github自带的点击后显示Definition位置找到


class RAGFlowTxtParser:
    def __call__(self, fnm, binary=None, chunk_token_num=128, delimiter="\n!?;。；！？"):
# 下面这个函数将二进制数据转化为字符串
        txt = get_text(fnm, binary)
        return self.parser_txt(txt, chunk_token_num, delimiter)

# 下面这个是装饰器，表示是类方法
    @classmethod
    def parser_txt(cls, txt, chunk_token_num=128, delimiter="\n!?;。；！？"):
# 如果txt变量不是字符串，报错
        if not isinstance(txt, str):
            raise TypeError("txt type should be str!")
        cks = [""]
        tk_nums = [0]

# 以下是逆天定义函数内局部函数
        def add_chunk(t):
            nonlocal cks, tk_nums, delimiter
            tnum = num_tokens_from_string(t)
            if tk_nums[-1] > chunk_token_num:
                cks.append(t)
                tk_nums.append(tnum)
            else:
                cks[-1] += t
                tk_nums[-1] += tnum
# 下面这个列表是用来提取并转义 delimiter 中的所有分隔符，并将它们保存到 dels 中
        dels = []
        s = 0
# m是finditer前两个参数匹配的结果，re.I表示忽略大小写
# 实际上通过extend那一行代码把所有delimiter放入dels列表
# 神秘地对于反引号内部的分割符进行提取处理
# 也许是不允许反引号作为分隔符
        for m in re.finditer(r"`([^`]+)`", delimiter, re.I):
# m.span()是匹配到的内容的左闭右开区间
            f, t = m.span()
# m.group(1)只有捕获组有（finditer第一个参数有括号的）
            dels.append(m.group(1))
            dels.extend(list(delimiter[s: f]))
            s = t
# 下一行也是很明显地让所有delimiter放入dels的补救措施
        if s < len(delimiter):
            dels.extend(list(delimiter[s:]))
        dels = [re.escape(d) for d in delimiter if d]
        dels = [d for d in dels if d]
        dels = "|".join(dels)
        secs = re.split(r"(%s)" % dels, txt)
        for sec in secs:
            add_chunk(sec)

        return [[c, ""] for c in cks]
