export interface Show {
  id: string;
  label: string;
  sources: string[];
  maxClips: number;
  segmentDuration: number;
  youtubeTitle: string;
}

export const SHOWS: Show[] = [
  {
    id: 'morning',
    label: 'Morning World Briefing',
    sources: ['BBCNews', 'DWNews', 'France24English', 'ReutersNews'],
    maxClips: 8,
    segmentDuration: 180,
    youtubeTitle: 'Morning World Briefing',
  },
  {
    id: 'noon',
    label: 'Midday News Update',
    sources: ['ABCNews', 'euronews', 'BBCNews', 'ReutersNews'],
    maxClips: 8,
    segmentDuration: 180,
    youtubeTitle: 'Midday News Update',
  },
  {
    id: 'evening',
    label: 'Evening News Roundup',
    sources: ['DWNews', 'France24English', 'ABCNews', 'euronews'],
    maxClips: 8,
    segmentDuration: 180,
    youtubeTitle: 'Evening News Roundup',
  },
  {
    id: 'night',
    label: 'Late Night World News',
    sources: ['BBCNews', 'ReutersNews', 'DWNews', 'France24English'],
    maxClips: 8,
    segmentDuration: 180,
    youtubeTitle: 'Late Night World News',
  },
];

export function getShow(id: string): Show {
  const show = SHOWS.find(s => s.id === id);
  if (!show) {
    console.error(`Unknown show: ${id}. Available: ${SHOWS.map(s => s.id).join(', ')}`);
    process.exit(1);
  }
  return show;
}
