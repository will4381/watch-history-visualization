import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import json
import numpy as np
import matplotlib.pyplot as plt
from sentence_transformers import SentenceTransformer
from sklearn.preprocessing import normalize
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

def main():
    input_file = "youtube_watch_history.json"
    output_file = "youtube_watch_history_clustered.json"
    
    data = load_data(input_file)
    n = len(data)
    print(f"Loaded {n} video entries.")
    
    corpus = build_text_corpus(data)
    
    print("Encoding text with SentenceTransformer...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    text_embeddings = model.encode(corpus, show_progress_bar=True)
    print(f"Text embeddings shape: {text_embeddings.shape}")
    
    embeddings_norm = normalize(text_embeddings)
    
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=2,
        min_samples=1,
        cluster_selection_epsilon=0.1,
        metric="euclidean",
        cluster_selection_method="eom"
    )
    clusters = clusterer.fit_predict(embeddings_norm)
    
    num_clusters = len(set(clusters)) - (1 if -1 in clusters else 0)
    num_noise = np.sum(clusters == -1)
    print(f"Found {num_clusters} clusters.")
    print(f"Unclustered (noise) points: {num_noise} / {n} ({100 * num_noise / n:.2f}%)")
    
    for i, entry in enumerate(data):
        entry["vector"] = text_embeddings[i].tolist()  # Raw 384-dimensional embedding
        entry["cluster"] = int(clusters[i])
    
    pca = PCA(n_components=50, random_state=42)
    X_reduced = pca.fit_transform(embeddings_norm)
    print("Performing t-SNE dimensionality reduction for visualization...")
    tsne = TSNE(n_components=2, random_state=42, perplexity=30, max_iter=1000)
    X_tsne = tsne.fit_transform(X_reduced)
    
    plt.figure(figsize=(10, 8))
    scatter = plt.scatter(X_tsne[:, 0], X_tsne[:, 1], c=clusters, cmap="tab20", alpha=0.7)
    plt.title("t-SNE Visualization of YouTube Watch History Clusters")
    plt.xlabel("t-SNE Dimension 1")
    plt.ylabel("t-SNE Dimension 2")
    plt.colorbar(scatter, label="Cluster Label")
    plt.show()
    
    with open(output_file, 'w', encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Enriched data saved to {output_file}")

if __name__ == "__main__":
    main()
