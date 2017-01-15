<!doctype HTML>
<html>
<head>
<meta charset="utf-8">
<title>CacheIR Analyzer</title>
<style>
#details > table {
    margin-bottom: 1em;
}
</style>
</head>
<body>
<h1>CacheIR Analyzer</h1>

<form>
<input type=file id="file">
<label>Limit to .js files matching this RegExp: <input type=text id="regexp"></label>
<button>Analyze</button>
</form>

<h1>Result<h1>
<h2>Stats</h2>
<table id=stats>
<tr>
    <td>Total entries</td><td id=entries></td>
</tr>
<tr>
    <td>Failures</td><td id=failures></td>
</tr>
</table>

<h2>Sorted by Property</h2>
<table id=property>
</table>

<h2>Locations</h2>
<table id=locations>
</table>

<h2>Locations where applying an IC failed</h2>
<table id=failed>
</table>

<h2>IC Kinds</h2>
<table id=kinds>
</table>

<h2>Details</h2>
<div id=details></div>

<script>
"use strict";

const $ = document.querySelector.bind(document);

class DefaultMap extends Map {
  constructor(defaultConstructor, init) {
    super(init);
    this.defaultConstructor = defaultConstructor;
  }

  get(key) {
    if (!this.has(key)) {
      this.set(key, this.defaultConstructor(key));
    }
    return super.get(key);
  }
}

const kinds = [
    "None",
    "Native",
    "Unboxed",
    "UnboxedExpando",
    "TypedObject",
    "ObjectLength",
    "ModuleNamespace",
    "WindowProxy",
    "GenericProxy",
    "DOMProxyExpando",
    "DOMProxyShadowed",
    "DOMProxyUnshadowed",
    "Primitive",
    "StringChar",
    "StringLength",
    "MagicArgumentName",
    "MagicArgument",
    "ArgumentsObjectArg",
    "DenseElement",
    "DenseElementHole",
    "UnboxedArrayElement",
    "TypedElement",
    "ProxyElement"
];

function showObjects(objects) {
    function showObject(obj) {
        let table = document.createElement("table");
        table.innerHTML = `
        <tr>
            <td>Type</td><td>${obj.type}${obj.ic ? " <b>" + kinds[obj.ic.kind] + "</b>" : ""}<td>
        </tr>
        <tr>
            <td>Location</td><td>${obj.where.file}:<b>${obj.where.line}</b></td>
        </tr>
        <tr>
            <td>PC</td><td>${obj.where.pc}</td>
        </tr>
        <tr>
            <td>Property</td><td><i>${obj.property.type}</i> ${obj.property.value !== undefined ? obj.property.value : ""}</td>
        </tr>
        <tr>
            <td>Value</td><td><i>${obj.value.type}</i></td>
        </tr>
        `;
        if (obj.ic === null)
            table.style.backgroundColor = "#f48d73";
        return table;
    }

    let details = $("#details");
    details.innerHTML = "";
    for (let obj of objects) {
        let table = showObject(obj);
        details.appendChild(table);
    }

    details.scrollIntoView(true);
}

function sortBy(table, objects, lookup, limit=10) {
    table.innerHTML = "";

    let things = new DefaultMap(() => new Array());
    for (let obj of objects) {
        let p = lookup(obj);
        if (p === undefined)
            continue;

        things.get(p).push(obj);
    }

    let sorted = Array.from(things.entries()).sort((a, b) => {
        return b[1].length - a[1].length;
    });

    for (let [property, objects] of sorted.slice(0, limit)) {
        let tr = document.createElement("tr");

        let td = document.createElement("td");
        td.textContent = property;
        tr.appendChild(td);

        td = document.createElement("td");
        let a = document.createElement("a");
        a.textContent = objects.length;
        a.addEventListener("click", (event) => { showObjects(objects); event.preventDefault(); });
        a.href = "#";
        td.appendChild(a);
        tr.appendChild(td)

        table.appendChild(tr);
    }

    if (sorted.length > limit) {
        let td = document.createElement("td");
        td.textContent = `Omitted: ${sorted.length - limit}`;
        let a = document.createElement("a");
        a.addEventListener("click", () => sortBy(table, objects, lookup, limit * 2));
        a.textContent = " (more)";
        a.href = "#";
        td.appendChild(a);
        let tr = document.createElement("tr");
        tr.appendChild(td);
        table.appendChild(tr);
    }
}

function analyze(objects, filter) {
    let types = new DefaultMap(() => 0);
    let failures = 0

    let regexp = new RegExp(filter);
    objects = objects.filter(obj => regexp.test(obj.where.file));

    for (let object of objects) {
        types.set(object.type, types.get(object.type) + 1);

        if (object.ic === null) {
            failures++;
        }
    }

    for (let [type, count] of types) {
        $("#stats").innerHTML += `<tr><td>${type}</td><td>${count}</td></tr>`;
    }

    $("#entries").textContent = objects.length;
    $("#failures").textContent = failures;

    sortBy($("#property"), objects, obj => {
        if (obj.property.type !== "string")
            return undefined;
        return obj.property.value;
    }, 20);

    sortBy($("#failed"), objects, obj => {
        if (obj.ic !== null)
            return undefined;

        return `${obj.where.file}:${obj.where.line} (pc: ${obj.where.pc})`;
    });

    sortBy($("#locations"), objects, obj => {
        return `${obj.where.file}:${obj.where.line} (pc: ${obj.where.pc})`;
    });

    sortBy($("#kinds"), objects, obj => {
        if (obj.ic === null)
            return undefined;
        return kinds[obj.ic.kind];
    })
}

$("form").addEventListener("submit", (event) => {
    const reader = new FileReader()
    reader.onload = (event) => {
        const text = "[" + event.target.result.slice(0, -2) + "]";
        const json = JSON.parse(text);
        analyze(json, $("#regexp").value);
    }
    reader.readAsText($("#file").files[0]);
    event.preventDefault();
});
</script>
</body>
</html>