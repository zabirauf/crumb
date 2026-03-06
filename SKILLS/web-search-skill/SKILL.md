---
name: web-search-shell
description: Perform web searches and process results using shell commands. Use this skill whenever the user wants to search the web, scrape URLs, fetch page content, download files from the internet, or combine web lookups with shell processing (grep, jq, awk, curl, wget). Trigger this skill for queries like "search for X and save results", "fetch this URL and parse it", "download and process this file", or any task combining internet access with command-line tools. Always use this skill when the task involves both web data retrieval and shell-based processing.
---

# Web Search + Shell Skill

This skill combines web search capabilities with shell command execution to fetch, process, and transform web content.

## When to Use

- User wants to search the web and process/save results
- User needs to fetch a URL and extract specific data
- User wants to download files and process them with shell tools
- Any combination of internet data retrieval + shell processing (grep, jq, curl, awk, sed, etc.)

## Workflow

### 1. Determine the Retrieval Method

**For general web search** (finding pages, news, facts):
```bash
# Use curl with a search engine or direct URL
curl -sL "https://html.duckduckgo.com/html/?q=YOUR+QUERY" | \
  grep -oP '(?<=class="result__snippet">)[^<]+' | head -20
```

**For fetching a specific URL**:
```bash
curl -sL --max-time 15 -A "Mozilla/5.0" "https://example.com" | \
  sed 's/<[^>]*>//g' | grep -v '^[[:space:]]*$' | head -50
```

**For downloading and saving**:
```bash
curl -sL -o /home/claude/output.html "https://example.com"
wget -q -O /home/claude/output.txt "https://example.com"
```

### 2. Process Results with Shell Tools

Common processing patterns:
```bash
# Extract JSON fields
curl -sL "https://api.example.com/data" | jq '.results[] | .name'

# Filter lines matching a pattern
curl -sL "https://example.com" | grep -i "keyword"

# Count occurrences
curl -sL "https://example.com" | grep -c "pattern"

# Strip HTML tags and clean up whitespace
curl -sL "https://example.com" | \
  sed 's/<[^>]*>//g' | \
  sed '/^[[:space:]]*$/d' | \
  tr -s ' '
```

### 3. Save and Present Output

Always save meaningful results to `/home/claude/` and present them to the user:
```bash
# Save processed output
curl -sL "URL" | jq '.' > /home/claude/results.json

# Present the file
# (use present_files tool after saving)
```

## Key Shell Tools Available

| Tool | Use Case |
|------|----------|
| `curl` | Fetch URLs, POST requests, download files |
| `wget` | Download files recursively |
| `jq` | Parse and filter JSON |
| `grep` | Filter text by pattern |
| `sed` | Transform/replace text |
| `awk` | Column-based text processing |
| `python3` | Complex parsing (HTML, CSV, etc.) |

## Python for Complex Parsing

For HTML parsing, use Python's built-in libraries:
```bash
python3 - <<'EOF'
import urllib.request
import html.parser

url = "https://example.com"
with urllib.request.urlopen(url) as response:
    content = response.read().decode('utf-8')
    # process content
    print(content[:2000])
EOF
```

## Error Handling

Always check if requests succeed:
```bash
response=$(curl -sL -w "\n%{http_code}" "https://example.com")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    echo "$body" | process_further
else
    echo "Error: HTTP $http_code"
fi
```

## Tips

- Use `-sL` flags with curl: `-s` for silent, `-L` to follow redirects
- Set `--max-time 15` to avoid hanging on slow sites
- Use `python3` for sites with complex HTML structure
- Pipe through `head -100` to preview before processing fully
- Save intermediate results to `/home/claude/` for inspection