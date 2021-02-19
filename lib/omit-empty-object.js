"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _cloneDeep = _interopRequireDefault(require("clone-deep"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

// omitEmptyObject({
//   a: {
//     b: {
//       c: 1,
//       d: {
//         e: {
//         }
//       }
//     }
//   }
// });
//
// { a: { b: { c: 1 } } }
//
var unsetEmptyObject = function unsetEmptyObject(obj) {
  Object.keys(obj).forEach(function (key) {
    if (!(0, _isPlainObject["default"])(obj[key])) {
      return;
    }

    unsetEmptyObject(obj[key]);

    if ((0, _isPlainObject["default"])(obj[key]) && Object.keys(obj[key]).length === 0) {
      obj[key] = undefined;
      delete obj[key];
    }
  });
  return obj;
};

var omitEmptyObject = function omitEmptyObject(obj) {
  return unsetEmptyObject((0, _cloneDeep["default"])(obj));
};

var _default = omitEmptyObject;
exports["default"] = _default;