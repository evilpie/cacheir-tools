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

const MODES = [
    "Specialized",
    "Megamorphic",
    "Generic"
];

// Helper function to generate the HTML string of a table element containing
// information read from the cacheIR instruction sequence log JSON.
function generateCacheIRInstructionTable(cacheIRArray) {

  let cacheIRstr = "";
  cacheIRstr += '<table class="cacheir-inst-seq-table">'
  cacheIRstr += '<tbody class="cacheir-inst-seq-tbody">'

  // The JSON of the cacheIR instruction sequence logs contains arrays of
  // objects. Below gets each element of the array, appends the operation value
  // to the string of HTML.
  cacheIRArray.forEach((elt) => {
    cacheIRstr += '<tr class="cacheir-inst-seq-tr">'
    cacheIRstr += '<td class="op-td">'+elt.op + '</td>';

    // The value of the args property of the cacheIR instruction sequence JSON
    // is also an array. Here, for each element of the array, we append the
    // property and value to  the string of HTML that will be injected into the
    // page.
    elt.args.forEach((arg) => {
        if( arg.hasOwnProperty('Id')
            || arg.hasOwnProperty('Field') ) {

          cacheIRstr += '<td class="arg-td">'
            +Object.entries(arg).join('').replace(',', '') + '</td>';
        }
        else {
          let key = Object.getOwnPropertyNames(arg);
          if( key.length > 0 ){
            key = key[0];

            // If the argument property is "Word", convert the integer value
            // to hex, otherwise just print the integer value.
            cacheIRstr += '<td class="arg-td">'
                +key
                +(( key.toLowerCase() === "word" ) ?
                  '(0x'+parseInt(arg[key], 10).toString(16)+')'+'</td>'
                : '('+parseInt(arg[key], 10)+')'+'</td>');
          }
        }
    });
    cacheIRstr += "</tr>"
  });
  cacheIRstr += "</tbody>"
  cacheIRstr += "</table>"
  return cacheIRstr;
}

function showObjects(objects) {
    function showObject(obj) {
        let table = document.createElement("table");

        table.innerHTML = `
        <tr>
            <td>Type</td><td>${obj.name} <b>${obj.attached ? obj.attached : ""}</b><td>
        </tr>
        <tr>
            <td>Mode</td><td>${MODES[obj.mode]}</td>
        </tr>
        <tr>
            <td>Location</td><td>${obj.file}:<b>${obj.line}</b></td>
        </tr>
        <tr>
            <td>Column</td><td>${obj.column}</td>
        </tr>
        <tr>
            <td>PC</td><td>${obj.pc}</td>
        </tr>
        <tr>
            <td class="cacheir-inst-td">Instructions</td><td>${obj.cacheIR ?
              generateCacheIRInstructionTable(obj.cacheIR) : ""}</td>
        </tr>
        `;

        function formatValue(name) {
            let value = obj[name.toLowerCase()];
            if (value == undefined)
                return;

            table.innerHTML += `
            <tr>
                <td>${name}</td><td><i>${value.type}</i> ${value.value !== undefined ? value.value : ""}</td>
            </tr>
            `;
        }

        formatValue("Property");
        formatValue("Base");

        if (obj.op !== undefined) {
            table.innerHTML += `
            <tr>
                <td>Operation</td><td><i>${obj.op}</td>
            </tr>
            `;
        }

        formatValue("LHS");
        formatValue("RHS");

        if (!obj.attached)
            table.style.backgroundColor = "#f48d73";
        return table;
    }

    let details = $("#details");
    details.innerHTML = "";

    let fragment = document.createDocumentFragment();
    for (let obj of objects) {
        let table = showObject(obj);
        fragment.appendChild(table);
    }

    details.appendChild(fragment);
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
        td.textContent = `Omitted: ${sorted.length - limit} `;
        let a = document.createElement("a");
        a.addEventListener("click", (event) => {
            sortBy(table, objects, lookup, limit * 2);
            event.preventDefault();
        });
        a.textContent = "(more)";
        a.href = "#";
        td.appendChild(a);
        let tr = document.createElement("tr");
        tr.appendChild(td);
        table.appendChild(tr);
    }
}

function analyze(objects) {
    let regexp = new RegExp($("#regexp").value);
    let selected = $("#types-select").selectedOptions;

    objects = objects.filter(obj => {
        if (!regexp.test(obj.file)) {
            return false;
        }

        if (selected.length > 0) {
            for (const option of selected) {
                if (option.value === obj.name) {
                    return true;
                }
            }

            return false;
        }

        return true;
    });

    const types = new DefaultMap(() => ({success: 0, failure: 0}));
    let failures = 0, successes = 0;
    for (let object of objects) {
        if (!object.attached) {
            types.get(object.name).failure++;
            failures++;
        } else {
            types.get(object.name).success++;
            successes++;
        }
    }

    $("#stats").innerHTML = "";

    for (let [name, {success, failure}] of types) {
        let tr = document.createElement("tr");

        let td = document.createElement("td");
        td.textContent = name;
        tr.append(td);

        td = document.createElement("td");
        let a = document.createElement("a");
        a.addEventListener("click", event => {
            showObjects(objects.filter(object => {
                return object.name === name && object.attached !== undefined;
            }))
            event.preventDefault();
        });
        a.href = "#";
        a.textContent = success;
        td.append(a);
        tr.append(td);

        td = document.createElement("td");
        a = document.createElement("a");
        a.addEventListener("click", event => {
            showObjects(objects.filter(object => {
                return object.name === name && object.attached === undefined;
            }))
            event.preventDefault();
        });
        a.href = "#";
        a.textContent = failure;
        td.append(a);
        tr.append(td);

        $("#stats").append(tr);
    }

    {
        let tr = document.createElement("tr");
        tr.innerHTML = `<td><b>Total</b></td><td>${successes}</td><td>${failures}</td>`
        $("#stats").append(tr);
    }

    sortBy($("#property-name"), objects, obj => {
        if (obj.property === undefined)
            return undefined;

        if (obj.property.type == "string")
            return obj.property.value;
        if (obj.property.type == "symbol")
            return `Symbol(${obj.property.value})`
        return undefined;
    }, 20);

    sortBy($("#property-index"), objects, obj => {
        if (obj.property === undefined)
            return undefined;

        if (obj.property.type == "string" || obj.property.type == "symbol")
            return undefined;

        return obj.property.value;
    }, 5);

    sortBy($("#success"), objects, obj => {
        if (!obj.attached)
            return undefined;

        return `${obj.name} ${obj.file}:${obj.line} (pc: ${obj.pc})`;
    });

    sortBy($("#failed"), objects, obj => {
        if (obj.attached)
            return undefined;

        return `${obj.name} ${obj.file}:${obj.line} (pc: ${obj.pc})`;
    });

    sortBy($("#kinds"), objects, obj => {
        return obj.attached;
    });

    sortBy($("#modes"), objects, obj => {
        return MODES[obj.mode];
    });
}

$("form").addEventListener("submit", event => {
    const reader = new FileReader()
    reader.onload = (event) => {
        let text = event.target.result;

        const msg = $("#msg");
        msg.textContent = "";

        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            try {
                text = text.slice(0, text.lastIndexOf("},\n{")) + "}]";
                json = JSON.parse(text);
            } catch (e) {}

            msg.textContent = "File was corrupt, tried to truncate";
        }

        analyze(json);
    }
    reader.readAsText($("#file").files[0]);
    event.preventDefault();
});

$("#clear").addEventListener("click", event => {
    $("#details").innerHTML = "";
    event.preventDefault();
});
