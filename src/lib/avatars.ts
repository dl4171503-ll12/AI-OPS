/**
 * 固定模板头像
 * - 由 Cursor 图片生成技能一次性生成，写入 public/avatars/
 * - id 与文件名永久固定，禁止改名/挪路径（存档兼容）
 * - 用户也可自定义上传（存 dataURL），与模板二选一
 */
export type AvatarTemplate = {
  /** 永久 ID，勿改：tpl-01 … tpl-08 */
  id: string;
  /** 永久路径，勿改：/avatars/avatar-tpl-0N.png */
  src: string;
  label: string;
};

/** 8 个固定模板：顺序与文件名绑定 */
export const AVATAR_TEMPLATES: readonly AvatarTemplate[] = [
  { id: 'tpl-01', src: '/avatars/avatar-tpl-01.png', label: '阳光男孩' },
  { id: 'tpl-02', src: '/avatars/avatar-tpl-02.png', label: '双马尾女孩' },
  { id: 'tpl-03', src: '/avatars/avatar-tpl-03.png', label: '眼镜男孩' },
  { id: 'tpl-04', src: '/avatars/avatar-tpl-04.png', label: '短发女孩' },
  { id: 'tpl-05', src: '/avatars/avatar-tpl-05.png', label: '小狐狸' },
  { id: 'tpl-06', src: '/avatars/avatar-tpl-06.png', label: '小熊猫' },
  { id: 'tpl-07', src: '/avatars/avatar-tpl-07.png', label: '小青蛙' },
  { id: 'tpl-08', src: '/avatars/avatar-tpl-08.png', label: '小猫咪' },
] as const;

export const DEFAULT_AVATAR = AVATAR_TEMPLATES[0].src;

export function isTemplateAvatar(avatar: string | undefined | null): boolean {
  const v = (avatar || '').trim();
  return AVATAR_TEMPLATES.some((t) => t.src === v);
}

/** 解析展示用头像：模板路径 / dataURL / 旧版 emoji 兜底 */
export function resolveAvatarSrc(avatar: string | undefined | null): string {
  const v = (avatar || '').trim();
  if (!v) return DEFAULT_AVATAR;
  if (v.startsWith('data:image/')) return v;
  if (v.startsWith('/avatars/')) return v;
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  // 旧版 emoji：映射到固定模板，保持兼容
  const emojiMap: Record<string, string> = {
    '🧒': AVATAR_TEMPLATES[0].src,
    '👧': AVATAR_TEMPLATES[1].src,
    '👦': AVATAR_TEMPLATES[2].src,
    '🧑': AVATAR_TEMPLATES[3].src,
    '🦊': AVATAR_TEMPLATES[4].src,
    '🐼': AVATAR_TEMPLATES[5].src,
    '🐸': AVATAR_TEMPLATES[6].src,
    '🐱': AVATAR_TEMPLATES[7].src,
  };
  return emojiMap[v] || DEFAULT_AVATAR;
}

/** 上传图片压缩为方形 dataURL，控制体积便于 localStorage */
export function fileToAvatarDataUrl(file: File, maxSide = 256, quality = 0.86): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件（JPG / PNG / WEBP）'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('图片请小于 8MB'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxSide;
        canvas.height = maxSide;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('画布不可用'));
          return;
        }
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.fillStyle = '#fff8f0';
        ctx.fillRect(0, 0, maxSide, maxSide);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSide, maxSide);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('图片解码失败'));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
