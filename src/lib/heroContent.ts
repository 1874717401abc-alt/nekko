import type { HeroContent, HeroSlideText } from "@/lib/types";

export const DEFAULT_HERO_CONTENT: HeroContent = {
  slides: [
    {
      vertical: "影像笔记",
      category: "精选 · FEATURED",
      title: "Ep.13『选题调研』",
      desc: "围绕海外热门话题展开调研，筛选出三个候选选题方向。",
      posterLabel: "下一步",
      posterSub: "下集开场分镜预览",
    },
    {
      vertical: "幕后纪实",
      category: "幕后 · 制作花絮",
      title: "Ep.12『拍摄现场』",
      desc: "外景拍摄两小时 + 棚内补拍，专注光线与节奏的把控。",
      posterLabel: "拍摄花絮",
      posterSub: "现场花絮抓拍",
    },
    {
      vertical: "工作室手记",
      category: "关于 · NEKKO",
      title: "「做值得被看见的内容」",
      desc: "两个人的小工作室，专注灵感、节奏与品质的坚持。",
      posterLabel: "工作室理念",
      posterSub: "Nekko 的创作哲学",
    },
  ],
  latestLabel: "本周更新",
  latestTitle: "Ep.12 成片初剪完成，进入二审反馈阶段",
  latestDesc: "已套用新的调色 LUT 并分享了测试版本，将根据反馈在本周内完成调整。",
};

function mergeSlide(base: HeroSlideText, override?: Partial<HeroSlideText> | null): HeroSlideText {
  return {
    vertical: override?.vertical || base.vertical,
    category: override?.category || base.category,
    title: override?.title || base.title,
    desc: override?.desc || base.desc,
    posterLabel: override?.posterLabel || base.posterLabel,
    posterSub: override?.posterSub || base.posterSub,
  };
}

export function mergeHeroContent(stored?: Partial<HeroContent> | null): HeroContent {
  return {
    slides: DEFAULT_HERO_CONTENT.slides.map((slide, i) => mergeSlide(slide, stored?.slides?.[i])),
    latestLabel: stored?.latestLabel || DEFAULT_HERO_CONTENT.latestLabel,
    latestTitle: stored?.latestTitle || DEFAULT_HERO_CONTENT.latestTitle,
    latestDesc: stored?.latestDesc || DEFAULT_HERO_CONTENT.latestDesc,
  };
}
