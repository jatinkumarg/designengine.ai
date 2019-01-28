"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var PropTypes = require("prop-types");
var React = require("react");
var ReactDOM = require("react-dom");
function panAndZoom(WrappedComponent) {
    var _a;
    return _a = /** @class */ (function (_super) {
            __extends(PanAndZoomHOC, _super);
            function PanAndZoomHOC() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                _this.dx = 0;
                _this.dy = 0;
                _this.ds = 0;
                _this.element = null;
                _this.handleWheel = function (event) {
                    var _a = _this.props, onPanAndZoom = _a.onPanAndZoom, renderOnChange = _a.renderOnChange, onZoom = _a.onZoom;
                    var x = _this.props.x;
                    var y = _this.props.y;
                    var scale = _this.props.scale;
                    var scaleFactor = _this.props.scaleFactor;
                    var minScale = _this.props.minScale;
                    var maxScale = _this.props.maxScale;
                    if (x !== undefined && y !== undefined && scale !== undefined && scaleFactor !== undefined && minScale !== undefined && maxScale !== undefined) {
                        var deltaY = event.deltaY;
                        var newScale = deltaY < 0 ? Math.min((scale + _this.ds) * scaleFactor, maxScale) : Math.max((scale + _this.ds) / scaleFactor, minScale);
                        var factor = newScale / (scale + _this.ds);
                        if (factor !== 1) {
                            var target = ReactDOM.findDOMNode(_this);
                            if (target !== null && 'getBoundingClientRect' in target) {
                                var _b = target.getBoundingClientRect(), top_1 = _b.top, left = _b.left, width = _b.width, height = _b.height;
                                var _c = _this.normalizeTouchPosition(event, target), clientX = _c.clientX, clientY = _c.clientY;
                                var dx = (clientX / width - 0.5) / (scale + _this.ds);
                                var dy = (clientY / height - 0.5) / (scale + _this.ds);
                                var sdx = dx * (1 - 1 / factor);
                                var sdy = dy * (1 - 1 / factor);
                                _this.dx += sdx;
                                _this.dy += sdy;
                                _this.ds = newScale - scale;
                                if (onPanAndZoom) {
                                    onPanAndZoom(x + _this.dx, y + _this.dy, scale + _this.ds, event);
                                }
                                if (renderOnChange) {
                                    _this.forceUpdate();
                                }
                            }
                        }
                    }
                    if (onZoom) {
                        onZoom(x, y, scale, event);
                    }
                    event.preventDefault();
                };
                _this.panning = false;
                _this.panLastX = 0;
                _this.panLastY = 0;
                _this.handleMouseDown = function (event) {
                    if (!_this.panning) {
                        var onPanStart = _this.props.onPanStart;
                        var target = ReactDOM.findDOMNode(_this);
                        if (target !== null && 'getBoundingClientRect' in target) {
                            var _a = _this.normalizeTouchPosition(event, target), clientX = _a.clientX, clientY = _a.clientY;
                            _this.panLastX = clientX;
                            _this.panLastY = clientY;
                            _this.panning = true;
                            document.addEventListener('mousemove', _this.handleMouseMove);
                            document.addEventListener('mouseup', _this.handleMouseUp);
                            document.addEventListener('touchmove', _this.handleMouseMove);
                            document.addEventListener('touchend', _this.handleMouseUp);
                            if (onPanStart) {
                                onPanStart(event);
                            }
                        }
                    }
                };
                _this.handleMouseMove = function (event) {
                    if (_this.panning) {
                        var _a = _this.props, onPanMove = _a.onPanMove, renderOnChange = _a.renderOnChange, ignorePanOutside = _a.ignorePanOutside;
                        var x = _this.props.x;
                        var y = _this.props.y;
                        var scale = _this.props.scale;
                        if (x !== undefined && y !== undefined && scale !== undefined) {
                            var target = ReactDOM.findDOMNode(_this);
                            if (target !== null && 'getBoundingClientRect' in target) {
                                var _b = _this.normalizeTouchPosition(event, target), clientX = _b.clientX, clientY = _b.clientY;
                                var _c = target.getBoundingClientRect(), width = _c.width, height = _c.height;
                                if (!ignorePanOutside || 0 <= clientX && clientX <= width && 0 <= clientY && clientY <= height) {
                                    var dx = clientX - _this.panLastX;
                                    var dy = clientY - _this.panLastY;
                                    _this.panLastX = clientX;
                                    _this.panLastY = clientY;
                                    var sdx = dx / (width * (scale + _this.ds));
                                    var sdy = dy / (height * (scale + _this.ds));
                                    _this.dx -= sdx;
                                    _this.dy -= sdy;
                                    if (onPanMove) {
                                        onPanMove(x + _this.dx, y + _this.dy, event);
                                    }
                                    if (renderOnChange) {
                                        _this.forceUpdate();
                                    }
                                }
                            }
                        }
                    }
                };
                _this.handleMouseUp = function (event) {
                    if (_this.panning) {
                        var _a = _this.props, onPanEnd = _a.onPanEnd, renderOnChange = _a.renderOnChange, ignorePanOutside = _a.ignorePanOutside;
                        var x = _this.props.x;
                        var y = _this.props.y;
                        var scale = _this.props.scale;
                        document.removeEventListener('mousemove', _this.handleMouseMove);
                        document.removeEventListener('mouseup', _this.handleMouseUp);
                        document.removeEventListener('touchmove', _this.handleMouseMove);
                        document.removeEventListener('touchend', _this.handleMouseUp);
                        if (x !== undefined && y !== undefined && scale !== undefined) {
                            var target = ReactDOM.findDOMNode(_this);
                            if (target !== null && 'getBoundingClientRect' in target) {
                                try {
                                    var _b = _this.normalizeTouchPosition(event, target), clientX = _b.clientX, clientY = _b.clientY;
                                    var _c = target.getBoundingClientRect(), width = _c.width, height = _c.height;
                                    if (!ignorePanOutside || 0 <= clientX && clientX <= width && 0 <= clientY && clientY <= height) {
                                        var dx = clientX - _this.panLastX;
                                        var dy = clientY - _this.panLastY;
                                        _this.panLastX = clientX;
                                        _this.panLastY = clientY;
                                        var sdx = dx / (width * (scale + _this.ds));
                                        var sdy = dy / (height * (scale + _this.ds));
                                        _this.dx -= sdx;
                                        _this.dy -= sdy;
                                    }
                                }
                                catch (error) {
                                    // Happens when touches are used
                                }
                            }
                            _this.panning = false;
                            if (onPanEnd) {
                                onPanEnd(x + _this.dx, y + _this.dy, event);
                            }
                            if (renderOnChange) {
                                _this.forceUpdate();
                            }
                        }
                    }
                };
                return _this;
            }
            PanAndZoomHOC.prototype.componentWillReceiveProps = function (nextProps) {
                if (this.props.x !== nextProps.x || this.props.y !== nextProps.y) {
                    this.dx = 0;
                    this.dy = 0;
                }
                if (this.props.scale !== nextProps.scale) {
                    this.ds = 0;
                }
            };
            PanAndZoomHOC.prototype.componentWillUnmount = function () {
                if (this.panning) {
                    document.removeEventListener('mousemove', this.handleMouseMove);
                    document.removeEventListener('mouseup', this.handleMouseUp);
                    document.removeEventListener('touchmove', this.handleMouseMove);
                    document.removeEventListener('touchend', this.handleMouseUp);
                }
            };
            PanAndZoomHOC.prototype.normalizeTouchPosition = function (event, parent) {
                var position = {
                    clientX: ('targetTouches' in event) ? event.targetTouches[0].pageX : event.clientX,
                    clientY: ('targetTouches' in event) ? event.targetTouches[0].pageY : event.clientY
                };
                while (parent.offsetParent) {
                    position.clientX -= parent.offsetLeft - parent.scrollLeft;
                    position.clientY -= parent.offsetTop - parent.scrollTop;
                    parent = parent.offsetParent;
                }
                return position;
            };
            PanAndZoomHOC.prototype.render = function () {
                var _a = this.props, children = _a.children, scaleFactor = _a.scaleFactor, tempX = _a.x, tempY = _a.y, tempScale = _a.scale, minScale = _a.minScale, maxScale = _a.maxScale, onPanStart = _a.onPanStart, onPanMove = _a.onPanMove, onPanEnd = _a.onPanEnd, onZoom = _a.onZoom, onPanAndZoom = _a.onPanAndZoom, renderOnChange = _a.renderOnChange, passOnProps = _a.passOnProps, ignorePanOutside = _a.ignorePanOutside, other = __rest(_a, ["children", "scaleFactor", "x", "y", "scale", "minScale", "maxScale", "onPanStart", "onPanMove", "onPanEnd", "onZoom", "onPanAndZoom", "renderOnChange", "passOnProps", "ignorePanOutside"]);
                var x = this.props.x;
                var y = this.props.y;
                var scale = this.props.scale;
                if (x !== undefined && y !== undefined && scale !== undefined) {
                    var passedProps = passOnProps ? { x: x + this.dx, y: y + this.dy, scale: scale + this.ds } : {};
                    return (React.createElement(WrappedComponent, __assign({}, passedProps, other, { onMouseDown: this.handleMouseDown, onTouchStart: this.handleMouseDown, onWheel: this.handleWheel }), children));
                }
                else {
                    return null;
                }
            };
            return PanAndZoomHOC;
        }(React.PureComponent)),
        _a.propTypes = {
            x: PropTypes.number,
            y: PropTypes.number,
            scale: PropTypes.number,
            scaleFactor: PropTypes.number,
            minScale: PropTypes.number,
            maxScale: PropTypes.number,
            renderOnChange: PropTypes.bool,
            passOnProps: PropTypes.bool,
            ignorePanOutside: PropTypes.bool,
            onPanStart: PropTypes.func,
            onPanMove: PropTypes.func,
            onPanEnd: PropTypes.func,
            onZoom: PropTypes.func,
            onPanAndZoom: PropTypes.func
        },
        _a.defaultProps = {
            x: 0.5,
            y: 0.5,
            scale: 1,
            scaleFactor: Math.sqrt(2),
            minScale: Number.EPSILON,
            maxScale: Number.POSITIVE_INFINITY,
            renderOnChange: false,
            passOnProps: false
        },
        _a;
}
exports.default = panAndZoom;
;
//# sourceMappingURL=panAndZoomHoc.js.map