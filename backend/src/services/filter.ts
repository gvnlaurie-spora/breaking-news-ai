// ============================================================
// filter.ts — News filter with Africa exclusion
// ============================================================

const AFRICAN_COUNTRIES = [
  'africa', 'african', 'nigeria', 'nigerian', 'kenya', 'kenyan', 'ethiopia', 'ethiopian',
  'egypt', 'egyptian', 'ghana', 'ghanaian', 'tanzania', 'tanzanian', 'uganda', 'ugandan',
  'south africa', 'south african', 'zimbabwe', 'zimbabwean', 'mozambique', 'mozambican',
  'senegal', 'senegalese', 'mali', 'malian', 'cameroon', 'cameroonian', 'ivory coast',
  'angola', 'angolan', 'zambia', 'zambian', 'somalia', 'somali', 'sudan', 'sudanese',
  'libya', 'libyan', 'algeria', 'algerian', 'morocco', 'moroccan', 'tunisia', 'tunisian',
  'rwanda', 'rwandan', 'burundi', 'congolese', 'congo', 'botswana', 'namibia', 'namibian',
  'lesotho', 'swaziland', 'eswatini', 'madagascar', 'malawi', 'niger', 'burkina faso',
  'togo', 'benin', 'guinea', 'sierra leone', 'liberia', 'gambia', 'mauritania',
  'cape verde', 'djibouti', 'eritrea', 'seychelles', 'comoros', 'mauritius',
  // Major African cities
  'lagos', 'nairobi', 'cairo', 'kinshasa', 'johannesburg', 'luanda', 'dar es salaam',
  'khartoum', 'addis ababa', 'abidjan', 'dakar', 'accra', 'kampala', 'harare',
  'lusaka', 'maputo', 'bamako', 'conakry', 'lome', 'niamey', 'ouagadougou',
  'tripoli', 'tunis', 'algiers', 'casablanca', 'rabat', 'mogadishu', 'juba',
  'kigali', 'bujumbura', 'libreville', 'yaounde', 'abuja', 'pretoria', 'cape town',
  'durban', 'port elizabeth', 'bloemfontein'
];

const BREAKING_KEYWORDS = [
  'breaking', 'urgent', 'just in', 'developing', 'live update',
  'emergency', 'critical', 'explosion', 'attack', 'crash', 'accident',
  'earthquake', 'flood', 'hurricane', 'tornado', 'storm', 'shooting',
  'arrest', 'resigns', 'resignation', 'election', 'crisis', 'war', 'peace',
  'missile', 'nuclear', 'sanctions', 'protest', 'riot', 'coup', 'invasion',
  'ceasefire', 'summit', 'deal', 'collapse', 'dead', 'killed', 'death',
  'verdict', 'guilty', 'sentenced', 'indicted', 'charged', 'scandal'
];

export interface NewsItem {
  title: string;
  description?: string;
  url: string;
  source: string;
  region: string;
  publishedAt: Date;
  category?: string;
}

export function isAfricanNews(title: string, description: string = '', region: string = ''): boolean {
  const combined = `${title} ${description} ${region}`.toLowerCase();
  return AFRICAN_COUNTRIES.some(term => combined.includes(term));
}

export function isBreakingNews(title: string): boolean {
  const titleLower = title.toLowerCase();
  return BREAKING_KEYWORDS.some(kw => titleLower.includes(kw));
}

export function filterNews(item: NewsItem): boolean {
  // Exclude African news
  if (isAfricanNews(item.title, item.description, item.region)) {
    return false;
  }
  return true;
}

export function categoriseArticle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('war') || t.includes('attack') || t.includes('election') ||
      t.includes('president') || t.includes('government') || t.includes('military') ||
      t.includes('nato') || t.includes('sanctions') || t.includes('diplomat')) return 'politics';
  if (t.includes('economy') || t.includes('market') || t.includes('trade') ||
      t.includes('stock') || t.includes('inflation') || t.includes('bank') ||
      t.includes('bitcoin') || t.includes('crypto')) return 'business';
  if (t.includes('tech') || t.includes('ai ') || t.includes('software') ||
      t.includes('apple') || t.includes('google') || t.includes('microsoft') ||
      t.includes('openai') || t.includes('robot')) return 'technology';
  if (t.includes('health') || t.includes('covid') || t.includes('medical') ||
      t.includes('virus') || t.includes('vaccine') || t.includes('drug')) return 'health';
  if (t.includes('climate') || t.includes('weather') || t.includes('environment') ||
      t.includes('earthquake') || t.includes('flood') || t.includes('hurricane')) return 'environment';
  if (t.includes('space') || t.includes('nasa') || t.includes('rocket') ||
      t.includes('moon') || t.includes('mars') || t.includes('satellite')) return 'science';
  return 'general';
}
