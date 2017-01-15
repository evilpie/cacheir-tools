import json

f = open("/tmp/ic.log", "r")
data = json.loads("[" +  f.read() + "]")
print data