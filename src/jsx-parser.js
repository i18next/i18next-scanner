const parse5 = require('parse5')

const jsExpr = /(.*?)({+[^]+?}+)(.*)/

function transform(node) {
    let output = []
    delete node.parentNode
    if (node.nodeName === '#text') {
        let text = node.value
        let m = jsExpr.exec(node.value)
        if (!m) {
            return node
        }
        while ((m = jsExpr.exec(text))) {
            if (m[1]) {
                output.push({
                    nodeName: '#text',
                    value: m[1],
                    parentNode: node.parentNode
                })
            }
            output.push({
                nodeName: '#expression',
                value: m[2],
                parentNode: node.parentNode
            })
            text = m[3]
        }
        if (text) {
            output.push({
                nodeName: '#text',
                value: text,
                parentNode: node.parentNode
            })
        }
    } else {
        node.childNodes = Array.prototype.concat.apply(
            [],
            node.childNodes.map(transform)
        )
        output.push(node)
    }
    return output
}


export function parseJSX(fragment) {
    const ast = parse5.parseFragment(fragment)
    return transform(ast)[0].childNodes
}


function astToText(ast) {
    let output = ''

    function walk(nodes) {
        nodes.forEach((node, ix) => {
            if (node.nodeName === '#text') {
                output += node.value;
            } else if (node.nodeName === '#expression') {
                output += `<${ix}>${node.value}</${ix}>`
            } else {
                output += `<${ix}>`
                walk(node.childNodes)
                output += `</${ix}>`
            }
        })
    }

    walk(ast)
    return output
}

export default function jsxToText(fragment) {
    const ast = parseJSX(fragment)
    return astToText(ast)
}
