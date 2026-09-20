#!/usr/bin/env sh
# Every screen here is Ant Design and every icon is Tabler, and saying so in
# CLAUDE.md has not been enough. Raw HTML is allowed — for a custom component or
# a bespoke design antd cannot cover — but only said out loud: the marker has to
# carry a reason. Only the lines an edit adds are read, so legacy markup is never
# re-litigated.

file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

case "$file" in
	*.tsx) ;;
	*) exit 0 ;;
esac

# Email bodies and OG images are raw HTML by construction — antd never renders there.
case "$file" in
	*/src/templates/* | *opengraph-image* | *twitter-image*) exit 0 ;;
esac

root="${CLAUDE_PROJECT_DIR:-.}"
cd "$root" || exit 0

off=$(grep -m1 'ui-guard: off' "$file")
if [ -n "$off" ]; then
	reason=$(printf '%s' "$off" | sed 's/.*ui-guard: off//; s/[^[:alnum:]]//g')
	case "$reason" in
		???*) exit 0 ;;
	esac
	printf '"ui-guard: off" in %s names no reason. Say what antd could not cover\nfor this file — "ui-guard: off — <reason>" — or drop the marker.\n' "$file" >&2
	exit 2
fi

# Added lines only: a file Claude has not touched yet is not this hook's business.
if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
	added=$(git diff -U0 --no-color HEAD -- "$file" 2>/dev/null | awk '
		/^\+\+\+/ { next }
		/^@@/ { split($3, a, ","); n = substr(a[1], 2) + 0; next }
		/^\+/ { print n ":" substr($0, 2); n++; next }
		/^ / { n++ }
	')
else
	added=$(awk '{ print NR ":" $0 }' "$file")
fi

[ -n "$added" ] || exit 0

report=$(printf '%s\n' "$added" | awk -v FILENAME_ARG="$file" -F: '
	# A marker excuses the line it sits on and the line below it. It has to carry a
	# reason: a bare marker is a mute button, and a mute button is how this stops working.
	function excuse(n,   s) {
		s = src[n]
		if (s !~ /ui-guard-ignore/) s = src[n - 1]
		if (s !~ /ui-guard-ignore/) return 0
		sub(/.*ui-guard-ignore/, "", s)
		gsub(/[^[:alnum:]]/, "", s)
		return length(s) >= 3 ? 1 : -1
	}

	BEGIN { while ((getline l < FILENAME_ARG) > 0) src[++i] = l }

	{ line = $1 + 0; sub(/^[0-9]+:/, "", $0); code = $0 }
	code ~ /^[[:space:]]*(\/\/|\*|\/\*)/ { next }

	{
		swap = ""
		if (code ~ /<button([ >]|\/>)/)                       swap = "<button> -> Button"
		else if (code ~ /<(table|thead|tbody|tfoot|tr|td|th)([ >]|\/>)/) swap = "raw table markup -> Table (columns + dataSource)"
		else if (code ~ /<(input|textarea)([ >]|\/>)/)        swap = "<input>/<textarea> -> Input, Input.TextArea, InputNumber"
		else if (code ~ /<(select|option)([ >]|\/>)/)         swap = "<select> -> Select"
		else if (code ~ /<(form|label)([ >]|\/>)/)            swap = "<form>/<label> -> Form + Form.Item"
		else if (code ~ /<h[1-6]([ >]|\/>)/)                  swap = "<h1>..<h6> -> Typography.Title level={n}"
		else if (code ~ /<p([ >]|\/>)/)                       swap = "<p> -> Typography.Paragraph (or Typography.Text)"
		else if (code ~ /<(ul|ol|li)([ >]|\/>)/)              swap = "<ul>/<li> -> List (renderItem), or Flex for a plain stack"
		else if (code ~ /<img([ >]|\/>)/)                     swap = "<img> -> AppImage (@/components/ui/AppImage)"
		else if (code ~ /<hr([ >]|\/>)/)                      swap = "<hr> -> Divider"
		else if (code ~ /<dialog([ >]|\/>)/)                  swap = "<dialog> -> Modal"
		else if (code ~ /<progress([ >]|\/>)/)                swap = "<progress> -> Progress"
		else if (code ~ /<a[ ][^>]*href=/)                    swap = "<a href> -> next/link Link (or Typography.Link)"

		if (swap == "") {
			if (code ~ /from[ ]*["'"'"'](react-icons|lucide-react|@heroicons|@mui\/icons)/) swap = "foreign icon pack -> @tabler/icons-react"
			else if (code ~ /from[ ]*["'"'"']@ant-design\/icons/ && code !~ /LoadingOutlined/ && code !~ /^import Icon from/) swap = "@ant-design/icons -> @tabler/icons-react"
		}
		if (swap == "") next

		e = excuse(line)
		if (e == 1) next
		if (e == -1) printf "  %s:%s  ui-guard-ignore names no reason — say what antd could not cover\n", FILENAME_ARG, line
		else printf "  %s:%s  %s\n", FILENAME_ARG, line, swap
	}
')

[ -n "$report" ] || exit 0

cat >&2 <<EOF
Raw HTML in a file antd is supposed to render:

$report

Check antd first — its MCP server is connected: mcp__antd__antd_list finds the
component, mcp__antd__antd_doc and mcp__antd__antd_demo give props and a working
example. If antd ships it, use it rather than hand-rolling it again.

HTML is right where antd genuinely cannot do it — a custom component, or a bespoke
design nothing in the library fits. Then keep it and name what antd could not cover:
"ui-guard-ignore <reason>" on the line or the line above it, or "ui-guard: off
<reason>" once at the top of the file. Layout is always CSS — <div>, <span> and
SCSS modules never trip this.
EOF
exit 2
