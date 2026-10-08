// Local search combines a published MyFCD per-100 g snapshot with legacy
// serving estimates. Legacy numbers lack per-item citations and are NOT
// verified nutrition facts. Never represent their values as restaurant data.

import { MYFCD_FOODS } from './myfcdFoods'
import { hasExcludedIngredients } from '../../shared/foodSuitability.js'

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
  nutritionSource?: string
  nutritionSourceUrl?: string
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
function suggestedPortion(food: LocalFood): { grams:number; label:string } {
  const name = food.name.toLowerCase()
  if (/complete set|set mandy|set khabsyah|briyani \(ayam\)|briyani \(daging\)/.test(name)) return {grams:400,label:'1 meal'}
  if (/rice|nasi/.test(name) && food.category === 'Rice') return {grams:150,label:'1 rice portion'}
  if (/kuih|karipap|cucur|bahulu|cara |lepat|samosa|koleh|cakar ayam/.test(name)) return {grams:40,label:'1 piece'}
  if (/bubur|dessert|taufu|puding/.test(name)) return {grams:200,label:'1 bowl'}
  if (food.category === 'Meat' || food.category === 'Seafood') return {grams:100,label:'1 side portion'}
  if (food.category === 'Vegetable') return {grams:80,label:'1 vegetable portion'}
  return {grams:100,label:'1 portion'}
}
const publishedFoods: LocalFood[] = MYFCD_FOODS.map(food => {
  const portion = suggestedPortion(food), multiplier = portion.grams / 100
  return { ...food, emoji:'', serving:`${portion.label} · ${portion.grams} g`, kcal:Math.round(food.kcal*multiplier),protein:Math.round(food.protein*multiplier*10)/10,carbs:Math.round(food.carbs*multiplier*10)/10,fat:Math.round(food.fat*multiplier*10)/10,
    nutritionSource:`MyFCD · scaled from 100 g. Assumed ${portion.grams} g portion; weigh or adjust yours.`, nutritionSourceUrl:`https://myfcd.moh.gov.my/myfcdcurrent/index.php/site/detail_product/${encodeURIComponent(food.aka?.[0] ?? '')}/0/10/-1/0/0/`, aka:[...(food.aka ?? []),...(food.name.includes('MANDY') ? ['nasi mandi ayam','nasi arab ayam','mandi chicken'] : []),...(food.name.includes('KHABSYAH') ? ['nasi kabsa kambing','kabsa lamb','kabsah kambing'] : [])] }
})
const estimatedFoods: LocalFood[] = CURATED_LOCAL_FOODS.map(food => ({ ...food, emoji:'', nutritionSource:'Unverified serving estimate · recipe and portion vary' }))
export const LOCAL_FOODS: LocalFood[] = [...publishedFoods, ...estimatedFoods].filter(f => !hasExcludedIngredients([f.name, ...(f.aka ?? [])].join(' ')))
/** A discovery collection, not a measured popularity ranking. No new nutrients
 * are invented: references retain their published basis or estimate label. */
export const POPULAR_MALAYSIAN_FOODS: LocalFood[] = [
  ...publishedFoods.filter(food => /traditional|kuih|bubur|nasi|rice,|rendang|satay|sambal|masak|goreng|roti jala|karipap|cucur|lepat|bahulu|cakar ayam|koleh|samosa|sirap bandung/i.test(food.name)),
  ...estimatedFoods.filter(food => !/protein|greek|avocado|caesar|salmon|fish & chips|lamb chop|cup noodles|char siew|bak kut teh/i.test(food.name)),
].filter(food => !hasExcludedIngredients([food.name,...(food.aka??[])].join(' '))).slice(0,100)

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Search suggestions, requiring every entered word to match. No nutrition is inferred from a partial match. */
export function searchLocalFoods(query: string, limit = 20): LocalFood[] {
  const q = norm(query)
  if (!q) return POPULAR_MALAYSIAN_FOODS.slice(0, limit)
  const terms = q.split(' ')
  const scored = LOCAL_FOODS.map((f) => {
    const names = [f.name, ...(f.aka ?? [])].map(norm)
    const hay = norm([f.name, ...(f.aka ?? []), f.category].join(' '))
    if (!terms.every((term) => hay.includes(term))) return { f, score: -1 }
    let score = terms.reduce((sum, term) => sum + term.length, 0)
    if (names.some((name) => name === q)) score += 40
    else if (names.some((name) => name.startsWith(q))) score += 20
    else if (names.some((name) => name.includes(q))) score += 10
    return { f, score }
  })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.f)
}

/** An exact food/alias match, optionally with an explicit weight in grams. */
export interface LocalFoodMatch { food: LocalFood; grams: number | null }

function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true
  const aWords = a.split(' ').sort()
  const bWords = b.split(' ').sort()
  return aWords.length === bWords.length && aWords.every((word, index) => word === bWords[index])
}

export function matchLocalFoodDetails(name: string): LocalFoodMatch | null {
  const amount = name.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:g|grams?)(?=\s|$)/i)
  const grams = amount ? Number(amount[1]) : null
  const query = norm(amount ? name.replace(amount[0], ' ') : name)
  if (!query) return null

  // Exact names and aliases are evidence; shared words are only suggestions.
  // "Salted egg chicken with rice" must not become chicken rice or briyani.
  for (const food of LOCAL_FOODS) {
    if (norm(food.name) === query || food.aka?.some((alias) => norm(alias) === query)) return { food, grams }
  }
  for (const food of LOCAL_FOODS) {
    if (wordsMatch(norm(food.name), query) || food.aka?.some((alias) => wordsMatch(norm(alias), query))) return { food, grams }
  }
  return null
}

export function matchLocalFood(name: string): LocalFood | null {
  return matchLocalFoodDetails(name)?.food ?? null
}

export const FOOD_CATEGORIES: FoodCategory[] = [
  'Rice', 'Noodles', 'Roti & Bread', 'Meat', 'Seafood', 'Egg', 'Vegetable', 'Soup', 'Snack', 'Dessert', 'Drink', 'Fruit', 'Basics',
]
