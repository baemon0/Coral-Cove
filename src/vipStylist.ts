import {
  GRID_SIZE,
  PALETTE_CODES,
  type ClothingItem,
  type ClothingSlot,
  type OutfitEffectType,
} from './constants';
import { classifyHexColor, type ColorFamily } from './community';

// ============================================================================
// VIP MYSTERY STYLIST — THEMES, 92 EXCLUSIVE UNBUYABLE REWARDS & JUDGING
// ============================================================================

export type VipRewardCategory = 'shop_decor' | 'studio_tool' | 'pet_boat' | 'title_trophy';
export type VipRewardSubkind =
  | 'shop_decor'
  | 'studio_palette'
  | 'studio_brush'
  | 'studio_sticker'
  | 'pet_accessory'
  | 'boat_skin'
  | 'prestige_title'
  | 'golden_trophy';
export type VipRarity = 'rare' | 'epic' | 'mythic' | 'legendary';

export type VipBrushMode =
  | 'sparkle_scatter'
  | 'pearl_dither'
  | 'checker_weave'
  | 'gold_trim'
  | 'velvet_spray'
  | 'coral_stripe'
  | 'star_stitch'
  | 'rainbow_thread';

export interface VipRewardDef {
  id: string;
  name: string;
  nameAr: string;
  category: VipRewardCategory;
  subkind: VipRewardSubkind;
  rarity: VipRarity;
  description: string;
  descriptionAr: string;
  colors: string[]; // primary, secondary, accent, glow
  animated?: boolean;
  emitsLight?: boolean;
  lightColor?: string;
  // Category-specific metadata
  decorArchetype?:
    | 'golden_mannequin'
    | 'chandelier'
    | 'carpet'
    | 'neon_sign'
    | 'aquarium'
    | 'stanchion'
    | 'fountain'
    | 'mirror'
    | 'archway'
    | 'pedestal'
    | 'runway_tile'
    | 'sofa'
    | 'bonsai'
    | 'desk'
    | 'lookbook_stand'
    | 'screen'
    | 'neon_palm'
    | 'terrarium'
    | 'lanterns'
    | 'showcase'
    | 'sewing_table'
    | 'partition'
    | 'mosaic_rug'
    | 'canopy_bench'
    | 'mural'
    | 'hat_tree'
    | 'pillar'
    | 'jellyfish_tank'
    | 'wall_clock'
    | 'ottoman';
  trophyArchetype?:
    | 'scissors'
    | 'chalice'
    | 'mannequin_award'
    | 'yacht_cup'
    | 'obelisk'
    | 'crown_monument'
    | 'muse_bust'
    | 'runway_pillar';
  studioPalette?: string[]; // 6 hex colors
  brushMode?: VipBrushMode;
  stickerPattern?: string[]; // 5x5 pattern ('.' transparent, '1' primary, '2' accent)
  titleBadgeText?: string;
  titleBadgeAr?: string;
  titleBg?: string;
  titleText?: string;
  titleBorder?: string;
}

export interface VipFashionTheme {
  id: string;
  titleEn: string;
  titleAr: string;
  promptEn: string;
  promptAr: string;
  targetColors: ColorFamily[];
  swatchHexes: string[];
  preferredSlots: ClothingSlot[];
  keywords: string[];
  bonusEffect?: OutfitEffectType;
  bonusNightNeon?: boolean;
  bonusRainMode?: boolean;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}

export const VIP_RARITY_META: Record<
  VipRarity,
  { label: string; labelAr: string; bg: string; text: string; border: string; weight: number }
> = {
  rare: {
    label: 'VIP Rare',
    labelAr: 'نادر VIP',
    bg: '#e0f2fe',
    text: '#0369a1',
    border: '#38bdf8',
    weight: 45,
  },
  epic: {
    label: 'VIP Epic',
    labelAr: 'ملحمي VIP',
    bg: '#f3e8ff',
    text: '#6b21a8',
    border: '#a855f7',
    weight: 30,
  },
  mythic: {
    label: 'VIP Mythic',
    labelAr: 'أسطوري VIP',
    bg: '#fce7f3',
    text: '#9d174d',
    border: '#ec4899',
    weight: 17,
  },
  legendary: {
    label: 'VIP Legendary',
    labelAr: 'خرافي VIP',
    bg: '#fef3c7',
    text: '#92400e',
    border: '#f59e0b',
    weight: 8,
  },
};

export const VIP_FASHION_THEMES: VipFashionTheme[] = [
  {
    id: 'summer_sunset',
    titleEn: 'Summer Sunset Vibes',
    titleAr: 'أجواء غروب الصيف',
    promptEn: 'Warm coral, golden amber, and sun-kissed resort couture!',
    promptAr: 'ألوان الغروب الدافئة: المرجاني، الذهبي، ولمسات الكهرمان الصيفية!',
    targetColors: ['gold', 'red', 'pink'],
    swatchHexes: ['#fb923c', '#f43f5e', '#fde047', '#fda4af'],
    preferredSlots: ['dress', 'hat', 'top'],
    keywords: ['sunset', 'summer', 'coral', 'amber', 'sun', 'gold', 'peach', 'beach', 'غروب', 'صيف', 'مرجان', 'شمس'],
    bonusEffect: 'sunset_amber',
    accentBg: '#fff7ed',
    accentBorder: '#f97316',
    accentText: '#9a3412',
  },
  {
    id: 'royal_coral_gala',
    titleEn: 'Royal Coral Gala',
    titleAr: 'حفل المرجان الملكي',
    promptEn: 'Opulent crowns, silk ballgowns, crimson velvet, and gold trim!',
    promptAr: 'فخامة ملكية: تيجان ذهبية، فساتين حريرية، ولمسات القرمزي واللؤلؤ!',
    targetColors: ['gold', 'pink', 'red'],
    swatchHexes: ['#f59e0b', '#be123c', '#f472b6', '#fef3c7'],
    preferredSlots: ['dress', 'hat'],
    keywords: ['royal', 'gala', 'crown', 'queen', 'king', 'velvet', 'gold', 'silk', 'gown', 'ملكي', 'تاج', 'حفل', 'فستان', 'حرير'],
    bonusEffect: 'starlight_coral',
    accentBg: '#fef3c7',
    accentBorder: '#d97706',
    accentText: '#78350f',
  },
  {
    id: 'midnight_ocean',
    titleEn: 'Midnight Ocean',
    titleAr: 'محيط منتصف الليل',
    promptEn: 'Deep sapphire, bioluminescent aqua, and starry night shimmer!',
    promptAr: 'أناقة البحر الليلي: أزرق ياقوتي، فيروزي مضيء، وبريق النجوم!',
    targetColors: ['blue', 'teal', 'purple'],
    swatchHexes: ['#1e3a8a', '#06b6d4', '#818cf8', '#00f5d4'],
    preferredSlots: ['dress', 'top', 'shoes'],
    keywords: ['midnight', 'ocean', 'night', 'star', 'neon', 'deep', 'pearl', 'blue', 'sea', 'ليل', 'محيط', 'بحر', 'نجوم', 'أزرق'],
    bonusEffect: 'glowing_pearls',
    bonusNightNeon: true,
    accentBg: '#eff6ff',
    accentBorder: '#2563eb',
    accentText: '#1e3a8a',
  },
  {
    id: 'cozy_pier_cafe',
    titleEn: 'Cozy Pier Cafe',
    titleAr: 'مقهى الرصيف الدافئ',
    promptEn: 'Charming knit tops, sandy gold tones, coastal hats, and relaxed boardwalk chic!',
    promptAr: 'إطلالة دافئة على الرصيف: ألوان الكراميل والذهبي والنعناع الهادئ!',
    targetColors: ['gold', 'green', 'red'],
    swatchHexes: ['#d97706', '#a16207', '#86efac', '#fef08a'],
    preferredSlots: ['top', 'bottom', 'hat'],
    keywords: ['cozy', 'cafe', 'pier', 'knit', 'sweater', 'beret', 'warm', 'coffee', 'boardwalk', 'مقهى', 'دافئ', 'رصيف', 'كراميل'],
    accentBg: '#fefce8',
    accentBorder: '#ca8a04',
    accentText: '#713f12',
  },
  {
    id: 'sakura_starlight',
    titleEn: 'Sakura Starlight Soirée',
    titleAr: 'سهرة أزهار الكرز والنجوم',
    promptEn: 'Blossom pinks, dreamy lavender, and sparkling star trails!',
    promptAr: 'رقة أزهار الكرز الوردية والبنفسجي الحالم مع بريق النجوم!',
    targetColors: ['pink', 'purple'],
    swatchHexes: ['#f9a8d4', '#c084fc', '#f472b6', '#fdf2f8'],
    preferredSlots: ['dress', 'hat', 'shoes'],
    keywords: ['sakura', 'blossom', 'pink', 'rose', 'petal', 'lavender', 'star', 'fairy', 'كرز', 'وردي', 'زهر', 'بنفسجي'],
    bonusEffect: 'starlight_coral',
    accentBg: '#fdf2f8',
    accentBorder: '#db2777',
    accentText: '#831843',
  },
  {
    id: 'monsoon_chic',
    titleEn: 'Tropical Monsoon Chic',
    titleAr: 'أناقة المطر الاستوائي',
    promptEn: 'Rain-reactive umbrellas or hoods, misty aqua, and glossy coastal boots!',
    promptAr: 'أزياء ممطرة أنيقة: مظلات متناسقة، أغطية مطر، وألوان الفيروز والأزرق!',
    targetColors: ['teal', 'blue', 'gold'],
    swatchHexes: ['#0ea5e9', '#14b8a6', '#fde047', '#38bdf8'],
    preferredSlots: ['top', 'shoes', 'hat'],
    keywords: ['rain', 'monsoon', 'storm', 'umbrella', 'hood', 'boots', 'coat', 'aqua', 'مطر', 'مظلة', 'معطف', 'عاصفة'],
    bonusEffect: 'seafoam_essence',
    bonusRainMode: true,
    accentBg: '#ecfeff',
    accentBorder: '#0891b2',
    accentText: '#155e75',
  },
  {
    id: 'emerald_reef',
    titleEn: 'Emerald Reef Couture',
    titleAr: 'أزياء الشعاب الزمردية',
    promptEn: 'Lush emerald greens, seafoam essence, and mermaid reef elegance!',
    promptAr: 'أناقة الشعاب المرجانية بألوان الزمرد الأخضر والزبد البحري!',
    targetColors: ['green', 'teal'],
    swatchHexes: ['#10b981', '#2dd4bf', '#059669', '#a7f3d0'],
    preferredSlots: ['dress', 'bottom', 'shoes'],
    keywords: ['emerald', 'reef', 'green', 'mermaid', 'seafoam', 'jade', 'leaf', 'nature', 'زمرد', 'أخضر', 'حورية', 'شعاب'],
    bonusEffect: 'seafoam_essence',
    accentBg: '#ecfdf5',
    accentBorder: '#059669',
    accentText: '#065f46',
  },
  {
    id: 'golden_yacht_club',
    titleEn: 'Golden Yacht Club',
    titleAr: 'نادي اليخت الذهبي',
    promptEn: 'Crisp nautical navy, captain caps, gold buttons, and Riviera luxury!',
    promptAr: 'إطلالة اليخوت الفاخرة: كحلي بحري، أبيض ناصع، وتفاصيل ذهبية!',
    targetColors: ['blue', 'gold'],
    swatchHexes: ['#1d4ed8', '#facc15', '#ffffff', '#60a5fa'],
    preferredSlots: ['hat', 'top', 'bottom'],
    keywords: ['yacht', 'captain', 'sailor', 'navy', 'gold', 'nautical', 'anchor', 'club', 'يخت', 'قبطان', 'بحري', 'ذهبي'],
    accentBg: '#eff6ff',
    accentBorder: '#eab308',
    accentText: '#1e40af',
  },
];

// ============================================================================
// 92 EXCLUSIVE UNBUYABLE VIP REWARDS CATALOG
// 30 Shop Decor + 25 Studio Tools + 20 Pet Acc & Boat Skins + 17 Titles & Trophies
// ============================================================================

const SHOP_DECOR_REWARDS: VipRewardDef[] = [
  {
    id: 'vip_decor_01',
    name: 'Golden Mannequin',
    nameAr: 'مانيكان ذهبي ملكي',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'legendary',
    description: '24k solid-gold showcase mannequin radiating VIP prestige.',
    descriptionAr: 'مانيكان عرض مطلي بالذهب الخالص لمتجرك الفاخر.',
    colors: ['#f59e0b', '#fef08a', '#b45309', '#fffbeb'],
    decorArchetype: 'golden_mannequin',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(253, 224, 71, 0.34)',
  },
  {
    id: 'vip_decor_02',
    name: 'Crystal Chandelier',
    nameAr: 'ثريا كريستال فاخرة',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'legendary',
    description: 'Twinkling tiered diamond chandelier that glows warmly at night.',
    descriptionAr: 'ثريا كريستال متلألئة تضيء متجرك ببريق ساحر ليلاً.',
    colors: ['#e0f2fe', '#ffffff', '#f59e0b', '#7dd3fc'],
    decorArchetype: 'chandelier',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(224, 242, 254, 0.42)',
  },
  {
    id: 'vip_decor_03',
    name: 'VIP Red Carpet',
    nameAr: 'سجادة VIP الحمراء',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'epic',
    description: 'Plush crimson runway carpet trimmed with woven gold.',
    descriptionAr: 'سجادة مخملية حمراء بحواف ذهبية لاستقبال كبار الشخصيات.',
    colors: ['#be123c', '#f43f5e', '#facc15', '#881337'],
    decorArchetype: 'carpet',
  },
  {
    id: 'vip_decor_04',
    name: 'Neon Coral Sign',
    nameAr: 'لافتة مرجان نيون',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'mythic',
    description: 'Glowing electric coral-pink boutique sign that pulses after dusk.',
    descriptionAr: 'لافتة نيون مرجانية متوهجة تنبض بالإضاءة في المساء.',
    colors: ['#ff2a85', '#00f5d4', '#1e1b4b', '#fda4af'],
    decorArchetype: 'neon_sign',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(255, 42, 133, 0.38)',
  },
  {
    id: 'vip_decor_05',
    name: 'Animated Aquarium Wall',
    nameAr: 'جدار حوض أسماك متحرك',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'legendary',
    description: 'Living reef aquarium with swimming pixel fish & rising bubbles.',
    descriptionAr: 'حوض أسماك مرجاني حي بأسماك تسبح وفقاعات متصاعدة.',
    colors: ['#0284c7', '#38bdf8', '#fb923c', '#a5f3fc'],
    decorArchetype: 'aquarium',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(56, 189, 248, 0.36)',
  },
  {
    id: 'vip_decor_06',
    name: 'Velvet Rope Stanchion',
    nameAr: 'حاجز حبل مخملي VIP',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'rare',
    description: 'Polished brass posts draped with royal crimson velvet rope.',
    descriptionAr: 'أعمدة نحاسية ذهبية مع حبل مخملي فاخر للمدخل.',
    colors: ['#eab308', '#be123c', '#fef08a', '#78350f'],
    decorArchetype: 'stanchion',
  },
  {
    id: 'vip_decor_07',
    name: 'Pearl Shell Fountain',
    nameAr: 'نافورة صدفة اللؤلؤ',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'mythic',
    description: 'Animated marble scallop fountain cascading sparkling aqua water.',
    descriptionAr: 'نافورة صدفة رخامية تتدفق منها مياه متلألئة مع لؤلؤة مضيئة.',
    colors: ['#f8fafc', '#38bdf8', '#f9a8d4', '#bae6fd'],
    decorArchetype: 'fountain',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(186, 230, 253, 0.32)',
  },
  {
    id: 'vip_decor_08',
    name: 'Rose Gold Mirror',
    nameAr: 'مرآة ذهب وردي',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'epic',
    description: 'Ornate rose-gold couture vanity mirror with starlit bulbs.',
    descriptionAr: 'مرآة فاخرة بإطار ذهب وردي ومصابيح عرض أنيقة.',
    colors: ['#fb7185', '#fde68a', '#e0f2fe', '#9f1239'],
    decorArchetype: 'mirror',
    emitsLight: true,
    lightColor: 'rgba(253, 230, 138, 0.28)',
  },
  {
    id: 'vip_decor_09',
    name: 'Starlight Archway',
    nameAr: 'قوس ضوء النجوم',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'mythic',
    description: 'Gilded boutique entrance arch laced with twinkling fairy lights.',
    descriptionAr: 'قوس مدخل مرصع بالنجوم المضيئة لاستقبال الزوار.',
    colors: ['#facc15', '#818cf8', '#fef9c3', '#4338ca'],
    decorArchetype: 'archway',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(250, 204, 21, 0.32)',
  },
  {
    id: 'vip_decor_10',
    name: 'Marble Display Pedestal',
    nameAr: 'قاعدة عرض رخامية',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'rare',
    description: 'Fluted ivory marble column topped with a gold showcase cushion.',
    descriptionAr: 'عمود رخامي أبيض بوسادة عرض ذهبية فخمة.',
    colors: ['#f1f5f9', '#cbd5e1', '#f59e0b', '#94a3b8'],
    decorArchetype: 'pedestal',
  },
  {
    id: 'vip_decor_11',
    name: 'Illuminated Runway Tile',
    nameAr: 'بلاطة منصة عرض مضيئة',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'epic',
    description: 'Glowing frosted-glass catwalk floor tile with cyan edge LEDs.',
    descriptionAr: 'بلاطة منصة أزياء مضيئة بحواف فيروزية متوهجة.',
    colors: ['#e0f2fe', '#00f5d4', '#38bdf8', '#0284c7'],
    decorArchetype: 'runway_tile',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(0, 245, 212, 0.30)',
  },
  {
    id: 'vip_decor_12',
    name: 'Champagne Lounge Sofa',
    nameAr: 'أريكة صالة الشامبين',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'epic',
    description: 'Tufted cream-velvet VIP lounge sofa with brass legs.',
    descriptionAr: 'أريكة مخملية فاخرة لراحة زبائن البوتيك المميزين.',
    colors: ['#fef3c7', '#f59e0b', '#fde68a', '#92400e'],
    decorArchetype: 'sofa',
  },
  {
    id: 'vip_decor_13',
    name: 'Golden Bonsai Planter',
    nameAr: 'أصيص بونساي ذهبي',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'rare',
    description: 'Sculpted sakura-leaf bonsai in a gilded ceramic planter.',
    descriptionAr: 'شجرة بونساي بأزهار الكرز في أصيص خزفي مذهب.',
    colors: ['#f472b6', '#fbcfe8', '#d97706', '#78350f'],
    decorArchetype: 'bonsai',
  },
  {
    id: 'vip_decor_14',
    name: 'Gilded Concierge Desk',
    nameAr: 'مكتب استقبال مذهب',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'epic',
    description: 'Luxury white-marble boutique counter with gold VIP crest.',
    descriptionAr: 'مكتب استقبال رخامي فاخر مزين بشعار VIP الذهبي.',
    colors: ['#ffffff', '#f59e0b', '#e2e8f0', '#b45309'],
    decorArchetype: 'desk',
  },
  {
    id: 'vip_decor_15',
    name: 'Holographic Lookbook Stand',
    nameAr: 'منصة مجلة هولوغرافية',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'mythic',
    description: 'Futuristic glowing fashion lookbook podium with floating shimmer.',
    descriptionAr: 'منصة عرض مجلات أزياء بإضاءة هولوغرافية متلألئة.',
    colors: ['#38bdf8', '#c084fc', '#00f5d4', '#1e293b'],
    decorArchetype: 'lookbook_stand',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(192, 132, 252, 0.34)',
  },
  {
    id: 'vip_decor_16',
    name: 'Velvet Dressing Screen',
    nameAr: 'حاجز تبديل مخملي',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'rare',
    description: 'Three-panel plum-velvet folding couture changing divider.',
    descriptionAr: 'حاجز تبديل ملابس ثلاثي من المخمل الأرجواني والذهب.',
    colors: ['#7e22ce', '#c084fc', '#facc15', '#3b0764'],
    decorArchetype: 'screen',
  },
  {
    id: 'vip_decor_17',
    name: 'Sunset Neon Palm',
    nameAr: 'نخلة نيون الغروب',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'mythic',
    description: 'Retro-glam glowing neon palm sculpture for seaside boutiques.',
    descriptionAr: 'مجسم نخلة نيون متوهجة بألوان الغروب الساحرة.',
    colors: ['#00f5d4', '#ff2a85', '#fde047', '#0f172a'],
    decorArchetype: 'neon_palm',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(0, 245, 212, 0.36)',
  },
  {
    id: 'vip_decor_18',
    name: 'Coral Reef Terrarium',
    nameAr: 'تيراريوم شعاب مرجانية',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'rare',
    description: 'Glass dome cradling luminous mini corals and sea anemones.',
    descriptionAr: 'قبة زجاجية تحتضن شعاباً مرجانية صغيرة مضيئة.',
    colors: ['#a5f3fc', '#fb7185', '#34d399', '#0e7490'],
    decorArchetype: 'terrarium',
    emitsLight: true,
    lightColor: 'rgba(165, 243, 252, 0.25)',
  },
  {
    id: 'vip_decor_19',
    name: 'Floating Lantern Cluster',
    nameAr: 'عنقود فوانيس عائمة',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'epic',
    description: 'Trio of bobbing golden paper lanterns casting cozy light.',
    descriptionAr: 'مجموعة فوانيس ذهبية طافية تنشر ضوءاً دافئاً.',
    colors: ['#fbbf24', '#fb7185', '#fef9c3', '#92400e'],
    decorArchetype: 'lanterns',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(251, 191, 36, 0.36)',
  },
  {
    id: 'vip_decor_20',
    name: 'Diamond Showcase Case',
    nameAr: 'خزانة عرض ألماسية',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'legendary',
    description: 'Museum-grade glass vitrine spotlighting a sparkling tiara.',
    descriptionAr: 'خزانة عرض زجاجية فاخرة تحتضن تاجاً مرصعاً بالألماس.',
    colors: ['#bae6fd', '#ffffff', '#f59e0b', '#0284c7'],
    decorArchetype: 'showcase',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(186, 230, 253, 0.36)',
  },
  {
    id: 'vip_decor_21',
    name: 'Couture Sewing Table',
    nameAr: 'طاولة خياطة كوتور',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'rare',
    description: 'Master tailor table with golden spools and silk swatches.',
    descriptionAr: 'طاولة مصمم أزياء مع بكرات خيوط ذهبية وأقمشة حريرية.',
    colors: ['#92400e', '#facc15', '#f472b6', '#fef3c7'],
    decorArchetype: 'sewing_table',
  },
  {
    id: 'vip_decor_22',
    name: 'Gold Leaf Partition',
    nameAr: 'فاصل ورق الذهب',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'rare',
    description: 'Art-deco lattice room divider crafted in hammered gold.',
    descriptionAr: 'فاصل ديكور فني بنقوش أوراق الذهب اللامعة.',
    colors: ['#eab308', '#fef08a', '#78350f', '#fde047'],
    decorArchetype: 'partition',
  },
  {
    id: 'vip_decor_23',
    name: 'Mosaic Sea Tile Rug',
    nameAr: 'سجادة فسيفساء البحر',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'rare',
    description: 'Hand-laid Mediterranean azure & gold floor medallion.',
    descriptionAr: 'سجادة فسيفساء بألوان البحر الأزرق والذهب.',
    colors: ['#0284c7', '#38bdf8', '#facc15', '#ffffff'],
    decorArchetype: 'mosaic_rug',
  },
  {
    id: 'vip_decor_24',
    name: 'Royal Canopy Bench',
    nameAr: 'مقعد مظلة ملكي',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'epic',
    description: 'Silk-draped boutique seating bench for VIP guests.',
    descriptionAr: 'مقعد فاخر بمظلة حريرية لاستراحة زوار البوتيك.',
    colors: ['#ec4899', '#fbcfe8', '#f59e0b', '#831843'],
    decorArchetype: 'canopy_bench',
  },
  {
    id: 'vip_decor_25',
    name: 'Ocean Wave Wall Mural',
    nameAr: 'جدارية أمواج المحيط',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'rare',
    description: 'Framed pixel-art seascape painted in gilded ultramarine.',
    descriptionAr: 'لوحة جدارية فنية لأمواج المحيط بإطار ذهبي.',
    colors: ['#1d4ed8', '#38bdf8', '#f8fafc', '#d97706'],
    decorArchetype: 'mural',
  },
  {
    id: 'vip_decor_26',
    name: 'Brass Hat Tree',
    nameAr: 'حامل قبعات نحاسي',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'rare',
    description: 'Sculpted brass stand displaying miniature couture hats.',
    descriptionAr: 'حامل نحاسي أنيق لعرض القبعات الفاخرة في المتجر.',
    colors: ['#d97706', '#f472b6', '#38bdf8', '#fef08a'],
    decorArchetype: 'hat_tree',
  },
  {
    id: 'vip_decor_27',
    name: 'Silk Ribbon Pillar',
    nameAr: 'عمود شرائط الحرير',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'epic',
    description: 'Ivory gallery column wrapped in shimmering coral silk.',
    descriptionAr: 'عمود عرض أبيض ملفوف بشرائط حرير مرجانية متلألئة.',
    colors: ['#f8fafc', '#fb7185', '#f59e0b', '#cbd5e1'],
    decorArchetype: 'pillar',
  },
  {
    id: 'vip_decor_28',
    name: 'Jellyfish Biolume Tank',
    nameAr: 'حوض قناديل البحر المضيئة',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'legendary',
    description: 'Cylindrical midnight tank with drifting glowing neon jellyfish.',
    descriptionAr: 'حوض أسطواني فاخر تسبح فيه قناديل بحر مضيئة بالنيون.',
    colors: ['#1e1b4b', '#ff2a85', '#00f5d4', '#c084fc'],
    decorArchetype: 'jellyfish_tank',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(192, 132, 252, 0.42)',
  },
  {
    id: 'vip_decor_29',
    name: 'Sunburst Gold Clock',
    nameAr: 'ساعة شمس ذهبية',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'rare',
    description: 'Radiant vintage sunburst timepiece for atelier walls.',
    descriptionAr: 'ساعة جدارية كلاسيكية بتصميم أشعة الشمس الذهبية.',
    colors: ['#f59e0b', '#fef9c3', '#1e293b', '#b45309'],
    decorArchetype: 'wall_clock',
  },
  {
    id: 'vip_decor_30',
    name: 'Velvet Ottoman Pair',
    nameAr: 'زوج مقاعد مخملية',
    category: 'shop_decor',
    subkind: 'shop_decor',
    rarity: 'rare',
    description: 'Matching teal & blush velvet fitting-room poufs.',
    descriptionAr: 'مقعدان مخمليان أنيقان بألوان الفيروزي والوردي لغرفة القياس.',
    colors: ['#14b8a6', '#f472b6', '#facc15', '#134e4a'],
    decorArchetype: 'ottoman',
  },
];

// 25 Studio Tools: 10 Rare Palettes + 8 Special Pixel Brushes + 7 Fabric Stamp Stickers
const STUDIO_TOOL_REWARDS: VipRewardDef[] = [
  // 10 Rare Studio Palettes
  {
    id: 'vip_studio_01',
    name: 'Royal Champagne Palette',
    nameAr: 'لوحة ألوان الشامبين الملكي',
    category: 'studio_tool',
    subkind: 'studio_palette',
    rarity: 'rare',
    description: '6 gilded ivory, honey-gold, and bronze couture shades.',
    descriptionAr: '6 درجات فاخرة من العاجي والذهبي والبرونزي للاستوديو.',
    colors: ['#fffbeb', '#fde68a', '#f59e0b', '#b45309'],
    studioPalette: ['#fffbeb', '#fef08a', '#fbbf24', '#d97706', '#92400e', '#451a03'],
  },
  {
    id: 'vip_studio_02',
    name: 'Bioluminescent Abyss Palette',
    nameAr: 'لوحة ألوان الأعماق المضيئة',
    category: 'studio_tool',
    subkind: 'studio_palette',
    rarity: 'epic',
    description: '6 deep midnight navy and electric aqua neon tones.',
    descriptionAr: '6 درجات من كحلي الأعماق والفيروزي النيون المضيء.',
    colors: ['#0f172a', '#1d4ed8', '#00f5d4', '#a5f3fc'],
    studioPalette: ['#090d1f', '#1e3a8a', '#0284c7', '#06b6d4', '#00f5d4', '#ccfbf1'],
  },
  {
    id: 'vip_studio_03',
    name: 'Sakura Silk Palette',
    nameAr: 'لوحة ألوان حرير الكرز',
    category: 'studio_tool',
    subkind: 'studio_palette',
    rarity: 'rare',
    description: '6 delicate cherry-blossom pinks and petal creams.',
    descriptionAr: '6 درجات ناعمة من وردي أزهار الكرز والحرير.',
    colors: ['#fff1f2', '#fbcfe8', '#f472b6', '#be185d'],
    studioPalette: ['#fff1f2', '#fce7f3', '#f9a8d4', '#f472b6', '#db2777', '#831843'],
  },
  {
    id: 'vip_studio_04',
    name: 'Sunset Riviera Palette',
    nameAr: 'لوحة ألوان غروب الريفييرا',
    category: 'studio_tool',
    subkind: 'studio_palette',
    rarity: 'rare',
    description: '6 glowing tangerine, coral-rose, and magenta horizon shades.',
    descriptionAr: '6 ألوان دافئة من البرتقالي والمرجاني وأرجواني الغروب.',
    colors: ['#fef08a', '#fb923c', '#f43f5e', '#9d174d'],
    studioPalette: ['#fef08a', '#fdba74', '#fb923c', '#f43f5e', '#be123c', '#6b1d4a'],
  },
  {
    id: 'vip_studio_05',
    name: 'Emerald Lagoon Palette',
    nameAr: 'لوحة ألوان البحيرة الزمردية',
    category: 'studio_tool',
    subkind: 'studio_palette',
    rarity: 'rare',
    description: '6 jewel-toned jade, mint foam, and deep reef emerald shades.',
    descriptionAr: '6 درجات فاخرة من الزمرد واليشم وزبد البحر الأخضر.',
    colors: ['#d1fae5', '#34d399', '#059669', '#064e3b'],
    studioPalette: ['#ecfdf5', '#a7f3d0', '#34d399', '#10b981', '#047857', '#064e3b'],
  },
  {
    id: 'vip_studio_06',
    name: 'Amethyst Velvet Palette',
    nameAr: 'لوحة ألوان مخمل الجمشت',
    category: 'studio_tool',
    subkind: 'studio_palette',
    rarity: 'epic',
    description: '6 regal lilac, violet, and plum couture velvet tones.',
    descriptionAr: '6 درجات ملكية من البنفسجي واللافندر والمخمل الداكن.',
    colors: ['#f3e8ff', '#c084fc', '#7e22ce', '#3b0764'],
    studioPalette: ['#faf5ff', '#e9d5ff', '#c084fc', '#9333ea', '#6b21a8', '#3b0764'],
  },
  {
    id: 'vip_studio_07',
    name: 'Mother-of-Pearl Palette',
    nameAr: 'لوحة ألوان عرق اللؤلؤ',
    category: 'studio_tool',
    subkind: 'studio_palette',
    rarity: 'epic',
    description: '6 iridescent opal whites, baby blues, and blush shimmers.',
    descriptionAr: '6 درجات لؤلؤية متقزحة من الأبيض والأزرق والوردي الباهت.',
    colors: ['#ffffff', '#e0f2fe', '#fce7f3', '#e2e8f0'],
    studioPalette: ['#ffffff', '#f8fafc', '#e0f2fe', '#fce7f3', '#e9d5ff', '#cbd5e1'],
  },
  {
    id: 'vip_studio_08',
    name: 'Crimson Gala Palette',
    nameAr: 'لوحة ألوان الحفل القرمزي',
    category: 'studio_tool',
    subkind: 'studio_palette',
    rarity: 'rare',
    description: '6 dramatic ruby, scarlet, and burgundy eveningwear reds.',
    descriptionAr: '6 درجات ساحرة من الياقوتي والقرمزي والخمري الفاخر.',
    colors: ['#ffe4e6', '#fb7185', '#e11d48', '#4c0519'],
    studioPalette: ['#ffe4e6', '#fda4af', '#f43f5e', '#e11d48', '#9f1239', '#4c0519'],
  },
  {
    id: 'vip_studio_09',
    name: 'Cyber Yacht Neon Palette',
    nameAr: 'لوحة ألوان نيون اليخت',
    category: 'studio_tool',
    subkind: 'studio_palette',
    rarity: 'mythic',
    description: '6 electric highlighter tones built for night-reactive couture.',
    descriptionAr: '6 ألوان نيون فائقة التوهج لأزياء الليل المضيئة.',
    colors: ['#ff2a85', '#00f5d4', '#bef264', '#fde047'],
    studioPalette: ['#ff2a85', '#c084fc', '#38bdf8', '#00f5d4', '#bef264', '#fde047'],
  },
  {
    id: 'vip_studio_10',
    name: 'Espresso Pier Palette',
    nameAr: 'لوحة ألوان مقهى الرصيف',
    category: 'studio_tool',
    subkind: 'studio_palette',
    rarity: 'rare',
    description: '6 warm latte, cinnamon, and roasted-cocoa knitwear shades.',
    descriptionAr: '6 درجات دافئة من اللاتيه والقرفة والكاكاو للأزياء الدافئة.',
    colors: ['#fef3c7', '#d6b287', '#92400e', '#3d1e0b'],
    studioPalette: ['#fef9e7', '#f0d8b2', '#cfa06e', '#a1622e', '#6e3c1b', '#381d0c'],
  },

  // 8 Special Pixel Brushes
  {
    id: 'vip_studio_11',
    name: 'Sparkle Scatter Brush',
    nameAr: 'فرشاة نثر البريق',
    category: 'studio_tool',
    subkind: 'studio_brush',
    rarity: 'epic',
    description: 'Dabs gleaming highlight sparkles around your chosen shade.',
    descriptionAr: 'تنثر نقاط بريق وإضاءة ناعمة أثناء الرسم على القماش.',
    colors: ['#fde047', '#ffffff', '#f59e0b', '#fef9c3'],
    brushMode: 'sparkle_scatter',
  },
  {
    id: 'vip_studio_12',
    name: 'Pearl Dither Brush',
    nameAr: 'فرشاة نسج اللؤلؤ',
    category: 'studio_tool',
    subkind: 'studio_brush',
    rarity: 'epic',
    description: 'Paints delicate alternating pearlescent highlight pixels.',
    descriptionAr: 'ترسم تدرجاً لؤلؤياً متبادلاً يضفي لمعاناً ناعماً.',
    colors: ['#f8fafc', '#bae6fd', '#f9a8d4', '#94a3b8'],
    brushMode: 'pearl_dither',
  },
  {
    id: 'vip_studio_13',
    name: 'Checker Weave Brush',
    nameAr: 'فرشاة نسيج الشطرنج',
    category: 'studio_tool',
    subkind: 'studio_brush',
    rarity: 'rare',
    description: 'Weaves crisp two-tone houndstooth & plaid fabric checks.',
    descriptionAr: 'تنسج نقشة مربعات ثنائية اللون لإطلالات الكوتور.',
    colors: ['#3d1e0b', '#fef3c7', '#b45309', '#f59e0b'],
    brushMode: 'checker_weave',
  },
  {
    id: 'vip_studio_14',
    name: 'Gold Trim Brush',
    nameAr: 'فرشاة التطريز الذهبي',
    category: 'studio_tool',
    subkind: 'studio_brush',
    rarity: 'mythic',
    description: 'Automatically paints alternating 24k metallic gold highlights.',
    descriptionAr: 'ترسم تطريزاً ذهنياً متلألئاً بحواف فاخرة تلقائياً.',
    colors: ['#facc15', '#fef08a', '#b45309', '#fffbeb'],
    brushMode: 'gold_trim',
  },
  {
    id: 'vip_studio_15',
    name: 'Velvet Spray Brush',
    nameAr: 'فرشاة بخاخ المخمل',
    category: 'studio_tool',
    subkind: 'studio_brush',
    rarity: 'epic',
    description: 'Adds plush soft-shaded micro-texture across fabric folds.',
    descriptionAr: 'تضيف ملمساً مخملياً غنياً بتظليل دقيق أثناء الرسم.',
    colors: ['#9d174d', '#f472b6', '#500724', '#fbcfe8'],
    brushMode: 'velvet_spray',
  },
  {
    id: 'vip_studio_16',
    name: 'Coral Stripe Brush',
    nameAr: 'فرشاة خطوط المرجان',
    category: 'studio_tool',
    subkind: 'studio_brush',
    rarity: 'rare',
    description: 'Paints crisp resort-style horizontal couture stripes.',
    descriptionAr: 'ترسم خطوطاً بحرية أنيقة متناوبة تلقائياً على الملابس.',
    colors: ['#fb7185', '#ffffff', '#0ea5e9', '#fde047'],
    brushMode: 'coral_stripe',
  },
  {
    id: 'vip_studio_17',
    name: 'Star Stitch Brush',
    nameAr: 'فرشاة غرز النجوم',
    category: 'studio_tool',
    subkind: 'studio_brush',
    rarity: 'mythic',
    description: 'Embroiders tiny starlight gold dots into dark fabrics.',
    descriptionAr: 'تطرز نقاط نجوم لامعة متباعدة بأناقة على الأقمشة.',
    colors: ['#312e81', '#fde047', '#c084fc', '#ffffff'],
    brushMode: 'star_stitch',
  },
  {
    id: 'vip_studio_18',
    name: 'Rainbow Thread Brush',
    nameAr: 'فرشاة خيوط قوس قزح',
    category: 'studio_tool',
    subkind: 'studio_brush',
    rarity: 'legendary',
    description: 'Cycles vibrant prism silk hues smoothly with every pixel.',
    descriptionAr: 'تبدل ألوان قوس قزح الحريرية تلقائياً مع كل بكسل.',
    colors: ['#f43f5e', '#facc15', '#10b981', '#818cf8'],
    brushMode: 'rainbow_thread',
  },

  // 7 Fabric Stamp Stickers (5x5 pixel patterns)
  {
    id: 'vip_studio_19',
    name: 'Royal Crown Stamp',
    nameAr: 'ختم التاج الملكي',
    category: 'studio_tool',
    subkind: 'studio_sticker',
    rarity: 'mythic',
    description: 'Stamp a crisp golden pixel crown emblem onto any garment.',
    descriptionAr: 'اطبع شعار تاج ذهبي دقيق على أي قطعة ملابس.',
    colors: ['#facc15', '#f43f5e', '#fef08a', '#92400e'],
    stickerPattern: ['.....', '1.1.1', '12121', '11111', '.....'],
  },
  {
    id: 'vip_studio_20',
    name: 'Coral Heart Stamp',
    nameAr: 'ختم قلب المرجان',
    category: 'studio_tool',
    subkind: 'studio_sticker',
    rarity: 'rare',
    description: 'Stamp a glowing pixel heart patch onto dresses or tops.',
    descriptionAr: 'اطبع قلب مرجاني أنيق على الفساتين أو القمصان.',
    colors: ['#f43f5e', '#fbcfe8', '#be123c', '#ffffff'],
    stickerPattern: ['.1.1.', '12111', '11111', '.111.', '..1..'],
  },
  {
    id: 'vip_studio_21',
    name: 'Starlight Spark Stamp',
    nameAr: 'ختم نجمة البريق',
    category: 'studio_tool',
    subkind: 'studio_sticker',
    rarity: 'epic',
    description: 'Stamp a twinkling 4-point couture star onto your design.',
    descriptionAr: 'اطبع نجمة متلألئة من 4 رؤوس على تصميمك.',
    colors: ['#fde047', '#ffffff', '#f59e0b', '#fef9c3'],
    stickerPattern: ['..1..', '..2..', '12221', '..2..', '..1..'],
  },
  {
    id: 'vip_studio_22',
    name: 'Pearl Shell Stamp',
    nameAr: 'ختم صدفة اللؤلؤ',
    category: 'studio_tool',
    subkind: 'studio_sticker',
    rarity: 'rare',
    description: 'Stamp an adorable scallop seashell motif onto resortwear.',
    descriptionAr: 'اطبع نقشة صدفة بحرية لطيفة على أزياء الشاطئ.',
    colors: ['#fda4af', '#ffffff', '#fb7185', '#fef3c7'],
    stickerPattern: ['.111.', '12121', '11211', '.111.', '..1..'],
  },
  {
    id: 'vip_studio_23',
    name: 'Yacht Anchor Stamp',
    nameAr: 'ختم مرساة اليخت',
    category: 'studio_tool',
    subkind: 'studio_sticker',
    rarity: 'epic',
    description: 'Stamp a crisp gold nautical anchor crest onto sailor styles.',
    descriptionAr: 'اطبع مرساة بحرية ذهبية لإطلالات نادي اليخت.',
    colors: ['#facc15', '#1e3a8a', '#fef08a', '#0f172a'],
    stickerPattern: ['..2..', '.111.', '..1..', '1.1.1', '.111.'],
  },
  {
    id: 'vip_studio_24',
    name: 'Monarch Butterfly Stamp',
    nameAr: 'ختم الفراشة الملكية',
    category: 'studio_tool',
    subkind: 'studio_sticker',
    rarity: 'mythic',
    description: 'Stamp delicate winged pixel butterflies across silk gowns.',
    descriptionAr: 'اطبع فراشة جميلة بأجنحة متناظرة على الفساتين.',
    colors: ['#c084fc', '#fde047', '#7e22ce', '#ffffff'],
    stickerPattern: ['1...1', '12.21', '.121.', '12.21', '1...1'],
  },
  {
    id: 'vip_studio_25',
    name: 'Crescent Moon Stamp',
    nameAr: 'ختم الهلال المضيء',
    category: 'studio_tool',
    subkind: 'studio_sticker',
    rarity: 'epic',
    description: 'Stamp a luminous crescent moon for midnight collections.',
    descriptionAr: 'اطبع هلالاً مضيئاً لتصاميم منتصف الليل.',
    colors: ['#fef08a', '#818cf8', '#ffffff', '#312e81'],
    stickerPattern: ['..11.', '.11..', '.11.2', '.11..', '..11.'],
  },
];

// 20 Pet Accessories (10) & Boat Skins (10)
const PET_AND_BOAT_REWARDS: VipRewardDef[] = [
  // 10 Exclusive Pet Accessories
  {
    id: 'vip_pet_01',
    name: 'Pet Golden Crown',
    nameAr: 'تاج ذهبي للحيوان الأليف',
    category: 'pet_boat',
    subkind: 'pet_accessory',
    rarity: 'legendary',
    description: 'A tiny jeweled gold crown perched proudly on your pet.',
    descriptionAr: 'تاج ذهبي صغير مرصع بالجواهر يرتديه حيوانك الأليف.',
    colors: ['#facc15', '#f43f5e', '#fef08a', '#b45309'],
  },
  {
    id: 'vip_pet_02',
    name: 'Pet Royal Crimson Cape',
    nameAr: 'عباءة ملكية قرمزية للحيوان',
    category: 'pet_boat',
    subkind: 'pet_accessory',
    rarity: 'mythic',
    description: 'Flowing ruby-velvet cape with an ermine-white collar.',
    descriptionAr: 'عباءة مخملية حمراء ملكية بحواف ذهبية لحيوانك الأليف.',
    colors: ['#be123c', '#facc15', '#ffffff', '#881337'],
  },
  {
    id: 'vip_pet_03',
    name: 'Pet Starlight Halo',
    nameAr: 'هالة ضوء النجوم للحيوان',
    category: 'pet_boat',
    subkind: 'pet_accessory',
    rarity: 'mythic',
    description: 'Floating golden ring of twinkling starlight above your pet.',
    descriptionAr: 'هالة نجمية ذهبية متلألئة تطفو فوق رأس حيوانك الأليف.',
    colors: ['#fde047', '#ffffff', '#f59e0b', '#fef9c3'],
  },
  {
    id: 'vip_pet_04',
    name: 'Pet Yacht Captain Hat',
    nameAr: 'قبعة قبطان اليخت للحيوان',
    category: 'pet_boat',
    subkind: 'pet_accessory',
    rarity: 'epic',
    description: 'Crisp white admiral cap with a gold anchor insignia.',
    descriptionAr: 'قبعة قبطان بيضاء بشعار مرساة ذهبية لرحلات البحر.',
    colors: ['#ffffff', '#1e3a8a', '#facc15', '#cbd5e1'],
  },
  {
    id: 'vip_pet_05',
    name: 'Pet Coral Hibiscus Bow',
    nameAr: 'فيونكة الكركديه للحيوان',
    category: 'pet_boat',
    subkind: 'pet_accessory',
    rarity: 'rare',
    description: 'Sweet coral-pink satin ribbon & tropical flower clip.',
    descriptionAr: 'شريط وردي مرجاني لطيف مع زهرة استوائية.',
    colors: ['#fb7185', '#fef08a', '#f43f5e', '#ffffff'],
  },
  {
    id: 'vip_pet_06',
    name: 'Pet Pearl Collar',
    nameAr: 'طوق اللؤلؤ للحيوان',
    category: 'pet_boat',
    subkind: 'pet_accessory',
    rarity: 'rare',
    description: 'Lustrous strand of Coral Cove pearls with a gold charm.',
    descriptionAr: 'عقد لؤلؤ أبيض فاخر يتوسطه تعليقة ذهبية.',
    colors: ['#f8fafc', '#facc15', '#bae6fd', '#e2e8f0'],
  },
  {
    id: 'vip_pet_07',
    name: 'Pet VIP Sunglasses',
    nameAr: 'نظارات VIP الشمسية للحيوان',
    category: 'pet_boat',
    subkind: 'pet_accessory',
    rarity: 'epic',
    description: 'Ultra-cool jet-black runway shades with gold rims.',
    descriptionAr: 'نظارات شمسية أنيقة بإطار ذهبي تجعل حيوانك نجم الجزيرة.',
    colors: ['#0f172a', '#facc15', '#38bdf8', '#334155'],
  },
  {
    id: 'vip_pet_08',
    name: 'Pet Fairy Sparkle Wings',
    nameAr: 'أجنحة الجنية المتلألئة',
    category: 'pet_boat',
    subkind: 'pet_accessory',
    rarity: 'legendary',
    description: 'Fluttering iridescent pastel wings trailing tiny sparkles.',
    descriptionAr: 'أجنحة متقزحة ترفرف ببريق ساحر خلف حيوانك الأليف.',
    colors: ['#a5f3fc', '#f9a8d4', '#ffffff', '#c084fc'],
  },
  {
    id: 'vip_pet_09',
    name: 'Pet Velvet Silk Scarf',
    nameAr: 'وشاح حريري دافئ للحيوان',
    category: 'pet_boat',
    subkind: 'pet_accessory',
    rarity: 'rare',
    description: 'Cozy pier-cafe teal silk scarf fluttering in the breeze.',
    descriptionAr: 'وشاح حريري فيروزي أنيق يتطاير مع نسيم البحر.',
    colors: ['#14b8a6', '#fde047', '#0f766e', '#ccfbf1'],
  },
  {
    id: 'vip_pet_10',
    name: 'Pet Diamond Tiara',
    nameAr: 'تاج ألماس صغير للحيوان',
    category: 'pet_boat',
    subkind: 'pet_accessory',
    rarity: 'epic',
    description: 'Sparkling silver-and-diamond gala tiara for your companion.',
    descriptionAr: 'تاج فضي مرصع بالألماس لإطلالات الحفلات الفاخرة.',
    colors: ['#e0f2fe', '#ffffff', '#38bdf8', '#94a3b8'],
  },

  // 10 Exclusive Boat Skins
  {
    id: 'vip_boat_01',
    name: 'Golden Yacht Skin',
    nameAr: 'تصميم اليخت الذهبي',
    category: 'pet_boat',
    subkind: 'boat_skin',
    rarity: 'legendary',
    description: 'Transforms your vessel with 24k gold trim, VIP flag & shimmer wake.',
    descriptionAr: 'يحوّل قاربك إلى يخت مذهب براية VIP وأثر متلألئ على الماء.',
    colors: ['#facc15', '#ffffff', '#b45309', '#fef9c3'],
  },
  {
    id: 'vip_boat_02',
    name: 'Crystal Pearl Hull',
    nameAr: 'هيكل اللؤلؤ الكريستالي',
    category: 'pet_boat',
    subkind: 'boat_skin',
    rarity: 'mythic',
    description: 'Opalescent pearl sheen & bubbling aqua aura while sailing.',
    descriptionAr: 'طلاء لؤلؤي متلألئ يترك فقاعات مائية مضيئة أثناء الإبحار.',
    colors: ['#f8fafc', '#bae6fd', '#f9a8d4', '#38bdf8'],
  },
  {
    id: 'vip_boat_03',
    name: 'Midnight Biolume Hull',
    nameAr: 'هيكل الأعماق المضيئة',
    category: 'pet_boat',
    subkind: 'boat_skin',
    rarity: 'mythic',
    description: 'Deep navy hull lined with neon-cyan bioluminescent strips.',
    descriptionAr: 'هيكل كحلي فاخر مزود بشرائط نيون فيروزية تتوهج ليلاً.',
    colors: ['#0f172a', '#00f5d4', '#38bdf8', '#818cf8'],
  },
  {
    id: 'vip_boat_04',
    name: 'Sakura Blossom Trim',
    nameAr: 'زينة أزهار الكرز للقارب',
    category: 'pet_boat',
    subkind: 'boat_skin',
    rarity: 'epic',
    description: 'Drapes your boat in pink petals with a drifting blossom trail.',
    descriptionAr: 'يزين قاربك بأزهار الكرز الوردية مع أثر بتلات متطايرة.',
    colors: ['#f9a8d4', '#f472b6', '#ffffff', '#db2777'],
  },
  {
    id: 'vip_boat_05',
    name: 'Royal Ruby Flagship',
    nameAr: 'سفينة الياقوت الملكية',
    category: 'pet_boat',
    subkind: 'boat_skin',
    rarity: 'epic',
    description: 'Crimson-lacquered royal trim with a golden crowned pennant.',
    descriptionAr: 'زخرفة ملكية باللون القرمزي مع علم التاج الذهبي.',
    colors: ['#be123c', '#facc15', '#fda4af', '#881337'],
  },
  {
    id: 'vip_boat_06',
    name: 'Emerald Dragon Crest',
    nameAr: 'شعار التنين الزمردي للقارب',
    category: 'pet_boat',
    subkind: 'boat_skin',
    rarity: 'mythic',
    description: 'Carved jade-emerald prow ornaments & seafoam sparkle wake.',
    descriptionAr: 'زخارف تنين زمردية منحوتة ببريق أخضر ساحر على الأمواج.',
    colors: ['#10b981', '#facc15', '#a7f3d0', '#065f46'],
  },
  {
    id: 'vip_boat_07',
    name: 'Sunset Amber Hull',
    nameAr: 'هيكل كهرمان الغروب',
    category: 'pet_boat',
    subkind: 'boat_skin',
    rarity: 'rare',
    description: 'Warm sunset-orange gradient stripes glowing across the waves.',
    descriptionAr: 'خطوط كهرمانية دافئة تعكس ألوان الغروب فوق البحر.',
    colors: ['#fb923c', '#f43f5e', '#fde047', '#9a3412'],
  },
  {
    id: 'vip_boat_08',
    name: 'Starlight Diamond Yacht',
    nameAr: 'يخت ألماس النجوم',
    category: 'pet_boat',
    subkind: 'boat_skin',
    rarity: 'legendary',
    description: 'Dazzling prism-diamond railing & shooting-star ocean wake.',
    descriptionAr: 'درابزين ألماسي مبهر يترك أثراً من النجوم المتساقطة في البحر.',
    colors: ['#e0f2fe', '#c084fc', '#ffffff', '#fde047'],
  },
  {
    id: 'vip_boat_09',
    name: 'Coral Reef Mosaic Skin',
    nameAr: 'تصميم فسيفساء المرجان',
    category: 'pet_boat',
    subkind: 'boat_skin',
    rarity: 'rare',
    description: 'Playful Mediterranean turquoise & coral hull detailing.',
    descriptionAr: 'زخارف فسيفساء بحرية بألوان الفيروزي والمرجاني.',
    colors: ['#06b6d4', '#fb7185', '#fef08a', '#0e7490'],
  },
  {
    id: 'vip_boat_10',
    name: 'Velvet VIP Cruiser',
    nameAr: 'يخت المخمل الفاخر',
    category: 'pet_boat',
    subkind: 'boat_skin',
    rarity: 'epic',
    description: 'Amethyst-purple luxury trim with gilded bow lanterns.',
    descriptionAr: 'طلاء بنفسجي مخملي فاخر مع فوانيس مقدمة مذهبة.',
    colors: ['#7e22ce', '#facc15', '#e9d5ff', '#3b0764'],
  },
];

// 17 Prestige Titles & Badges (9) + Golden Trophies (8)
const TITLE_AND_TROPHY_REWARDS: VipRewardDef[] = [
  // 9 Prestige Titles & Designer Badges
  {
    id: 'vip_title_01',
    name: 'Grand Couturier',
    nameAr: 'كبير مصممي الأزياء',
    category: 'title_trophy',
    subkind: 'prestige_title',
    rarity: 'legendary',
    description: 'Prestigious golden couture title displayed above your name.',
    descriptionAr: 'لقب ذهبي مرموق يظهر فوق اسمك أمام جميع اللاعبين.',
    colors: ['#f59e0b', '#fef08a', '#78350f', '#ffffff'],
    titleBadgeText: '★ Grand Couturier',
    titleBadgeAr: '★ كبير المصممين',
    titleBg: '#451a03',
    titleText: '#fde047',
    titleBorder: '#f59e0b',
  },
  {
    id: 'vip_title_02',
    name: 'Coral Royalty',
    nameAr: 'ملكية المرجان',
    category: 'title_trophy',
    subkind: 'prestige_title',
    rarity: 'mythic',
    description: 'Regal coral-and-gold designer crown badge.',
    descriptionAr: 'شارة التاج المرجاني والذهبي لملوك الأناقة.',
    colors: ['#f43f5e', '#fde047', '#881337', '#fff1f2'],
    titleBadgeText: '♛ Coral Royalty',
    titleBadgeAr: '♛ ملكية المرجان',
    titleBg: '#881337',
    titleText: '#fef08a',
    titleBorder: '#fb7185',
  },
  {
    id: 'vip_title_03',
    name: 'Midnight Muse',
    nameAr: 'ملهم منتصف الليل',
    category: 'title_trophy',
    subkind: 'prestige_title',
    rarity: 'epic',
    description: 'Glowing cyan-on-midnight prestige badge.',
    descriptionAr: 'شارة مضيئة بألوان منتصف الليل والفيروز النيون.',
    colors: ['#0f172a', '#00f5d4', '#38bdf8', '#818cf8'],
    titleBadgeText: '☾ Midnight Muse',
    titleBadgeAr: '☾ ملهم الليل',
    titleBg: '#0f172a',
    titleText: '#00f5d4',
    titleBorder: '#38bdf8',
  },
  {
    id: 'vip_title_04',
    name: 'Golden Needle',
    nameAr: 'الإبرة الذهبية',
    category: 'title_trophy',
    subkind: 'prestige_title',
    rarity: 'rare',
    description: 'Awarded to dedicated artisans of Coral Cove.',
    descriptionAr: 'شارة تُمنح للمصممين المتقنين في خليج المرجان.',
    colors: ['#d97706', '#fef3c7', '#92400e', '#facc15'],
    titleBadgeText: '✦ Golden Needle',
    titleBadgeAr: '✦ الإبرة الذهبية',
    titleBg: '#78350f',
    titleText: '#fef3c7',
    titleBorder: '#f59e0b',
  },
  {
    id: 'vip_title_05',
    name: 'Yacht Club VIP',
    nameAr: 'عضو نادي اليخت VIP',
    category: 'title_trophy',
    subkind: 'prestige_title',
    rarity: 'epic',
    description: 'Nautical navy-and-gold badge of Madame Lumière’s circle.',
    descriptionAr: 'شارة نادي اليخت الفاخر باللون الكحلي والذهبي.',
    colors: ['#1e3a8a', '#facc15', '#93c5fd', '#ffffff'],
    titleBadgeText: '⚓ Yacht Club VIP',
    titleBadgeAr: '⚓ عضو اليخت VIP',
    titleBg: '#1e3a8a',
    titleText: '#fde047',
    titleBorder: '#facc15',
  },
  {
    id: 'vip_title_06',
    name: 'Sakura Icon',
    nameAr: 'أيقونة أزهار الكرز',
    category: 'title_trophy',
    subkind: 'prestige_title',
    rarity: 'rare',
    description: 'Blossom-pink designer badge with delicate charm.',
    descriptionAr: 'شارة وردية أنيقة لمحبي تصاميم أزهار الكرز.',
    colors: ['#db2777', '#fce7f3', '#f9a8d4', '#831843'],
    titleBadgeText: '✿ Sakura Icon',
    titleBadgeAr: '✿ أيقونة الكرز',
    titleBg: '#831843',
    titleText: '#fbcfe8',
    titleBorder: '#f472b6',
  },
  {
    id: 'vip_title_07',
    name: 'Reef Luminary',
    nameAr: 'نجم الشعاب المرجانية',
    category: 'title_trophy',
    subkind: 'prestige_title',
    rarity: 'epic',
    description: 'Emerald-seafoam prestige badge for oceanic innovators.',
    descriptionAr: 'شارة زمردية متوهجة لمبدعي أزياء المحيط.',
    colors: ['#065f46', '#5eead4', '#10b981', '#ecfdf5'],
    titleBadgeText: '❖ Reef Luminary',
    titleBadgeAr: '❖ نجم الشعاب',
    titleBg: '#064e3b',
    titleText: '#5eead4',
    titleBorder: '#10b981',
  },
  {
    id: 'vip_title_08',
    name: 'Diamond Trendsetter',
    nameAr: 'صانع موضة ألماسي',
    category: 'title_trophy',
    subkind: 'prestige_title',
    rarity: 'legendary',
    description: 'Crystalline diamond prestige title worn by top VIP winners.',
    descriptionAr: 'لقب ألماسي نادر يُمنح لألمع الفائزين بتحدي VIP.',
    colors: ['#0284c7', '#e0f2fe', '#ffffff', '#38bdf8'],
    titleBadgeText: '◆ Diamond Trendsetter',
    titleBadgeAr: '◆ صانع الموضة الألماسي',
    titleBg: '#0c4a6e',
    titleText: '#e0f2fe',
    titleBorder: '#7dd3fc',
  },
  {
    id: 'vip_title_09',
    name: 'Atelier Legend',
    nameAr: 'أسطورة الأتيليه',
    category: 'title_trophy',
    subkind: 'prestige_title',
    rarity: 'mythic',
    description: 'Royal violet & gold title honoring iconic boutiques.',
    descriptionAr: 'لقب بنفسجي ملكي مذهب لتكريم أصحاب المتاجر الأسطورية.',
    colors: ['#581c87', '#facc15', '#d8b4fe', '#3b0764'],
    titleBadgeText: '✧ Atelier Legend',
    titleBadgeAr: '✧ أسطورة الأتيليه',
    titleBg: '#3b0764',
    titleText: '#facc15',
    titleBorder: '#c084fc',
  },

  // 8 Placeable Golden Trophies
  {
    id: 'vip_trophy_01',
    name: 'Golden Scissors Trophy',
    nameAr: 'كأس المقص الذهبي',
    category: 'title_trophy',
    subkind: 'golden_trophy',
    rarity: 'epic',
    description: 'Placeable monument celebrating master pixel tailoring.',
    descriptionAr: 'تمثال المقص الذهبي يمكنك وضعه أمام متجرك للتباهي.',
    colors: ['#facc15', '#fef08a', '#92400e', '#1e293b'],
    trophyArchetype: 'scissors',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(250, 204, 21, 0.34)',
  },
  {
    id: 'vip_trophy_02',
    name: 'Royal Coral Chalice',
    nameAr: 'كأس المرجان الملكي',
    category: 'title_trophy',
    subkind: 'golden_trophy',
    rarity: 'mythic',
    description: 'Jeweled golden goblet crowned with a glowing coral pearl.',
    descriptionAr: 'كأس ذهبي فاخر مرصع بلؤلؤة مرجانية متلألئة.',
    colors: ['#f59e0b', '#fb7185', '#fef08a', '#78350f'],
    trophyArchetype: 'chalice',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(251, 113, 133, 0.32)',
  },
  {
    id: 'vip_trophy_03',
    name: 'Diamond Mannequin Award',
    nameAr: 'جائزة المانيكان الألماسي',
    category: 'title_trophy',
    subkind: 'golden_trophy',
    rarity: 'legendary',
    description: 'Sparkling diamond-cut couture statue on an obsidian plinth.',
    descriptionAr: 'تمثال مانيكان ألماسي متلألئ على قاعدة فخمة أمام البوتيك.',
    colors: ['#bae6fd', '#ffffff', '#facc15', '#0f172a'],
    trophyArchetype: 'mannequin_award',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(186, 230, 253, 0.40)',
  },
  {
    id: 'vip_trophy_04',
    name: 'Grand Yacht Cup',
    nameAr: 'كأس اليخت الكبير',
    category: 'title_trophy',
    subkind: 'golden_trophy',
    rarity: 'epic',
    description: 'Twin-handled solid gold regatta trophy for VIP champions.',
    descriptionAr: 'كأس سباق اليخوت الذهبي للفائزين بتقييم مدام لوميير.',
    colors: ['#eab308', '#38bdf8', '#fef9c3', '#713f12'],
    trophyArchetype: 'yacht_cup',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(250, 204, 21, 0.32)',
  },
  {
    id: 'vip_trophy_05',
    name: 'Starlight Couture Obelisk',
    nameAr: 'مسلة أزياء ضوء النجوم',
    category: 'title_trophy',
    subkind: 'golden_trophy',
    rarity: 'mythic',
    description: 'Towering golden spire topped with a rotating pixel star.',
    descriptionAr: 'مسلة ذهبية شامخة تعلوها نجمة متوهجة ليلاً.',
    colors: ['#facc15', '#c084fc', '#ffffff', '#4338ca'],
    trophyArchetype: 'obelisk',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(192, 132, 252, 0.36)',
  },
  {
    id: 'vip_trophy_06',
    name: 'Pearl Crown Monument',
    nameAr: 'نصب تاج اللؤلؤ',
    category: 'title_trophy',
    subkind: 'golden_trophy',
    rarity: 'legendary',
    description: 'Crowned marble pedestal honoring Coral Cove’s finest.',
    descriptionAr: 'نصب رخامي فاخر يعلوه تاج ذهبي مرصع باللؤلؤ.',
    colors: ['#f8fafc', '#facc15', '#f43f5e', '#94a3b8'],
    trophyArchetype: 'crown_monument',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(253, 224, 71, 0.38)',
  },
  {
    id: 'vip_trophy_07',
    name: 'Midnight Muse Statue',
    nameAr: 'تمثال ملهمة الليل',
    category: 'title_trophy',
    subkind: 'golden_trophy',
    rarity: 'epic',
    description: 'Sculpted golden silhouette illuminated by cyan starlight.',
    descriptionAr: 'تمثال ذهبي أنيق مضاء بهالة فيروزية ساحرة.',
    colors: ['#f59e0b', '#00f5d4', '#1e293b', '#fef08a'],
    trophyArchetype: 'muse_bust',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(0, 245, 212, 0.32)',
  },
  {
    id: 'vip_trophy_08',
    name: 'Platinum Runway Pillar',
    nameAr: 'عمود المنصة البلاتيني',
    category: 'title_trophy',
    subkind: 'golden_trophy',
    rarity: 'mythic',
    description: 'Prestigious platinum-and-gold beacon for boutique entrances.',
    descriptionAr: 'عمود بلاتيني وذهبي يعلن عن مكانة متجرك الراقية.',
    colors: ['#e2e8f0', '#facc15', '#ffffff', '#475569'],
    trophyArchetype: 'runway_pillar',
    animated: true,
    emitsLight: true,
    lightColor: 'rgba(226, 232, 240, 0.36)',
  },
];

export const VIP_REWARDS: VipRewardDef[] = [
  ...SHOP_DECOR_REWARDS, // 30
  ...STUDIO_TOOL_REWARDS, // 25
  ...PET_AND_BOAT_REWARDS, // 20
  ...TITLE_AND_TROPHY_REWARDS, // 17 -> Total 92 Exclusive Unbuyable Rewards!
];

export const VIP_REWARD_MAP: Record<string, VipRewardDef> = Object.fromEntries(
  VIP_REWARDS.map((r) => [r.id, r])
);

export const VIP_REWARD_COUNTS = {
  total: VIP_REWARDS.length,
  shop_decor: SHOP_DECOR_REWARDS.length,
  studio_tool: STUDIO_TOOL_REWARDS.length,
  pet_boat: PET_AND_BOAT_REWARDS.length,
  title_trophy: TITLE_AND_TROPHY_REWARDS.length,
};

export function getVipReward(id?: string | null): VipRewardDef | null {
  if (!id) return null;
  return VIP_REWARD_MAP[id] || null;
}

// ============================================================================
// VIP YACHT PERIODIC EVENT SCHEDULE
// ============================================================================

export const VIP_CYCLE_MS = 20 * 60 * 1000; // 20 minutes total cycle (triggers automatically every 20 min)
export const VIP_VISIT_DURATION_MS = 5 * 60 * 1000; // 5 minutes yacht docked at pier, 15 minutes at sea

export interface VipEventState {
  isDocked: boolean;
  theme: VipFashionTheme;
  themeIndex: number;
  visitId: string;
  msRemaining: number;
  formattedTime: string;
}

export function getVipEventState(
  nowMs: number,
  manualVisit?: { activeUntilMs: number; themeIndex: number; visitId: string } | null
): VipEventState {
  if (manualVisit && nowMs < manualVisit.activeUntilMs) {
    const idx = ((manualVisit.themeIndex % VIP_FASHION_THEMES.length) + VIP_FASHION_THEMES.length) % VIP_FASHION_THEMES.length;
    const msRemaining = Math.max(0, manualVisit.activeUntilMs - nowMs);
    const totalSec = Math.ceil(msRemaining / 1000);
    return {
      isDocked: true,
      theme: VIP_FASHION_THEMES[idx],
      themeIndex: idx,
      visitId: manualVisit.visitId,
      msRemaining,
      formattedTime: `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`,
    };
  }

  const cycleIndex = Math.floor(nowMs / VIP_CYCLE_MS);
  const elapsed = nowMs % VIP_CYCLE_MS;
  const isDocked = elapsed < VIP_VISIT_DURATION_MS;
  const themeIndex = cycleIndex % VIP_FASHION_THEMES.length;
  const msRemaining = isDocked ? VIP_VISIT_DURATION_MS - elapsed : VIP_CYCLE_MS - elapsed;
  const totalSec = Math.ceil(msRemaining / 1000);

  return {
    isDocked,
    theme: VIP_FASHION_THEMES[themeIndex],
    themeIndex,
    visitId: `vip_cycle_${cycleIndex}`,
    msRemaining,
    formattedTime: `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`,
  };
}

// ============================================================================
// VIP JUDGING ENGINE & TIERED REWARD ROLLER
// ============================================================================

export type VipJudgeRank = 'Bronze' | 'Silver' | 'Gold' | 'Diamond VIP';

export interface VipJudgeResult {
  totalScore: number;
  paletteScore: number; // 0..35
  themeScore: number; // 0..25
  creativityScore: number; // 0..40
  rank: VipJudgeRank;
  feedbackEn: string;
  feedbackAr: string;
  bonusGold: number;
  rewards: VipRewardDef[];
  newlyUnlockedIds: string[];
  evaluatedCount: number;
}

function countNonEmptyPixels(item: ClothingItem): { painted: number; uniqueColors: number } {
  let painted = 0;
  const usedCodes = new Set<string>();
  for (let i = 0; i < item.pixels.length; i++) {
    const ch = item.pixels[i];
    if (ch && ch !== '.') {
      painted++;
      usedCodes.add(ch);
    }
  }
  return { painted, uniqueColors: usedCodes.size };
}

export function rollVipRewards(
  alreadyUnlockedIds: string[],
  count: number,
  minRarity: VipRarity = 'rare'
): VipRewardDef[] {
  const unlockedSet = new Set(alreadyUnlockedIds);
  const rarityOrder: VipRarity[] = ['rare', 'epic', 'mythic', 'legendary'];
  const minIdx = rarityOrder.indexOf(minRarity);

  const picked: VipRewardDef[] = [];
  const pickedIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    // First reward on high tiers respects minRarity; prioritize unowned items strongly!
    const eligibleMinIdx = i === 0 ? minIdx : Math.max(0, minIdx - 1);
    const unownedEligible = VIP_REWARDS.filter(
      (r) => !unlockedSet.has(r.id) && !pickedIds.has(r.id) && rarityOrder.indexOf(r.rarity) >= eligibleMinIdx
    );
    const unownedAny = VIP_REWARDS.filter((r) => !unlockedSet.has(r.id) && !pickedIds.has(r.id));
    const placeableFallback = VIP_REWARDS.filter(
      (r) =>
        (r.subkind === 'shop_decor' || r.subkind === 'golden_trophy') && !pickedIds.has(r.id)
    );
    const pool =
      unownedEligible.length > 0
        ? unownedEligible
        : unownedAny.length > 0
          ? unownedAny
          : placeableFallback.length > 0
            ? placeableFallback
            : VIP_REWARDS;

    const totalWeight = pool.reduce((sum, r) => sum + VIP_RARITY_META[r.rarity].weight, 0);
    let roll = Math.random() * Math.max(1, totalWeight);
    let chosen = pool[pool.length - 1];
    for (const candidate of pool) {
      roll -= VIP_RARITY_META[candidate.rarity].weight;
      if (roll <= 0) {
        chosen = candidate;
        break;
      }
    }
    picked.push(chosen);
    pickedIds.add(chosen.id);
    unlockedSet.add(chosen.id);
  }

  return picked;
}

export function evaluateVipSubmission(
  items: ClothingItem[],
  theme: VipFashionTheme,
  alreadyUnlockedIds: string[],
  submissionMode: 'outfit' | 'mannequins'
): VipJudgeResult {
  const validItems = items.filter((it) => it && typeof it.pixels === 'string');
  if (validItems.length === 0) {
    return {
      totalScore: 0,
      paletteScore: 0,
      themeScore: 0,
      creativityScore: 0,
      rank: 'Bronze',
      feedbackEn: 'Dress up or display an outfit on a mannequin so Madame Lumière can judge it!',
      feedbackAr: 'ارتدِ زياً أو اعرض تصميماً على مانيكان في متجرك لتقييمه!',
      bonusGold: 0,
      rewards: [],
      newlyUnlockedIds: [],
      evaluatedCount: 0,
    };
  }

  // 1. Color Palette Score (0..35)
  let totalPaletteEntries = 0;
  let matchingPaletteEntries = 0;
  for (const item of validItems) {
    const pal = Array.isArray(item.palette) ? item.palette : [];
    for (const hex of pal) {
      totalPaletteEntries++;
      const fam = classifyHexColor(hex);
      if (fam && theme.targetColors.includes(fam)) {
        matchingPaletteEntries++;
      }
    }
  }
  const colorRatio = totalPaletteEntries > 0 ? matchingPaletteEntries / totalPaletteEntries : 0;
  const paletteScore = Math.min(35, Math.round(10 + colorRatio * 28));

  // 2. Theme Tags & Silhouette Score (0..25)
  let keywordHits = 0;
  let slotHits = 0;
  for (const item of validItems) {
    const lowerName = (item.name || '').toLowerCase();
    if (theme.keywords.some((kw) => lowerName.includes(kw.toLowerCase()))) {
      keywordHits++;
    }
    if (theme.preferredSlots.includes(item.slot)) {
      slotHits++;
    }
  }
  const themeScore = Math.min(
    25,
    8 + Math.min(10, slotHits * 5) + Math.min(12, keywordHits * 7)
  );

  // 3. Creativity & Craftsmanship Score (0..40)
  let creativity = 8;
  let maxPainted = 0;
  let maxUniqueColors = 0;
  let hasCustom = false;
  let hasInfused = false;
  let hasThemeInfused = false;
  let hasReactive = false;
  let hasThemeReactive = false;
  let hasLimitedOrUnique = false;

  for (const item of validItems) {
    const { painted, uniqueColors } = countNonEmptyPixels(item);
    if (painted > maxPainted) maxPainted = painted;
    if (uniqueColors > maxUniqueColors) maxUniqueColors = uniqueColors;
    if (item.source === 'custom') hasCustom = true;
    if (item.effect) {
      hasInfused = true;
      if (theme.bonusEffect && item.effect === theme.bonusEffect) hasThemeInfused = true;
    }
    if (item.reactive?.nightNeon || item.reactive?.rainMode) {
      hasReactive = true;
      if (theme.bonusNightNeon && item.reactive?.nightNeon) hasThemeReactive = true;
      if (theme.bonusRainMode && item.reactive?.rainMode) hasThemeReactive = true;
    }
    if (item.editionTier === 'unique' || item.editionTier === 'limited') {
      hasLimitedOrUnique = true;
    }
  }

  if (hasCustom) creativity += 6;
  creativity += Math.min(7, Math.floor(maxPainted / 14));
  creativity += Math.min(7, Math.max(0, maxUniqueColors - 1) * 2);
  if (validItems.length >= 2) creativity += 4;
  if (validItems.length >= 3) creativity += 3;
  if (hasInfused) creativity += 4;
  if (hasThemeInfused) creativity += 4;
  if (hasReactive) creativity += 4;
  if (hasThemeReactive) creativity += 4;
  if (hasLimitedOrUnique) creativity += 3;
  if (submissionMode === 'mannequins' && validItems.length >= 2) creativity += 3;

  const creativityScore = Math.min(40, creativity);
  const totalScore = Math.min(100, paletteScore + themeScore + creativityScore);

  let rank: VipJudgeRank = 'Bronze';
  let rewardCount = 1;
  let minRarity: VipRarity = 'rare';
  let bonusGold = 250;
  let feedbackEn = `A charming start for "${theme.titleEn}"! Try richer palette matches or Deep Sea effects next time.`;
  let feedbackAr = `بداية جميلة لثيم "${theme.titleAr}"! جرّب مطابقة الألوان بشكل أدق أو إضافة مؤثرات الأعماق.`;

  if (totalScore >= 86) {
    rank = 'Diamond VIP';
    rewardCount = 3;
    minRarity = 'mythic';
    bonusGold = 1200;
    feedbackEn = `Magnifique!! Pure couture perfection for "${theme.titleEn}"! You’ve earned 3 ultra-exclusive VIP treasures!`;
    feedbackAr = `مذهل للغاية! إبداع استثنائي يناسب "${theme.titleAr}" بكل تفاصيله! لقد ربحت 3 جوائز VIP نادرة!`;
  } else if (totalScore >= 70) {
    rank = 'Gold';
    rewardCount = 2;
    minRarity = 'epic';
    bonusGold = 750;
    feedbackEn = `Très chic! Gorgeous color harmony and boutique flair for "${theme.titleEn}". Enjoy 2 exclusive VIP gifts!`;
    feedbackAr = `أنيق جداً! تناسق لوني رائع وإبداع مميز لثيم "${theme.titleAr}". تفضل جائزتين VIP حصريتين!`;
  } else if (totalScore >= 52) {
    rank = 'Silver';
    rewardCount = 2;
    minRarity = 'rare';
    bonusGold = 450;
    feedbackEn = `Lovely styling for "${theme.titleEn}"! Add custom shading or theme accessories to reach Diamond VIP.`;
    feedbackAr = `تنسيق لطيف جداً لثيم "${theme.titleAr}"! أضف تظليلاً أو قطعاً متناسقة للوصول إلى التقييم الألماسي.`;
  }

  const prevSet = new Set(alreadyUnlockedIds);
  const rewards = rollVipRewards(alreadyUnlockedIds, rewardCount, minRarity);
  const newlyUnlockedIds = rewards.filter((r) => !prevSet.has(r.id)).map((r) => r.id);

  return {
    totalScore,
    paletteScore,
    themeScore,
    creativityScore,
    rank,
    feedbackEn,
    feedbackAr,
    bonusGold,
    rewards,
    newlyUnlockedIds,
    evaluatedCount: validItems.length,
  };
}

// ============================================================================
// PIXEL-ART SPRITE RENDERERS (YACHT, VIP NPC, 30 DECOR, 8 TROPHIES, OVERLAYS)
// ============================================================================

const yachtSpriteCache = new Map<string, HTMLCanvasElement>();
const vipNpcCache = new Map<string, HTMLCanvasElement>();
const vipPropCache = new Map<string, HTMLCanvasElement>();
const vipIconCache = new Map<string, HTMLCanvasElement>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

/**
 * Luxury Pixel-Art Yacht docked at Coral Cove pier (96x56 native pixel art).
 */
export function renderLuxuryYachtSprite(animFrame: number, isNight: boolean): HTMLCanvasElement {
  const key = `yacht_${animFrame % 4}_${isNight ? 'n' : 'd'}`;
  const cached = yachtSpriteCache.get(key);
  if (cached) return cached;

  const [c, ctx] = makeCanvas(96, 56);
  const f = animFrame % 4;

  // Water shimmer reflection under hull
  px(ctx, 8, 46, 80, 6, 'rgba(14, 116, 144, 0.35)');
  px(ctx, 12 + (f % 2), 49, 70, 2, 'rgba(255, 255, 255, 0.45)');
  px(ctx, 18 - (f % 2), 52, 54, 1, 'rgba(253, 224, 71, 0.35)');

  // Lower sleek dark-navy & gold hull
  px(ctx, 12, 34, 72, 12, '#0f172a');
  px(ctx, 8, 36, 80, 8, '#1e293b');
  px(ctx, 6, 37, 84, 5, '#0f172a');
  // Tapered bow (right side)
  px(ctx, 86, 36, 5, 6, '#1e293b');
  px(ctx, 90, 35, 3, 4, '#f8fafc');
  // Crisp white upper hull
  px(ctx, 10, 27, 78, 10, '#f8fafc');
  px(ctx, 84, 28, 7, 7, '#f8fafc');
  px(ctx, 10, 35, 78, 2, '#cbd5e1');
  // 24k Gold VIP hull stripe
  px(ctx, 10, 33, 79, 2, '#f59e0b');
  px(ctx, 12, 33, 75, 1, '#fef08a');

  // Hull porthole windows (glow warm amber at night)
  const winCol = isNight ? '#fef08a' : '#38bdf8';
  const winGlow = isNight ? '#f59e0b' : '#0284c7';
  for (let i = 0; i < 6; i++) {
    px(ctx, 18 + i * 10, 30, 5, 2, winGlow);
    px(ctx, 19 + i * 10, 30, 3, 2, winCol);
  }

  // Main Deck Superstructure
  px(ctx, 18, 18, 56, 10, '#ffffff');
  px(ctx, 18, 18, 56, 2, '#e2e8f0');
  px(ctx, 70, 20, 8, 8, '#f8fafc');
  // Panoramic lounge glass
  px(ctx, 22, 21, 48, 5, '#0f172a');
  px(ctx, 23, 22, 46, 3, isNight ? '#fde047' : '#38bdf8');
  px(ctx, 26, 22, 12, 1, '#ffffff');
  px(ctx, 48, 22, 14, 1, '#ffffff');

  // Upper Sun Deck + VIP Canopy
  px(ctx, 26, 11, 38, 8, '#f8fafc');
  px(ctx, 24, 10, 42, 2, '#f59e0b');
  px(ctx, 25, 10, 40, 1, '#fef08a');
  // Upper bridge glass
  px(ctx, 34, 13, 24, 4, '#1e293b');
  px(ctx, 35, 14, 22, 2, isNight ? '#fef08a' : '#7dd3fc');

  // Mast, Radar & Fluttering Gold VIP Pennant
  px(ctx, 44, 3, 2, 8, '#cbd5e1');
  px(ctx, 41, 6, 8, 1, '#94a3b8');
  const wave = f % 2 === 0 ? 0 : 1;
  px(ctx, 46, 3 + wave, 7, 3, '#be123c');
  px(ctx, 46, 4 + wave, 5, 1, '#facc15');
  px(ctx, 53, 4 - wave, 3, 2, '#be123c');

  // Plush Red Carpet Boarding Gangplank (left stern)
  px(ctx, 4, 25, 10, 4, '#be123c');
  px(ctx, 4, 25, 10, 1, '#facc15');
  px(ctx, 4, 28, 10, 1, '#facc15');

  // Twinkling VIP sparkles on deck
  const spX = [16, 46, 78, 32][f];
  const spY = [24, 9, 26, 15][f];
  px(ctx, spX, spY, 2, 2, '#ffffff');
  px(ctx, spX - 1, spY, 4, 1, '#fef08a');

  yachtSpriteCache.set(key, c);
  return c;
}

/**
 * Madame Lumière — Mysterious VIP Stylist NPC (16x24 native pixel art).
 */
export function renderVipStylistNpcSprite(
  dir: 'down' | 'up' | 'left' | 'right',
  frame: number
): HTMLCanvasElement {
  const key = `vipnpc_${dir}_${frame % 4}`;
  const cached = vipNpcCache.get(key);
  if (cached) return cached;

  const [c, ctx] = makeCanvas(16, 24);
  const f = frame % 4;
  const bob = f === 1 || f === 3 ? -1 : 0;

  // Ground shadow
  px(ctx, 4, 22, 8, 2, 'rgba(30, 15, 10, 0.28)');

  // Couture wide-brimmed hat (plum velvet + gold ribbon)
  px(ctx, 1, 3 + bob, 14, 2, '#3b0764');
  px(ctx, 2, 2 + bob, 12, 2, '#581c87');
  px(ctx, 4, 0 + bob, 8, 3, '#4c1d95');
  px(ctx, 4, 2 + bob, 8, 1, '#facc15'); // gold band
  px(ctx, 11, 1 + bob, 2, 2, '#f43f5e'); // coral rose feather

  // Head & glam platinum-blonde bob hair
  px(ctx, 4, 5 + bob, 8, 6, '#f6cca5');
  px(ctx, 3, 5 + bob, 2, 6, '#fef3c7');
  px(ctx, 11, 5 + bob, 2, 6, '#fef3c7');
  if (dir === 'up') {
    px(ctx, 4, 5 + bob, 8, 6, '#fde68a');
  } else {
    // Iconic dark VIP sunglasses with gold bridge
    if (dir === 'left') {
      px(ctx, 4, 7 + bob, 4, 2, '#0f172a');
      px(ctx, 5, 7 + bob, 1, 1, '#38bdf8');
    } else if (dir === 'right') {
      px(ctx, 8, 7 + bob, 4, 2, '#0f172a');
      px(ctx, 10, 7 + bob, 1, 1, '#38bdf8');
    } else {
      px(ctx, 4, 7 + bob, 3, 2, '#0f172a');
      px(ctx, 9, 7 + bob, 3, 2, '#0f172a');
      px(ctx, 7, 7 + bob, 2, 1, '#facc15');
      px(ctx, 5, 7 + bob, 1, 1, '#7dd3fc');
      px(ctx, 10, 7 + bob, 1, 1, '#7dd3fc');
      // Ruby lipstick
      px(ctx, 7, 10 + bob, 2, 1, '#e11d48');
    }
  }

  // Pearl necklace
  px(ctx, 6, 11 + bob, 4, 1, '#ffffff');

  // Flowing crimson-plum couture coat + gold lapel & belt
  px(ctx, 3, 12 + bob, 10, 8, '#881337');
  px(ctx, 4, 12 + bob, 8, 7, '#be123c');
  px(ctx, 6, 12 + bob, 4, 7, '#1e1b4b'); // dark silk inner dress
  px(ctx, 6, 12 + bob, 1, 7, '#facc15'); // gold trim
  px(ctx, 9, 12 + bob, 1, 7, '#facc15');
  px(ctx, 4, 15 + bob, 8, 1, '#facc15'); // gold waist belt

  // Arms
  const armSwing = f === 1 ? 1 : f === 3 ? -1 : 0;
  px(ctx, 2, 13 + bob + armSwing, 2, 4, '#be123c');
  px(ctx, 12, 13 + bob - armSwing, 2, 4, '#be123c');

  // Gold heeled boots
  const leftLeg = f === 1 ? 1 : f === 3 ? -1 : 0;
  px(ctx, 5, 20 + leftLeg, 2, 3, '#1e1b4b');
  px(ctx, 5, 22 + leftLeg, 2, 1, '#facc15');
  px(ctx, 9, 20 - leftLeg, 2, 3, '#1e1b4b');
  px(ctx, 9, 22 - leftLeg, 2, 1, '#facc15');

  vipNpcCache.set(key, c);
  return c;
}

/**
 * Renders placeable pixel-art sprites for all 30 VIP Shop Decor items & 8 Golden Trophies (24x28 canvas).
 */
export function renderVipPropSprite(rewardId: string, animFrame = 0): HTMLCanvasElement {
  const reward = getVipReward(rewardId);
  const f = reward?.animated ? animFrame % 4 : 0;
  const key = `vprop_${rewardId}_${f}`;
  const cached = vipPropCache.get(key);
  if (cached) return cached;

  const [c, ctx] = makeCanvas(24, 28);
  const cols = reward?.colors || ['#facc15', '#fef08a', '#92400e', '#ffffff'];
  const [c1, c2, c3, c4] = cols;

  // Soft floor shadow for standing props
  const isFlatFloor =
    reward?.decorArchetype === 'carpet' ||
    reward?.decorArchetype === 'runway_tile' ||
    reward?.decorArchetype === 'mosaic_rug';
  if (!isFlatFloor) {
    px(ctx, 4, 24, 16, 3, 'rgba(32, 18, 10, 0.25)');
  }

  if (reward?.subkind === 'golden_trophy') {
    // Rich marble/obsidian plinth
    px(ctx, 5, 19, 14, 7, '#1e293b');
    px(ctx, 6, 20, 12, 5, '#334155');
    px(ctx, 4, 24, 16, 2, '#0f172a');
    px(ctx, 8, 22, 8, 2, '#facc15'); // gold engraved plaque

    const arch = reward.trophyArchetype || 'yacht_cup';
    if (arch === 'scissors') {
      px(ctx, 8, 15, 3, 4, c1);
      px(ctx, 13, 15, 3, 4, c1);
      px(ctx, 9, 16, 1, 2, '#1e293b');
      px(ctx, 14, 16, 1, 2, '#1e293b');
      px(ctx, 11, 11, 2, 5, c2);
      px(ctx, 9, 6, 2, 6, c1);
      px(ctx, 13, 6, 2, 6, c2);
    } else if (arch === 'chalice' || arch === 'yacht_cup') {
      px(ctx, 10, 14, 4, 5, c1);
      px(ctx, 7, 6, 10, 8, c1);
      px(ctx, 8, 7, 8, 5, c2);
      px(ctx, 5, 8, 2, 4, c1);
      px(ctx, 17, 8, 2, 4, c1);
      px(ctx, 10, 4, 4, 3, c3);
    } else if (arch === 'mannequin_award') {
      px(ctx, 11, 14, 2, 5, c3);
      px(ctx, 8, 8, 8, 7, c1);
      px(ctx, 9, 9, 6, 5, c2);
      px(ctx, 10, 4, 4, 4, c2);
    } else if (arch === 'obelisk' || arch === 'runway_pillar') {
      px(ctx, 9, 7, 6, 12, c1);
      px(ctx, 10, 8, 2, 11, c2);
      px(ctx, 10, 4, 4, 3, c3);
      px(ctx, 11, 2, 2, 2, '#ffffff');
    } else if (arch === 'crown_monument') {
      px(ctx, 6, 12, 12, 7, c1);
      px(ctx, 6, 7, 12, 5, c2);
      px(ctx, 6, 5, 2, 3, c2);
      px(ctx, 11, 4, 2, 4, c2);
      px(ctx, 16, 5, 2, 3, c2);
      px(ctx, 11, 9, 2, 2, c3);
    } else {
      // muse_bust
      px(ctx, 9, 14, 6, 5, c1);
      px(ctx, 8, 8, 8, 6, c1);
      px(ctx, 10, 5, 4, 4, c4);
      px(ctx, 7, 10, 10, 2, c2);
    }
    // Twinkling trophy glint
    const gx = [7, 15, 11, 16][f];
    const gy = [5, 7, 3, 10][f];
    px(ctx, gx, gy, 2, 2, '#ffffff');
    vipPropCache.set(key, c);
    return c;
  }

  const arch = reward?.decorArchetype || 'pedestal';
  switch (arch) {
    case 'golden_mannequin':
      px(ctx, 8, 22, 8, 3, c3);
      px(ctx, 11, 16, 2, 6, c1);
      px(ctx, 7, 8, 10, 9, c1);
      px(ctx, 8, 9, 8, 7, c2);
      px(ctx, 9, 12, 6, 2, c3);
      px(ctx, 10, 3, 4, 4, c2);
      px(ctx, 9, 2, 6, 1, c1);
      px(ctx, 6 + f * 3, 6, 2, 2, '#ffffff');
      break;
    case 'chandelier':
      px(ctx, 11, 1, 2, 6, c3);
      px(ctx, 4, 7, 16, 2, c3);
      px(ctx, 6, 9, 12, 5, c1);
      px(ctx, 8, 14, 8, 4, c2);
      px(ctx, 10, 18, 4, 3, c4);
      for (let i = 0; i < 4; i++) {
        px(ctx, 5 + i * 4, 5 + ((i + f) % 2), 2, 2, '#fef08a');
      }
      break;
    case 'carpet':
      px(ctx, 2, 8, 20, 16, c3);
      px(ctx, 3, 9, 18, 14, c1);
      px(ctx, 5, 11, 14, 10, c2);
      px(ctx, 9, 14, 6, 4, c3);
      break;
    case 'neon_sign':
      px(ctx, 5, 22, 14, 3, c3);
      px(ctx, 11, 16, 2, 6, c3);
      px(ctx, 3, 5, 18, 12, '#0f172a');
      px(ctx, 4, 6, 16, 10, f % 2 === 0 ? c1 : c2);
      px(ctx, 5, 7, 14, 8, '#1e1b4b');
      // Pixel "VIP" letters
      px(ctx, 6, 9, 1, 4, c1);
      px(ctx, 8, 9, 1, 4, c1);
      px(ctx, 7, 12, 1, 1, c1);
      px(ctx, 11, 9, 1, 4, c2);
      px(ctx, 14, 9, 1, 4, c1);
      px(ctx, 15, 9, 2, 2, c1);
      break;
    case 'aquarium':
      px(ctx, 2, 5, 20, 19, '#1e293b');
      px(ctx, 3, 6, 18, 16, c1);
      px(ctx, 4, 7, 16, 13, c2);
      px(ctx, 4, 18, 16, 3, '#fde68a'); // sand floor
      px(ctx, 6, 15, 3, 3, '#fb7185'); // coral
      px(ctx, 15, 16, 3, 2, '#34d399'); // kelp
      // Swimming fish
      px(ctx, 5 + f * 3, 10, 4, 2, c3);
      px(ctx, 17 - f * 2, 14, 3, 2, '#fef08a');
      // Bubbles
      px(ctx, 8, 13 - f * 2, 1, 1, '#ffffff');
      px(ctx, 14, 12 - ((f + 2) % 4) * 2, 1, 1, '#ffffff');
      break;
    case 'stanchion':
      px(ctx, 3, 22, 5, 3, c4);
      px(ctx, 16, 22, 5, 3, c4);
      px(ctx, 5, 9, 2, 13, c1);
      px(ctx, 17, 9, 2, 13, c1);
      px(ctx, 4, 7, 4, 3, c3);
      px(ctx, 16, 7, 4, 3, c3);
      px(ctx, 7, 13, 3, 2, c2);
      px(ctx, 10, 14, 4, 2, c2);
      px(ctx, 14, 13, 3, 2, c2);
      break;
    case 'fountain':
      px(ctx, 3, 18, 18, 7, '#cbd5e1');
      px(ctx, 4, 19, 16, 4, c2);
      px(ctx, 7, 10, 10, 9, c1);
      px(ctx, 9, 8, 6, 5, c3);
      px(ctx, 10, 11, 4, 3, '#ffffff'); // pearl
      px(ctx, 11, 6 - (f % 2), 2, 5, c4); // water jet
      px(ctx, 7 + f * 2, 19, 2, 1, '#ffffff');
      break;
    case 'mirror':
      px(ctx, 6, 22, 12, 3, c4);
      px(ctx, 5, 4, 14, 19, c1);
      px(ctx, 7, 6, 10, 15, c3);
      px(ctx, 8, 7, 3, 7, '#ffffff');
      px(ctx, 6, 5, 2, 2, c2);
      px(ctx, 16, 5, 2, 2, c2);
      px(ctx, 6, 19, 2, 2, c2);
      px(ctx, 16, 19, 2, 2, c2);
      break;
    case 'archway':
      px(ctx, 2, 8, 4, 17, c1);
      px(ctx, 18, 8, 4, 17, c1);
      px(ctx, 4, 4, 16, 5, c1);
      px(ctx, 6, 6, 12, 3, c2);
      for (let i = 0; i < 5; i++) {
        px(ctx, 4 + i * 4, 5 + ((i + f) % 2), 2, 2, c3);
      }
      break;
    case 'pedestal':
      px(ctx, 5, 21, 14, 4, c2);
      px(ctx, 7, 10, 10, 11, c1);
      px(ctx, 9, 11, 2, 9, c2);
      px(ctx, 13, 11, 2, 9, c2);
      px(ctx, 5, 8, 14, 3, c3);
      px(ctx, 8, 6, 8, 2, '#be123c');
      break;
    case 'runway_tile':
      px(ctx, 2, 7, 20, 17, c4);
      px(ctx, 3, 8, 18, 15, f % 2 === 0 ? c2 : c3);
      px(ctx, 5, 10, 14, 11, c1);
      px(ctx, 9, 13, 6, 5, '#ffffff');
      break;
    case 'sofa':
      px(ctx, 3, 12, 18, 9, c1);
      px(ctx, 2, 15, 4, 7, c3);
      px(ctx, 18, 15, 4, 7, c3);
      px(ctx, 5, 16, 14, 5, c2);
      px(ctx, 5, 21, 2, 4, c4);
      px(ctx, 17, 21, 2, 4, c4);
      break;
    case 'bonsai':
      px(ctx, 6, 18, 12, 6, c3);
      px(ctx, 5, 17, 14, 2, '#fef08a');
      px(ctx, 10, 11, 4, 7, c4);
      px(ctx, 4, 6, 10, 6, c1);
      px(ctx, 11, 5, 9, 6, c2);
      px(ctx, 8, 4, 7, 4, c1);
      break;
    case 'desk':
      px(ctx, 2, 12, 20, 12, c1);
      px(ctx, 2, 11, 20, 2, c2);
      px(ctx, 4, 14, 16, 8, c3);
      px(ctx, 9, 16, 6, 4, c2);
      px(ctx, 11, 17, 2, 2, c4);
      break;
    case 'lookbook_stand':
      px(ctx, 7, 21, 10, 4, c4);
      px(ctx, 10, 13, 4, 8, c4);
      px(ctx, 5, 7, 14, 7, c1);
      px(ctx, 6, 8, 12, 5, f % 2 === 0 ? c2 : c3);
      px(ctx, 9, 4 - (f % 2), 6, 3, '#ffffff');
      break;
    case 'screen':
      px(ctx, 3, 6, 5, 18, c1);
      px(ctx, 9, 5, 6, 19, c2);
      px(ctx, 16, 6, 5, 18, c1);
      px(ctx, 3, 6, 18, 1, c3);
      px(ctx, 3, 23, 18, 1, c3);
      break;
    case 'neon_palm':
      px(ctx, 7, 22, 10, 3, c4);
      px(ctx, 10, 11, 4, 11, c2);
      px(ctx, 4, 7, 8, 3, c1);
      px(ctx, 12, 7, 8, 3, c1);
      px(ctx, 6, 4, 12, 3, f % 2 === 0 ? c1 : c3);
      break;
    case 'terrarium':
      px(ctx, 5, 20, 14, 5, c4);
      px(ctx, 5, 7, 14, 13, c1);
      px(ctx, 7, 5, 10, 3, c1);
      px(ctx, 7, 14, 4, 5, c2);
      px(ctx, 13, 13, 4, 6, c3);
      px(ctx, 7, 8, 2, 4, '#ffffff');
      break;
    case 'lanterns':
      px(ctx, 11, 13, 2, 12, c4);
      px(ctx, 5, 12, 14, 2, c4);
      px(ctx, 4, 6 + (f % 2), 5, 6, c1);
      px(ctx, 10, 4 + ((f + 1) % 2), 5, 6, c2);
      px(ctx, 15, 7 + (f % 2), 5, 6, c1);
      px(ctx, 6, 8 + (f % 2), 2, 2, c3);
      px(ctx, 12, 6 + ((f + 1) % 2), 2, 2, c3);
      break;
    case 'showcase':
      px(ctx, 4, 16, 16, 9, '#1e293b');
      px(ctx, 5, 5, 14, 11, c1);
      px(ctx, 6, 6, 12, 9, 'rgba(255,255,255,0.65)');
      px(ctx, 9, 10, 6, 4, c3); // golden tiara inside
      px(ctx, 11, 8, 2, 2, c2);
      px(ctx, 6 + f * 3, 7, 2, 2, '#ffffff');
      break;
    case 'sewing_table':
      px(ctx, 3, 12, 18, 4, c1);
      px(ctx, 4, 16, 2, 9, c1);
      px(ctx, 18, 16, 2, 9, c1);
      px(ctx, 6, 8, 4, 4, c2);
      px(ctx, 12, 9, 6, 3, c3);
      px(ctx, 14, 7, 2, 2, c4);
      break;
    case 'partition':
      px(ctx, 4, 5, 16, 19, c3);
      px(ctx, 5, 6, 14, 17, c1);
      for (let y = 8; y <= 18; y += 5) {
        for (let x = 7; x <= 15; x += 4) {
          px(ctx, x, y, 2, 3, c2);
        }
      }
      break;
    case 'mosaic_rug':
      px(ctx, 2, 8, 20, 16, c4);
      px(ctx, 3, 9, 18, 14, c1);
      px(ctx, 6, 11, 12, 10, c2);
      px(ctx, 9, 13, 6, 6, c3);
      px(ctx, 11, 15, 2, 2, c4);
      break;
    case 'canopy_bench':
      px(ctx, 3, 4, 18, 4, c1);
      px(ctx, 4, 8, 2, 16, c3);
      px(ctx, 18, 8, 2, 16, c3);
      px(ctx, 5, 16, 14, 5, c2);
      px(ctx, 5, 21, 14, 2, c4);
      break;
    case 'mural':
      px(ctx, 2, 5, 20, 15, c4);
      px(ctx, 4, 7, 16, 11, c1);
      px(ctx, 4, 12, 16, 6, c2);
      px(ctx, 6, 11, 5, 2, c3);
      px(ctx, 13, 13, 5, 2, c3);
      break;
    case 'hat_tree':
      px(ctx, 8, 22, 8, 3, c1);
      px(ctx, 11, 7, 2, 15, c1);
      px(ctx, 6, 11, 12, 2, c1);
      px(ctx, 5, 8, 5, 3, c2);
      px(ctx, 14, 8, 5, 3, c3);
      px(ctx, 9, 4, 6, 3, c4);
      break;
    case 'pillar':
      px(ctx, 6, 21, 12, 4, c4);
      px(ctx, 8, 6, 8, 15, c1);
      px(ctx, 7, 9, 10, 2, c2);
      px(ctx, 7, 14, 10, 2, c2);
      px(ctx, 6, 4, 12, 3, c3);
      break;
    case 'jellyfish_tank':
      px(ctx, 5, 4, 14, 21, '#0f172a');
      px(ctx, 6, 6, 12, 17, c1);
      px(ctx, 5, 4, 14, 2, '#94a3b8');
      px(ctx, 5, 23, 14, 2, '#94a3b8');
      // Bobbing neon jellyfish
      const jy = 10 + (f % 2 === 0 ? 0 : 2);
      px(ctx, 9, jy, 6, 3, c2);
      px(ctx, 10, jy + 3, 1, 4, c3);
      px(ctx, 12, jy + 3, 1, 5, c4);
      px(ctx, 14, jy + 3, 1, 4, c3);
      break;
    case 'wall_clock':
      px(ctx, 11, 3, 2, 20, c1);
      px(ctx, 2, 12, 20, 2, c1);
      px(ctx, 5, 6, 14, 14, c1);
      px(ctx, 7, 8, 10, 10, c2);
      px(ctx, 11, 10, 2, 4, c3);
      px(ctx, 11, 12, 4, 2, c3);
      break;
    case 'ottoman':
      px(ctx, 2, 15, 9, 7, c1);
      px(ctx, 13, 15, 9, 7, c2);
      px(ctx, 3, 22, 7, 2, c3);
      px(ctx, 14, 22, 7, 2, c3);
      break;
  }

  vipPropCache.set(key, c);
  return c;
}

/**
 * Generates a crisp 24x24 preview icon canvas for ANY of the 92 VIP rewards.
 */
export function renderVipRewardIconCanvas(rewardId: string): HTMLCanvasElement {
  const cached = vipIconCache.get(rewardId);
  if (cached) return cached;

  const reward = getVipReward(rewardId);
  if (!reward) {
    const [c] = makeCanvas(24, 24);
    return c;
  }

  if (reward.subkind === 'shop_decor' || reward.subkind === 'golden_trophy') {
    const prop = renderVipPropSprite(rewardId, 0);
    const [c, ctx] = makeCanvas(24, 24);
    ctx.drawImage(prop, 0, -2, 24, 26);
    vipIconCache.set(rewardId, c);
    return c;
  }

  const [c, ctx] = makeCanvas(24, 24);
  const [c1, c2, c3, c4] = reward.colors;

  if (reward.subkind === 'studio_palette' && reward.studioPalette) {
    px(ctx, 2, 4, 20, 16, '#45230d');
    px(ctx, 3, 5, 18, 14, '#f5e6c8');
    reward.studioPalette.slice(0, 6).forEach((hex, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      px(ctx, 4 + col * 6, 6 + row * 6, 5, 5, hex);
    });
  } else if (reward.subkind === 'studio_brush') {
    px(ctx, 4, 16, 6, 5, c1);
    px(ctx, 8, 12, 6, 6, c2);
    px(ctx, 12, 7, 6, 6, c3);
    px(ctx, 16, 3, 4, 4, c4);
    px(ctx, 3, 18, 3, 3, '#ffffff');
  } else if (reward.subkind === 'studio_sticker' && reward.stickerPattern) {
    px(ctx, 2, 2, 20, 20, '#291709');
    px(ctx, 3, 3, 18, 18, '#fef3c7');
    reward.stickerPattern.forEach((rowStr, y) => {
      for (let x = 0; x < rowStr.length; x++) {
        const ch = rowStr[x];
        if (ch === '1') px(ctx, 4 + x * 3, 4 + y * 3, 3, 3, c1);
        if (ch === '2') px(ctx, 4 + x * 3, 4 + y * 3, 3, 3, c2);
      }
    });
  } else if (reward.subkind === 'pet_accessory') {
    px(ctx, 4, 14, 16, 7, '#f5e6c8');
    px(ctx, 6, 6, 12, 10, c1);
    px(ctx, 8, 8, 8, 6, c2);
    px(ctx, 10, 4, 4, 4, c3);
  } else if (reward.subkind === 'boat_skin') {
    px(ctx, 2, 15, 20, 5, '#0ea5e9');
    px(ctx, 4, 11, 16, 6, c1);
    px(ctx, 6, 13, 12, 2, c2);
    px(ctx, 11, 4, 2, 8, '#cbd5e1');
    px(ctx, 13, 5, 6, 5, c3);
  } else if (reward.subkind === 'prestige_title') {
    px(ctx, 2, 6, 20, 12, reward.titleBorder || c1);
    px(ctx, 3, 7, 18, 10, reward.titleBg || c3);
    px(ctx, 10, 9, 4, 6, reward.titleText || c2);
    px(ctx, 6, 11, 12, 2, reward.titleText || c2);
  }

  vipIconCache.set(rewardId, c);
  return c;
}

// ============================================================================
// LIVE OVERLAY RENDERERS FOR EQUIPPED PET ACCESSORIES & BOAT SKINS
// ============================================================================

export function drawPetAccessoryOverlay(
  ctx: CanvasRenderingContext2D,
  accessoryId: string | null | undefined,
  petScreenX: number,
  petScreenY: number,
  scale: number,
  timeSec: number
): void {
  if (!accessoryId) return;
  const reward = getVipReward(accessoryId);
  if (!reward || reward.subkind !== 'pet_accessory') return;

  const s = Math.max(1, Math.round(scale));
  const x = Math.round(petScreenX);
  const y = Math.round(petScreenY);
  const [c1, c2, c3] = reward.colors;

  ctx.save();
  switch (accessoryId) {
    case 'vip_pet_01': // Golden Crown
      ctx.fillStyle = c1;
      ctx.fillRect(x + 4 * s, y + 1 * s, 6 * s, 2 * s);
      ctx.fillRect(x + 4 * s, y, 1 * s, 1 * s);
      ctx.fillRect(x + 6 * s, y - 1 * s, 2 * s, 2 * s);
      ctx.fillRect(x + 9 * s, y, 1 * s, 1 * s);
      ctx.fillStyle = c2;
      ctx.fillRect(x + 6 * s, y + 1 * s, 2 * s, 1 * s);
      break;
    case 'vip_pet_02': // Royal Crimson Cape
      ctx.fillStyle = c1;
      ctx.fillRect(x + 2 * s, y + 7 * s, 10 * s, 4 * s);
      ctx.fillStyle = c2;
      ctx.fillRect(x + 2 * s, y + 10 * s, 10 * s, 1 * s);
      ctx.fillStyle = c3;
      ctx.fillRect(x + 4 * s, y + 6 * s, 6 * s, 1 * s);
      break;
    case 'vip_pet_03': {
      // Starlight Halo
      const bob = Math.round(Math.sin(timeSec * 4) * s * 0.6);
      ctx.fillStyle = c1;
      ctx.fillRect(x + 3 * s, y - 2 * s + bob, 8 * s, 1 * s);
      ctx.fillStyle = c2;
      ctx.fillRect(x + 5 * s, y - 3 * s + bob, 4 * s, 1 * s);
      break;
    }
    case 'vip_pet_04': // Yacht Captain Hat
      ctx.fillStyle = c1;
      ctx.fillRect(x + 3 * s, y, 8 * s, 2 * s);
      ctx.fillStyle = c2;
      ctx.fillRect(x + 3 * s, y + 2 * s, 8 * s, 1 * s);
      ctx.fillStyle = c3;
      ctx.fillRect(x + 6 * s, y + 1 * s, 2 * s, 1 * s);
      break;
    case 'vip_pet_05': // Coral Hibiscus Bow
      ctx.fillStyle = c1;
      ctx.fillRect(x + 3 * s, y + 1 * s, 3 * s, 2 * s);
      ctx.fillRect(x + 8 * s, y + 1 * s, 3 * s, 2 * s);
      ctx.fillStyle = c2;
      ctx.fillRect(x + 6 * s, y + 1 * s, 2 * s, 2 * s);
      break;
    case 'vip_pet_06': // Pearl Collar
      ctx.fillStyle = c1;
      ctx.fillRect(x + 4 * s, y + 7 * s, 6 * s, 1 * s);
      ctx.fillStyle = c2;
      ctx.fillRect(x + 6 * s, y + 8 * s, 2 * s, 1 * s);
      break;
    case 'vip_pet_07': // VIP Shades
      ctx.fillStyle = c1;
      ctx.fillRect(x + 3 * s, y + 4 * s, 3 * s, 2 * s);
      ctx.fillRect(x + 8 * s, y + 4 * s, 3 * s, 2 * s);
      ctx.fillStyle = c2;
      ctx.fillRect(x + 6 * s, y + 4 * s, 2 * s, 1 * s);
      break;
    case 'vip_pet_08': {
      // Fairy Sparkle Wings
      const flap = Math.sin(timeSec * 10) > 0 ? 0 : s;
      ctx.fillStyle = c1;
      ctx.fillRect(x - 1 * s, y + 5 * s - flap, 3 * s, 4 * s);
      ctx.fillRect(x + 12 * s, y + 5 * s - flap, 3 * s, 4 * s);
      ctx.fillStyle = c2;
      ctx.fillRect(x, y + 6 * s - flap, 2 * s, 2 * s);
      ctx.fillRect(x + 12 * s, y + 6 * s - flap, 2 * s, 2 * s);
      break;
    }
    case 'vip_pet_09': // Velvet Silk Scarf
      ctx.fillStyle = c1;
      ctx.fillRect(x + 3 * s, y + 7 * s, 8 * s, 2 * s);
      ctx.fillRect(x + 10 * s, y + 8 * s, 3 * s, 2 * s);
      ctx.fillStyle = c2;
      ctx.fillRect(x + 11 * s, y + 9 * s, 2 * s, 1 * s);
      break;
    case 'vip_pet_10': // Diamond Tiara
      ctx.fillStyle = c1;
      ctx.fillRect(x + 4 * s, y + 1 * s, 6 * s, 1 * s);
      ctx.fillStyle = c2;
      ctx.fillRect(x + 6 * s, y - 1 * s, 2 * s, 2 * s);
      ctx.fillStyle = c3;
      ctx.fillRect(x + 4 * s, y, 1 * s, 1 * s);
      ctx.fillRect(x + 9 * s, y, 1 * s, 1 * s);
      break;
  }
  ctx.restore();
}

export function drawBoatSkinOverlay(
  ctx: CanvasRenderingContext2D,
  skinId: string | null | undefined,
  bx: number,
  by: number,
  w: number,
  h: number,
  scale: number,
  timeSec: number
): void {
  if (!skinId) return;
  const reward = getVipReward(skinId);
  if (!reward || reward.subkind !== 'boat_skin') return;

  const [c1, c2, c3] = reward.colors;
  const s = Math.max(1, Math.round(scale));

  ctx.save();
  // Luxury hull trim stripe
  ctx.fillStyle = c1;
  ctx.fillRect(Math.round(bx + w * 0.14), Math.round(by + h * 0.64), Math.round(w * 0.72), Math.max(2, s));
  ctx.fillStyle = c2;
  ctx.fillRect(Math.round(bx + w * 0.2), Math.round(by + h * 0.72), Math.round(w * 0.6), Math.max(1, Math.round(s * 0.7)));

  // Fluttering VIP pennant flag on stern/bow
  const wave = Math.round(Math.sin(timeSec * 6) * s * 0.5);
  const poleX = Math.round(bx + w * 0.82);
  const poleY = Math.round(by + h * 0.18);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(poleX, poleY, Math.max(2, Math.round(s * 0.6)), Math.round(h * 0.42));
  ctx.fillStyle = c1;
  ctx.fillRect(poleX + s, poleY + wave, 4 * s, 2 * s);
  ctx.fillStyle = c3;
  ctx.fillRect(poleX + s, poleY + wave + s, 3 * s, s);

  // Shimmering wake sparkles behind boat
  const phase = Math.floor(timeSec * 6) % 3;
  ctx.fillStyle = c2;
  for (let i = 0; i < 3; i++) {
    const sx = bx + w * (0.18 + i * 0.28) + ((phase + i) % 2) * s;
    const sy = by + h * 0.88 + ((i + phase) % 2) * s;
    ctx.fillRect(Math.round(sx), Math.round(sy), s, s);
  }
  ctx.restore();
}

// ============================================================================
// DESIGN STUDIO SPECIAL BRUSH & STICKER HELPERS
// ============================================================================

const RAINBOW_THREAD_HEXES = ['#f43f5e', '#fb923c', '#facc15', '#10b981', '#38bdf8', '#a855f7'];
const GOLD_TRIM_HEXES = ['#f59e0b', '#facc15', '#fef08a', '#d97706'];

export function computeVipBrushPaint(
  brushMode: VipBrushMode,
  x: number,
  y: number,
  baseHex: string,
  strokeIdx: number
): Array<{ x: number; y: number; hex: string }> {
  const out: Array<{ x: number; y: number; hex: string }> = [];
  const inBounds = (cx: number, cy: number) => cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE;

  switch (brushMode) {
    case 'sparkle_scatter':
      out.push({ x, y, hex: (x + y) % 3 === 0 ? '#fef9c3' : baseHex });
      if ((x + y) % 2 === 0 && inBounds(x + 1, y)) out.push({ x: x + 1, y, hex: '#ffffff' });
      break;
    case 'pearl_dither':
      out.push({ x, y, hex: (x + y) % 2 === 0 ? baseHex : '#f8fafc' });
      break;
    case 'checker_weave':
      out.push({ x, y, hex: (x + y) % 2 === 0 ? baseHex : '#291709' });
      break;
    case 'gold_trim':
      out.push({ x, y, hex: GOLD_TRIM_HEXES[(x + y) % GOLD_TRIM_HEXES.length] });
      break;
    case 'velvet_spray':
      out.push({ x, y, hex: baseHex });
      if (inBounds(x, y + 1) && (x + y) % 2 === 0) out.push({ x, y: y + 1, hex: baseHex });
      break;
    case 'coral_stripe':
      out.push({ x, y, hex: y % 2 === 0 ? baseHex : '#ffffff' });
      break;
    case 'star_stitch':
      out.push({ x, y, hex: x % 3 === 0 && y % 3 === 0 ? '#fde047' : baseHex });
      break;
    case 'rainbow_thread':
      out.push({ x, y, hex: RAINBOW_THREAD_HEXES[(strokeIdx + x + y) % RAINBOW_THREAD_HEXES.length] });
      break;
  }

  return out.filter((p) => inBounds(p.x, p.y));
}

export function stampVipStickerOnGrid(
  grid: (string | null)[][],
  stickerId: string,
  centerX: number,
  centerY: number,
  mirrorX: boolean
): (string | null)[][] {
  const reward = getVipReward(stickerId);
  if (!reward || !reward.stickerPattern) return grid;
  const next = grid.map((r) => [...r]);
  const [c1, c2] = reward.colors;

  const stampAt = (cx: number, cy: number) => {
    reward.stickerPattern!.forEach((rowStr, dy) => {
      for (let dx = 0; dx < rowStr.length; dx++) {
        const ch = rowStr[dx];
        if (ch === '.') continue;
        const tx = cx + dx - 2;
        const ty = cy + dy - 2;
        if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
          next[ty][tx] = ch === '1' ? c1 : c2;
        }
      }
    });
  };

  stampAt(centerX, centerY);
  if (mirrorX) {
    stampAt(GRID_SIZE - 1 - centerX, centerY);
  }
  return next;
}

export function isItemMatchingVipTheme(item: ClothingItem | null | undefined, theme: VipFashionTheme): boolean {
  if (!item) return false;
  const lower = (item.name || '').toLowerCase();
  if (theme.keywords.some((kw) => lower.includes(kw.toLowerCase()))) return true;
  if (theme.bonusEffect && item.effect === theme.bonusEffect) return true;
  if (theme.bonusNightNeon && item.reactive?.nightNeon) return true;
  if (theme.bonusRainMode && item.reactive?.rainMode) return true;
  const pal = Array.isArray(item.palette) ? item.palette : [];
  return pal.some((hex) => {
    const fam = classifyHexColor(hex);
    return fam !== null && theme.targetColors.includes(fam);
  });
}

// Keep unused PALETTE_CODES reference avoided cleanly
export const _VIP_PALETTE_REF = PALETTE_CODES.length;
