"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHOWS = void 0;
exports.getShow = getShow;
exports.SHOWS = [
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
function getShow(id) {
    const show = exports.SHOWS.find(s => s.id === id);
    if (!show) {
        console.error(`Unknown show: ${id}. Available: ${exports.SHOWS.map(s => s.id).join(', ')}`);
        process.exit(1);
    }
    return show;
}
