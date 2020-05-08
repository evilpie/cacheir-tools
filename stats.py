import argparse
import json
import collections

parser = argparse.ArgumentParser(description='Process a CacheIR json file')
parser.add_argument('json', type=argparse.FileType('r'),
                    help='CacheIR json file to analyze')

args = parser.parse_args()
data = json.load(args.json)


attached = collections.defaultdict(list)

for ic in data:
  if not 'attached' in ic:
    continue

  #print("{} {} {}".format(ic['name'], ic['pc'], ic['attached']))

  attached[ic['pc']].append((ic['name'], ic['attached']))

counter = collections.Counter([tuple(l) for l in attached.values()])

for item in counter.most_common(100):
  name = item[0][0][0]

  stubs = []
  for attached in item[0]:
    stubs.append(attached[1])

  if len(stubs) == 1:
    continue

  print("{}: {} => {}".format(name, stubs, item[1]))
