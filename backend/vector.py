import os
# Disable parallelism in Hugging Face tokenizers to avoid fork warnings.
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import json
import datetime
import numpy as np
import matplotlib.pyplot as plt

from sentence_transformers import SentenceTransformer
from sklearn.preprocessing import StandardScaler, normalize
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
import hdbscan

def load_data(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def build_text_corpus(data):
    corpus = []
    for entry in data:
        title = entry.get("video_title", "")
        channel = entry.get("channel_name", "")
        corpus.append(f"{title} {channel}")
    return corpus

def parse_timestamp(ts):
    try:
        dt = datetime.datetime.fromisoformat(ts)
        return dt.timestamp()
    except Exception:
        return None

def build_time_feature(data):
    times = []
    for entry in data:
        ts_str = entry.get("timestamp", "")
        t = parse_timestamp(ts_str)
        if t is None:
            t = 0
        times.append(t)
    return np.array(times).reshape(-1, 1)

def main():
    input_file = 'youtube_watch_history.json'
    output_file = 'youtube_watch_history_twostage_clustered.json'
    
    data = load_data(input_file)
    n = len(data)
    print(f"Loaded {n} video entries.")
    
    corpus = build_text_corpus(data)
    
    print("Encoding text with SentenceTransformer...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    text_embeddings = model.encode(corpus, show_progress_bar=True)
    print(f"Text embeddings shape: {text_embeddings.shape}")
    
    for i, entry in enumerate(data):
        entry["content_vector"] = text_embeddings[i].tolist()
    
    # normalize the text embeddings so that euclidean distance approximates cosine similarity
    text_embeddings_norm = normalize(text_embeddings)
    
    clusterer_content = hdbscan.HDBSCAN(
        min_cluster_size=5,
        min_samples=1,
        metric='euclidean',
        cluster_selection_method='eom'
    )
    clusters_content = clusterer_content.fit_predict(text_embeddings_norm)
    num_content_clusters = len(set(clusters_content)) - (1 if -1 in clusters_content else 0)
    num_noise_stage1 = np.sum(clusters_content == -1)
    print(f"Stage 1 (Content) clustering: Found {num_content_clusters} clusters.")
    print(f"Unclustered (noise) points in Stage 1: {num_noise_stage1} / {n} ({100 * num_noise_stage1/n:.2f}%)")
    
    for entry, label in zip(data, clusters_content):
        entry["cluster_content"] = int(label)
    
    time_feature = build_time_feature(data)
    for i, entry in enumerate(data):
        entry["time_value"] = float(time_feature[i])
    
    cluster_time_labels = np.full(n, -1)  # default label -1 (noise)
    
    unique_content_clusters = set(clusters_content)
    for cluster in unique_content_clusters:
        if cluster == -1:
            continue
        indices = [i for i, c in enumerate(clusters_content) if c == cluster]
        if len(indices) < 2:
            for i in indices:
                cluster_time_labels[i] = 0
            continue
        
        times_cluster = time_feature[indices]
        scaler_cluster = StandardScaler()
        times_cluster_norm = scaler_cluster.fit_transform(times_cluster)
        
        clusterer_time = hdbscan.HDBSCAN(
            min_cluster_size=2,
            min_samples=1,
            metric='euclidean',
            cluster_selection_method='eom'
        )
        sub_clusters = clusterer_time.fit_predict(times_cluster_norm)
        for idx, sub_label in zip(indices, sub_clusters):
            cluster_time_labels[idx] = int(sub_label)
    
    for i, entry in enumerate(data):
        entry["cluster_time"] = int(cluster_time_labels[i])
    
    combined_cluster_labels = []
    for c, t in zip(clusters_content, cluster_time_labels):
        if c == -1 or t == -1:
            combined_cluster_labels.append(-1)
        else:
            combined_cluster_labels.append(f"{c}_{t}")
    for entry, comb_label in zip(data, combined_cluster_labels):
        entry["combined_cluster"] = comb_label
    
    num_time_noise = np.sum(cluster_time_labels == -1)
    print(f"Stage 2: Unclustered (time) points within content clusters: {num_time_noise} / {n}")
    
    time_norm_all = StandardScaler().fit_transform(time_feature)
    vis_features = np.hstack([text_embeddings, 0.1 * time_norm_all])
    print(f"Combined features for visualization shape: {vis_features.shape}")
    
    pca = PCA(n_components=50, random_state=42)
    X_reduced = pca.fit_transform(vis_features)
    
    print("Performing t-SNE dimensionality reduction for visualization...")
    tsne = TSNE(n_components=2, random_state=42, perplexity=30, max_iter=1000)
    X_tsne = tsne.fit_transform(X_reduced)
    
    plt.figure(figsize=(10, 8))
    scatter = plt.scatter(X_tsne[:, 0], X_tsne[:, 1], c=clusters_content, cmap='tab20', alpha=0.7)
    plt.title("t-SNE Visualization of Stage 1 (Content) Clusters")
    plt.xlabel("t-SNE Dimension 1")
    plt.ylabel("t-SNE Dimension 2")
    cbar = plt.colorbar(scatter, label="Content Cluster Label")
    plt.show()
    
    # 8. Save the enriched data.
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Enriched data with two-stage clusters saved to {output_file}")

if __name__ == "__main__":
    main()
