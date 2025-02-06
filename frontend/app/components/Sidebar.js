'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';

const FallbackImage = () => (
  <div className="w-full h-full bg-white/5 flex items-center justify-center rounded-lg">
    <svg
      className="w-8 h-8 text-white/40"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  </div>
);

const VideoThumbnail = ({ src, alt, className }) => {
  const [error, setError] = useState(false);

  if (error) {
    return <FallbackImage />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      onError={() => setError(true)}
    />
  );
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function Sidebar({ selectedCluster }) {
  // Early return if no cluster is selected
  if (!selectedCluster) {
    return (
      <div className="fixed top-6 right-6 bottom-6 w-96 bg-black/80 backdrop-blur-lg border border-white/10 rounded-2xl z-50 p-6">
        <div className="flex items-center justify-center h-full text-white/60">
          Select a cluster to view videos
        </div>
      </div>
    );
  }

  // Sort videos by timestamp (most recent first)
  const sortedVideos = useMemo(() => {
    return [...selectedCluster.videos]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 100); // Limit to 100 videos for performance
  }, [selectedCluster]);

  return (
    <div className="fixed top-6 right-6 bottom-6 w-96 bg-black/80 backdrop-blur-lg border border-white/10 rounded-2xl z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <h2 className="text-xl font-bold text-white/90">
          {selectedCluster.videos.length.toLocaleString()} Videos
        </h2>
      </div>

      {/* Video List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
        {sortedVideos.map((video) => (
          <a
            key={`${video.videoId}-${video.timestamp}`}
            href={`https://youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 bg-white/5 rounded-xl p-3 backdrop-blur-sm hover:bg-white/10 transition-colors group"
          >
            <div className="relative w-24 h-16 flex-shrink-0 overflow-hidden rounded-lg">
              <VideoThumbnail
                src={video.thumbnailUrl}
                alt={video.title}
                className="object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-white/90 text-sm line-clamp-2">
                {video.title}
              </h4>
              <p className="text-xs text-white/60 mt-1 truncate">
                {video.channelName}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                {formatDate(video.timestamp)}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
