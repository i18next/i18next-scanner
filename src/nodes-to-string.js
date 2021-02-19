import _get from 'lodash/get';

const isJSXText = (node) => {
    if (!node) {
        return false;
    }

    return node.type === 'JSXText';
};

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

const nodesToString = (nodes, code) => {
    let memo = '';
    let nodeIndex = 0;
    nodes.forEach((node, i) => {
        if (isJSXText(node) || isStringLiteral(node)) {
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
                memo += `{{${expression.properties[0].key.name}}}`;
            } else {
                console.error(`Unsupported JSX expression. Only static values or {{interpolation}} blocks are supported. Got ${expression.type}:`);
                console.error(code.slice(node.start, node.end));
                console.error(node.expression);
            }
        } else if (node.children) {
            if (node.openingElement.selfClosing) {
                memo += `<${nodeIndex}/>${nodesToString(node.children, code)}`;
            } else {
                memo += `<${nodeIndex}>${nodesToString(node.children, code)}</${nodeIndex}>`;
            }
        }

        ++nodeIndex;
    });

    return memo;
};

export default nodesToString;
