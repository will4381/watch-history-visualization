'use client';

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import FlowCanvas from './components/FlowCanvas';

export default function Home() {
  const [data, setData] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [clusterData, setClusterData] = useState(null);

  // Load and process the watch history data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/youtube_watch_history_clustered.json');
        try {
          const jsonData = await response.json();
          setData(jsonData);

          // Process data into cluster groups
          const groups = new Map();
          jsonData.forEach(item => {
            if (!groups.has(item.cluster)) {
              groups.set(item.cluster, {
                id: item.cluster,
                name: item.cluster === -1 ? 'Unclustered' : `Cluster ${item.cluster}`,
                videos: []
              });
            }

            // Safely extract video ID from URL
            let videoId;
            try {
              videoId = new URL(item.video_url).searchParams.get('v');
            } catch (e) {
              console.warn('Invalid URL:', item.video_url);
              videoId = 'invalid';
            }

            groups.get(item.cluster).videos.push({
              videoId,
              title: item.video_title,
              channelName: item.channel_name,
              timestamp: item.timestamp,
              thumbnailUrl: `https://img.youtube.com/vi/${videoId}/default.jpg`,
              vector: item.vector, // Include vector data for similarity calculations
            });
          });

          setClusterData(Array.from(groups.values()));
        } catch (error) {
          console.error('Error processing data:', error);
          // Show a more user-friendly error in the UI
          setData([]);
          setClusterData([]);
        }
      } catch (error) {
        console.error('Error loading watch history:', error);
      }
    };

    loadData();
  }, []);

  const handleSelectCluster = (clusterId) => {
    const cluster = clusterData?.find(c => c.id === clusterId);
    setSelectedCluster(cluster);
  };

  if (!data || !clusterData) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-white/60">Loading watch history...</div>
      </div>
    );
  }

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#000000]">
      {/* Floating title */}
      <div className="absolute top-6 left-6 z-10">
        <h1 className="text-2xl font-bold text-white/90">
          YouTube Watch History
        </h1>
        <p className="text-sm text-white/60 mt-1">
          {data.length.toLocaleString()} videos analyzed
        </p>
      </div>

      {/* Flow Canvas */}
      <FlowCanvas
        data={data}
        selectedCluster={selectedCluster?.id}
        onSelectCluster={handleSelectCluster}
      />

      {/* Sidebar */}
      <Sidebar
        clusters={clusterData}
        selectedCluster={selectedCluster}
        onSelectCluster={handleSelectCluster}
      />
    </main>
  );
}
