import argparse
import json

parser = argparse.ArgumentParser(description='Process a CacheIR json file')
parser.add_argument('json', type=argparse.FileType('r'),
                    help='CacheIR json file to optimize')
parser.add_argument('out', type=argparse.FileType('w'),
                    help='Output')
parser.add_argument('--url', type=str,
                    help='Filter to a specific URL')
parser.add_argument('--shorten', action='store_true',
                    help='Shorten strings')


args = parser.parse_args()
data = json.load(args.json)

def shorten(ref):
    if ref['type'] != 'string' or not 'value' in ref:
        return ref

    ref['value'] = ref['value'][:20]
    return ref

filtered = []
for ic in data:
    if args.url:
        if not args.url.lower() in ic['file'].lower():
            continue

    if args.shorten:
        ic['base'] = shorten(ic['base'])
        ic['property'] = shorten(ic['property'])

    filtered.append(ic)


json.dump(filtered, args.out)
