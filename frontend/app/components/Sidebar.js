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
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function Sidebar({ clusters, selectedCluster, onSelectCluster }) {
  // Get color for cluster (same function as in FlowCanvas)
  const getClusterColor = (clusterId) => {
    if (clusterId === -1) return '#6C757D';
    const hue = (clusterId * 137.508) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  // Sort videos by timestamp (most recent first)
  const sortedVideos = useMemo(() => {
    if (!selectedCluster) return [];
    return [...selectedCluster.videos].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [selectedCluster]);

  // Group videos by channel
  const channelStats = useMemo(() => {
    if (!selectedCluster) return [];
    const channels = new Map();
    selectedCluster.videos.forEach(video => {
      if (!channels.has(video.channelName)) {
        channels.set(video.channelName, 0);
      }
      channels.set(video.channelName, channels.get(video.channelName) + 1);
    });
    return Array.from(channels.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 channels
  }, [selectedCluster]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        bottom: '1.5rem',
        width: '24rem'
      }}
      className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-2xl z-50 custom-scrollbar overflow-y-auto"
    >
      <div className="p-6 space-y-6">
        {/* Clusters List */}
        <div>
          <h2 className="text-2xl font-bold text-white/90 mb-4">Clusters</h2>
          <div className="space-y-2">
            {clusters.map(cluster => (
              <button
                key={cluster.id}
                onClick={() => onSelectCluster(cluster)}
                className={`w-full text-left p-4 rounded-xl backdrop-blur-sm transition-colors ${
                  selectedCluster?.id === cluster.id 
                    ? 'bg-white/10' 
                    : 'bg-white/5 hover:bg-white/8'
                }`}
                style={{
                  borderLeft: `4px solid ${getClusterColor(cluster.id)}`
                }}
              >
                <h3 className="font-medium text-white/90">{cluster.name}</h3>
                <p className="text-sm text-white/60">
                  {cluster.videos.length.toLocaleString()} videos
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Cluster Details */}
        {selectedCluster && (
          <>
            <div className="h-px bg-white/10" />
            
            {/* Top Channels */}
            <div>
              <h3 className="text-lg font-semibold text-white/80 mb-3">
                Top Channels
              </h3>
              <div className="space-y-2">
                {channelStats.map(([channel, count]) => (
                  <div
                    key={channel}
                    className="bg-white/5 rounded-xl p-3 backdrop-blur-sm"
                  >
                    <h4 className="font-medium text-white/90">{channel}</h4>
                    <p className="text-sm text-white/60">
                      {count} {count === 1 ? 'video' : 'videos'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Video List */}
            <div>
              <h3 className="text-lg font-semibold text-white/80 mb-3">
                Recent Videos
              </h3>
              <div className="space-y-3">
                {sortedVideos.map((video) => (
                  <a
                    key={`${video.videoId}-${video.timestamp}`}
                    href={`https://youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 bg-white/5 rounded-xl p-3 backdrop-blur-sm hover:bg-white/10 transition-colors"
                  >
                    <div className="relative w-24 h-16 flex-shrink-0">
                      <VideoThumbnail
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="rounded-lg object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white/90 text-sm truncate">
                        {video.title}
                      </h4>
                      <p className="text-xs text-white/60 truncate">
                        {video.channelName}
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        {formatDate(video.timestamp)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
