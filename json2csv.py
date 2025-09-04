import json
import os
import pandas as pd
from datetime import datetime

rows = []

for filename in os.listdir('../reports'):
    if filename.endswith('.json'):
        with open(f'../reports/{filename}') as f:
            data = json.load(f)

        audits = data['audits']
        url = data['finalUrl']
        green_items = (
            audits.get('green-host-audit', {})
                .get('details', {})
                .get('items', [])
        )

        green = green_items[0].get('hosted_by') if green_items else "Unknown"

        refresh_details = audits.get('refresh-frequency-audit', {}).get('details', {})
        polling_request = refresh_details.get('items', [])
        ws_count = refresh_details.get('websocketCount')

        cdn_items = audits.get('cdn-usage-audit', {}).get('details', {}).get('items', [])
        cdn_hit_items = [item for item in cdn_items if item.get('cdnHit') == True]

        server_data_retention_details = audits.get('server-data-retention', {}).get('details', {})

        cookie_size = server_data_retention_details.get('cookieTotalBytes')
        cached_resources_size = server_data_retention_details.get('resourceCacheableBytes')
        heavy_long_cache = server_data_retention_details.get('heavyLongCache')

        polling_occurrence = sum(req['count'] for req in polling_request)

        row = {
            'URL': url,
            'Green Host': green,
            'Static Count': len(cdn_items),
            'Cdn Hit Count': len(cdn_hit_items),
            'Cdn Hit Rate': f"{len(cdn_hit_items) / len(cdn_items):.2f}" if len(cdn_items) else "0.00",
            'Polling Request': polling_request,
            'Polling Count': polling_occurrence,
            'Websocket Count': ws_count,
            'Cookie Size': cookie_size,
            'Cached Resource Size': cached_resources_size,
            'Heavy Long Cache': heavy_long_cache
        }

        rows.append(row)

df = pd.DataFrame(rows)

timestamp = datetime.now().strftime("%Y%m%d_%H%M")

# filename concatenation
filename = f"lighthouse_summary_{timestamp}.csv"
df.to_csv(filename, index=False)

print(f"output completed: {filename}")
