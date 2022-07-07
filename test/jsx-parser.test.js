import { Parser } from 'acorn';
import jsx from 'acorn-jsx';
import { ensureArray } from 'ensure-type';
import _get from 'lodash/get';
import nodesToString from '../src/nodes-to-string';

const jsxToString = (code) => {
  try {
    const ast = Parser.extend(jsx()).parse(`<Trans>${code}</Trans>`, { ecmaVersion: 2020 });

    const nodes = ensureArray(_get(ast, 'body[0].expression.children'));
    if (nodes.length === 0) {
      return '';
    }

    const options = {
      code,
      supportBasicHtmlNodes: true,
      keepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
    };

    return nodesToString(nodes, options);
  } catch (e) {
    console.error(e);
    return '';
  }
};

test('Usage with text nodes and HTML entities', () => {
  expect(jsxToString('Basic text')).toBe('Basic text');
  expect(jsxToString('Hello, {{name}}')).toBe('Hello, {{name}}');
  expect(jsxToString('I agree to the <Link>terms</Link>.')).toBe('I agree to the <1>terms</1>.');
  expect(jsxToString('One &amp; two')).toBe('One & two');
  expect(jsxToString('Don&apos;t do this <strong>Dave</strong>')).toBe('Don\'t do this <strong>Dave</strong>');
  expect(jsxToString('Hello, <span>{{name}}</span>')).toBe('Hello, <1>{{name}}</1>');
  expect(jsxToString('Hello <strong>John</strong>. <Link to="/inbox">See my profile</Link>')).toBe('Hello <strong>John</strong>. <3>See my profile</3>');
  expect(jsxToString('Hello <strong>{{name}}</strong>. <Link to="/inbox">See my profile</Link>')).toBe('Hello <1>{{name}}</1>. <3>See my profile</3>');
});

test('Usage with simple HTML elements', () => {
  /**
   * There are two options that allow you to have basic HTML tags inside your translations, instead of numeric indexes.
   * However, this only works for elements without additional attributes (like className), having none or a single text children.
   */

  // Examples of elements that will be readable in translation strings:
  expect(jsxToString('<strong>bold</strong>')).toBe('<strong>bold</strong>');
  expect(jsxToString('<i>some italic text</i>')).toBe('<i>some italic text</i>');
  expect(jsxToString('<p>some paragraph</p>')).toBe('<p>some paragraph</p>');
  expect(jsxToString('<br/>')).toBe('<br/>');
  expect(jsxToString('Some newlines <br/> would be <br/> fine')).toBe('Some newlines <br/> would be <br/> fine');

  // Examples that will be converted to indexed nodes:
  expect(jsxToString('<i className="icon-gear" />')).toBe('<0></0>'); // no attributes allowed
  expect(jsxToString('<strong title="something">{{name}}</strong>')).toBe('<0>{{name}}</0>'); // only text nodes allowed
  expect(jsxToString('<b>bold <i>italic</i></b>')).toBe('<0>bold <i>italic</i></0>'); // no nested elements, even simple ones

  // Examples of mixed use
  expect(jsxToString(`
    Lorem Ipsum is simply dummy text of the printing and typesetting industry.
    <p>
        Lorem Ipsum is simply dummy text of the printing and typesetting industry.
        <p>
            {'Lorem Ipsum is simply dummy text of the printing and typesetting industry.'}
        </p>
    </p>
    <p>
        Lorem Ipsum has been the industry's standard dummy text ever since the 1500s
    </p>
  `)).toBe('Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p></1><p>Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s</p>');
  expect(jsxToString(`
    Lorem Ipsum is simply dummy text of the printing and typesetting industry.
    <p>
        Lorem Ipsum is simply dummy text of the printing and typesetting industry.
        <p>
            xxx{'Lorem Ipsum is simply dummy text of the printing and typesetting industry.'}
        </p>
    </p>
    <p>
        Lorem Ipsum has been the industry's standard dummy text ever since the 1500s
    </p>
  `)).toBe('Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>xxxLorem Ipsum is simply dummy text of the printing and typesetting industry.</1></1><p>Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s</p>');
});
