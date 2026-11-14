import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Music2, TimerReset } from 'lucide-react';
import { toast } from 'sonner';
import { ReliableImage, filterLoadableImages } from '@/components/ReliableImage';
import { useSchoolStore } from '@/store/school';
import {
  EYE_CARE_PHASE1_MS,
  EYE_CARE_REST_MS,
  beginEyeCareSession,
  fetchEyeCareMaterials,
  fetchQuietKugouTracks,
  formatRemain,
  getActiveMs,
  hasTodayEyeCareMedia,
  isEyeCareCooldown,
  markRestDone,
  recoverEyeCareAfterReload,
  setActiveMs,
  thresholdMs,
  type EyeCareGalleryImage,
  type EyeCarePack,
  type KugouTrack,
} from '@/lib/eye-care';
import { EYE_CARE_FALLBACK, LOCAL_EYE_CARE_IMAGES } from '@/lib/eye-care-images';

const TICK_MS = 5000;
const LOCAL_FALLBACKS = LOCAL_EYE_CARE_IMAGES.map((i) => i.url);

/**
 * 全站护眼：页面可见累计超过设定时长（默认 40 分钟）后强制休息 10 分钟。
 * 前 5 分钟：随机放映「眼球训练图」或「眼保健操视频」（可内嵌播放）。
 * 后 5 分钟：家长今日自定义；若前段是训练图且未设定今日媒体 → 自动酷狗安静配乐。
 */
export function EyeCareGuard() {
  const student = useSchoolStore((s) => s.student);
  const parent = useSchoolStore((s) => s.parent);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<1 | 2>(1);
  const [remainMs, setRemainMs] = useState(EYE_CARE_REST_MS);
  const [pack, setPack] = useState<EyeCarePack | null>(null);
  const [loadingPack, setLoadingPack] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [kugouHint, setKugouHint] = useState('');
  const restStarted = useRef(0);
  const restingLock = useRef(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const kugouPlaylist = useRef<KugouTrack[]>([]);
  const kugouIndex = useRef(0);
  const kugouStarted = useRef(false);
  const autoKugouTimer = useRef<number | null>(null);

  const limit = thresholdMs(parent?.eyeCareMinutes);
  const custom = parent?.eyeCare || {};

  // 刷新/脏数据自愈：避免「刚打开就又弹护眼」
  useEffect(() => {
    recoverEyeCareAfterReload();
  }, []);

  const stopMusic = useCallback(() => {
    if (autoKugouTimer.current) {
      window.clearTimeout(autoKugouTimer.current);
      autoKugouTimer.current = null;
    }
    const a = musicRef.current;
    if (a) {
      a.onended = null;
      a.pause();
      a.removeAttribute('src');
      musicRef.current = null;
    }
    kugouPlaylist.current = [];
    kugouIndex.current = 0;
    kugouStarted.current = false;
    setKugouHint('');
  }, []);

  const playUrl = useCallback(async (url: string, loop = false, retries = 2) => {
    const prev = musicRef.current;
    if (prev) {
      prev.onended = null;
      prev.onerror = null;
      prev.pause();
    }
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const audio = new Audio();
        musicRef.current = audio;
        audio.preload = 'auto';
        audio.loop = loop;
        audio.volume = 0.32;
        audio.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            cleanup();
            resolve();
          };
          const onFail = () => {
            cleanup();
            reject(new Error('audio load failed'));
          };
          const cleanup = () => {
            audio.removeEventListener('canplaythrough', onReady);
            audio.removeEventListener('error', onFail);
          };
          audio.addEventListener('canplaythrough', onReady, { once: true });
          audio.addEventListener('error', onFail, { once: true });
          audio.src = url;
          audio.load();
          window.setTimeout(() => {
            if (audio.readyState >= 2) onReady();
          }, 2500);
        });
        await audio.play();
        return audio;
      } catch {
        if (attempt === retries) break;
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    return null;
  }, []);

  const playNextKugou = useCallback(() => {
    const list = kugouPlaylist.current;
    if (!list.length) return;
    const i = kugouIndex.current % list.length;
    const track = list[i];
    kugouIndex.current = i + 1;
    setKugouHint(`酷狗安静配乐：${track.name} · ${track.artist}`);
    void playUrl(track.playUrl, false).then((audio) => {
      if (!audio) {
        // 当前曲失败则跳下一首
        if (kugouIndex.current < list.length + 3) playNextKugou();
        else setKugouHint('配乐暂时不可用，保持安静休息也很好');
        return;
      }
      audio.onended = () => playNextKugou();
      audio.onerror = () => playNextKugou();
    });
  }, [playUrl]);

  const startKugouPlaylist = useCallback(async () => {
    if (kugouStarted.current) return;
    if (hasTodayEyeCareMedia(useSchoolStore.getState().parent?.eyeCare)) return;
    kugouStarted.current = true;
    try {
      const tracks = await fetchQuietKugouTracks(4);
      kugouPlaylist.current = tracks;
      kugouIndex.current = 0;
      playNextKugou();
      toast.message('已自动播放酷狗安静背景音乐');
    } catch {
      kugouStarted.current = false;
      toast.message('暂时没法拉取酷狗配乐，保持安静休息也很好');
    }
  }, [playNextKugou]);

  const startRest = useCallback(async () => {
    if (restingLock.current || open) return;
    restingLock.current = true;
    beginEyeCareSession(); // 立刻清零累计，防止重复触发 / 刷新秒弹
    stopMusic();
    setOpen(true);
    setPhase(1);
    restStarted.current = Date.now();
    setRemainMs(EYE_CARE_REST_MS);
    setLoadingPack(true);
    setGalleryIndex(0);
    try {
      const p = await fetchEyeCareMaterials();
      if (p.kind === 'gallery') {
        const raw = (p.gallery?.length ? p.gallery : p.galleryFocus ? [p.galleryFocus] : []) as EyeCareGalleryImage[];
        const safe = await filterLoadableImages(raw, { ...EYE_CARE_FALLBACK });
        setPack({
          ...p,
          gallery: safe,
          galleryFocus: safe[0] || { ...EYE_CARE_FALLBACK },
        });
      } else {
        setPack(p);
      }
    } catch {
      setPack({
        engine: 'deepseek',
        kind: 'gallery',
        summary: '暂时搜不到视频，先用本地眼球训练图护眼吧。',
        video: null,
        gallery: LOCAL_EYE_CARE_IMAGES.map((x) => ({
          title: x.title,
          url: x.url,
          source: x.source,
        })),
        galleryFocus: { ...EYE_CARE_FALLBACK },
      });
      toast.message('暂时搜不到视频，先用本地眼球训练图护眼吧');
    } finally {
      setLoadingPack(false);
    }
  }, [open, stopMusic]);

  // 累计可见停留时间
  useEffect(() => {
    if (!student || open) return;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      if (restingLock.current) return;
      // 休息结束后冷却期内不累计、不触发
      if (isEyeCareCooldown()) {
        if (getActiveMs() !== 0) setActiveMs(0);
        return;
      }
      const next = getActiveMs() + TICK_MS;
      // 脏数据保护：远超阈值则清零重计
      if (next > limit * 3) {
        setActiveMs(0);
        return;
      }
      setActiveMs(next);
      if (next >= limit) {
        setActiveMs(0);
        void startRest();
      }
    };
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [student, open, limit, startRest]);

  // 休息倒计时
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - restStarted.current;
      const left = Math.max(0, EYE_CARE_REST_MS - elapsed);
      setRemainMs(left);
      setPhase(elapsed < EYE_CARE_PHASE1_MS ? 1 : 2);
      if (left <= 0) {
        markRestDone();
        restingLock.current = false;
        stopMusic();
        setOpen(false);
        setPack(null);
        toast.success('护眼休息完成，眼睛舒服多了～');
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [open, stopMusic]);

  // 示例图轮播
  useEffect(() => {
    if (!open || pack?.kind !== 'gallery') return;
    const imgs = pack.gallery?.length ? pack.gallery : pack.galleryFocus ? [pack.galleryFocus] : [];
    if (imgs.length <= 1) return;
    const id = window.setInterval(() => {
      setGalleryIndex((i) => (i + 1) % imgs.length);
    }, 12000);
    return () => window.clearInterval(id);
  }, [open, pack]);

  // 家长自定义音乐优先；示例图模式则在后续 5 分钟窗口自动酷狗
  useEffect(() => {
    if (!open) {
      stopMusic();
      return;
    }

    const eye = useSchoolStore.getState().parent?.eyeCare;
    if (eye?.musicUrl && hasTodayEyeCareMedia(eye)) {
      void playUrl(eye.musicUrl, true).then((a) => {
        if (a) setKugouHint('正在播放家长设置的放松音乐');
        else setKugouHint('家长音乐暂时无法播放，保持安静休息也很好');
      });
      return () => stopMusic();
    }

    // 仅当本次放映为示例图：后 5 分钟仍未设定今日媒体 → 自动酷狗
    if (pack?.kind === 'gallery') {
      const delay = Math.max(0, EYE_CARE_PHASE1_MS - (Date.now() - restStarted.current));
      autoKugouTimer.current = window.setTimeout(() => {
        if (!hasTodayEyeCareMedia(useSchoolStore.getState().parent?.eyeCare)) {
          void startKugouPlaylist();
        }
      }, delay + 800);
    }

    return () => {
      if (autoKugouTimer.current) {
        window.clearTimeout(autoKugouTimer.current);
        autoKugouTimer.current = null;
      }
    };
  }, [open, pack?.kind, parent?.eyeCare?.musicUrl, playUrl, startKugouPlaylist, stopMusic]);

  // 家长在休息过程中补设了今日媒体：停掉自动酷狗，改播家长音乐/尊重其视频图
  useEffect(() => {
    if (!open || pack?.kind !== 'gallery') return;
    if (!hasTodayEyeCareMedia(parent?.eyeCare)) return;
    if (parent?.eyeCare?.musicUrl) {
      void playUrl(parent.eyeCare.musicUrl, true).then((a) => {
        if (a) setKugouHint('正在播放家长设置的放松音乐');
      });
      kugouStarted.current = true;
    } else {
      // 有今日小视频/插画主题但无音乐：停掉酷狗，留给后 5 分钟画面
      const a = musicRef.current;
      if (a && kugouPlaylist.current.length) {
        a.pause();
        setKugouHint('已改用家长今天设定的放映内容');
      }
    }
  }, [
    open,
    pack?.kind,
    parent?.eyeCare?.musicUrl,
    parent?.eyeCare?.videoUrl,
    parent?.eyeCare?.imageUrl,
    parent?.eyeCare?.musicTheme,
    parent?.eyeCare?.todayDate,
    playUrl,
  ]);

  if (!student || !open) return null;

  const inPhase1 = phase === 1;
  const galleryList =
    pack?.kind === 'gallery'
      ? pack.gallery?.length
        ? pack.gallery
        : pack.galleryFocus
          ? [pack.galleryFocus]
          : [{ ...EYE_CARE_FALLBACK }]
      : [];
  const galleryImg = galleryList[galleryIndex % Math.max(1, galleryList.length)];
  const galleryFallbacks = [...galleryList.map((g) => g.url), ...LOCAL_FALLBACKS];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1a3a4a]/88 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="护眼休息"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border border-white/40">
        <div className="bg-gradient-to-r from-sky-100 via-emerald-50 to-amber-50 px-5 py-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/80 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-campus-ink">护眼休息时间到啦</div>
            <p className="text-xs text-campus-ink/65 mt-0.5 leading-relaxed">
              已连续使用约 {Math.round(limit / 60000)} 分钟。请休息 10 分钟，保护视力。
              {pack?.engine ? `（${pack.engine === 'kimi' ? 'Kimi' : 'DeepSeek'} 护眼老师）` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-black tabular-nums text-emerald-700">{formatRemain(remainMs)}</div>
            <div className="text-[10px] text-campus-ink/50 flex items-center gap-1 justify-end">
              <TimerReset className="w-3 h-3" />
              {inPhase1 ? '前5分钟·护眼放映' : '后5分钟·自定义'}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {inPhase1 ? (
            <>
              <p className="text-sm text-campus-ink/80">
                {loadingPack
                  ? '护眼老师正在搜寻可放映内容…'
                  : pack?.summary || '跟着放映内容放松眼睛吧。'}
              </p>

              {pack?.kind === 'video' && pack.video?.playUrl ? (
                <div className="rounded-2xl overflow-hidden border-2 border-emerald-200 bg-black">
                  <div className="px-3 py-2 bg-emerald-50 text-xs font-bold text-emerald-800">
                    正在放映眼保健操 · {pack.video.title}
                  </div>
                  {pack.video.playType === 'video' ? (
                    <video
                      key={pack.video.playUrl}
                      src={pack.video.playUrl}
                      className="w-full aspect-video bg-black"
                      controls
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <iframe
                      key={pack.video.playUrl}
                      src={pack.video.playUrl}
                      title={pack.video.title}
                      className="w-full aspect-video bg-black"
                      allow="autoplay; fullscreen; encrypted-media"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  )}
                </div>
              ) : null}

              {pack?.kind === 'gallery' || (!pack?.video && !loadingPack) ? (
                <div className="rounded-2xl overflow-hidden border bg-campus-cream/40">
                  <div className="px-3 py-2 text-xs font-bold text-campus-ink/70">
                    眼球训练图放映 · {galleryImg?.title || '眼球训练'}
                  </div>
                  <ReliableImage
                    src={galleryImg?.url}
                    alt={galleryImg?.title || '眼球训练图'}
                    className="w-full object-contain max-h-64 mx-auto bg-white"
                    fallbacks={galleryFallbacks}
                  />
                  <p className="text-center text-[11px] text-campus-ink/50 py-2">
                    跟着示意图活动眼球：左右 · 上下 · 绕圈 · 远近 · 眨眼
                  </p>
                </div>
              ) : null}

              {kugouHint ? (
                <p className="text-xs text-campus-ink/55 flex items-center gap-1">
                  <Music2 className="w-3.5 h-3.5" /> {kugouHint}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-campus-ink/80">
                {custom.tipText?.trim() || '后 5 分钟自由放松：听听音乐、看看插画，离开屏幕远眺更佳。'}
              </p>
              {custom.videoUrl && hasTodayEyeCareMedia(custom) ? (
                <video
                  src={custom.videoUrl}
                  controls
                  className="w-full rounded-2xl max-h-52 bg-black"
                  playsInline
                  autoPlay
                />
              ) : null}
              {custom.imageUrl && hasTodayEyeCareMedia(custom) ? (
                <ReliableImage
                  src={custom.imageUrl}
                  alt="家长自定义插画"
                  className="w-full rounded-2xl object-contain max-h-52 border"
                  fallbacks={LOCAL_FALLBACKS}
                />
              ) : (
                !(custom.videoUrl && hasTodayEyeCareMedia(custom)) &&
                pack?.kind === 'gallery' && (
                  <div className="rounded-2xl overflow-hidden border bg-campus-cream/40">
                    <ReliableImage
                      src={galleryImg?.url}
                      alt="继续眼球训练图"
                      className="w-full object-contain max-h-52 mx-auto"
                      fallbacks={galleryFallbacks}
                    />
                  </div>
                )
              )}
              {!(custom.videoUrl && hasTodayEyeCareMedia(custom)) &&
                !(custom.imageUrl && hasTodayEyeCareMedia(custom)) &&
                pack?.kind !== 'gallery' && (
                <div className="rounded-2xl border border-dashed border-campus-ink/15 px-4 py-8 text-center text-sm text-campus-ink/55">
                  家长可在「家长中心 → 护眼休息」设定今天的音乐主题、小视频或插画
                </div>
              )}
              {kugouHint ? (
                <p className="text-xs text-campus-ink/55 flex items-center gap-1">
                  <Music2 className="w-3.5 h-3.5" /> {kugouHint}
                </p>
              ) : null}
            </>
          )}
          <p className="text-[11px] text-campus-ink/40 text-center pt-1">
            倒计时结束后自动关闭。请尽量离开屏幕，眺望远方。
          </p>
        </div>
      </div>
    </div>
  );
}
