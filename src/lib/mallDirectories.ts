import { hasExcludedIngredients } from '../../shared/foodSuitability.js'
import { isExcludedRestaurant, restaurantNameKey } from '../../shared/restaurantCuration.js'

export type MallDirectoryKey = 'ioi-city-mall' | 'alamanda' | 'the-mines' | 'tamarind-square' | 'dpulze'
export type MallPlaceCategory = 'meals' | 'cafe-snacks' | 'all'
export type MallPlaceCategoryOverride = Exclude<MallPlaceCategory, 'all'>

export type MallDirectory = {
  key: MallDirectoryKey
  name: string
  address: string
  sourceUrl: string
  names: string[]
}

// These are directory snapshots from the malls' own tenant pages. They are deliberately
// labelled as a directory, not as halal certification or a live opening-hours feed.
const IOI_NAMES = [
  '10GRAM', '4 FINGERS CRISPY CHICKEN', 'A&W', 'ABSOLUTE THAI', 'AH CHENG LAKSA', 'AK NOODLES HOUSE', 'ALI, MUTHU & AH HOCK', 'AMALFI', 'ASAM PEDAS PREMIER', "AUNTIE ANNE'S", 'AWAGYU YAKINIKU', 'Airi Berry', 'All About Chew', 'Ayam Gepuk Hut', "BAAJI'S", 'BANANABRO', 'BANGLO 289', 'BASKIN ROBBINS', "BERYL'S", 'BHAI JIM JUM', 'BHC Chicken', 'BIG APPLE DONUTS AND COFFEE', 'BING CHUN', 'BISOU BAKE SHOP', 'BLACK CANYON', 'BMS ORGANICS (VEGETARIAN)', 'BOAT NOODLE', 'BOOST JUICE BAR', 'BUNGKUS KAW KAW', 'CAFE CHEF WAN', 'CAFE COLOMBO', 'CHAGEE', 'CHEESEU BISTRO & DESSERT BAR', 'CHEEZUTO', 'CHEZ CHOUX', "CHILI'S", 'CHIZU', "CHRISTINE'S BAKERY", 'CHURROS+', 'CINNABON', 'CORNERY', 'Cold Stone Creamery', 'Crème De La Crème', "D'PENYETZ", 'DABOBA', "DAVE'S DELI", 'DIMSUSU', 'DIN BY DIN TAI FUNG', 'DODO KOREA', 'DOLLY DIM SUM', 'DOME', 'DOOKKI', 'DOTNUTS', "DOTTY'S PASTRIES", 'DRAGON-I', 'DUBUYO', "DUNKIN' DONUTS", 'Don の Makase', 'EMPIRE SUSHI', 'FAMILY MART', 'FAMOUS AMOS', 'FOOD EMPIRE', 'FOOD JUNCTION', 'FUEL SHACK', 'GIGI COFFEE', 'GO NOODLE HOUSE', 'GODIVA', 'GONG CHA', 'GOPIZZA', 'GULA PETITE', 'Garrett Popcorn', 'HAAGEN DAZS', 'HAIDILAO', 'HANBING', 'HAPPY POTATO', 'HO MIN SAN', 'HOGAN BAKERY', 'HOKKAIDO BAKED CHEESE TART', 'HOT & ROLL', 'HOT BIRD', 'HWC COFFEE', 'I LOVE YOO!', 'ICHIBAN RAMEN', 'INDOASLI', 'INSIDE SCOOP', 'IPPUDO', 'IRAMA SIGNATURE', 'ISABELLE RESTAURANT & BAR', 'ISTANOODLE', 'India Gate', 'JANGSAJANG DEOPBAP', 'JARDIN COFFEE', 'JM BARIANI HOUSE', "JOHNNY'S RESTAURANTS", 'JOLLIBEE', 'JOM AMIGO', 'JOM CHA', 'JORDAN HONG KONG', "JOYMOM'S", 'JP & CO', 'JU BANQUET & RESTAURANT', 'JUICE WORKS', 'JUST GOOD COFFEE', 'K GARDEN KOREAN BBQ', 'K-FRY URBAN KOREAN', 'KEE NGUYEN', 'KENNY HILLS BAKERS', 'KENNY ROGERS ROASTERS', 'KHAWAJA MIDDLE EASTERN RESTAURANT', 'KOI Thé', 'KOONG WOH TONG', 'KRISPY KREME DOUGHNUTS', 'KYOCHON 1991', 'KYOTO KATSU', 'Kakatoo.Go', 'Kedai Kopi Suka Hati', 'Kenangan Coffee', 'Korea Cotton Candy', 'LA GAYA', 'LAEM CHAROEN THAI SEAFOOD', 'LAOHUNAN', 'LAUSANJEE', 'LAVENDER', 'LAVISH RESTAURANT & BAR', 'LE SHRIMP RAMEN', 'LLAO LLAO', 'La Mesa', 'Luckin Coffee', "MADAM KWAN'S", 'MAKII MAKII', 'MAMA THAI', 'MARRYBROWN', 'MBG FRUITSHOP', "MCDONALD'S", 'MELTKIES', 'MIX STORE', 'MON CHINESE BEEF ROTI', 'MR TUK TUK', 'MR.DAKGALBI', 'MYEONGDONG TOPOKKI', 'Maison La Manne', 'Mo-Mo Paradise', "Mokky's with Flaaah", 'NADEJE', 'NAK NAK', "NANDO'S", 'NEWJUiCE', 'NIKUMAI', 'NY STEAK SHACK', 'Nanyang Cafe', 'Nasi Lemak Shop', 'OGA TEA & DINING', 'OISO', 'OLE-OLE BALI', 'OMBAK KITCHEN', 'OPPADAK OVEN BAKED CHICKEN', 'ORIENTAL KOPI', 'OldTown White Coffee', 'PARATHAI', 'PARIS BAGUETTE', 'PENANG ROAD FAMOUS TEOCHEW CHENDUL', 'PERFECT ICE', 'PIZZA HUT', 'POKOK', 'POP MEALS', 'POTATO CORNER', 'QCC Baked', 'RAKUZEN', 'RAMEN SEIROCK-YA', 'RASA ROSZ', "RASA by Grandmama's", 'ROBATA SUSHI AND GRILL', 'ROTIBOY', "ROYCE'", 'SALAD ATELIER', 'SANG GERAI', 'SECRET RECIPE', 'SEOUL GARDEN', 'SEPIRING UNIQUELY MALAYSIA', 'SERAI', 'SHIHLIN TAIWAN STREET SNACKS', 'SIGNATURE MARKET', 'SISTERS CRISPY POPIAH', 'SOPOONG', 'SOUPER TANG', 'SOYALAH', 'SQUID BOY', 'STRUDEL BAKERY HOUSE', 'SUBWAY', 'SUKI-YA', 'SUSHI JIRO', 'SUSHI KING', 'SUSHI TEI', 'SUSHI ZANMAI', 'Salon Du Chocolat', 'Silk Road Kitchen by Yusuf', 'Sukiya Tokyo Bowls & Noodles', 'TEALIVE', 'TEPPANYAKI', 'TERRACE CAFE', 'TEXAS CHICKEN', 'THAIKOR BBQ BUFFET', 'THE BARN', 'THE CHICKEN RICE SHOP', 'THE COFFEE BEAN & TEA LEAF', 'THE FISH BOWL', 'THE MANHATTAN FISH MARKET', 'THE SPICE ALLEY', 'THONG CHA PLUS', 'TICCO', 'TIM HORTONS', "TONY ROMA'S", 'TOP TEPPANYAKI', 'TRUEDAN', 'Talad Thai', 'The Founders Bakery', 'The Grass', 'Thong Bowl', 'Tous Les Jours', 'VANILLA CAFE EXPRESS', 'YAYOI', 'YGF MALATANG', 'YOGURT FACTORY', 'YOGURT PLANET', 'YOLE', 'Yakiniku Kuro', 'Ying Xian Canton Cuisine', 'Yonny', 'ZOK NOODLE HOUSE', 'ZUS Signature', 'dipndip', 'luckin coffee'
]

const ALAMANDA_NAMES = [
  'Ah Cheng Laksa', "Auntie Anne's", 'Bask Bear Coffee & Toasties', 'Baskin Robbins', "Beryl's", 'Black Canyon', 'Boost Juice', 'Bungkus Kaw Kaw', 'Burger King', 'CHAGEE', 'Cili Kampung', 'DubuYo Mini', "Dunkin'", 'Empire Sushi', 'Homebaker @ Clover', "Johnny's Steamboat", 'I Love Yoo!', 'Krispy Kreme', 'Llao Llao', 'Mahnaz Food', "Nando's", 'Oiso', 'Oriental Kopi', 'Padi House', 'Pizza Hut', 'Rotiboy', 'Secret Recipe Cakes & Cafe', 'Seoul Garden', 'Sepiring', 'Subway', 'Sushi King', "T.G.I. Fridays", 'Tealive Plus', 'The Chicken Rice Shop', 'Zus Coffee', 'ChaTraMue', 'RASA Food Arena', 'RASA – Ayam Penyet', 'RASA – Chicken Rice', 'RASA – Nasi Campur', 'RASA – Nasi Kandar', 'RASA – Mee Tarik', 'RASA – Western'
]

const MINES_NAMES = [
  'Ah Cheng Laksa', 'Ah Yip Herbal Soup', 'ALIIS BISTRO', 'Auntea Jenny', "Auntie Anne's", 'Black Canyon', 'Boost', 'Bungkus Kaw Kaw', 'CHAGEE', 'DubuYo', 'Esquire Kitchen', 'KFC', 'Luckin Coffee', "McDonald's", "Nando's", 'Pizza Hut', 'Richeese Factory', 'Seoul Garden', 'Sepiring', 'Sushi King', 'Tealive', 'Texas Chicken', 'The Chicken Rice Shop', 'Wallace', 'A&W', 'Secret Recipe', 'Starbucks', 'Baskin Robbins', 'Mixue', 'Go Noodle House', 'Bar B Q Plaza', 'Ayam Penyet Best', 'Chagee'
]

export const MALL_DIRECTORIES: MallDirectory[] = [
  { key: 'dpulze', name: 'DPULZE Shopping Centre', address: 'Cyber 12, Cyberjaya', sourceUrl: 'https://dpulze.com/directory/', names: ["4Fingers Crispy Chicken","Bananabro","Bungkus Kaw Kaw","Campur Campur Kitchen","Canton Boy","GO Noodle House (Non-Halal)","Homst Recipe","HWC Coffee","I Love Yoo!","Johnny's Restaurant","Kenangan Coffee","KGB","Kopihut","Luckin Coffee","Mr Dakgalbi","Nando’s","Oldtown White Coffee – Basic","Omulah by Teppanyaki","Pasta Zanmai","Penang Chendul","Pizza Hut Express","Pop Meals","Restoran Sana Sini","Sepiring","Sopoong","Stuff'd","Suki-ya","Sushi King","Sushi Zanmai","The Chicken Rice Shop","The Coffee Bean & Tea Leaf","US Pizza","Zus Coffee"] },
  // Official F&B snapshot, 8 October 2026; not a certification claim.
  { key: 'tamarind-square', name: 'Tamarind Square', address: 'Cyber 10, Cyberjaya', sourceUrl: 'https://www.tamarindsq.com/directory/', names: ["10 Gram","10 Pots","10 Thai","A Bite of Yunnam","After 7 Lounge","Afters Baker","Alcea Coffee","Alfie Coffee","Amirah Ali Solutions","Antipodean Black","Arabesq","Auntea Jenny","Ayam Gepuk Boss","Bakez Grocer","Barba Bros Enterprise","Bings Cafe","Boat Noodle","Botanist","Burger King","Cafe Met","Celsius Coffee","Cha Tra Mue","Chagee","Dapur Pramugari","Digital Pylot","Dokebi Chicken","Duer Ventures","Food Project","Four Season Noodle House","Four Seasons Noodle House","Fuel Shack","Furu Japanese Restaurant","Gisomo Group Enterprise","Glaze Eatery","Herbs & Butter","Hot & Roll","HWC Coffee","Jamu Haus Cafe","Kaapi Kreat","Kaysha","Kopi & Wrap","Lourve Cafe & Co","Makdas","Maybematcha","Mixue","Murni Discovery","Noir","Padang Ijau Restaurant","Pakej Usaha (Kocha Lala)","Pastribella","Pekan Ipoh","Rasa Lemak","Restoran Al Arif Nasi Kandar Penang","Restoran Rajo Padang","San Francisco Coffee","Sand Kitchen Restaurant","Savoir Cafe","Sepohon","Shisha Town","Simple Box","Sukhothai Cuisine","Tackle Classic","Tama Food Court","Thai Moment","Thai Tomyam Maphraw","Toast Maker","Valentine Cafe","Wallace Chicken","Warung Geprek","Wow Tea & Beautea","Zans Pizza","Zuby"] },
  { key: 'ioi-city-mall', name: 'IOI City Mall', address: 'IOI Resort City, Putrajaya', sourceUrl: 'https://www.ioicitymall.com.my/?cat=36&tenantlist=full', names: IOI_NAMES },
  { key: 'alamanda', name: 'Alamanda Putrajaya', address: 'Presint 1, Putrajaya', sourceUrl: 'https://www.alamanda.com.my/specialty-fnb-stores/', names: ALAMANDA_NAMES },
  { key: 'the-mines', name: 'The Mines', address: 'Mines Resort City, Seri Kembangan', sourceUrl: 'https://the-mines.com.my/stores-locate-to/', names: MINES_NAMES },
]

const excludedMallName = (name: string) => hasExcludedIngredients(name) || isExcludedRestaurant(name)
const cafeSnackName = /\b(coffee|cafe|tea|juice|boba|bubble|gong cha|chagee|tealive|boost|starbucks|tim hortons|luckin|daboba|kenangan|auntea|bask bear|auntie anne|baskin|krispy|donut|bakery|chocolate|godiva|popcorn|yogurt|ice|chendul|churros|cinnabon|royce|dessert|snack|rotiboy|dipndip|perfect ice|cold stone|haagen dazs|tous les jours|juice works|newjuice|mixue)\b/i
const mallSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const cafeSnackBrands = new Set([
  'Airi Berry', 'All About Chew', "BERYL'S", 'BING CHUN', 'BISOU BAKE SHOP', 'CHEEZUTO', 'CHEZ CHOUX', 'CHIZU', 'CORNERY', 'Crème De La Crème', 'DIMSUSU', 'DOTNUTS', "DOTTY'S PASTRIES", "DUNKIN'", "DUNKIN' DONUTS", 'FAMILY MART', 'FAMOUS AMOS', 'GULA PETITE', 'HANBING', 'HAPPY POTATO', 'HOKKAIDO BAKED CHEESE TART', 'HOT & ROLL', 'INSIDE SCOOP', 'JOM CHA', "JOYMOM'S", 'KEE NGUYEN', 'KENNY HILLS BAKERS', 'KOI Thé', 'KOONG WOH TONG', 'Korea Cotton Candy', 'LAVENDER', 'LLAO LLAO', 'MAKII MAKII', 'MBG FRUITSHOP', 'MELTKIES', 'MIX STORE', 'Maison La Manne', "Mokky's with Flaaah", 'NADEJE', 'PARIS BAGUETTE', 'POTATO CORNER', 'QCC Baked', 'SIGNATURE MARKET', 'SISTERS CRISPY POPIAH', 'SOYALAH', 'SQUID BOY', 'Salon Du Chocolat', 'THONG CHA PLUS', 'TICCO', 'TRUEDAN', 'The Founders Bakery', 'The Grass', 'YOLE', 'Yonny', 'ZUS Signature', 'Afters Baker', 'Bakez Grocer', 'Cha Tra Mue', 'Maybematcha', 'Pastribella', 'Kaapi Kreat', 'Kopi & Wrap', 'ChaTraMue', 'Homebaker @ Clover', 'Mahnaz Food', 'I LOVE YOO!',
].map(restaurantNameKey))
export const isMallCafeSnack = (name: string) => cafeSnackName.test(name) || cafeSnackBrands.has(restaurantNameKey(name))

export function mallRestaurants(directory: MallDirectory, category: MallPlaceCategory = 'all', overrides: Record<string, MallPlaceCategoryOverride> = {}) {
  const seen = new Set<string>()
  return directory.names.map(name => name.trim()).filter(name => {
    const key = restaurantNameKey(name)
    // F&B registration names do not establish a consumer-facing restaurant.
    if (directory.key === 'tamarind-square' && /solutions|enterprise|ventures|digital pylot|shisha town/i.test(name)) return false
    if (!name || excludedMallName(name) || seen.has(key)) return false
    seen.add(key); return true
  }).map(name => {
    const id = `mall:${directory.key}:${mallSlug(name)}`
    const resolvedCategory = overrides[id] ?? (isMallCafeSnack(name) ? 'cafe-snacks' : 'meals')
    return {
    id,
    name,
    address: `${directory.name}, ${directory.address}`,
    distanceKm: 0,
    cuisine: resolvedCategory === 'cafe-snacks' ? 'Café / snack' : 'Restaurant / meal',
    openingHours: 'Mall hours are usually 10am–10pm; outlet hours may differ.',
    halalStatus: 'Halal status unknown—check this outlet before eating',
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${directory.name} Malaysia`)}`,
    osmUrl: '',
    category: resolvedCategory,
  }}).filter(place => category === 'all' || place.category === category)
}
