import htmlparser from 'htmlparser2';

const jsExpr = /(.*?)({+[^]+?}+)(.*)/;

export function parseJSX(fragment) {
    const ast = {
        nodeName: '#root',
        childNodes: []
    };
    const stack = [ast];

    const handler = {
        onopentag: (name) => {
            const node = {
                nodeName: name,
                childNodes: []
            };
            stack[0].childNodes.push(node);
            stack.unshift(node);
        },

        onclosetag: () => {
            stack.shift();
        },

        ontext: (text) => {
            let txt = text;
            let m = jsExpr.exec(txt);

            const addText = txt => {
                const lastNode = stack[0].childNodes.slice(-1)[0];
                if (lastNode && lastNode.nodeName === '#text') {
                    lastNode.value += txt;
                } else {
                    stack[0].childNodes.push({
                        nodeName: '#text',
                        value: txt,
                        childNodes: []
                    });
                }
            };

            if (m) {
                while ((m = jsExpr.exec(txt))) {
                    if (m[1]) {
                        addText(m[1]);
                    }
                    stack[0].childNodes.push({
                        nodeName: '#expression',
                        value: m[2],
                        childNodes: []
                    });
                    txt = m[3];
                }
            }
            if (txt) {
                addText(txt);
            }
        }
    };

    const parser = new htmlparser.Parser(handler, {
        xmlMode: true,
        decodeEntities: true
    });
    parser.write(fragment);

    return stack[0].childNodes;
}

export function astToText(ast) {
    let output = '';

    function walk(nodes) {
        nodes.forEach((node, ix) => {
            if (node.nodeName === '#text') {
                output += node.value;
            } else if (node.nodeName === '#expression') {
                output += `<${ix}>${node.value}</${ix}>`;
            } else {
                output += `<${ix}>`;
                walk(node.childNodes);
                output += `</${ix}>`;
            }
        });
    }

    walk(ast);
    return output;
}

export function jsxToText(fragment) {
    const ast = parseJSX(fragment);
    return astToText(ast);
}
