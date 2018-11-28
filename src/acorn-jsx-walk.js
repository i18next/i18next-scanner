// Originally from: https://github.com/sderosiaux/acorn-jsx-walk

import { Parser } from 'acorn';
import { simple as walk, base } from 'acorn-walk';
import jsx from 'acorn-jsx';
import stage3 from 'acorn-stage3';

//
// Extends acorn walk with JSX elements
//

// See: https://github.com/RReverser/acorn-jsx/issues/23#issuecomment-403753801
Object.assign(base, {
    FieldDefinition(node, state, callback) {
        if (node.value !== null) {
            callback(node.value, state);
        }
    },

    JSXAttribute(node, state, callback) {
        if (node.value !== null) {
            callback(node.value, state);
        }
    },

    JSXElement(node, state, callback) {
        node.openingElement.attributes.forEach(attribute => {
            callback(attribute, state);
        });
        node.children.forEach(node => {
            callback(node, state);
        });
    },

    JSXEmptyExpression(node, state, callback) {
        // Comments. Just ignore.
    },

    JSXExpressionContainer(node, state, callback) {
        callback(node.expression, state);
    },

    JSXFragment(node, state, callback) {
        node.children.forEach(node => {
            callback(node, state);
        });
    },

    JSXSpreadAttribute(node, state, callback) {
        callback(node.argument, state);
    },

    JSXText() {}
});

export default (source, options) => {
    const ast = Parser.extend(stage3, jsx()).parse(source, {
        sourceType: 'module',
        ecmaVersion: 10,
    });
    walk(ast, options || {});
};
