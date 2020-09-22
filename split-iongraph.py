import sys
import json
import random

search_start = "{\n  \"name\": \""
search_end = "},\n{\n  \"name\""

start = 0

counts = 0

f = open(sys.argv[1], "r")
text = f.read()

while True:
  start = text.find(search_start, start)
  end = text.find(search_end, start)

  if start < 0 or end < 0:
    break

  name_start = start + len(search_start)
  name = text[name_start:text.find('"', name_start)]

  print("#{} {}".format(counts, name))

  f = open("/tmp/ion-{}.json".format(counts), "w")
  f.write("""{
    "functions": [
  """)
  f.write(text[start:end + 1])
  f.write("]}")

  start = end
  counts += 1