import { parse } from 'acorn-jsx';
import ensureArray from 'ensure-array';
import _get from 'lodash/get';

const isNumericLiteral = (node) => {
    if (!node) {
        return false;
    }

    return node.type === 'Literal' && typeof node.value === 'number';
};

const isStringLiteral = (node) => {
    if (!node) {
        return false;
    }

    return node.type === 'Literal' && typeof node.value === 'string';
};

const isObjectExpression = (node) => {
    if (!node) {
        return false;
    }

    return node.type === 'ObjectExpression';
};

const nodesToString = (nodes) => {
    let memo = '';
    let nodeIndex = 0;
    nodes.forEach((node, i) => {
        if (node.type === 'JSXText') {
            const value = (node.value)
                .replace(/^[\r\n]+\s*/g, '') // remove leading spaces containing a leading newline character
                .replace(/[\r\n]+\s*$/g, '') // remove trailing spaces containing a leading newline character
                .replace(/[\r\n]+\s*/g, ' '); // replace spaces containing a leading newline character with a single space character

            if (!value) {
                return;
            }
            memo += value;
        } else if (node.type === 'JSXExpressionContainer') {
            const { expression = {} } = node;

            if (isNumericLiteral(expression)) {
                // Numeric literal is ignored in react-i18next
                memo += '';
            } if (isStringLiteral(expression)) {
                memo += expression.value;
            } else if (isObjectExpression(expression) && (_get(expression, 'properties[0].type') === 'Property')) {
                memo += `<${nodeIndex}>{{${expression.properties[0].key.name}}}</${nodeIndex}>`;
            } else {
                console.error(`Unsupported JSX expression. Only static values or {{interpolation}} blocks are supported. Got ${expression.type}:`);
                console.error(node.expression);
            }
        } else if (node.children) {
            memo += `<${nodeIndex}>${nodesToString(node.children)}</${nodeIndex}>`;
        }

        ++nodeIndex;
    });

    return memo;
};

const jsxToString = (code) => {
    try {
        const ast = parse(`<Trans>${code}</Trans>`, {
            plugins: { jsx: true }
        });

        const nodes = ensureArray(_get(ast, 'body[0].expression.children'));
        if (nodes.length === 0) {
            return '';
        }

        return nodesToString(nodes);
    } catch (e) {
        console.error(e);
        return '';
    }
};

export default jsxToString;
