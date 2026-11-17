import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface RichContentRendererProps {
  content: string;
  className?: string;
}

export const RichContentRenderer: React.FC<RichContentRendererProps> = ({
  content,
  className = '',
}) => {
  // 스포일러 블록들의 노출 상태를 개별적으로 관리 (index 기반)
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<number, boolean>>({});

  const toggleSpoiler = (index: number) => {
    setRevealedSpoilers((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // 1단계: 스포일러 태그 [스포일러]...[/스포일러] 또는 ||...|| 추출 및 파싱
  const renderParagraph = (text: string, pIndex: number) => {
    // 스포일러 정규식
    const spoilerRegex = /\[스포일러\]([\s\S]*?)\[\/스포일러\]|\|\|([\s\S]*?)\|\|/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let spoilerCount = 0;

    while ((match = spoilerRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      // 스포일러 앞부분 텍스트
      if (matchIndex > lastIndex) {
        parts.push(renderInlineFormatting(text.substring(lastIndex, matchIndex), `${pIndex}-${lastIndex}`));
      }

      const spoilerContent = match[1] || match[2] || '';
      const currentSpoilerId = pIndex * 1000 + spoilerCount;
      const isRevealed = !!revealedSpoilers[currentSpoilerId];

      parts.push(
        <span
          key={`sp-${currentSpoilerId}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleSpoiler(currentSpoilerId);
          }}
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 rounded cursor-pointer transition-all select-none ${
            isRevealed
              ? 'bg-indigo-950/70 border border-indigo-500/50 text-indigo-200'
              : 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400'
          }`}
          title={isRevealed ? '클릭하여 다시 가리기' : '클릭하여 스포일러 내용 확인'}
        >
          {isRevealed ? (
            <>
              <EyeOff size={12} className="text-indigo-400 shrink-0" />
              <span className="font-sans text-slate-100">{renderInlineFormatting(spoilerContent, `sp-in-${currentSpoilerId}`)}</span>
            </>
          ) : (
            <>
              <Eye size={12} className="text-amber-400 shrink-0 animate-pulse" />
              <span className="text-xs font-semibold text-amber-300">스포일러 (클릭하여 확인)</span>
            </>
          )}
        </span>
      );

      spoilerCount++;
      lastIndex = spoilerRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(renderInlineFormatting(text.substring(lastIndex), `${pIndex}-${lastIndex}`));
    }

    return parts;
  };

  // 인라인 서식 (굵게, 밑줄, 취소선, 기울임, 인라인 코드, 링크, 이미지)
  const renderInlineFormatting = (raw: string, keyPrefix: string): React.ReactNode => {
    // 간단한 분할 파서
    const tokens = raw.split(/(\*\*.*?\*\*|<u>.*?<\/u>|~~.*?~~|\*.*?\*|`.*?`|!\[.*?\]\(.*?\) |\[.*?\]\(.*?\))/g);

    return tokens.map((token, idx) => {
      const key = `${keyPrefix}-${idx}`;

      // 이미지 ![alt](url)
      if (token.startsWith('![') && token.includes('](')) {
        const altMatch = token.match(/!\[(.*?)\]\((.*?)\)/);
        if (altMatch) {
          return (
            <span key={key} className="block my-3">
              <img
                src={altMatch[2]}
                alt={altMatch[1] || '첨부 이미지'}
                className="max-h-96 max-w-full rounded-lg border border-slate-700 object-cover shadow-lg"
                loading="lazy"
              />
              {altMatch[1] && <span className="block text-xs text-slate-400 mt-1">{altMatch[1]}</span>}
            </span>
          );
        }
      }

      // 링크 [text](url)
      if (token.startsWith('[') && token.includes('](')) {
        const linkMatch = token.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          return (
            <a
              key={key}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 underline hover:text-cyan-300 font-medium transition-colors"
            >
              {linkMatch[1]}
            </a>
          );
        }
      }

      // 굵게 **text**
      if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
        return <strong key={key} className="font-bold text-slate-100">{token.slice(2, -2)}</strong>;
      }

      // 밑줄 <u>text</u>
      if (token.startsWith('<u>') && token.endsWith('</u>')) {
        return <u key={key} className="underline underline-offset-2 decoration-indigo-400">{token.slice(3, -4)}</u>;
      }

      // 취소선 ~~text~~
      if (token.startsWith('~~') && token.endsWith('~~') && token.length >= 4) {
        return <del key={key} className="line-through text-slate-500">{token.slice(2, -2)}</del>;
      }

      // 기울임 *text*
      if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
        return <em key={key} className="italic text-slate-200">{token.slice(1, -1)}</em>;
      }

      // 인라인 코드 `code`
      if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
        return (
          <code key={key} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-xs border border-slate-700">
            {token.slice(1, -1)}
          </code>
        );
      }

      return token;
    });
  };

  // 블록 단위 처리 (코드 블록, 인용문, 제목, 목록, 일반 문단)
  const renderBlocks = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLanguage = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 코드 블록 토글 ```lang
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // 코드 블록 종료
          elements.push(
            <div key={`code-${i}`} className="my-3 rounded-lg border border-slate-800 bg-slate-950/90 overflow-hidden shadow-md">
              {codeLanguage && (
                <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                  {codeLanguage}
                </div>
              )}
              <pre className="p-3 text-xs font-mono text-cyan-200 overflow-x-auto whitespace-pre leading-relaxed">
                {codeBuffer.join('\n')}
              </pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
          codeLanguage = '';
        } else {
          inCodeBlock = true;
          codeLanguage = line.trim().replace(/^```/, '');
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // 인용구 > text
      if (line.startsWith('>')) {
        elements.push(
          <blockquote
            key={`quote-${i}`}
            className="border-l-3 border-indigo-500 pl-3 py-1 my-2 text-slate-300 italic bg-indigo-950/20 rounded-r-md text-sm"
          >
            {renderParagraph(line.replace(/^>\s*/, ''), i)}
          </blockquote>
        );
        continue;
      }

      // 제목 ###, ##, #
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-bold text-slate-100 mt-4 mb-2">
            {renderParagraph(line.replace(/^### /, ''), i)}
          </h3>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-lg font-bold text-white mt-5 mb-2 pb-1 border-b border-slate-800">
            {renderParagraph(line.replace(/^## /, ''), i)}
          </h2>
        );
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl font-extrabold text-white mt-6 mb-3">
            {renderParagraph(line.replace(/^# /, ''), i)}
          </h1>
        );
        continue;
      }

      // 목록 - item 또는 * item
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <div key={`li-${i}`} className="flex items-start gap-2 my-1 text-sm text-slate-200 pl-2">
            <span className="text-indigo-400 font-bold">•</span>
            <div>{renderParagraph(line.trim().replace(/^[-*]\s+/, ''), i)}</div>
          </div>
        );
        continue;
      }

      // 빈 줄
      if (!line.trim()) {
        elements.push(<div key={`empty-${i}`} className="h-2" />);
        continue;
      }

      // 일반 문단
      elements.push(
        <p key={`p-${i}`} className="text-sm text-slate-200 leading-relaxed my-1">
          {renderParagraph(line, i)}
        </p>
      );
    }

    return elements;
  };

  return <div className={`rich-post-content ${className}`}>{renderBlocks()}</div>;
};
