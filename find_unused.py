import os
import re
import subprocess

def get_exports(directory):
    exports = []
    # Regex to catch various export patterns
    patterns = [
        r'export\s+(?:const|function|class|type|interface|enum)\s+([a-zA-Z0-9_]+)',
        r'export\s+default\s+([a-zA-Z0-9_]+)',
        r'export\s+{[^}]*?\b([a-zA-Z0-9_]+)\b[^}]*?}'
    ]
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.ts', '.tsx')) and not file.endswith('.test.ts') and not file.endswith('.test.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', errors='ignore') as f:
                    content = f.read()
                    for pattern in patterns:
                        matches = re.finditer(pattern, content)
                        for match in matches:
                            name = match.group(1)
                            if name:
                                exports.append((path, name))
    return exports

def is_used(name, definition_file, directory):
    # Search for the name in the directory, excluding the definition file
    # and excluding comments or string literals if possible (but grep is simpler)
    try:
        # We look for the name as a whole word
        cmd = ['grep', '-r', '-l', r'\b' + name + r'\b', directory]
        output = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode()
        files = output.strip().split('\n')
        # Filter out the definition file
        usages = [f for f in files if os.path.abspath(f) != os.path.abspath(definition_file)]
        # Filter out tests if we want to be strict about "unused in production"
        usages = [f for f in usages if not f.endswith(('.test.ts', '.test.tsx'))]
        return len(usages) > 0
    except subprocess.CalledProcessError:
        return False

def main():
    src_dir = 'src'
    print(f"Scanning {src_dir} for exports...")
    exports = get_exports(src_dir)
    print(f"Found {len(exports)} exports. Checking usage...")
    
    unused = []
    for path, name in exports:
        if name in ('default', 'interface', 'type', 'const', 'function', 'class'):
            continue # skip keywords that might be mis-captured
        if not is_used(name, path, src_dir):
            unused.append((path, name))
            print(f"Potentially unused: {name} in {path}")

    print("\n--- Summary ---")
    if not unused:
        print("No unused exports found.")
    for path, name in unused:
        print(f"{path}: {name}")

if __name__ == "__main__":
    main()
