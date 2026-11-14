import { useEffect, useMemo, useState } from 'react';

const DEFAULT_FALLBACK = '/eye-care/eye-train-left-right.svg';
const DEFAULT_FALLBACK_2 = '/eye-care/eye-train-near-far.svg';

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  /** 额外候选；失败时依次尝试，最后落到本地眼球训练图 */
  fallbacks?: string[];
  onSettledSrc?: (src: string) => void;
};

/**
 * 可靠图片：主图失败自动切下一张，最终必落到本地资源，避免裂图/空白。
 */
export function ReliableImage({
  src,
  alt,
  className = '',
  fallbacks = [],
  onSettledSrc,
}: Props) {
  const chain = useMemo(() => {
    const list = [src, ...fallbacks, DEFAULT_FALLBACK, DEFAULT_FALLBACK_2]
      .map((u) => String(u || '').trim())
      .filter(Boolean);
    return [...new Set(list)];
  }, [src, fallbacks]);

  const [index, setIndex] = useState(0);
  const current = chain[Math.min(index, chain.length - 1)] || DEFAULT_FALLBACK;

  useEffect(() => {
    setIndex(0);
  }, [src, chain.join('|')]);

  useEffect(() => {
    onSettledSrc?.(current);
  }, [current, onSettledSrc]);

  return (
    <img
      key={current}
      src={current}
      alt={alt}
      className={className}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setIndex((i) => {
          if (i >= chain.length - 1) return i;
          return i + 1;
        });
      }}
    />
  );
}

/** 预检图片 URL 是否可加载（超时视为失败） */
export function probeImageUrl(url: string, timeoutMs = 6000): Promise<boolean> {
  const u = String(url || '').trim();
  if (!u) return Promise.resolve(false);
  // 本地路径默认可信
  if (u.startsWith('/') && !u.startsWith('//')) return Promise.resolve(true);
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    const t = window.setTimeout(() => finish(false), timeoutMs);
    img.onload = () => {
      window.clearTimeout(t);
      finish(img.naturalWidth > 0 && img.naturalHeight > 0);
    };
    img.onerror = () => {
      window.clearTimeout(t);
      finish(false);
    };
    img.referrerPolicy = 'no-referrer';
    img.src = u;
  });
}

/** 过滤出能加载的图片列表；若全挂则返回本地保底 */
export async function filterLoadableImages<T extends { url: string }>(
  items: T[],
  localFallback: T,
): Promise<T[]> {
  const ok: T[] = [];
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    const pass = await probeImageUrl(item.url);
    if (pass) ok.push(item);
  }
  return ok.length ? ok : [localFallback];
}
