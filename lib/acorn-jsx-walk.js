"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _acornWalk = require("acorn-walk");

var _acornDynamicImport = require("acorn-dynamic-import");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

Object.assign(_acornWalk.base, _defineProperty({
  FieldDefinition: function FieldDefinition(node, state, callback) {
    if (node.value !== null) {
      callback(node.value, state);
    }
  }
}, _acornDynamicImport.DynamicImportKey, function () {})); // Extends acorn walk with JSX elements
// https://github.com/RReverser/acorn-jsx/issues/23#issuecomment-403753801

Object.assign(_acornWalk.base, {
  JSXAttribute: function JSXAttribute(node, state, callback) {
    if (node.value !== null) {
      callback(node.value, state);
    }
  },
  JSXElement: function JSXElement(node, state, callback) {
    node.openingElement.attributes.forEach(function (attribute) {
      callback(attribute, state);
    });
    node.children.forEach(function (node) {
      callback(node, state);
    });
  },
  JSXEmptyExpression: function JSXEmptyExpression(node, state, callback) {// Comments. Just ignore.
  },
  JSXExpressionContainer: function JSXExpressionContainer(node, state, callback) {
    callback(node.expression, state);
  },
  JSXFragment: function JSXFragment(node, state, callback) {
    node.children.forEach(function (node) {
      callback(node, state);
    });
  },
  JSXSpreadAttribute: function JSXSpreadAttribute(node, state, callback) {
    callback(node.argument, state);
  },
  JSXText: function JSXText() {}
});

var _default = function _default(ast, options) {
  (0, _acornWalk.simple)(ast, _objectSpread({}, options));
};

exports["default"] = _default;