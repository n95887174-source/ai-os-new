"""Migrate eventBus imports from kernel/events/event-bus to kernel/instances."""
import os
import re
from pathlib import Path

ROOT = Path(r"C:\Users\egily\Desktop\ai-os-new\src")

# Patterns for each depth level
REPLACEMENTS = [
    # components/*/file.tsx and similar 2-level deep files
    (r"from '(\.\./\.\./)kernel/events/event-bus'", r"from '\1kernel/instances'"),
    # components/*/*/file.tsx (3 levels)
    (r"from '(\.\./\.\./\.\./)kernel/events/event-bus'", r"from '\1kernel/instances'"),
    # stores/*/file.ts and hooks/*/file.ts (1 level)
    (r"from '(\.\./)kernel/events/event-bus'", r"from '\1kernel/instances'"),
    # stores/*/*/file.ts (2 levels)
    (r"from '(\.\./\.\./)kernel/events/event-bus'", r"from '\1kernel/instances'"),
    # kernel/services/*/file.ts (1 level from services)
    (r"from '(\.\./)events/event-bus'", r"from '\1instances'"),
    # kernel/services/*/*/file.ts (2 levels from services)
    (r"from '(\.\./\.\./)events/event-bus'", r"from '\1instances'"),
    # kernel/utils/*/file.ts (2 levels)
    (r"from '(\.\./\.\./)events/event-bus'", r"from '\1instances'"),
    # main.tsx
    (r"from '(\./)kernel/events/event-bus'", r"from '\1kernel/instances'"),
]

def process_file(path: Path) -> bool:
    content = path.read_text(encoding='utf-8')
    original = content

    # Skip event-bus.ts itself
    if path.name == 'event-bus.ts':
        return False

    # Skip kernel/index.ts (re-exports from event-bus, different purpose)
    if str(path).endswith('kernel/index.ts'):
        return False

    # Skip instances.ts (just added the export)
    if path.name == 'instances.ts':
        return False

    # Check if this file actually imports from event-bus
    if not re.search(r"from '.*event-bus'", content):
        return False

    new_content = content

    for pattern, replacement in REPLACEMENTS:
        new_content = re.sub(pattern, replacement, new_content)

    if new_content != original:
        path.write_text(new_content, encoding='utf-8')
        return True
    return False

count = 0
for path in ROOT.rglob("*.ts"):
    if process_file(path):
        rel = str(path.relative_to(ROOT))
        print(f"  UPDATED: {rel}")
        count += 1

for path in ROOT.rglob("*.tsx"):
    if process_file(path):
        rel = str(path.relative_to(ROOT))
        print(f"  UPDATED: {rel}")
        count += 1

print(f"\nTotal updated: {count}")
