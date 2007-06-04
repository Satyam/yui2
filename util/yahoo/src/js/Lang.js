
    
/**
 * Provides the language utilites and extensions used by the library
 * @class YAHOO.lang
 */
YAHOO.lang = {
    /**
     * Determines whether or not the provided object is an array.
     * Testing typeof/instanceof/constructor of arrays across frame 
     * boundaries isn't possible in Safari unless you have a reference
     * to the other frame to test against its Array prototype.  To
     * handle this case, we test well-known array properties instead.
     * properties.
     * @method isArray
     * @param {any} o The object being testing
     * @return Boolean
     */
    isArray: function(o) { 

        if (o) {
           return YAHOO.lang.isNumber(o.length) && 
                  YAHOO.lang.isFunction(o.splice) && 
                  !YAHOO.lang.hasOwnProperty(o.length);
        }
        return false;
    },

    /**
     * Determines whether or not the provided object is a boolean
     * @method isBoolean
     * @param {any} o The object being testing
     * @return Boolean
     */
    isBoolean: function(o) {
        return typeof o === 'boolean';
    },
    
    /**
     * Determines whether or not the provided object is a function
     * @method isFunction
     * @param {any} o The object being testing
     * @return Boolean
     */
    isFunction: function(o) {
        return typeof o === 'function';
    },
        
    /**
     * Determines whether or not the provided object is null
     * @method isNull
     * @param {any} o The object being testing
     * @return Boolean
     */
    isNull: function(o) {
        return o === null;
    },
        
    /**
     * Determines whether or not the provided object is a legal number
     * @method isNumber
     * @param {any} o The object being testing
     * @return Boolean
     */
    isNumber: function(o) {
        return typeof o === 'number' && isFinite(o);
    },
      
    /**
     * Determines whether or not the provided object is of type object
     * or function
     * @method isObject
     * @param {any} o The object being testing
     * @return Boolean
     */  
    isObject: function(o) {
return (o && (typeof o === 'object' || YAHOO.lang.isFunction(o))) || false;
    },
        
    /**
     * Determines whether or not the provided object is a string
     * @method isString
     * @param {any} o The object being testing
     * @return Boolean
     */
    isString: function(o) {
        return typeof o === 'string';
    },
        
    /**
     * Determines whether or not the provided object is undefined
     * @method isUndefined
     * @param {any} o The object being testing
     * @return Boolean
     */
    isUndefined: function(o) {
        return typeof o === 'undefined';
    },
    
    /**
     * Determines whether or not the property was added
     * to the object instance.  Returns false if the property is not present
     * in the object, or was inherited from the prototype.
     * This abstraction is provided to enable hasOwnProperty for Safari 1.3.x.
     * There is a discrepancy between YAHOO.lang.hasOwnProperty and
     * Object.prototype.hasOwnProperty when the property is a primitive added to
     * both the instance AND prototype with the same value:
     * <pre>
     * var A = function() {};
     * A.prototype.foo = 'foo';
     * var a = new A();
     * a.foo = 'foo';
     * alert(a.hasOwnProperty('foo')); // true
     * alert(YAHOO.lang.hasOwnProperty(a, 'foo')); // false when using fallback
     * </pre>
     * @method hasOwnProperty
     * @param {any} o The object being testing
     * @return Boolean
     */
    hasOwnProperty: function(o, prop) {
        if (Object.prototype.hasOwnProperty) {
            return o.hasOwnProperty(prop);
        }
        
        return !YAHOO.lang.isUndefined(o[prop]) && 
                o.constructor.prototype[prop] !== o[prop];
    },
 
    /**
     * IE will not enumerate native functions in a derived object even if the
     * function was overridden.  This is a workaround for specific functions 
     * we care about on the Object prototype. 
     * @property _IEEnumFix
     * @param {Function} r  the object to receive the augmentation
     * @param {Function} s  the object that supplies the properties to augment
     * @static
     * @private
     */
    _IEEnumFix: function(r, s) {
        if (YAHOO.env.ua.ie) {
            var add=["toString", "valueOf"];
            for (i=0;i<add.length;i=i+1) {
                var fname=add[i],f=s[fname];
                if (YAHOO.lang.isFunction(f) && f!=Object.prototype[fname]) {
                    r[fname]=f;
                }
            }
        }
    },
       
    /**
     * Utility to set up the prototype, constructor and superclass properties to
     * support an inheritance strategy that can chain constructors and methods.
     *
     * @method extend
     * @static
     * @param {Function} subc   the object to modify
     * @param {Function} superc the object to inherit
     * @param {Object} overrides  additional properties/methods to add to the
     *                              subclass prototype.  These will override the
     *                              matching items obtained from the superclass 
     *                              if present.
     */
    extend: function(subc, superc, overrides) {
        if (!superc||!subc) {
            throw new Error("YAHOO.lang.extend failed, please check that " +
                            "all dependencies are included.");
        }
        var F = function() {};
        F.prototype=superc.prototype;
        subc.prototype=new F();
        subc.prototype.constructor=subc;
        subc.superclass=superc.prototype;
        if (superc.prototype.constructor == Object.prototype.constructor) {
            superc.prototype.constructor=superc;
        }
    
        if (overrides) {
            for (var i in overrides) {
                subc.prototype[i]=overrides[i];
            }

            YAHOO.lang._IEEnumFix(subc.prototype, overrides);
        }
    },
   
    /**
     * Applies all properties in the supplier to the receiver if the
     * receiver does not have these properties yet.  Optionally, one or more
     * methods/properties can be specified (as additional parameters).  This
     * option will overwrite the property if receiver has it already.  If true
     * is passed as the third parameter, all properties will be applied and
     * _will_ overwrite properties in the receiver.
     *
     * @method augmentObject
     * @static
     * @param {Function} r  the object to receive the augmentation
     * @param {Function} s  the object that supplies the properties to augment
     * @param {String*|boolean}  arguments zero or more properties methods to augment the
     *                             receiver with.  If none specified, everything
     *                             in the supplier will be used unless it would
     *                             overwrite an existing property in the receiver. If true
     *                             is specified as the third parameter, all properties will
     *                             be applied and will overwrite an existing property in
     *                             the receiver
     */
    augmentObject: function(r, s) {
        if (!s||!r) {
            throw new Error("Absorb failed, verify dependencies.");
        }
        var a=arguments, i, p, override=a[2];
        if (override && override!==true) { // only absorb the specified properties
            for (i=2; i<a.length; i=i+1) {
                r[a[i]] = s[a[i]];
            }
        } else { // take everything, overwriting only if the third parameter is true
            for (p in s) { 
                if (override || !r[p]) {
                    r[p] = s[p];
                }
            }
            
            YAHOO.lang._IEEnumFix(r, s);
        }
    },
 
    /**
     * Same as YAHOO.lang.augmentObject, except it only applies prototype properties
     * @see YAHOO.lang.augmentObject
     * @method augmentProto
     * @static
     * @param {Function} r  the object to receive the augmentation
     * @param {Function} s  the object that supplies the properties to augment
     * @param {String*|boolean}  arguments zero or more properties methods to augment the
     *                             receiver with.  If none specified, everything
     *                             in the supplier will be used unless it would
     *                             overwrite an existing property in the receiver.  if true
     *                             is specified as the third parameter, all properties will
     *                             be applied and will overwrite an existing property in
     *                             the receiver
     */
    augmentProto: function(r, s) {
        if (!s||!r) {
            throw new Error("Augment failed, verify dependencies.");
        }
        //var a=[].concat(arguments);
        var a=[r.prototype,s.prototype];
        for (var i=2;i<arguments.length;i=i+1) {
            a.push(arguments[i]);
        }
        YAHOO.lang.augmentObject.apply(this, a);
    },

      
    /**
     * Returns a simple string representation of the object or array.
     * Other types of objects will be returned unprocessed.  Arrays
     * are expected to be indexed.  Use object notation for
     * associative arrays.
     * @method dump
     * @param o {Object} The object to dump
     * @param d {int} How deep to recurse child objects, default 3
     * @return {String} the dump result
     */
    dump: function(o, d) {
        var l=YAHOO.lang,i,len,s=[],OBJ="{...}",FUN="f(){...}";

        // Skip non-objects
        // Skip dates because the std toString is what we want
        // Skip HTMLElement-like objects because trying to dump an
        // element will cause an unhandled exception in FF 2.x
        if (!l.isObject(o) || o instanceof Date || 
            ("nodeType" in o && "tagName" in o)) {
            return o;
        } else if  (l.isFunction(o)) {
            return FUN;
        }

        d = (l.isNumber(d)) ? d : 3;

        if (l.isArray(o)) {
            s.push("[");
            for (i=0,len=o.length;i<len;i=i+1) {
                if (l.isObject(o[i])) {
                    s.push((d > 0) ? l.dump(o[i], d-1) : OBJ);
                } else {
                    s.push(o[i]);
                }
                s.push(", ");
            }
            if (s.length > 1) {
                s.pop();
            }
            s.push("]");
        } else {
            s.push("{");
            for (i in o) {
                if (l.hasOwnProperty(o, i)) {
                    s.push(i + " => ");
                    if (l.isObject(o[i])) {
                        s.push((d > 0) ? l.dump(o[i], d-1) : OBJ);
                    } else {
                        s.push(o[i]);
                    }
                    s.push(", ");
                }
            }
            if (s.length > 1) {
                s.pop();
            }
            s.push("}");
        }

        return s.join("");
    },

    /**
     * Does variable substitution on a string. It scans through the string 
     * looking for expressions enclosed in { } braces. If an expression 
     * is found, it is used a key on the object.  If there is a space in
     * the key, the first word is used for the key and the rest is provided
     * to an optional function to be used to programatically determine the
     * value (the extra information might be used for this decision). If 
     * the value for the key in the object, or what is returned from the
     * function has a string value, number value, or object value, it is 
     * substituted for the bracket expression and it repeats.  If this
     * value is an object, it uses the Object's toString() if this has
     * been overridden, otherwise it does a shallow dump of the key/value
     * pairs.
     * @method substitute
     * @param s {String} The string that will be modified.
     * @param o {Object} An object containing the replacement values
     * @param f {Function} An optional function that can be used to
     *                     process each match.  It receives the key,
     *                     value, and any extra metadata included with
     *                     the key inside of the braces.
     * @return {String} the substituted string
     */
    substitute: function (s, o, f) {
        var i, j, k, key, v, meta, l=YAHOO.lang;
        for (;;) {
            i = s.lastIndexOf('{');
            if (i < 0) {
                break;
            }
            j = s.indexOf('}', i);
            if (i + 1 >= j) {
                break;
            }

            key = s.substring(i + 1, j);
            meta = null;

            k = key.indexOf(" ");
            if (k > -1) {
                meta = key.substring(k + 1);
                key = key.substring(0, k);
            }

            v = o[key];
            if (f) {
                v = f(key, v, meta);
            }

            if (l.isObject(v)) {
                //if (l.isFunction(v)) {
                //    break;
                //} else if (l.isArray(v)) {
                if (l.isArray(v)) {
                    v = l.dump(v, parseInt(meta, 10));
                } else {
                    meta = meta || "";
                    var dump = meta.indexOf("dump");
                    if (dump > -1) {
                        meta = meta.substring(4);
                    }
                    if (v.toString === Object.prototype.toString || dump > -1) {
                        v = l.dump(v, parseInt(meta, 10));
                    } else {
                        v = v.toString();
                    }
                }
            } else if (!l.isString(v) && !l.isNumber(v)) {
                break;
            }

            s = s.substring(0, i) + v + s.substring(j + 1);
        }

        return s;
    }

};

/*
 * An alias for <a href="YAHOO.lang.html">YAHOO.lang</a>
 * @class YAHOO.util.Lang
 */
YAHOO.util.Lang = YAHOO.lang;
 
/**
 * Same as YAHOO.lang.augmentObject, except it only applies prototype properties.
 * This is an alias for augmentProto.
 * @see YAHOO.lang.augmentObject
 * @method augment
 * @static
 * @param {Function} r  the object to receive the augmentation
 * @param {Function} s  the object that supplies the properties to augment
 * @param {String*|boolean}  arguments zero or more properties methods to augment the
 *                             receiver with.  If none specified, everything
 *                             in the supplier will be used unless it would
 *                             overwrite an existing property in the receiver.  if true
 *                             is specified as the third parameter, all properties will
 *                             be applied and will overwrite an existing property in
 *                             the receiver
 */
YAHOO.lang.augment = YAHOO.lang.augmentProto;

/**
 * An alias for <a href="YAHOO.lang.html#augment">YAHOO.lang.augment</a>
 * @for YAHOO
 * @method augment
 * @static
 * @param {Function} r  the object to receive the augmentation
 * @param {Function} s  the object that supplies the properties to augment
 * @param {String*}  arguments zero or more properties methods to augment the
 *                             receiver with.  If none specified, everything
 *                             in the supplier will be used unless it would
 *                             overwrite an existing property in the receiver
 */
YAHOO.augment = YAHOO.lang.augmentProto;
       
/**
 * An alias for <a href="YAHOO.lang.html#extend">YAHOO.lang.extend</a>
 * @method extend
 * @static
 * @param {Function} subc   the object to modify
 * @param {Function} superc the object to inherit
 * @param {Object} overrides  additional properties/methods to add to the
 *                              subclass prototype.  These will override the
 *                              matching items obtained from the superclass 
 *                              if present.
 */
YAHOO.extend = YAHOO.lang.extend;
