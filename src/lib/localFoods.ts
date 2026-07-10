// Local (Malaysian / SEA) food reference — factual per-serving nutrition used to
// power manual search, quick-add, the offline fallback, and to GROUND the AI
// vision result against vetted local values.
//
// Values are typical single servings, cross-referenced with the Malaysian Food
// Composition Database (MyFCD, MOH Malaysia — https://myfcd.moh.gov.my) and
// common nutrition sources. Nutrition facts are factual data, not proprietary.

import { MYFCD_FOODS } from './myfcdFoods'

export type FoodCategory =
  | 'Rice'
  | 'Noodles'
  | 'Roti & Bread'
  | 'Meat'
  | 'Seafood'
  | 'Egg'
  | 'Vegetable'
  | 'Soup'
  | 'Snack'
  | 'Dessert'
  | 'Drink'
  | 'Fruit'
  | 'Basics'

export interface LocalFood {
  name: string
  emoji: string
  category: FoodCategory
  serving: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** search aliases (romanised / common spellings) */
  aka?: string[]
}

const CURATED_LOCAL_FOODS: LocalFood[] = [
  // Rice
  { name: 'Nasi Lemak (with sambal, egg, anchovies)', emoji: '🍚', category: 'Rice', serving: '1 plate', kcal: 644, protein: 17, carbs: 80, fat: 28, aka: ['nasi lemak'] },
  { name: 'Nasi Lemak Ayam Goreng', emoji: '🍗', category: 'Rice', serving: '1 plate', kcal: 885, protein: 34, carbs: 92, fat: 42, aka: ['nasi lemak ayam'] },
  { name: 'Nasi Goreng Kampung', emoji: '🍚', category: 'Rice', serving: '1 plate', kcal: 636, protein: 20, carbs: 82, fat: 24, aka: ['fried rice', 'nasi goreng'] },
  { name: 'Nasi Ayam (Chicken Rice)', emoji: '🍗', category: 'Rice', serving: '1 plate', kcal: 607, protein: 30, carbs: 75, fat: 20, aka: ['chicken rice', 'nasi ayam'] },
  { name: 'Nasi Kandar (with curry)', emoji: '🍛', category: 'Rice', serving: '1 plate', kcal: 720, protein: 28, carbs: 88, fat: 30, aka: ['nasi kandar'] },
  { name: 'Nasi Kerabu', emoji: '🍚', category: 'Rice', serving: '1 plate', kcal: 560, protein: 22, carbs: 78, fat: 18, aka: ['nasi kerabu'] },
  { name: 'Nasi Dagang', emoji: '🍚', category: 'Rice', serving: '1 plate', kcal: 640, protein: 24, carbs: 74, fat: 28, aka: ['nasi dagang'] },
  { name: 'Steamed White Rice', emoji: '🍚', category: 'Rice', serving: '1 cup', kcal: 205, protein: 4, carbs: 45, fat: 0, aka: ['nasi putih', 'white rice'] },
  { name: 'Briyani Rice with Chicken', emoji: '🍛', category: 'Rice', serving: '1 plate', kcal: 780, protein: 32, carbs: 90, fat: 32, aka: ['briyani', 'biryani'] },

  // Noodles
  { name: 'Mee Goreng Mamak', emoji: '🍜', category: 'Noodles', serving: '1 plate', kcal: 577, protein: 18, carbs: 76, fat: 21, aka: ['mee goreng'] },
  { name: 'Char Kway Teow', emoji: '🍳', category: 'Noodles', serving: '1 plate', kcal: 742, protein: 23, carbs: 76, fat: 38, aka: ['char kuey teow', 'ckt'] },
  { name: 'Laksa (Curry)', emoji: '🍲', category: 'Noodles', serving: '1 bowl', kcal: 520, protein: 21, carbs: 55, fat: 24, aka: ['curry laksa', 'laksa lemak'] },
  { name: 'Asam Laksa (Penang)', emoji: '🍲', category: 'Noodles', serving: '1 bowl', kcal: 380, protein: 18, carbs: 60, fat: 8, aka: ['asam laksa'] },
  { name: 'Wan Tan Mee (dry)', emoji: '🍜', category: 'Noodles', serving: '1 bowl', kcal: 480, protein: 22, carbs: 62, fat: 15, aka: ['wantan mee', 'wonton noodles'] },
  { name: 'Hokkien Mee (KL, dark)', emoji: '🍜', category: 'Noodles', serving: '1 plate', kcal: 660, protein: 24, carbs: 78, fat: 28, aka: ['hokkien mee'] },
  { name: 'Mee Rebus', emoji: '🍜', category: 'Noodles', serving: '1 bowl', kcal: 460, protein: 16, carbs: 68, fat: 14, aka: ['mee rebus'] },
  { name: 'Maggi Goreng', emoji: '🍜', category: 'Noodles', serving: '1 plate', kcal: 540, protein: 16, carbs: 70, fat: 22, aka: ['maggi goreng'] },
  { name: 'Bihun Soup', emoji: '🍲', category: 'Noodles', serving: '1 bowl', kcal: 320, protein: 18, carbs: 46, fat: 7, aka: ['bihun sup', 'vermicelli soup'] },

  // Roti & Bread
  { name: 'Roti Canai (plain)', emoji: '🫓', category: 'Roti & Bread', serving: '1 piece', kcal: 301, protein: 7, carbs: 41, fat: 12, aka: ['roti canai', 'roti prata'] },
  { name: 'Roti Telur', emoji: '🫓', category: 'Roti & Bread', serving: '1 piece', kcal: 400, protein: 13, carbs: 44, fat: 19, aka: ['roti telur'] },
  { name: 'Thosai / Tosai (plain)', emoji: '🫓', category: 'Roti & Bread', serving: '1 piece', kcal: 170, protein: 4, carbs: 30, fat: 4, aka: ['thosai', 'dosa', 'tosai'] },
  { name: 'Capati (Chapati)', emoji: '🫓', category: 'Roti & Bread', serving: '1 piece', kcal: 240, protein: 8, carbs: 36, fat: 7, aka: ['chapati', 'capati'] },
  { name: 'Roti Bakar with Kaya & Butter', emoji: '🍞', category: 'Roti & Bread', serving: '2 slices', kcal: 300, protein: 6, carbs: 42, fat: 12, aka: ['roti bakar', 'kaya toast'] },

  // Meat
  { name: 'Ayam Goreng (Fried Chicken)', emoji: '🍗', category: 'Meat', serving: '1 piece', kcal: 280, protein: 26, carbs: 8, fat: 16, aka: ['ayam goreng', 'fried chicken'] },
  { name: 'Rendang Daging (Beef)', emoji: '🥘', category: 'Meat', serving: '1 serving', kcal: 470, protein: 28, carbs: 10, fat: 36, aka: ['rendang', 'beef rendang'] },
  { name: 'Ayam Masak Merah', emoji: '🍗', category: 'Meat', serving: '1 serving', kcal: 340, protein: 27, carbs: 14, fat: 20, aka: ['masak merah'] },
  { name: 'Satay Chicken (6 sticks)', emoji: '🍢', category: 'Meat', serving: '6 sticks', kcal: 360, protein: 34, carbs: 12, fat: 20, aka: ['satay', 'sate'] },
  { name: 'Sup Tulang (Bone Soup)', emoji: '🍲', category: 'Meat', serving: '1 bowl', kcal: 320, protein: 26, carbs: 8, fat: 20, aka: ['sup tulang'] },
  { name: 'Chicken Chop', emoji: '🍗', category: 'Meat', serving: '1 plate', kcal: 620, protein: 38, carbs: 42, fat: 32, aka: ['chicken chop'] },

  // Seafood
  { name: 'Ikan Bakar (Grilled Fish)', emoji: '🐟', category: 'Seafood', serving: '1 fish', kcal: 300, protein: 34, carbs: 4, fat: 16, aka: ['ikan bakar', 'grilled fish'] },
  { name: 'Sotong Goreng Tepung', emoji: '🦑', category: 'Seafood', serving: '1 serving', kcal: 360, protein: 22, carbs: 28, fat: 18, aka: ['fried squid', 'sotong'] },
  { name: 'Udang Masak Lemak', emoji: '🦐', category: 'Seafood', serving: '1 serving', kcal: 300, protein: 24, carbs: 8, fat: 18, aka: ['prawn', 'udang'] },
  { name: 'Grilled Salmon Bowl', emoji: '🍣', category: 'Seafood', serving: '1 bowl', kcal: 640, protein: 42, carbs: 58, fat: 24, aka: ['salmon bowl', 'salmon'] },

  // Egg
  { name: 'Boiled Egg', emoji: '🥚', category: 'Egg', serving: '1 egg', kcal: 78, protein: 6, carbs: 1, fat: 5, aka: ['telur rebus', 'boiled egg'] },
  { name: 'Telur Goreng (Fried Egg)', emoji: '🍳', category: 'Egg', serving: '1 egg', kcal: 90, protein: 6, carbs: 0, fat: 7, aka: ['telur goreng', 'fried egg'] },
  { name: 'Telur Dadar (Omelette)', emoji: '🍳', category: 'Egg', serving: '2 eggs', kcal: 200, protein: 13, carbs: 2, fat: 15, aka: ['telur dadar', 'omelette'] },
  { name: 'Half-Boiled Eggs (2)', emoji: '🥚', category: 'Egg', serving: '2 eggs', kcal: 150, protein: 12, carbs: 1, fat: 10, aka: ['half boiled egg', 'soft boiled'] },

  // Vegetable
  { name: 'Sayur Campur (Mixed Veg)', emoji: '🥬', category: 'Vegetable', serving: '1 serving', kcal: 120, protein: 5, carbs: 12, fat: 6, aka: ['sayur', 'mixed veg'] },
  { name: 'Kangkung Belacan', emoji: '🥬', category: 'Vegetable', serving: '1 serving', kcal: 160, protein: 6, carbs: 10, fat: 11, aka: ['kangkung', 'water spinach'] },
  { name: 'Ulam with Sambal', emoji: '🥗', category: 'Vegetable', serving: '1 serving', kcal: 90, protein: 4, carbs: 8, fat: 5, aka: ['ulam'] },
  { name: 'Acar (Pickled Veg)', emoji: '🥗', category: 'Vegetable', serving: '1 serving', kcal: 140, protein: 3, carbs: 14, fat: 9, aka: ['acar'] },

  // Soup
  { name: 'Sup Ayam (Chicken Soup)', emoji: '🍲', category: 'Soup', serving: '1 bowl', kcal: 210, protein: 22, carbs: 10, fat: 9, aka: ['sup ayam', 'chicken soup'] },
  { name: 'Bak Kut Teh', emoji: '🍲', category: 'Soup', serving: '1 bowl', kcal: 420, protein: 30, carbs: 12, fat: 28, aka: ['bak kut teh', 'bkt'] },
  { name: 'Tom Yam Seafood', emoji: '🍲', category: 'Soup', serving: '1 bowl', kcal: 300, protein: 24, carbs: 16, fat: 15, aka: ['tom yam', 'tomyam'] },

  // Snack
  { name: 'Karipap (Curry Puff)', emoji: '🥟', category: 'Snack', serving: '1 piece', kcal: 130, protein: 3, carbs: 15, fat: 7, aka: ['curry puff', 'karipap'] },
  { name: 'Pisang Goreng (Banana Fritter)', emoji: '🍌', category: 'Snack', serving: '2 pieces', kcal: 220, protein: 2, carbs: 32, fat: 10, aka: ['pisang goreng', 'banana fritter'] },
  { name: 'Cucur Udang', emoji: '🍤', category: 'Snack', serving: '2 pieces', kcal: 240, protein: 6, carbs: 26, fat: 12, aka: ['cucur udang', 'prawn fritter'] },
  { name: 'Popiah (Fresh)', emoji: '🌯', category: 'Snack', serving: '1 roll', kcal: 180, protein: 6, carbs: 26, fat: 6, aka: ['popiah', 'spring roll'] },
  { name: 'Kuih Lapis', emoji: '🍰', category: 'Snack', serving: '1 piece', kcal: 150, protein: 1, carbs: 24, fat: 6, aka: ['kuih', 'kueh'] },
  { name: 'Keropok Lekor', emoji: '🍢', category: 'Snack', serving: '1 serving', kcal: 210, protein: 8, carbs: 26, fat: 8, aka: ['keropok lekor'] },

  // Dessert
  { name: 'Cendol', emoji: '🍧', category: 'Dessert', serving: '1 bowl', kcal: 290, protein: 3, carbs: 52, fat: 9, aka: ['cendol', 'chendol'] },
  { name: 'Ais Kacang (ABC)', emoji: '🍧', category: 'Dessert', serving: '1 bowl', kcal: 320, protein: 5, carbs: 64, fat: 6, aka: ['ais kacang', 'abc'] },
  { name: 'Bubur Cha Cha', emoji: '🍮', category: 'Dessert', serving: '1 bowl', kcal: 280, protein: 3, carbs: 50, fat: 8, aka: ['bubur cha cha'] },
  { name: 'Kaya Ball / Onde-onde', emoji: '🍡', category: 'Dessert', serving: '4 pieces', kcal: 200, protein: 2, carbs: 34, fat: 6, aka: ['onde onde', 'buah melaka'] },

  // Drink
  { name: 'Teh Tarik', emoji: '🥤', category: 'Drink', serving: '1 cup', kcal: 130, protein: 3, carbs: 22, fat: 3, aka: ['teh tarik'] },
  { name: 'Kopi O', emoji: '☕', category: 'Drink', serving: '1 cup', kcal: 60, protein: 0, carbs: 15, fat: 0, aka: ['kopi o'] },
  { name: 'Milo Ais', emoji: '🥤', category: 'Drink', serving: '1 glass', kcal: 210, protein: 5, carbs: 34, fat: 6, aka: ['milo ais', 'milo'] },
  { name: 'Sirap Bandung', emoji: '🥤', category: 'Drink', serving: '1 glass', kcal: 180, protein: 3, carbs: 34, fat: 4, aka: ['bandung', 'sirap bandung'] },
  { name: 'Fresh Orange Juice', emoji: '🍊', category: 'Drink', serving: '1 glass', kcal: 110, protein: 2, carbs: 26, fat: 0, aka: ['orange juice'] },
  { name: 'Kelapa (Coconut Water)', emoji: '🥥', category: 'Drink', serving: '1 coconut', kcal: 90, protein: 3, carbs: 18, fat: 1, aka: ['coconut water', 'air kelapa'] },

  // Fruit
  { name: 'Durian (4 seeds)', emoji: '🥭', category: 'Fruit', serving: '4 seeds', kcal: 200, protein: 2, carbs: 37, fat: 6, aka: ['durian'] },
  { name: 'Banana (Pisang)', emoji: '🍌', category: 'Fruit', serving: '1 medium', kcal: 105, protein: 1, carbs: 27, fat: 0, aka: ['pisang', 'banana'] },
  { name: 'Papaya', emoji: '🍈', category: 'Fruit', serving: '1 cup', kcal: 62, protein: 1, carbs: 16, fat: 0, aka: ['betik', 'papaya'] },
  { name: 'Watermelon (Tembikai)', emoji: '🍉', category: 'Fruit', serving: '1 cup', kcal: 46, protein: 1, carbs: 12, fat: 0, aka: ['tembikai', 'watermelon'] },

  // Basics / Western
  { name: 'Chicken Breast (grilled)', emoji: '🍗', category: 'Basics', serving: '150 g', kcal: 248, protein: 46, carbs: 0, fat: 5, aka: ['chicken breast'] },
  { name: 'Protein Oats & Eggs', emoji: '🥣', category: 'Basics', serving: '1 bowl', kcal: 540, protein: 38, carbs: 52, fat: 18, aka: ['oats', 'oatmeal'] },
  { name: 'Greek Yogurt & Berries', emoji: '🫐', category: 'Basics', serving: '1 cup', kcal: 220, protein: 20, carbs: 24, fat: 5, aka: ['greek yogurt'] },
  { name: 'Protein Shake (whey)', emoji: '🥤', category: 'Basics', serving: '1 scoop', kcal: 180, protein: 30, carbs: 8, fat: 3, aka: ['protein shake', 'whey'] },
  { name: 'Avocado (half)', emoji: '🥑', category: 'Basics', serving: 'half', kcal: 160, protein: 2, carbs: 3, fat: 15, aka: ['avocado'] },
  { name: 'Caesar Salad w/ Chicken', emoji: '🥗', category: 'Basics', serving: '1 bowl', kcal: 420, protein: 32, carbs: 12, fat: 26, aka: ['caesar salad', 'salad'] },

  // Mamak & Western-mamak
  { name: 'Buttermilk Chicken', emoji: '🍗', category: 'Meat', serving: '1 serving', kcal: 520, protein: 32, carbs: 26, fat: 32, aka: ['buttermilk chicken', 'ayam buttermilk'] },
  { name: 'Nasi Goreng Pattaya', emoji: '🍳', category: 'Rice', serving: '1 plate', kcal: 700, protein: 22, carbs: 84, fat: 30, aka: ['pattaya', 'nasi goreng pattaya'] },
  { name: 'Nasi Goreng USA', emoji: '🍚', category: 'Rice', serving: '1 plate', kcal: 880, protein: 38, carbs: 92, fat: 40, aka: ['nasi goreng usa'] },
  { name: 'Roti Tisu', emoji: '🫓', category: 'Roti & Bread', serving: '1 piece', kcal: 380, protein: 6, carbs: 58, fat: 14, aka: ['roti tisu'] },
  { name: 'Roti John', emoji: '🥖', category: 'Roti & Bread', serving: '1 serving', kcal: 560, protein: 24, carbs: 52, fat: 28, aka: ['roti john'] },
  { name: 'Murtabak Ayam', emoji: '🫓', category: 'Roti & Bread', serving: '1 piece', kcal: 480, protein: 22, carbs: 44, fat: 24, aka: ['murtabak'] },
  { name: 'Naan with Curry', emoji: '🫓', category: 'Roti & Bread', serving: '1 piece', kcal: 320, protein: 9, carbs: 48, fat: 10, aka: ['naan'] },
  { name: 'Tandoori Chicken', emoji: '🍗', category: 'Meat', serving: '1 quarter', kcal: 300, protein: 34, carbs: 6, fat: 16, aka: ['tandoori'] },
  { name: 'Banana Leaf Rice', emoji: '🍛', category: 'Rice', serving: '1 set', kcal: 720, protein: 22, carbs: 96, fat: 26, aka: ['banana leaf'] },
  { name: 'Maggi Kari (cooked)', emoji: '🍜', category: 'Noodles', serving: '1 pack', kcal: 400, protein: 8, carbs: 54, fat: 16, aka: ['maggi kari', 'maggi curry'] },
  { name: 'Nasi Ayam Penyet', emoji: '🍗', category: 'Rice', serving: '1 plate', kcal: 780, protein: 40, carbs: 78, fat: 34, aka: ['ayam penyet', 'penyet'] },

  // Instant / packaged noodles
  { name: 'Mi Sedaap Goreng', emoji: '🍜', category: 'Noodles', serving: '1 pack', kcal: 330, protein: 7, carbs: 47, fat: 13, aka: ['mi sedaap', 'mee sedap', 'mi sedap goreng'] },
  { name: 'Mi Sedaap Soto', emoji: '🍲', category: 'Noodles', serving: '1 pack', kcal: 350, protein: 8, carbs: 50, fat: 13, aka: ['mi sedaap soto'] },
  { name: 'Maggi Goreng Pack', emoji: '🍜', category: 'Noodles', serving: '1 pack', kcal: 350, protein: 8, carbs: 49, fat: 14, aka: ['maggi pack', 'indomie goreng', 'indomie'] },
  { name: 'Cup Noodles', emoji: '🍜', category: 'Noodles', serving: '1 cup', kcal: 300, protein: 6, carbs: 42, fat: 12, aka: ['cup noodle', 'cintan'] },

  // Chinese-Malaysian
  { name: 'Char Siew Rice', emoji: '🍖', category: 'Rice', serving: '1 plate', kcal: 620, protein: 30, carbs: 78, fat: 20, aka: ['char siew', 'bbq pork rice'] },
  { name: 'Claypot Chicken Rice', emoji: '🍲', category: 'Rice', serving: '1 pot', kcal: 660, protein: 30, carbs: 82, fat: 22, aka: ['claypot rice'] },
  { name: 'Pan Mee', emoji: '🍜', category: 'Noodles', serving: '1 bowl', kcal: 480, protein: 20, carbs: 62, fat: 16, aka: ['pan mee', 'ban mian'] },
  { name: 'Yong Tau Foo (dry)', emoji: '🍢', category: 'Soup', serving: '1 bowl', kcal: 380, protein: 24, carbs: 34, fat: 16, aka: ['yong tau foo', 'ytf'] },
  { name: 'Dim Sum (mixed, 4)', emoji: '🥟', category: 'Snack', serving: '4 pieces', kcal: 320, protein: 16, carbs: 34, fat: 13, aka: ['dim sum', 'dimsum'] },
  { name: 'Wan Tan Soup', emoji: '🥟', category: 'Soup', serving: '1 bowl', kcal: 220, protein: 14, carbs: 24, fat: 8, aka: ['wantan soup'] },
  { name: 'Chee Cheong Fun', emoji: '🍥', category: 'Snack', serving: '1 plate', kcal: 300, protein: 8, carbs: 48, fat: 8, aka: ['chee cheong fun', 'ccf'] },

  // Western / fast food
  { name: 'Fried Chicken (KFC-style, 1pc)', emoji: '🍗', category: 'Meat', serving: '1 piece', kcal: 320, protein: 22, carbs: 10, fat: 21, aka: ['fried chicken', 'kfc'] },
  { name: 'Ramly Burger Special', emoji: '🍔', category: 'Snack', serving: '1 burger', kcal: 550, protein: 24, carbs: 38, fat: 34, aka: ['ramly', 'ramly burger'] },
  { name: 'Fish & Chips', emoji: '🍟', category: 'Seafood', serving: '1 plate', kcal: 780, protein: 34, carbs: 68, fat: 40, aka: ['fish and chips'] },
  { name: 'Lamb Chop', emoji: '🍖', category: 'Meat', serving: '1 plate', kcal: 640, protein: 40, carbs: 32, fat: 38, aka: ['lamb chop'] },
  { name: 'French Fries', emoji: '🍟', category: 'Snack', serving: '1 medium', kcal: 340, protein: 4, carbs: 44, fat: 17, aka: ['fries', 'kentang goreng'] },

  // Malay home dishes
  { name: 'Ayam Masak Kicap', emoji: '🍗', category: 'Meat', serving: '1 serving', kcal: 330, protein: 28, carbs: 12, fat: 19, aka: ['masak kicap', 'ayam kicap'] },
  { name: 'Daging Masak Hitam', emoji: '🥘', category: 'Meat', serving: '1 serving', kcal: 400, protein: 28, carbs: 10, fat: 28, aka: ['masak hitam', 'daging hitam'] },
  { name: 'Ikan Asam Pedas', emoji: '🐟', category: 'Seafood', serving: '1 serving', kcal: 260, protein: 30, carbs: 8, fat: 12, aka: ['asam pedas', 'ikan asam pedas'] },
  { name: 'Sotong Masak Kicap', emoji: '🦑', category: 'Seafood', serving: '1 serving', kcal: 240, protein: 22, carbs: 10, fat: 12, aka: ['sotong kicap'] },
  { name: 'Sup Kambing', emoji: '🍲', category: 'Soup', serving: '1 bowl', kcal: 340, protein: 28, carbs: 10, fat: 21, aka: ['sup kambing', 'mutton soup'] },
  { name: 'Nasi Campur (1 meat, 2 veg)', emoji: '🍛', category: 'Rice', serving: '1 plate', kcal: 650, protein: 26, carbs: 82, fat: 24, aka: ['nasi campur', 'mixed rice', 'economy rice'] },
  { name: 'Telur Bungkus (Egg Wrap)', emoji: '🍳', category: 'Egg', serving: '1 serving', kcal: 260, protein: 12, carbs: 20, fat: 15, aka: ['telur bungkus'] },

  // Indian-Malaysian
  { name: 'Thosai Masala', emoji: '🫓', category: 'Roti & Bread', serving: '1 piece', kcal: 300, protein: 7, carbs: 48, fat: 9, aka: ['masala thosai', 'masala dosa'] },
  { name: 'Vadai', emoji: '🍩', category: 'Snack', serving: '2 pieces', kcal: 220, protein: 8, carbs: 24, fat: 11, aka: ['vadai', 'vada'] },
  { name: 'Idli (2)', emoji: '🍥', category: 'Snack', serving: '2 pieces', kcal: 140, protein: 5, carbs: 28, fat: 1, aka: ['idli'] },
  { name: 'Putu Mayam', emoji: '🍜', category: 'Snack', serving: '1 serving', kcal: 210, protein: 4, carbs: 40, fat: 4, aka: ['putu mayam', 'string hopper'] },

  // Kuih / desserts
  { name: 'Apam Balik', emoji: '🥞', category: 'Dessert', serving: '1 piece', kcal: 280, protein: 6, carbs: 40, fat: 11, aka: ['apam balik'] },
  { name: 'Seri Muka', emoji: '🍮', category: 'Dessert', serving: '1 piece', kcal: 180, protein: 3, carbs: 28, fat: 6, aka: ['seri muka', 'kuih seri muka'] },
  { name: 'Kuih Talam', emoji: '🍮', category: 'Dessert', serving: '1 piece', kcal: 150, protein: 2, carbs: 24, fat: 6, aka: ['kuih talam'] },
  { name: 'Rojak Buah', emoji: '🥗', category: 'Snack', serving: '1 serving', kcal: 260, protein: 6, carbs: 40, fat: 9, aka: ['rojak', 'rojak buah'] },
  { name: 'Pasembur', emoji: '🥗', category: 'Snack', serving: '1 plate', kcal: 420, protein: 12, carbs: 44, fat: 22, aka: ['pasembur', 'mamak rojak'] },

  // Drinks
  { name: 'Teh O Ais', emoji: '🧊', category: 'Drink', serving: '1 glass', kcal: 90, protein: 0, carbs: 22, fat: 0, aka: ['teh o ais', 'teh o'] },
  { name: 'Teh C Ais', emoji: '🥤', category: 'Drink', serving: '1 glass', kcal: 150, protein: 3, carbs: 26, fat: 4, aka: ['teh c ais', 'teh c'] },
  { name: 'Kopi Ais', emoji: '🧋', category: 'Drink', serving: '1 glass', kcal: 160, protein: 3, carbs: 28, fat: 4, aka: ['kopi ais', 'iced coffee'] },
  { name: 'Limau Ais', emoji: '🍋', category: 'Drink', serving: '1 glass', kcal: 90, protein: 0, carbs: 22, fat: 0, aka: ['limau ais', 'lime juice'] },
  { name: '100 Plus', emoji: '🥤', category: 'Drink', serving: '1 can', kcal: 90, protein: 0, carbs: 22, fat: 0, aka: ['100 plus', 'isotonic'] },
]

// Keep curated foods first, then add the official MyFCD per-100 g snapshot.
export const LOCAL_FOODS: LocalFood[] = [...CURATED_LOCAL_FOODS, ...MYFCD_FOODS]

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Fuzzy-ish search by name, alias, or category. */
export function searchLocalFoods(query: string, limit = 20): LocalFood[] {
  const q = norm(query)
  if (!q) return LOCAL_FOODS.slice(0, limit)
  const terms = q.split(' ')
  const scored = LOCAL_FOODS.map((f) => {
    const hay = norm([f.name, ...(f.aka ?? []), f.category].join(' '))
    let score = 0
    for (const t of terms) if (hay.includes(t)) score += t.length
    if (hay.startsWith(q)) score += 5
    return { f, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.f)
}

/**
 * Best single match for a free-text food name (e.g. AI-detected label).
 * Returns null when nothing matches well enough to trust.
 */
export function matchLocalFood(name: string): LocalFood | null {
  const q = norm(name)
  if (!q) return null
  let best: { f: LocalFood; score: number } | null = null
  for (const f of LOCAL_FOODS) {
    const names = [norm(f.name), ...(f.aka ?? []).map(norm)]
    let score = 0
    for (const n of names) {
      if (n === q) score = Math.max(score, 100)
      else if (q.includes(n) || n.includes(q)) score = Math.max(score, Math.min(n.length, q.length))
      else {
        const shared = n.split(' ').filter((w) => w.length > 2 && q.includes(w)).length
        if (shared) score = Math.max(score, shared * 3)
      }
    }
    if (!best || score > best.score) best = { f, score }
  }
  return best && best.score >= 6 ? best.f : null
}

export const FOOD_CATEGORIES: FoodCategory[] = [
  'Rice', 'Noodles', 'Roti & Bread', 'Meat', 'Seafood', 'Egg', 'Vegetable', 'Soup', 'Snack', 'Dessert', 'Drink', 'Fruit', 'Basics',
]
