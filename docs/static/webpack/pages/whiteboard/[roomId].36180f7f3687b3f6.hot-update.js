"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdate_N_E"]("pages/whiteboard/[roomId]",{

/***/ "./src/components/StickerPicker/index.tsx":
/*!************************************************!*\
  !*** ./src/components/StickerPicker/index.tsx ***!
  \************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var _swc_helpers_sliced_to_array__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @swc/helpers/_/_sliced_to_array */ \"./node_modules/@swc/helpers/esm/_sliced_to_array.js\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"./node_modules/react/jsx-dev-runtime.js\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"./node_modules/react/index.js\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_image__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/image */ \"./node_modules/next/image.js\");\n/* harmony import */ var next_image__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_image__WEBPACK_IMPORTED_MODULE_2__);\n\nvar _this = undefined;\n\nvar _s = $RefreshSig$();\n\n\nvar StickerPicker = function(param) {\n    var onStickerSelect = param.onStickerSelect;\n    _s();\n    var _useState = (0,_swc_helpers_sliced_to_array__WEBPACK_IMPORTED_MODULE_3__._)((0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false), 2), isOpen = _useState[0], setIsOpen = _useState[1];\n    // 使用圖片路徑\n    var stickers = [\n        '/draw-chat/stickers/sticker1.png'\n    ];\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n        className: \"relative\",\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                onClick: function() {\n                    return setIsOpen(!isOpen);\n                },\n                className: \"px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600\",\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)((next_image__WEBPACK_IMPORTED_MODULE_2___default()), {\n                    src: \"/draw-chat/src/lib/img/小八.png\",\n                    alt: \"sticker\",\n                    width: 24,\n                    height: 24,\n                    className: \"w-6 h-6\",\n                    unoptimized: true\n                }, void 0, false, {\n                    fileName: \"D:\\\\立瑜\\\\ReactLearning\\\\LiveChatRoom\\\\draw\\\\whiteboard-app\\\\src\\\\components\\\\StickerPicker\\\\index.tsx\",\n                    lineNumber: 23,\n                    columnNumber: 9\n                }, _this)\n            }, void 0, false, {\n                fileName: \"D:\\\\立瑜\\\\ReactLearning\\\\LiveChatRoom\\\\draw\\\\whiteboard-app\\\\src\\\\components\\\\StickerPicker\\\\index.tsx\",\n                lineNumber: 19,\n                columnNumber: 7\n            }, _this),\n            isOpen && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"absolute bottom-full mb-2 bg-white rounded-lg shadow-lg p-2 grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto z-50\",\n                children: stickers.map(function(sticker, index) {\n                    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                        className: \"p-2 hover:bg-gray-100 rounded flex items-center justify-center\",\n                        onClick: function() {\n                            onStickerSelect(sticker);\n                            setIsOpen(false);\n                        },\n                        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)((next_image__WEBPACK_IMPORTED_MODULE_2___default()), {\n                            src: sticker,\n                            alt: \"sticker-\".concat(index),\n                            width: 32,\n                            height: 32,\n                            className: \"w-8 h-8\",\n                            unoptimized: true\n                        }, void 0, false, {\n                            fileName: \"D:\\\\立瑜\\\\ReactLearning\\\\LiveChatRoom\\\\draw\\\\whiteboard-app\\\\src\\\\components\\\\StickerPicker\\\\index.tsx\",\n                            lineNumber: 44,\n                            columnNumber: 15\n                        }, _this)\n                    }, index, false, {\n                        fileName: \"D:\\\\立瑜\\\\ReactLearning\\\\LiveChatRoom\\\\draw\\\\whiteboard-app\\\\src\\\\components\\\\StickerPicker\\\\index.tsx\",\n                        lineNumber: 36,\n                        columnNumber: 13\n                    }, _this);\n                })\n            }, void 0, false, {\n                fileName: \"D:\\\\立瑜\\\\ReactLearning\\\\LiveChatRoom\\\\draw\\\\whiteboard-app\\\\src\\\\components\\\\StickerPicker\\\\index.tsx\",\n                lineNumber: 34,\n                columnNumber: 9\n            }, _this)\n        ]\n    }, void 0, true, {\n        fileName: \"D:\\\\立瑜\\\\ReactLearning\\\\LiveChatRoom\\\\draw\\\\whiteboard-app\\\\src\\\\components\\\\StickerPicker\\\\index.tsx\",\n        lineNumber: 18,\n        columnNumber: 5\n    }, _this);\n};\n_s(StickerPicker, \"+sus0Lb0ewKHdwiUhiTAJFoFyQ0=\");\n_c = StickerPicker;\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (StickerPicker);\nvar _c;\n$RefreshReg$(_c, \"StickerPicker\");\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvY29tcG9uZW50cy9TdGlja2VyUGlja2VyL2luZGV4LnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBaUM7QUFDRjtBQU0vQixJQUFNRSxnQkFBOEM7UUFBR0Msd0JBQUFBOztJQUNyRCxJQUE0QkgsWUFBQUEsK0RBQUFBLENBQUFBLCtDQUFRQSxDQUFDLFlBQTlCSSxTQUFxQkosY0FBYkssWUFBYUw7SUFFNUIsU0FBUztJQUNULElBQU1NLFdBQVc7UUFDZjtLQUVEO0lBRUQscUJBQ0UsOERBQUNDO1FBQUlDLFdBQVU7OzBCQUNiLDhEQUFDQztnQkFDQ0MsU0FBUzsyQkFBTUwsVUFBVSxDQUFDRDs7Z0JBQzFCSSxXQUFVOzBCQUVWLDRFQUFDUCxtREFBS0E7b0JBQ0pVLEtBQUk7b0JBQ0pDLEtBQUk7b0JBQ0pDLE9BQU87b0JBQ1BDLFFBQVE7b0JBQ1JOLFdBQVU7b0JBQ1ZPLFdBQVc7Ozs7Ozs7Ozs7O1lBSWRYLHdCQUNDLDhEQUFDRztnQkFBSUMsV0FBVTswQkFDWkYsU0FBU1UsR0FBRyxDQUFDLFNBQUNDLFNBQVNDO3lDQUN0Qiw4REFBQ1Q7d0JBRUNELFdBQVU7d0JBQ1ZFLFNBQVM7NEJBQ1BQLGdCQUFnQmM7NEJBQ2hCWixVQUFVO3dCQUNaO2tDQUVBLDRFQUFDSixtREFBS0E7NEJBQ0pVLEtBQUtNOzRCQUNMTCxLQUFLLFdBQWlCLE9BQU5NOzRCQUNoQkwsT0FBTzs0QkFDUEMsUUFBUTs0QkFDUk4sV0FBVTs0QkFDVk8sV0FBVzs7Ozs7O3VCQWJSRzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFxQm5CO0dBbERNaEI7S0FBQUE7QUFvRE4saUVBQWVBLGFBQWFBLEVBQUMiLCJzb3VyY2VzIjpbIkQ6XFznq4vnkZxcXFJlYWN0TGVhcm5pbmdcXExpdmVDaGF0Um9vbVxcZHJhd1xcd2hpdGVib2FyZC1hcHBcXHNyY1xcY29tcG9uZW50c1xcU3RpY2tlclBpY2tlclxcaW5kZXgudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xyXG5pbXBvcnQgSW1hZ2UgZnJvbSAnbmV4dC9pbWFnZSc7XHJcblxyXG5pbnRlcmZhY2UgU3RpY2tlclBpY2tlclByb3BzIHtcclxuICBvblN0aWNrZXJTZWxlY3Q6IChzdGlja2VyVXJsOiBzdHJpbmcpID0+IHZvaWQ7XHJcbn1cclxuXHJcbmNvbnN0IFN0aWNrZXJQaWNrZXI6IFJlYWN0LkZDPFN0aWNrZXJQaWNrZXJQcm9wcz4gPSAoeyBvblN0aWNrZXJTZWxlY3QgfSkgPT4ge1xyXG4gIGNvbnN0IFtpc09wZW4sIHNldElzT3Blbl0gPSB1c2VTdGF0ZShmYWxzZSk7XHJcbiAgXHJcbiAgLy8g5L2/55So5ZyW54mH6Lev5b6RXHJcbiAgY29uc3Qgc3RpY2tlcnMgPSBbXHJcbiAgICAnL2RyYXctY2hhdC9zdGlja2Vycy9zdGlja2VyMS5wbmcnLFxyXG5cclxuICBdO1xyXG5cclxuICByZXR1cm4gKFxyXG4gICAgPGRpdiBjbGFzc05hbWU9XCJyZWxhdGl2ZVwiPlxyXG4gICAgICA8YnV0dG9uXHJcbiAgICAgICAgb25DbGljaz17KCkgPT4gc2V0SXNPcGVuKCFpc09wZW4pfVxyXG4gICAgICAgIGNsYXNzTmFtZT1cInB4LTIgcHktMSBiZy1ncmF5LTcwMCB0ZXh0LXdoaXRlIHJvdW5kZWQgaG92ZXI6YmctZ3JheS02MDBcIlxyXG4gICAgICA+XHJcbiAgICAgICAgPEltYWdlIFxyXG4gICAgICAgICAgc3JjPVwiL2RyYXctY2hhdC9zcmMvbGliL2ltZy/lsI/lhasucG5nXCJcclxuICAgICAgICAgIGFsdD1cInN0aWNrZXJcIlxyXG4gICAgICAgICAgd2lkdGg9ezI0fVxyXG4gICAgICAgICAgaGVpZ2h0PXsyNH1cclxuICAgICAgICAgIGNsYXNzTmFtZT1cInctNiBoLTZcIlxyXG4gICAgICAgICAgdW5vcHRpbWl6ZWRcclxuICAgICAgICAvPlxyXG4gICAgICA8L2J1dHRvbj5cclxuXHJcbiAgICAgIHtpc09wZW4gJiYgKFxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgYm90dG9tLWZ1bGwgbWItMiBiZy13aGl0ZSByb3VuZGVkLWxnIHNoYWRvdy1sZyBwLTIgZ3JpZCBncmlkLWNvbHMtNCBnYXAtMiBtYXgtaC1bMjAwcHhdIG92ZXJmbG93LXktYXV0byB6LTUwXCI+XHJcbiAgICAgICAgICB7c3RpY2tlcnMubWFwKChzdGlja2VyLCBpbmRleCkgPT4gKFxyXG4gICAgICAgICAgICA8YnV0dG9uXHJcbiAgICAgICAgICAgICAga2V5PXtpbmRleH1cclxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwLTIgaG92ZXI6YmctZ3JheS0xMDAgcm91bmRlZCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiXHJcbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgb25TdGlja2VyU2VsZWN0KHN0aWNrZXIpO1xyXG4gICAgICAgICAgICAgICAgc2V0SXNPcGVuKGZhbHNlKTtcclxuICAgICAgICAgICAgICB9fVxyXG4gICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgPEltYWdlXHJcbiAgICAgICAgICAgICAgICBzcmM9e3N0aWNrZXJ9XHJcbiAgICAgICAgICAgICAgICBhbHQ9e2BzdGlja2VyLSR7aW5kZXh9YH1cclxuICAgICAgICAgICAgICAgIHdpZHRoPXszMn1cclxuICAgICAgICAgICAgICAgIGhlaWdodD17MzJ9XHJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LTggaC04XCJcclxuICAgICAgICAgICAgICAgIHVub3B0aW1pemVkXHJcbiAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICApKX1cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgKX1cclxuICAgIDwvZGl2PlxyXG4gICk7XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBTdGlja2VyUGlja2VyOyAiXSwibmFtZXMiOlsidXNlU3RhdGUiLCJJbWFnZSIsIlN0aWNrZXJQaWNrZXIiLCJvblN0aWNrZXJTZWxlY3QiLCJpc09wZW4iLCJzZXRJc09wZW4iLCJzdGlja2VycyIsImRpdiIsImNsYXNzTmFtZSIsImJ1dHRvbiIsIm9uQ2xpY2siLCJzcmMiLCJhbHQiLCJ3aWR0aCIsImhlaWdodCIsInVub3B0aW1pemVkIiwibWFwIiwic3RpY2tlciIsImluZGV4Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./src/components/StickerPicker/index.tsx\n"));

/***/ })

});