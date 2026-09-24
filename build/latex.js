/* ============================================================
   《剑与魔法命运编年史》美化面板渲染引擎
   严格实现 docs/设定集-续.md 附录甲 的全部规定：
     \( ... \)        数学环境包裹（禁止 $$）
     \fcolorbox{b}{bg}{内容}    完整彩色边框面板
     \colorbox{bg}{内容}        无边框色块
     \textcolor{色}{内容}       文字上色
     \begin{array}{l}..\end{array}  多行排版（行间 \\）
     \scalebox{系数}{内容}      缩放面板（防溢出）
     \rule{长}{高}              进度条实心段
     \overline{...}             分隔线
     \text{} \textbf{} \Large \normalsize \footnotesize \quad \qquad \; \bullet \#
   解析失败时原样输出源码，绝不静默吞掉内容（规定：不得省略、不得跳过）。
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 配色：严格照文档色表 ---------- */
  var THEMES = {
    gold:      { bd: '#E0B45A', ti: '#A87E2E', name: '奶金' },
    blue:      { bd: '#8FC1DE', ti: '#5E8FAE', name: '雾蓝' },
    pink:      { bd: '#E8A0BE', ti: '#C27090', name: '玫粉' },
    lav:       { bd: '#BFA3DE', ti: '#8F74B8', name: '薰衣草' },
    matcha:    { bd: '#9FCFB4', ti: '#5FA98A', name: '抹茶' },
    coral:     { bd: '#E88A80', ti: '#C05F55', name: '珊瑚' },
    orange:    { bd: '#E8AF6E', ti: '#C0863E', name: '蜜橘' },
    lightgold: { bd: '#E6C95A', ti: '#B8982E', name: '浅金' },
    grayblue:  { bd: '#8FA8CC', ti: '#5E7A9E', name: '灰蓝' },
    sand:      { bd: '#CFC4B0', ti: '#9E9078', name: '浅砂' }
  };
  var BG = { panel: '#FDF6F0', warn: '#FDEBE7', bar: '#EDE6F2', mystic: '#F4EEF9', white: '#FFFFFF' };
  var INK = { body: '#4A4458', dim: '#9A8FA8', em: '#2E2A3A' };
  var ATTR = {
    hp: '#E87A7A', joy: '#6FA8D9', int: '#D4A437', body: '#E89A5E', cha: '#E08AB0',
    soul: '#A98FD9', gold: '#D9AE4E', xp: '#7FBF9E', curse: '#C78FBE', dark: '#8E8578'
  };

  var COLORS = {
    white: '#FFFFFF', black: '#2E2A3A', gray: '#9A8FA8', grey: '#9A8FA8',
    gold: '#E0B45A', cream: '#FDF6F0', blue: '#8FC1DE', pink: '#E8A0BE',
    lav: '#BFA3DE', matcha: '#9FCFB4', coral: '#E88A80', orange: '#E8AF6E',
    lightgold: '#E6C95A', grayblue: '#8FA8CC', sand: '#CFC4B0',
    body: '#4A4458', dim: '#9A8FA8', em: '#2E2A3A'
  };
  ['#E0B45A', '#A87E2E', '#8FC1DE', '#5E8FAE', '#E8A0BE', '#C27090', '#BFA3DE', '#8F74B8',
   '#9FCFB4', '#5FA98A', '#E88A80', '#C05F55', '#E8AF6E', '#C0863E', '#E6C95A', '#B8982E',
   '#8FA8CC', '#5E7A9E', '#CFC4B0', '#9E9078', '#FDF6F0', '#FDEBE7', '#EDE6F2', '#F4EEF9',
   '#4A4458', '#9A8FA8', '#2E2A3A', '#FFFFFF', '#E87A7A', '#6FA8D9', '#D4A437', '#E89A5E',
   '#E08AB0', '#A98FD9', '#D9AE4E', '#7FBF9E', '#C78FBE', '#8E8578'
  ].forEach(function (h) { COLORS[h.toLowerCase()] = h; });

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function resolveColor(c) {
    if (!c) return null;
    var k = String(c).trim();
    return COLORS[k.toLowerCase()] || (/^#[0-9a-fA-F]{3,8}$/.test(k) ? k : null);
  }
  function themeOf(t) {
    if (!t) return THEMES.blue;
    if (typeof t === 'object') return { bd: resolveColor(t.bd) || THEMES.blue.bd, ti: resolveColor(t.ti) || THEMES.blue.ti, name: t.name || '' };
    return THEMES[t] || THEMES.blue;
  }

  /* ---------- LaTeX 子集解析器 ---------- */
  function Parser(src) {
    this.s = String(src == null ? '' : src).replace(/\r/g, '');
    this.i = 0;
    this.n = this.s.length;
  }
  Parser.prototype.eof = function () { return this.i >= this.n; };
  Parser.prototype.peek = function (k) { return this.s.substr(this.i, k || 1); };
  Parser.prototype.readIdent = function () {
    /* 解析器此刻停在反斜杠上，命令名要连反斜杠一起吃 */
    var m = /^\\?([a-zA-Z]+)/.exec(this.s.substr(this.i));
    if (!m) return null;
    this.i += m[0].length;
    return m[1];
  };
  Parser.prototype.readGroup = function () {
    while (!this.eof() && /\s/.test(this.peek())) this.i++;
    if (this.peek() !== '{') return null;
    this.i++;
    var depth = 1, start = this.i;
    while (this.i < this.n) {
      var ch = this.s[this.i];
      if (ch === '\\' && this.s[this.i + 1] === '{') { this.i += 2; depth++; continue; }
      if (ch === '\\' && this.s[this.i + 1] === '}') { this.i += 2; depth--; continue; }
      if (ch === '\\') { this.i += 2; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { var out = this.s.slice(start, this.i); this.i++; return out; } }
      this.i++;
    }
    return this.s.slice(start);
  };
  Parser.prototype.readOpt = function () {
    if (this.peek() !== '[') return null;
    var end = this.s.indexOf(']', this.i);
    if (end < 0) return null;
    var out = this.s.slice(this.i + 1, end);
    this.i = end + 1;
    return out;
  };
  /* 环境正文到配对的 \end{env} 为止（LaTeX 环境正文不是 {..} 包起来的） */
  Parser.prototype.readEnvironment = function (env) {
    var start = this.i, depth = 1;
    var endTok = '\\end{' + env + '}', begTok = '\\begin{' + env + '}';
    while (this.i < this.n) {
      var ch = this.s[this.i];
      if (ch === '\\') {
        if (this.s.substr(this.i, begTok.length) === begTok) { depth++; this.i += begTok.length; continue; }
        if (this.s.substr(this.i, endTok.length) === endTok) {
          depth--;
          if (depth === 0) { var body = this.s.slice(start, this.i); this.i += endTok.length; return body; }
          this.i += endTok.length; continue;
        }
        this.i += 2; continue;
      }
      this.i++;
    }
    this.i = this.n;
    return this.s.slice(start);
  };

  /* 解析为 token 序列；ctx.color 会向下传递，让分隔线与进度条继承外层颜色 */
  Parser.prototype.parse = function (ctx) {
    ctx = ctx || {};
    var out = [], buf = '';
    var self = this;
    function flush() { if (buf) { out.push({ t: 'text', v: buf, color: ctx.color, size: ctx.size, strong: ctx.strong }); buf = ''; } }
    function push(tok) { if (ctx.color && !tok.color) tok.color = ctx.color; out.push(tok); }

    while (!this.eof()) {
      var ch = this.peek();
      if (ch === '\\') {
        var nx = this.peek(2);
        if (nx === '\\\\') { this.i += 2; flush(); out.push({ t: 'break' }); continue; }
        if ('{}&%_$#'.indexOf(nx[1]) >= 0) { this.i += 2; buf += nx[1]; continue; }
        if (nx[1] === ',' || nx[1] === ';' || nx[1] === ':' || nx[1] === '!') { this.i += 2; buf += ' '; continue; }
        if (nx === '\\(') { this.i += 2; continue; }   /* 规定分隔符，丢弃 */
        if (nx === '\\)') { this.i += 2; continue; }

        var save = this.i;
        var name = this.readIdent();
        if (name === null) { buf += ch; this.i++; continue; }

        switch (name) {
          case 'text': case 'mathrm': case 'mathbf': case 'mathit': case 'mathsf': {
            var g = this.readGroup();
            var sub = new Parser(g == null ? '' : g).parse(ctx);
            out.push.apply(out, sub);
            break;
          }
          case 'mathbb': {
            var gm = this.readGroup();
            push({ t: 'text', v: gm || '', math: true });
            break;
          }
          case 'frac': {
            var a = this.readGroup(), b = this.readGroup();
            push({ t: 'text', v: (a || '') + '/' + (b || ''), math: true });
            break;
          }
          case 'textcolor': {
            var col = resolveColor(this.readGroup());
            var body = this.readGroup();
            var c2 = {}; for (var kk in ctx) c2[kk] = ctx[kk];
            c2.color = col;
            out.push.apply(out, new Parser(body == null ? '' : body).parse(c2));
            break;
          }
          case 'colorbox': {
            var bgc = resolveColor(this.readGroup());
            var ib = this.readGroup();
            out.push({ t: 'chip', bg: bgc, kids: new Parser(ib == null ? '' : ib).parse(ctx) });
            break;
          }
          case 'fcolorbox': {
            var bd = resolveColor(this.readGroup());
            var bg2 = resolveColor(this.readGroup());
            var inner = new Parser(this.readGroup() || '').parse({ color: ctx.color });
            push({ t: 'box', border: bd, bg: bg2, kids: inner });
            break;
          }
          case 'scalebox': {
            var f = parseFloat(this.readGroup());
            var body2 = this.readGroup();
            push({ t: 'scale', f: (isFinite(f) && f > 0 ? f : 1), kids: new Parser(body2 == null ? '' : body2).parse(ctx) });
            break;
          }
          case 'overline': {
            var orn = this.readGroup() || '';
            var q = (orn.match(/\\qquad/g) || []).length, q1 = (orn.match(/\\quad/g) || []).length;
            var em = q * 4 + q1 * 2;
            flush();
            push({ t: 'rule', em: em > 0 ? em : 0 });
            break;
          }
          case 'rule': {
            var w = this.readGroup() || '1em', h = this.readGroup() || '1ex';
            push({ t: 'bar', w: String(w).trim(), h: String(h).trim() });
            break;
          }
          case 'begin': {
            var env = (this.readGroup() || '').trim();
            if (env === 'array' || env === 'tabular') {
              this.readOpt();
              var colspec = this.readGroup();
              var inner3 = this.readEnvironment(env);
              out.push({ t: 'array', cols: colspec, kids: new Parser(inner3).parse({ align: 'col', color: ctx.color }) });
            } else {
              var raw = this.readEnvironment(env);
              out.push.apply(out, new Parser(raw).parse(ctx));
            }
            break;
          }
          case 'end': {
            var e2 = this.readGroup();
            push({ t: 'text', v: '\\end{' + (e2 || '') + '}' });
            break;
          }
          case 'quad': buf += '\u2003\u2003'; break;
          case 'qquad': buf += '\u2003\u2003\u2003\u2003'; break;
          case 'hspace': case 'hskip': { this.readGroup(); buf += '\u2003'; break; }
          case 'vspace': { this.readGroup(); flush(); out.push({ t: 'break' }); break; }
          case 'bullet': buf += '\u00b7'; break;
          case 'hline': flush(); push({ t: 'rule', em: 0 }); break;
          case 'centering': break;
          case 'Large': case 'large': case 'huge': case 'Huge':
            flush(); ctx.size = 'big'; break;
          case 'small': case 'footnotesize': case 'scriptsize':
            flush(); ctx.size = 'small'; break;
          case 'normalsize':
            flush(); ctx.size = null; break;
          case 'textbf': case 'bfseries': case 'bf': {
            var gb = this.readGroup();
            if (gb != null) {
              var cc = {}; for (var k3 in ctx) cc[k3] = ctx[k3];
              cc.strong = true;
              out.push.apply(out, new Parser(gb).parse(cc));
            } else { ctx.strong = true; }
            break;
          }
          case 'emph': case 'textit': {
            var gi = this.readGroup();
            var ci = {}; for (var k4 in ctx) ci[k4] = ctx[k4];
            ci.italic = true;
            out.push.apply(out, new Parser(gi == null ? '' : gi).parse(ci));
            break;
          }
          case 'displaystyle': case 'limits': case 'nolimits': case 'left': case 'right': break;
          case ' ': buf += ' '; break;
          case '!': break;
          default:
            /* 未知命令：原样输出，不吞内容 */
            this.i = save;
            buf += this.s[this.i];
            this.i++;
            break;
        }
        continue;
      }
      if (this.peek(2) === '$$') { this.i += 2; continue; }   /* 规定禁止，但容错丢弃 */
      if (ch === '$') { this.i++; continue; }
      if (ch === '~') { this.i++; buf += '\u00a0'; continue; }
      buf += ch;
      this.i++;
    }
    flush();
    return out;
  };

  /* ---------- token 序列 -> HTML ---------- */
  function spanOpen(t) {
    var st = [];
    if (t.color) st.push('color:' + t.color);
    if (t.strong) st.push('font-weight:700');
    if (t.italic) st.push('font-style:italic');
    if (t.math) st.push('font-family:Cambria,\'Times New Roman\',serif');
    return st.length ? '<span style="' + st.join(';') + '">' : '<span>';
  }

  function renderSeq(seq, ctx) {
    ctx = ctx || {};
    var html = '', lineOpen = false;

    function openLine() {
      if (lineOpen) return;
      html += '<div class="pl-line' + (ctx.align === 'col' ? ' pl-row' : '') + '">';
      lineOpen = true;
    }
    function closeLine() { if (lineOpen) { html += '</div>'; lineOpen = false; } }

    for (var k = 0; k < seq.length; k++) {
      var t = seq[k];
      switch (t.t) {
        case 'text': {
          openLine();
          var span = spanOpen(t) + esc(t.v) + '</span>';
          if (t.size === 'big') span = '<span class="pl-big">' + span + '</span>';
          else if (t.size === 'small') span = '<span class="pl-small">' + span + '</span>';
          html += span;
          break;
        }
        case 'break':
          if (lineOpen) { closeLine(); }
          ctx.size = null;          /* 字号随行结束复位，避免整块被一行 \Large 带大 */
          break;
        case 'rule': {
          closeLine();
          var style = t.color ? ' style="border-top-color:' + t.color + (t.em ? ';width:' + t.em + 'em' : '') + '"'
                              : (t.em ? ' style="width:' + t.em + 'em"' : '');
          html += '<div class="pl-rule"' + style + '></div>';
          break;
        }
        case 'bar': {
          openLine();
          var bgc = t.color || ATTR.hp;
          html += '<span class="pl-bar" style="width:' + esc(t.w) + ';height:' + esc(t.h) + ';background:' + bgc + '"></span>';
          break;
        }
        case 'chip': {
          openLine();
          html += '<span class="pl-chip" style="background:' + (t.bg || BG.bar) + '">' +
                  renderSeq(t.kids, { align: 'inline' }) + '</span>';
          break;
        }
        case 'scale': {
          closeLine();
          html += '<div class="pl-scale" style="--sc:' + t.f + '">' + renderSeq(t.kids, { align: 'col' }) + '</div>';
          break;
        }
        case 'box': {
          closeLine();
          var bd = t.border || THEMES.blue.bd;
          html += '<div class="pl-box" style="border-color:' + bd + ';background:' + (t.bg || BG.panel) + '">' +
                  renderSeq(t.kids, { align: 'col' }) + '</div>';
          break;
        }
        case 'array': {
          closeLine();
          html += '<div class="pl-array">' + renderSeq(t.kids, { align: 'col' }) + '</div>';
          break;
        }
        default: break;
      }
    }
    closeLine();
    return html;
  }

  function latexToHtml(src) {
    try {
      var seq = new Parser(String(src)).parse({});
      if (!seq.length) return '<div class="pl-line">' + esc(src) + '</div>';
      return renderSeq(seq, {});
    } catch (e) {
      return '<div class="pl-line">' + esc(src) + '</div>';
    }
  }

  var RE_LATEX = /\\\(|\\fcolorbox|\\colorbox|\\textcolor|\\begin\{array\}|\\scalebox|\\overline|\\rule\{/;
  function looksLikeLatex(s) { return RE_LATEX.test(String(s)); }

  /* 混合文本渲染：普通剧情文字 + \(...\) 面板，一次成型。
     文档禁止用 $$...$$ 包面板；若真的出现且里面是 LaTeX 命令，也照样渲染，
     但玩家自己打的 $$ 文本原样保留（文字只增不减、不改写玩家输入）。 */
  function renderMixed(src) {
    var s = String(src == null ? '' : src);
    var out = '', i = 0;
    while (i < s.length) {
      var a1 = s.indexOf('\\(', i), a2 = s.indexOf('$$', i);
      var a = -1, delim = 0;
      if (a1 >= 0 && (a2 < 0 || a1 < a2)) { a = a1; delim = 1; }
      else if (a2 >= 0) { a = a2; delim = 2; }
      if (a < 0) { out += textBlock(s.slice(i)); break; }
      var close = delim === 1 ? s.indexOf('\\)', a + 2) : s.indexOf('$$', a + 2);
      var inner = close < 0 ? '' : s.slice(a + 2, close);
      if (close < 0 || (delim === 2 && inner.indexOf('\\') < 0)) {
        var step = (close < 0) ? s.length : close + 2;
        out += textBlock(s.slice(i, step));
        i = step;
        continue;
      }
      out += textBlock(s.slice(i, a));
      out += panel(latexToHtml(inner));
      i = close + 2;
    }
    return out;
  }
  function textBlock(txt) {
    var t = String(txt).replace(/^\s*\n/, '').replace(/\n\s*$/, '');
    if (!t.trim()) return '';
    var paras = t.split(/\n{2,}/);
    return paras.map(function (p) {
      var lines = p.split('\n');
      return '<p class="tx">' + lines.map(function (l) {
        return esc(l).replace(/^\s+/, function (m) { return m.replace(/ /g, '\u00a0'); });
      }).join('<br>') + '</p>';
    }).join('');
  }
  function panel(inner, opts) {
    opts = opts || {};
    var cls = 'panel' + (opts.cls ? ' ' + opts.cls : '');
    return '<div class="' + cls + '">' + inner + '</div>';
  }

  /* ---------- 面板代码生成器（严格照文档骨架） ---------- */
  function boxCode(bd, bg, lines, scale) {
    var body = lines.filter(function (x) { return x != null; }).join(' \\\\\n');
    return '\\(\\fcolorbox{' + bd + '}{' + bg + '}{\\scalebox{' + (scale || 0.8) + '}{\\begin{array}{l}\n' +
           body + '\n\\end{array}}}\\)';
  }
  /* 通用面板：title + lines + foot，主题自动配色 */
  function mkPanel(opt) {
    var th = themeOf(opt.theme);
    var bg = opt.bg || BG.panel;
    var lines = [];
    if (opt.title) {
      lines.push('\\textcolor{' + th.ti + '}{\\textbf{\\Large ' + opt.title + '}}');
      lines.push('\\textcolor{' + th.bd + '}{\\overline{\\qquad\\qquad\\qquad\\qquad\\qquad\\qquad}}');
    }
    (opt.lines || []).forEach(function (l) { lines.push(l); });
    if (opt.foot) {
      lines.push('\\textcolor{' + th.bd + '}{\\overline{\\qquad\\qquad\\qquad\\qquad\\qquad\\qquad}}');
      lines.push('\\textcolor{' + INK.dim + '}{\\footnotesize ' + opt.foot + '}');
    }
    return boxCode(th.bd, bg, lines, opt.scale || 0.8);
  }
  function txt(v, color) { return '\\textcolor{' + (color || INK.body) + '}{' + v + '}'; }
  function strong(v, color) { return '\\textcolor{' + (color || INK.em) + '}{\\textbf{' + v + '}}'; }
  function kv(k, v, kc, vc) {
    return txt(k + '：', kc || INK.dim) + txt(v, vc || INK.body);
  }
  /* 进度条：总长 4.5em = 满值；前段当前值 + 后段底色 */
  function bar(cur, max, color) {
    var total = 4.5;
    var r = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
    var w1 = (total * r).toFixed(2), w2 = (total - total * r).toFixed(2);
    return '\\textcolor{' + (color || ATTR.hp) + '}{\\rule{' + w1 + 'em}{1ex}}' +
           '\\textcolor{' + BG.bar + '}{\\rule{' + w2 + 'em}{1ex}}';
  }
  function barRow(label, cur, max, color) {
    return txt(label, INK.body) + '\\quad ' + bar(cur, max, color) + '\\quad ' +
           txt(Math.round(cur) + ' / ' + Math.round(max), color || INK.body);
  }
  function rule(color, n) { return '\\textcolor{' + (color || THEMES.blue.bd) + '}{\\overline{' + '\\qquad'.repeat(n || 6) + '}}'; }
  function size(v, n) { return '\\' + (n || 'footnotesize') + ' ' + v; }
  /* 选项气泡：a 雾蓝 / b 玫粉 / c 奶金 / d 薰衣草 / e 浅砂；
     选项多于五个（建卡与选择地区时按文档数量列出）就按色序循环，字母照排。 */
  var CYCLE = ['blue', 'pink', 'gold', 'lav', 'sand', 'matcha', 'orange', 'lightgold', 'coral', 'grayblue'];
  function themeFor(k) {
    var s = String(k == null ? '' : k).toLowerCase();
    if (s.length === 1 && s >= 'a' && s <= 'z') return CYCLE[(s.charCodeAt(0) - 97) % CYCLE.length];
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return CYCLE[h % CYCLE.length];
  }
  function bubble(k, label) {
    var th = themeOf(themeFor(k));
    return '\\(\\scalebox{0.85}{\\fcolorbox{' + th.bd + '}{' + BG.panel + '}{\\textbf{' +
           '\\textcolor{' + INK.body + '}{\\normalsize \\;【' + String(k).toUpperCase() + '】\\; ' +
           label + ' \\;}}}}\\)';
  }
  function options(list) {
    return (list || []).map(function (o) { return bubble(o.k, o.label != null ? o.label : o); }).join('\n');
  }

  var MOD = {
    THEMES: THEMES, BG: BG, INK: INK, ATTR: ATTR, COLORS: COLORS,
    esc: esc, resolveColor: resolveColor, themeOf: themeOf,
    Parser: Parser, renderSeq: renderSeq, latexToHtml: latexToHtml, looksLikeLatex: looksLikeLatex,
    renderMixed: renderMixed, panel: panel, textBlock: textBlock,
    boxCode: boxCode, mkPanel: mkPanel, txt: txt, strong: strong, kv: kv,
    bar: bar, barRow: barRow, rule: rule, size: size, bubble: bubble, options: options, themeFor: themeFor
  };
  global.LTX = MOD;
})(window);
