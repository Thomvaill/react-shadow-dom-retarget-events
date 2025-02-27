var reactEvents = ["onAbort", "onAnimationCancel", "onAnimationEnd", "onAnimationIteration", "onAuxClick", "onBlur",
    "onChange", "onClick", "onClose", "onContextMenu", "onDoubleClick", "onError", "onFocus", "onGotPointerCapture",
    "onInput", "onKeyDown", "onKeyPress", "onKeyUp", "onLoad", "onLoadEnd", "onLoadStart", "onLostPointerCapture",
    "onMouseDown", "onMouseMove", "onMouseOut", "onMouseOver", "onMouseUp", "onPointerCancel", "onPointerDown",
    "onPointerEnter", "onPointerLeave", "onPointerMove", "onPointerOut", "onPointerOver", "onPointerUp", "onReset",
    "onResize", "onScroll", "onSelect", "onSelectionChange", "onSelectStart", "onSubmit", "onTouchCancel",
    "onTouchMove", "onTouchStart", "onTransitionCancel", "onTransitionEnd", "onDrag", "onDragEnd", "onDragEnter",
    "onDragExit", "onDragLeave", "onDragOver", "onDragStart", "onDrop", "onFocusOut"];

var divergentNativeEvents = {
    onDoubleClick: 'dblclick'
};

var defaultMimickedReactEvents = {
    onInput: 'onChange',
    onFocusOut: 'onBlur',
    onSelectionChange: 'onSelect'
};

var defaultOptions = {
    dispatchDegradedOnMouseLeaveEvents: false
};

module.exports = function retargetEvents(shadowRoot, options = defaultOptions) {
    var mimickedReactEvents = Object.assign({}, defaultMimickedReactEvents);
    if (options.dispatchDegradedOnMouseLeaveEvents) {
        mimickedReactEvents.onMouseOut = 'onMouseLeave';
    }

    var removeEventListeners = [];

    reactEvents.forEach(function (reactEventName) {

        var nativeEventName = getNativeEventName(reactEventName);
        
        function retargetEvent(event) {
            
            var path = event.path || (event.composedPath && event.composedPath()) || composedPath(event.target);

            for (var i = 0; i < path.length; i++) {

                var el = path[i];
                var reactComponent = findReactComponent(el);
                var props = findReactProps(reactComponent);

                if (reactComponent && props) {
                    dispatchEvent(event, reactEventName, props);
                }

                if (reactComponent && props && mimickedReactEvents[reactEventName]) {
                    dispatchEvent(event, mimickedReactEvents[reactEventName], props);
                }

                if (event.cancelBubble) { 
                    break; 
                }                

                if (el === shadowRoot) {
                    break;
                }
            }
        }

        shadowRoot.addEventListener(nativeEventName, retargetEvent, false);
        
        removeEventListeners.push(function () { shadowRoot.removeEventListener(nativeEventName, retargetEvent, false); })
    });
    
    return function () {
      
      removeEventListeners.forEach(function (removeEventListener) {
        
        removeEventListener();
      });
    };
};

function findReactComponent(item) {
    for (var key in item) {
        if (item.hasOwnProperty(key) && key.indexOf('_reactInternal') !== -1) {
            return item[key];
        }
    }
}

function findReactProps(component) {
    if (!component) return undefined;
    if (component.memoizedProps) return component.memoizedProps; // React 16 Fiber
    if (component._currentElement && component._currentElement.props) return component._currentElement.props; // React <=15

}

function dispatchEvent(event, eventType, componentProps) {
    event.persist = function() {
        event.isPersistent = function(){ return true};
    };

    if (componentProps[eventType]) {
        componentProps[eventType](event);
    }
}

function getNativeEventName(reactEventName) {
    if (divergentNativeEvents[reactEventName]) {
        return divergentNativeEvents[reactEventName];
    }
    return reactEventName.replace(/^on/, '').toLowerCase();
}

function composedPath(el) {
  var path = [];
  while (el) {
    path.push(el);
    if (el.tagName === 'HTML') {
      path.push(document);
      path.push(window);
      return path;
    }
    el = el.parentElement;
  }
}
