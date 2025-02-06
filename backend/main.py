from bs4 import BeautifulSoup
import json

with open('watch-history.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

activities = soup.find_all('div', class_='outer-cell')

parsed_data = []

for activity in activities:
    data = {}
    
    header_cell = activity.find('div', class_='header-cell')
    if header_cell:
        header_text = header_cell.get_text(strip=True)
        data['service'] = header_text
    
    content_cell = activity.find('div', class_='content-cell')
    if content_cell:
        # Watched <a href="video_url">Video Title</a><br>
        # <a href="channel_url">Channel Name</a><br>
        # Timestamp
        video_a = content_cell.find('a', href=True)
        if video_a:
            data['video_title'] = video_a.get_text(strip=True)
            data['video_url'] = video_a['href']
        
        a_tags = content_cell.find_all('a', href=True)
        if len(a_tags) >= 2:
            channel_a = a_tags[1]
            data['channel_name'] = channel_a.get_text(strip=True)
            data['channel_url'] = channel_a['href']
        
        texts = list(content_cell.stripped_strings)
        if texts:
            data['timestamp'] = texts[-1]
    
    parsed_data.append(data)

for event in parsed_data:
    print(json.dumps(event, indent=2))

with open('youtube_watch_history.json', 'w', encoding='utf-8') as outfile:
    json.dump(parsed_data, outfile, ensure_ascii=False, indent=2)
