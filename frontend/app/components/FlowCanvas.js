'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-white/60">Loading visualization...</div>
    </div>
  )
});

const getClusterColor = (clusterId) => {
  if (clusterId === -1) return '#6C757D';
  const hue = (clusterId * 137.508) % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

export default function FlowCanvas({ data, selectedCluster, onSelectCluster }) {
  // Transform data into graph format
  const graphData = {
    nodes: Array.from(new Set(data?.map(item => item.cluster) || []))
      .map(clusterId => {
        const clusterVideos = data.filter(item => item.cluster === clusterId);
        return {
          id: clusterId,
          videos: clusterVideos,
          val: Math.sqrt(clusterVideos.length) * 2,
          color: getClusterColor(clusterId)
        };
      }),
    links: [] // No links for cleaner visualization
  };

  const handleNodeClick = useCallback(node => {
    // Just pass the cluster ID, parent component will handle the rest
    onSelectCluster(node.id);
  }, [onSelectCluster]);

  return (
    <div className="w-full h-full bg-black">
      <ForceGraph2D
        graphData={graphData}
        nodeLabel={node => `${node.videos.length} videos`}
        nodeColor={node => node.color}
        nodeVal={node => node.val}
        nodeRelSize={6}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.videos.length.toString();
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

          // Node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI);
          ctx.fillStyle = node.color;
          ctx.fill();

          // Selected node effect
          if (selectedCluster && node.id === selectedCluster) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Node label
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'white';
          ctx.fillText(label, node.x, node.y);
        }}
        onNodeClick={handleNodeClick}
        cooldownTicks={100}
        onEngineStop={() => {}} // Prevents endless simulation
        enableNodeDrag={false}
        minZoom={0.5}
        maxZoom={4}
      />
    </div>
  );
}
