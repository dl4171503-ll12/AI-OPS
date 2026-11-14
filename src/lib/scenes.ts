/** 场景图资源：一律用 cover + 固定比例容器，避免拉伸变形 */
export const SCENES = {
  /** 我的校园整幅场景（带中文楼名的可点击地图） */
  campus: '/scenes/campus-scene-named.png?v=campus-unified-ai',
  campusNamed: '/scenes/campus-scene-named.png?v=campus-unified-ai',
  /** 无建筑的空地背景（旧） */
  campusGround: '/scenes/campus-ground.png',
  principal: '/scenes/principal-office.png',
  counselor: '/scenes/counselor-room.png',
  fun: '/scenes/fun-tower.png',
  explore: '/scenes/explore-plaza.png',
  social: '/scenes/social-plaza.png',
  classroom: {
    math: '/scenes/classroom-math.png',
    chinese: '/scenes/classroom-chinese.png',
    english: '/scenes/classroom-english.png',
    science: '/scenes/classroom-math.png',
    art: '/scenes/classroom-chinese.png',
    pe: '/scenes/classroom-english.png',
    ai: '/scenes/classroom-ai.png?v=warm-cli',
  } as Record<string, string>,
  building: {
    math: '/scenes/building-math.png',
    chinese: '/scenes/building-chinese.png',
    english: '/scenes/building-english.png',
    science: '/scenes/building-science.png',
    art: '/scenes/building-art.png',
    pe: '/scenes/building-pe.png',
    ai: '/scenes/building-ai.png',
  } as Record<string, string>,
} as const;

export type SceneKey = keyof typeof SCENES;
