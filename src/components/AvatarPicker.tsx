import { useRef, useState } from 'react';
import { Check, ImagePlus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { AVATAR_TEMPLATES, fileToAvatarDataUrl, resolveAvatarSrc } from '@/lib/avatars';

export function AvatarView({
  src,
  size = 56,
  className = '',
  alt = '头像',
}: {
  src?: string | null;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const resolved = resolveAvatarSrc(src);
  return (
    <img
      src={resolved}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-2xl object-cover object-center bg-campus-cream shadow-soft border border-white/80 ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

type Tab = 'template' | 'upload';

export function AvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isCustom = value.startsWith('data:image/');
  const [tab, setTab] = useState<Tab>(isCustom ? 'upload' : 'template');
  const resolved = resolveAvatarSrc(value);

  const onUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      onChange(dataUrl);
      setTab('upload');
      toast.success('自定义头像已设置');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <AvatarView src={resolved} size={80} />
        <div className="min-w-0">
          <div className="text-sm font-bold text-campus-ink">当前头像</div>
          <p className="text-xs text-campus-ink/65 mt-1 leading-relaxed">
            {isCustom ? '已使用自定义上传图片' : '已使用固定模板头像'}
            <br />
            可选「固定模板」或「自定义上传」。
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setTab('template')}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold border ${
            tab === 'template' ? 'bg-campus-mint text-white border-campus-mint' : 'bg-white border-campus-ink/10'
          }`}
        >
          固定模板
        </button>
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold border ${
            tab === 'upload' ? 'bg-campus-mint text-white border-campus-mint' : 'bg-white border-campus-ink/10'
          }`}
        >
          自定义上传
        </button>
      </div>

      {tab === 'template' && (
        <>
          <p className="text-[11px] text-campus-ink/55 mb-2">模板由图片生成技能生成，文件名固定不可变。</p>
          <div className="grid grid-cols-4 gap-2">
            {AVATAR_TEMPLATES.map((tpl) => {
              const active = !isCustom && (resolved === tpl.src || value === tpl.src);
              return (
                <button
                  key={tpl.id}
                  type="button"
                  title={tpl.label}
                  onClick={() => onChange(tpl.src)}
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition ${
                    active ? 'border-campus-mint ring-2 ring-campus-mint/30' : 'border-transparent hover:border-campus-ink/15'
                  }`}
                >
                  <img src={tpl.src} alt={tpl.label} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
                  <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[9px] font-bold py-0.5 text-center truncate px-0.5">
                    {tpl.label}
                  </span>
                  {active && (
                    <span className="absolute top-1 right-1 rounded-full bg-campus-mint text-white p-0.5 shadow">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === 'upload' && (
        <div className="rounded-2xl border border-dashed border-campus-mint/50 bg-campus-mint/5 p-4 text-center">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void onUpload(e.target.files?.[0] || null)}
          />
          <p className="text-sm text-campus-ink/70 mb-3">支持 JPG / PNG / WEBP，最大 8MB。自动裁成正方形并压缩。</p>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold bg-campus-mint text-white shadow-soft disabled:opacity-50"
          >
            {uploading ? <ImagePlus className="w-4 h-4 animate-pulse" /> : <Upload className="w-4 h-4" />}
            {uploading ? '处理中…' : isCustom ? '重新上传图片' : '从相册选择图片'}
          </button>
          {isCustom && (
            <button
              type="button"
              className="block mx-auto mt-3 text-xs text-campus-ink/60 underline"
              onClick={() => {
                onChange(AVATAR_TEMPLATES[0].src);
                setTab('template');
                toast.message('已改回固定模板');
              }}
            >
              清除自定义，改用固定模板
            </button>
          )}
        </div>
      )}
    </div>
  );
}
