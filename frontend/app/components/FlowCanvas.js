'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import * as d3 from 'd3-force';
import 'reactflow/dist/style.css';

const getClusterColor = (clusterId) => {
  if (clusterId === -1) return '#6C757D';
  
  const hue = (clusterId * 137.508) % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

// Calculate cosine similarity between two vectors
const cosineSimilarity = (vec1, vec2) => {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
};

// Calculate average vector for a cluster
const calculateClusterVector = (videos) => {
  if (!videos.length) return null;
  const vectorLength = videos[0].vector.length;
  const avgVector = new Array(vectorLength).fill(0);
  
  videos.forEach(video => {
    for (let i = 0; i < vectorLength; i++) {
      avgVector[i] += video.vector[i];
    }
  });
  
  for (let i = 0; i < vectorLength; i++) {
    avgVector[i] /= videos.length;
  }
  
  return avgVector;
};

const CustomNode = ({ data, selected }) => {
  return (
    <div className="relative group">
      <div
        className={`
          w-full h-full rounded-full transition-all duration-300
          bg-gradient-to-br from-white/10 to-white/5
          group-hover:from-white/20 group-hover:to-white/10
          border border-white/10 group-hover:border-white/20
          ${selected ? 'border-white/40 from-white/20 to-white/10' : ''}
          shadow-lg backdrop-blur-sm
          flex items-center justify-center
          min-w-[80px] min-h-[80px]
        `}
        style={{
          width: `${Math.max(80, data.size)}px`,
          height: `${Math.max(80, data.size)}px`,
        }}
      >
        <div className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at center, ${data.color}33 0%, ${data.color}11 70%, transparent 100%)`,
          }}
        />
        <div className="relative z-10 text-center p-4">
          <h3 className="font-bold text-white/90 text-lg mb-1">
            {data.clusterId === -1 ? 'Unclustered' : `Cluster ${data.clusterId}`}
          </h3>
          <p className="text-white/60 text-sm">{data.videoCount} videos</p>
        </div>
      </div>
      {/* Glow effect */}
      <div
        className="absolute inset-0 -z-10 opacity-50 blur-xl transition-opacity duration-300 group-hover:opacity-75"
        style={{
          background: `radial-gradient(circle at center, ${data.color}33 0%, transparent 70%)`,
        }}
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const defaultViewport = { x: 0, y: 0, zoom: 1 };

export default function FlowCanvas({ data, selectedCluster, onSelectCluster }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const forceSimulationRef = useRef(null);

  // Process the raw data into cluster groups
  const clusterGroups = useMemo(() => {
    if (!data) return new Map();
    
    const groups = new Map();
    data.forEach(item => {
      if (!groups.has(item.cluster)) {
        groups.set(item.cluster, []);
      }
      groups.get(item.cluster).push(item);
    });
    return groups;
  }, [data]);

  // Transform cluster groups into nodes and calculate edges
  useEffect(() => {
    if (!clusterGroups.size) return;

    // Create nodes
    const newNodes = Array.from(clusterGroups.entries()).map(([clusterId, videos]) => {
      const clusterNum = parseInt(clusterId);
      return {
        id: clusterId.toString(),
        type: 'custom',
        // Initial positions will be updated by force simulation
        position: { 
          x: 500 + (Math.random() - 0.5) * 800,
          y: 300 + (Math.random() - 0.5) * 600
        },
        data: {
          clusterId: clusterNum,
          videoCount: videos.length,
          color: getClusterColor(clusterNum),
          size: Math.max(80, Math.min(300, Math.sqrt(videos.length) * 15)),
          vector: calculateClusterVector(videos),
        },
        selected: selectedCluster === clusterNum,
      };
    });

    // Calculate edges based on vector similarity
    const newEdges = [];
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        const similarity = cosineSimilarity(
          newNodes[i].data.vector,
          newNodes[j].data.vector
        );
        
        // Create edges with varying strength based on similarity
        if (similarity > 0.3) {
          newEdges.push({
            id: `${newNodes[i].id}-${newNodes[j].id}`,
            source: newNodes[i].id,
            target: newNodes[j].id,
            style: {
              stroke: `rgba(255, 255, 255, ${similarity * 0.5})`,
              strokeWidth: Math.max(1, similarity * 3),
            },
            data: { similarity }, // Store similarity for force simulation
          });
        }
      }
    }

    // Initialize force simulation
    const simulation = d3.forceSimulation(newNodes)
      .force('charge', d3.forceManyBody().strength(-1500))
      .force('center', d3.forceCenter(500, 300))
      .force('collision', d3.forceCollide().radius(d => (d.data.size / 2) + 50))
      .force('link', d3.forceLink(newEdges)
        .id(d => d.id)
        .distance(d => 200 + (1 - d.data.similarity) * 300) // More similar = closer
        .strength(d => d.data.similarity * 2)) // More similar = stronger connection
      .on('tick', () => {
        setNodes([...newNodes]);
      });

    // Store simulation reference for cleanup
    forceSimulationRef.current = simulation;

    // Set initial state
    setNodes(newNodes);
    setEdges(newEdges);

    // Cleanup
    return () => {
      if (forceSimulationRef.current) {
        forceSimulationRef.current.stop();
      }
    };
  }, [clusterGroups, selectedCluster, setNodes, setEdges]);

  const onNodeClick = useCallback((_, node) => {
    onSelectCluster(parseInt(node.id));
  }, [onSelectCluster]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        defaultViewport={defaultViewport}
        minZoom={0.2}
        maxZoom={1.5}
        fitView
        draggable={false}
        nodesConnectable={false}
        className="bg-black"
      >
        <Background
          color="#ffffff"
          style={{ backgroundColor: 'black' }}
          variant="dots"
          gap={20}
          size={1}
          className="opacity-5"
        />
        <Controls className="bg-white/5 border border-white/10 rounded-lg p-2" />
        <MiniMap
          className="bg-white/5 border border-white/10 rounded-lg p-2"
          nodeColor={(node) => node.data.color}
          maskColor="rgb(0, 0, 0, 0.8)"
          style={{ backgroundColor: 'black' }}
        />
      </ReactFlow>
    </div>
  );
}
