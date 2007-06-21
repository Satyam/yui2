/**
 * The DataTable widget provides a progressively enhanced DHTML control for
 * displaying tabular data across A-grade browsers.
 *
 * @module datatable
 * @requires yahoo, dom, event, datasource
 * @optional dragdrop
 * @title DataTable Widget
 * @beta
 */

/****************************************************************************/
/****************************************************************************/
/****************************************************************************/

/**
 * DataTable class for the YUI DataTable widget.
 *
 * @namespace YAHOO.widget
 * @class DataTable
 * @uses YAHOO.util.EventProvider
 * @constructor
 * @param elContainer {HTMLElement} Container element for the TABLE.
 * @param aColumnDefs {Object[]} Array of object literal Column definitions.
 * @param oDataSource {YAHOO.util.DataSource} DataSource instance.
 * @param oConfigs {object} (optional) Object literal of configuration values.
 */
YAHOO.widget.DataTable = function(elContainer,aColumnDefs,oDataSource,oConfigs) {
    // Internal vars
    this._nIndex = YAHOO.widget.DataTable._nCount;
    this._sName = "instance" + this._nIndex;
    this.id = "yui-dt"+this._nIndex;

    // Initialize container element
    this._initContainerEl(elContainer);
    if(!this._elContainer) {
        YAHOO.log("Could not instantiate DataTable due to an invalid container element", "error", this.toString());
        return;
    }

    // Initialize configs
    this._initConfigs(oConfigs);

    // Initialize ColumnSet
    this._initColumnSet(aColumnDefs);
    if(!this._oColumnSet) {
        YAHOO.log("Could not instantiate DataTable due to an invalid ColumnSet", "error", this.toString());
        return;
    }

    // Initialize DOM elements
    this._initTableEl();
    if(!this._elTable || !this._elThead || !this._elTbody) {
        YAHOO.log("Could not instantiate DataTable due to an invalid DOM elements", "error", this.toString());
        return;
    }

    // Call Element's constructor after DOM elements are created
    // but before data is requested
    YAHOO.widget.DataTable.superclass.constructor.call(this, this._elContainer, this._oConfigs);

    // Initialize DataSource
    this._initDataSource(oDataSource);
    if(!this._oDataSource) {
        YAHOO.log("Could not instantiate DataTable due to an invalid DataSource", "error", this.toString());
        return;
    }

    // Send out for data in an asynchronous request
    this._oDataSource.sendRequest(this.get("initialRequest"), this.onDataReturnInitializeTable, this);

    // Initialize inline Cell editing
    this._initCellEditorEl();

    // Initialize Column sort
    this._initColumnSort();

    // Initialize DOM event listeners
    this._initDomEvents();

    YAHOO.widget.DataTable._nCount++;
    YAHOO.log("DataTable initialized", "info", this.toString());
};

if(YAHOO.util.Element) {
    YAHOO.lang.extend(YAHOO.widget.DataTable, YAHOO.util.Element);
}
else {
    YAHOO.log("Missing dependency: YAHOO.util.Element","error",this.toString());
}

if(YAHOO.util.EventProvider) {
    //YAHOO.lang.augment(YAHOO.widget.DataTable, YAHOO.util.EventProvider);
}
else {
    YAHOO.log("Missing dependency: YAHOO.util.EventProvider","error",this.toString());
}

/////////////////////////////////////////////////////////////////////////////
//
// Superclass methods
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Implementation of Element's abstract method. Sets up config values.
 *
 * @method initAttributes
 * @param oConfigs {Object} (Optional) Object literal definition of configuration values.
 * @private
 */

YAHOO.widget.DataTable.prototype.initAttributes = function(oConfigs) {
    oConfigs = oConfigs || {};
    YAHOO.widget.DataTable.superclass.initAttributes.call(this, oConfigs);

    /**
    * @config foo
    * @description foobar
    * @default "bar"
    * @type String
    */
    /*this.setAttributeConfig("param", {
        value: oDefaultValue,
        readOnly: false,
        writeOnce: false,
        validator: validateFn,
        method: excuteFn
    });*/

    /**
    * @config caption
    * @description Value for the CAPTION element.
    * @type String
    */
    this.setAttributeConfig("caption", {
        value: null,
        validator: YAHOO.lang.isString,
        method: function(sCaption) {
            // Create CAPTION element
            if(!this._elCaption) {
                if(!this._elTable.firstChild) {
                    this._elCaption = this._elTable.appendChild(document.createElement("caption"));
                }
                else {
                    this._elCaption = this._elTable.insertBefore(document.createElement("caption"), this._elTable.firstChild);
                }
            }
            // Set CAPTION value
            this._elCaption.innerHTML = sCaption;
        }
    });

    /**
    * @config summary
    * @description Value for the SUMMARY attribute.
    * @type String
    */
    this.setAttributeConfig("summary", {
        value: null,
        validator: YAHOO.lang.isString,
        method: function(sSummary) {
            this._elTable.summary = sSummary;
        }
    });

    /**
    * @config selectionMode
    * @description Specifies row or cell selection mode. Accepts the following strings
    *    <dl>
    *      <dt>"standard"</dt>
    *      <dd>Standard row selection with support for modifier keys to enable
    *      multiple selections.</dd>
    *
    *      <dt>"single"</dt>
    *      <dd>Row selection with modifier keys disabled to not allow
    *      multiple selections.</dd>
    *
    *      <dt>"singlecell"</dt>
    *      <dd>Cell selection with modifier keys disabled to not allow
    *      multiple selections.</dd>
    *
    *      <dt>"cellblock"</dt>
    *      <dd>Cell selection with support for modifier keys to enable multiple
    *      selections in a block-fashion, like a spreadsheet.</dd>
    *
    *      <dt>"cellrange"</dt>
    *      <dd>Cell selection with support for modifier keys to enable multiple
    *      selections in a range-fashion, like a calendar.</dd>
    *    </dl>
    *
    * @default "standard"
    * @type String
    */
    this.setAttributeConfig("selectionMode", {
        value: "standard",
        validator: YAHOO.lang.isString
    });

    /**
    * @config Defines the initial request that gets sent to the DataSource.
    * @description foobar
    * @default "bar"
    * @type String
    */
    this.setAttributeConfig("initialRequest", {
        value: "",
        validator: YAHOO.lang.isString
    });

    /**
    * @config sortedBy
    * @description Object literal holds sort metadata for UI:
    *     <ul>
    *         <li>sortedBy.key</li>
    *         <li>sortedBy.dir</li>
    *      </ul>
    * @type Object
    */
    this.setAttributeConfig("sortedBy", {
        value: null,
        // TODO: accepted array for nested sorts
        validator: function(oNewSortedBy) {
            return (oNewSortedBy && (oNewSortedBy.constructor == Object) && oNewSortedBy.key);
        },
        method: function(oNewSortedBy) {
            // Remove previous sort UI, if any
            var oOldSortedBy = this.get("sortedBy");
            if(oOldSortedBy && (oOldSortedBy.constructor == Object) && oOldSortedBy.key) {
                var oldColumn = this._oColumnSet.getColumn(oOldSortedBy.key);
                var oldThEl = this.getThEl(oldColumn);
                YAHOO.util.Dom.removeClass(oldThEl, YAHOO.widget.DataTable.CLASS_ASC);
                YAHOO.util.Dom.removeClass(oldThEl, YAHOO.widget.DataTable.CLASS_DESC);
            }
            
            // Add new sort UI
            var column = (oNewSortedBy.column) ? oNewSortedBy.column : this._oColumnSet.getColumn(oNewSortedBy.key);
            if(column) {
                var newClass = (oNewSortedBy.dir && (oNewSortedBy.dir != "asc")) ?
                        YAHOO.widget.DataTable.CLASS_DESC :
                        YAHOO.widget.DataTable.CLASS_ASC;
                YAHOO.util.Dom.addClass(this.id + "-col" + column.getId(), newClass);
            }
        }
    });

    /**
    * @config paginator
    * @description Object literal of pagination values.
    * @default {
    *   containers:[], // UI container elements
    *   rowsPerPage:500, // 500 rows
    *   currentPage:1,  // page one
    *   pageLinks:0,    // show all links
    *   pageLinksStart:1, // first link is page 1
    *   dropdownOptions:null, // no dropdown
    *   links: [], // links elements
    *   dropdowns: [] //dropdown elements
    * }
    * @type Object
    */
    this.setAttributeConfig("paginator", {
        value: {
            rowsPerPage:500, // 500 rows per page
            currentPage:1,  // show page one
            startRecordIndex:0, // start with first Record
            totalRecords:0, // how many Records total
            totalPages:0, // how many pages total
            rowsThisPage:0, // how many rows this page
            pageLinks:0,    // show all links
            pageLinksStart:1, // first link is page 1
            //TODO: hack until attribute order can by guaranteed by Element
            dropdownOptions:[25, 50, 100, 500], // [] no dropdown
            containers:[], // Paginator container element references
            dropdowns: [], //dropdown element references,
            links: [] // links elements
        },
        validator: function(oNewPaginator) {
            if(oNewPaginator && (oNewPaginator.constructor == Object)) {
                // Check for incomplete set of values
                if((oNewPaginator.rowsPerPage !== undefined) &&
                        (oNewPaginator.currentPage !== undefined) &&
                        (oNewPaginator.startRecordIndex !== undefined) &&
                        (oNewPaginator.totalRecords !== undefined) &&
                        (oNewPaginator.totalPages !== undefined) &&
                        (oNewPaginator.rowsThisPage !== undefined) &&
                        (oNewPaginator.pageLinks !== undefined) &&
                        (oNewPaginator.pageLinksStart !== undefined) &&
                        (oNewPaginator.dropdownOptions !== undefined) &&
                        (oNewPaginator.containers !== undefined) &&
                        (oNewPaginator.dropdowns !== undefined) &&
                        (oNewPaginator.links !== undefined)) {

                    // Validate each value
                    if(YAHOO.lang.isNumber(oNewPaginator.rowsPerPage) &&
                            YAHOO.lang.isNumber(oNewPaginator.currentPage) &&
                            YAHOO.lang.isNumber(oNewPaginator.startRecordIndex) &&
                            YAHOO.lang.isNumber(oNewPaginator.totalRecords) &&
                            YAHOO.lang.isNumber(oNewPaginator.totalPages) &&
                            YAHOO.lang.isNumber(oNewPaginator.rowsThisPage) &&
                            YAHOO.lang.isNumber(oNewPaginator.pageLinks) &&
                            YAHOO.lang.isNumber(oNewPaginator.pageLinksStart) &&
                            YAHOO.lang.isArray(oNewPaginator.dropdownOptions) &&
                            YAHOO.lang.isArray(oNewPaginator.containers) &&
                            YAHOO.lang.isArray(oNewPaginator.dropdowns) &&
                            YAHOO.lang.isArray(oNewPaginator.links)) {
                        return true;
                    }
                }
            }
            return false;
        }
    });

    /**
    * @config paginated
    * @description True if built-in client-side pagination is enabled
    * @default
    * @type Boolean
    */
    this.setAttributeConfig("paginated", {
        value: false,
        readOnly: false,
        validator: YAHOO.lang.isBoolean,
        method: function(oParam) {
            var oPaginator = this.get("paginator");
            var aContainerEls = oPaginator.containers;
            
            // Paginator is enabled
            if(oParam) {
                // No containers found, create two from scratch
                if(aContainerEls.length === 0) {
                    // One before TABLE
                    var pag0 = document.createElement("span");
                    pag0.id = this.id + "-paginator0";
                    YAHOO.util.Dom.addClass(pag0, YAHOO.widget.DataTable.CLASS_PAGINATOR);
                    pag0 = this._elContainer.insertBefore(pag0, this._elTable);
                    aContainerEls.push(pag0);

                    // One after TABLE
                    var pag1 = document.createElement("span");
                    pag1.id = this.id + "-paginator1";
                    YAHOO.util.Dom.addClass(pag1, YAHOO.widget.DataTable.CLASS_PAGINATOR);
                    pag1 = this._elContainer.insertBefore(pag1, this._elTable.nextSibling);
                    aContainerEls.push(pag1);

                    // Add containers directly to tracker
                    this._configs.paginator.value.containers = [pag0, pag1];

                }
                else {
                    // Show each container
                    for(var i=0; i<aContainerEls.length; i++) {
                        aContainerEls[i].style.display = "";
                    }
                }

                // Links are enabled
                if(oPaginator.pageLinks > -1) {
                    var aLinkEls = oPaginator.links;
                    // No links containers found, create from scratch
                    if(aLinkEls.length === 0) {
                        for(i=0; i<aContainerEls.length; i++) {
                            // Create one links container per Paginator container
                            var linkEl = document.createElement("span");
                            linkEl.id = "yui-dt-pagselect"+i;
                            linkEl = aContainerEls[i].appendChild(linkEl);

                            // Add event listener
                            //TODO: anon fnc
                            YAHOO.util.Event.addListener(linkEl,"click",this._onPaginatorLinkClick,this);

                             // Add directly to tracker
                            this._configs.paginator.value.links.push(linkEl);
                       }
                   }
                }

                // Dropdown enabled
                if(oPaginator.dropdownOptions) {
                    // Show these options in the dropdown
                    var dropdownOptions = oPaginator.dropdownOptions;

                    for(i=0; i<aContainerEls.length; i++) {
                        // Create one SELECT element per Paginator container
                        var selectEl = document.createElement("select");
                        YAHOO.util.Dom.addClass(selectEl, YAHOO.widget.DataTable.CLASS_DROPDOWN);
                        selectEl = aContainerEls[i].appendChild(selectEl);
                        selectEl.id = "yui-dt-pagselect"+i;

                        // Create OPTION elements
                        for(var j=0; j<dropdownOptions.length; j++) {
                            var dropdownOption = dropdownOptions[j];
                            var optionEl = document.createElement("option");
                            optionEl.value = (YAHOO.lang.isValue(dropdownOption.value)) ?
                                    dropdownOption.value : dropdownOption;
                            optionEl.innerHTML = (YAHOO.lang.isValue(dropdownOption.text)) ?
                                    dropdownOption.text : dropdownOption;
                            optionEl = selectEl.appendChild(optionEl);
                        }

                        // Add event listener
                        //TODO: anon fnc
                        YAHOO.util.Event.addListener(selectEl,"change",this._onPaginatorDropdownChange,this);

                        // Add DOM reference directly to tracker
                       this._configs.paginator.value.dropdowns.push(selectEl);
                    }
                }

                //TODO: fire paginatorDisabledEvent & add to api doc
                YAHOO.log("Paginator enabled", "info", this.toString());
            }
            // Pagination is disabled
            else {
                // Containers found
                if(aContainerEls.length > 0) {
                    // Destroy or just hide?
                    
                    // Hide each container
                    for(i=0; i<aContainerEls.length; i++) {
                        aContainerEls[i].style.display = "none";
                    }

                    /*TODO?
                    // Destroy each container
                    for(i=0; i<aContainerEls.length; i++) {
                        YAHOO.util.Event.purgeElement(aContainerEls[i], true);
                        aContainerEls.innerHTML = null;
                        //TODO: remove container?
                        // aContainerEls[i].parentNode.removeChild(aContainerEls[i]);
                    }
                    */
                }
                //TODO: fire paginatorDisabledEvent & add to api doc
                YAHOO.log("Paginator disabled", "info", this.toString());
            }
        }
    });

    /**
    * @config scrollable
    * @description True if primary TBODY should scroll while THEAD remains fixed.
    * When enabling this feature, captions cannot be used, and the following
    * features are not recommended: inline editing, resizeable columns.
    * @default false
    * @type Boolean
    */
    this.setAttributeConfig("scrollable", {
        value: false,
        validator: function(oParam) {
            //TODO: validate against caption, inline editing, resizeable
            return YAHOO.lang.isBoolean(oParam);
        },
        method: function(oParam) {
            if(oParam) {
                //TODO: conf height
                YAHOO.util.Dom.addClass(this._elContainer,YAHOO.widget.DataTable.CLASS_SCROLLABLE);
                YAHOO.util.Dom.addClass(this._elTbody,YAHOO.widget.DataTable.CLASS_SCROLLBODY);
            }
            else {
                YAHOO.util.Dom.removeClass(this._elContainer,YAHOO.widget.DataTable.CLASS_SCROLLABLE);
                YAHOO.util.Dom.removeClass(this._elTbody,YAHOO.widget.DataTable.CLASS_SCROLLBODY);

            }
        }
    });

    /*TODO
    * @config contextMenu
    * @description ContextMenu Instance.
    * @type YAHOO.widget.ContextMenu
    */
    /*this.setAttributeConfig("contextMenu", {
        value: null,
        readOnly: false,
        writeOnce: false,
        validator: function(oParam) {
            return (YAHOO.widget.ContextMenu && (oParam instanceof YAHOO.widget.ContextMenu));
        },
        method: function() {
            // Set up context menu
            //TODO: does trigger have to exist? can trigger be TBODY rather than rows?
            if(this.contextMenu && this.contextMenuOptions) {
                this.contextMenu = new YAHOO.widget.ContextMenu(this.id+"-cm", { trigger: this._elTbody } );
                this.contextMenu.addItem("delete item");
                this.contextMenu.render(document.body);
            }
        }
    });*/

    /*TODO
    * @config fixedWidth
    * @description True if overall width of entire DataTable should be a fixed value.
    * @type TBD
    */
    /*this.setAttributeConfig("fixedWidth", {
        value: null,
        readOnly: true,
        validator: function() {return false},
        method: function() {}
    });*/
};

/////////////////////////////////////////////////////////////////////////////
//
// Public constants
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Class name assigned to TABLE element.
 *
 * @property DataTable.CLASS_TABLE
 * @type String
 * @static
 * @final
 * @default "yui-dt-table"
 */
YAHOO.widget.DataTable.CLASS_TABLE = "yui-dt-table";

/**
 * Class name assigned to header container elements within each TH element.
 *
 * @property DataTable.CLASS_HEADER
 * @type String
 * @static
 * @final
 * @default "yui-dt-header"
 */
YAHOO.widget.DataTable.CLASS_HEADER = "yui-dt-header";

/**
 * Class name assigned to the primary TBODY element.
 *
 * @property DataTable.CLASS_BODY
 * @type String
 * @static
 * @final
 * @default "yui-dt-body"
 */
YAHOO.widget.DataTable.CLASS_BODY = "yui-dt-body";

/**
 * Class name assigned to the scrolling TBODY element of a fixed scrolling DataTable.
 *
 * @property DataTable.CLASS_SCROLLBODY
 * @type String
 * @static
 * @final
 * @default "yui-dt-scrollbody"
 */
YAHOO.widget.DataTable.CLASS_SCROLLBODY = "yui-dt-scrollbody";

/**
 * Class name assigned to display label elements.
 *
 * @property DataTable.CLASS_LABEL
 * @type String
 * @static
 * @final
 * @default "yui-dt-label"
 */
YAHOO.widget.DataTable.CLASS_LABEL = "yui-dt-label";

/**
 * Class name assigned to resizer handle elements.
 *
 * @property DataTable.CLASS_RESIZER
 * @type String
 * @static
 * @final
 * @default "yui-dt-resizer"
 */
YAHOO.widget.DataTable.CLASS_RESIZER = "yui-dt-resizer";

/**
 * Class name assigned to Editor container elements.
 *
 * @property DataTable.CLASS_EDITOR
 * @type String
 * @static
 * @final
 * @default "yui-dt-editor"
 */
YAHOO.widget.DataTable.CLASS_EDITOR = "yui-dt-editor";

/**
 * Class name assigned to paginator container elements.
 *
 * @property DataTable.CLASS_PAGINATOR
 * @type String
 * @static
 * @final
 * @default "yui-dt-paginator"
 */
YAHOO.widget.DataTable.CLASS_PAGINATOR = "yui-dt-paginator";

/**
 * Class name assigned to page number indicators.
 *
 * @property DataTable.CLASS_PAGE
 * @type String
 * @static
 * @final
 * @default "yui-dt-page"
 */
YAHOO.widget.DataTable.CLASS_PAGE = "yui-dt-page";

/**
 * Class name assigned to previous indicators.
 *
 * @property DataTable.CLASS_PREVIOUS
 * @type String
 * @static
 * @final
 * @default "yui-dt-previous"
 */
YAHOO.widget.DataTable.CLASS_PREVIOUS = "yui-dt-previous";

/**
 * Class name assigned next indicators.
 *
 * @property DataTable.CLASS_NEXT
 * @type String
 * @static
 * @final
 * @default "yui-dt-next"
 */
YAHOO.widget.DataTable.CLASS_NEXT = "yui-dt-next";

/**
 * Class name assigned to first elements.
 *
 * @property DataTable.CLASS_FIRST
 * @type String
 * @static
 * @final
 * @default "yui-dt-first"
 */
YAHOO.widget.DataTable.CLASS_FIRST = "yui-dt-first";

/**
 * Class name assigned to last elements.
 *
 * @property DataTable.CLASS_LAST
 * @type String
 * @static
 * @final
 * @default "yui-dt-last"
 */
YAHOO.widget.DataTable.CLASS_LAST = "yui-dt-last";

/**
 * Class name assigned to even elements.
 *
 * @property DataTable.CLASS_EVEN
 * @type String
 * @static
 * @final
 * @default "yui-dt-even"
 */
YAHOO.widget.DataTable.CLASS_EVEN = "yui-dt-even";

/**
 * Class name assigned to odd elements.
 *
 * @property DataTable.CLASS_ODD
 * @type String
 * @static
 * @final
 * @default "yui-dt-odd"
 */
YAHOO.widget.DataTable.CLASS_ODD = "yui-dt-odd";

/**
 * Class name assigned to selected elements.
 *
 * @property DataTable.CLASS_SELECTED
 * @type String
 * @static
 * @final
 * @default "yui-dt-selected"
 */
YAHOO.widget.DataTable.CLASS_SELECTED = "yui-dt-selected";

/**
 * Class name assigned to highlighted elements.
 *
 * @property DataTable.CLASS_HIGHLIGHTED
 * @type String
 * @static
 * @final
 * @default "yui-dt-highlighted"
 */
YAHOO.widget.DataTable.CLASS_HIGHLIGHTED = "yui-dt-highlighted";

/**
 * Class name assigned to disabled elements.
 *
 * @property DataTable.CLASS_DISABLED
 * @type String
 * @static
 * @final
 * @default "yui-dt-disabled"
 */
YAHOO.widget.DataTable.CLASS_DISABLED = "yui-dt-disabled";

/**
 * Class name assigned to empty indicators.
 *
 * @property DataTable.CLASS_EMPTY
 * @type String
 * @static
 * @final
 * @default "yui-dt-empty"
 */
YAHOO.widget.DataTable.CLASS_EMPTY = "yui-dt-empty";

/**
 * Class name assigned to loading indicatorx.
 *
 * @property DataTable.CLASS_LOADING
 * @type String
 * @static
 * @final
 * @default "yui-dt-loading"
 */
YAHOO.widget.DataTable.CLASS_LOADING = "yui-dt-loading";

/**
 * Class name assigned to error indicators.
 *
 * @property DataTable.CLASS_ERROR
 * @type String
 * @static
 * @final
 * @default "yui-dt-error"
 */
YAHOO.widget.DataTable.CLASS_ERROR = "yui-dt-error";

/**
 * Class name assigned to editable elements.
 *
 * @property DataTable.CLASS_EDITABLE
 * @type String
 * @static
 * @final
 * @default "yui-dt-editable"
 */
YAHOO.widget.DataTable.CLASS_EDITABLE = "yui-dt-editable";

/**
 * Class name assigned to scrollable elements.
 *
 * @property DataTable.CLASS_SCROLLABLE
 * @type String
 * @static
 * @final
 * @default "yui-dt-scrollable"
 */
YAHOO.widget.DataTable.CLASS_SCROLLABLE = "yui-dt-scrollable";

/**
 * Class name assigned to sortable elements.
 *
 * @property DataTable.CLASS_SORTABLE
 * @type String
 * @static
 * @final
 * @default "yui-dt-sortable"
 */
YAHOO.widget.DataTable.CLASS_SORTABLE = "yui-dt-sortable";

/**
 * Class name assigned to ascending elements.
 *
 * @property DataTable.CLASS_ASC
 * @type String
 * @static
 * @final
 * @default "yui-dt-asc"
 */
YAHOO.widget.DataTable.CLASS_ASC = "yui-dt-asc";

/**
 * Class name assigned to descending elements.
 *
 * @property DataTable.CLASS_DESC
 * @type String
 * @static
 * @final
 * @default "yui-dt-desc"
 */
YAHOO.widget.DataTable.CLASS_DESC = "yui-dt-desc";

/**
 * Class name assigned to BUTTON container elements.
 *
 * @property DataTable.CLASS_BUTTON
 * @type String
 * @static
 * @final
 * @default "yui-dt-button"
 */
YAHOO.widget.DataTable.CLASS_BUTTON = "yui-dt-button";

/**
 * Class name assigned to SELECT container elements.
 *
 * @property DataTable.CLASS_DROPDOWN
 * @type String
 * @static
 * @final
 * @default "yui-dt-dropdown"
 */
YAHOO.widget.DataTable.CLASS_DROPDOWN = "yui-dt-dropdown";

/**
 * Class name assigned to INPUT TYPE=CHECKBOX container elements.
 *
 * @property DataTable.CLASS_CHECKBOX
 * @type String
 * @static
 * @final
 * @default "yui-dt-checkbox"
 */
YAHOO.widget.DataTable.CLASS_CHECKBOX = "yui-dt-checkbox";

/**
 * Message to display if DataTable has no data.
 *
 * @property DataTable.MSG_EMPTY
 * @type String
 * @static
 * @final
 * @default "No records found."
 */
YAHOO.widget.DataTable.MSG_EMPTY = "No records found.";

/**
 * Message to display while DataTable is loading data.
 *
 * @property DataTable.MSG_LOADING
 * @type String
 * @static
 * @final
 * @default "Loading data..."
 */
YAHOO.widget.DataTable.MSG_LOADING = "Loading data...";

/**
 * Message to display while DataTable has data error.
 *
 * @property DataTable.MSG_ERROR
 * @type String
 * @static
 * @final
 * @default "Data error."
 */
YAHOO.widget.DataTable.MSG_ERROR = "Data error.";

/////////////////////////////////////////////////////////////////////////////
//
// Private member variables
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Internal class variable for indexing multiple DataTable instances.
 *
 * @property DataTable._nCount
 * @type Number
 * @private
 * @static
 */
YAHOO.widget.DataTable._nCount = 0;

/**
 * Index assigned to instance.
 *
 * @property _nIndex
 * @type Number
 * @private
 */
YAHOO.widget.DataTable.prototype._nIndex = null;

/**
 * Unique name assigned to instance.
 *
 * @property _sName
 * @type String
 * @private
 */
YAHOO.widget.DataTable.prototype._sName = null;

/**
 * DOM reference to the container element for the DataTable instance into which
 * the TABLE element gets created.
 *
 * @property _elContainer
 * @type HTMLElement
 * @private
 */
YAHOO.widget.DataTable.prototype._elContainer = null;

/**
 * DOM reference to the CAPTION element for the DataTable instance.
 *
 * @property _elCaption
 * @type HTMLElement
 * @private
 */
YAHOO.widget.DataTable.prototype._elCaption = null;

/**
 * DOM reference to the TABLE element for the DataTable instance.
 *
 * @property _elTable
 * @type HTMLElement
 * @private
 */
YAHOO.widget.DataTable.prototype._elTable = null;

/**
 * DOM reference to the THEAD element for the DataTable instance.
 *
 * @property _elThead
 * @type HTMLElement
 * @private
 */
YAHOO.widget.DataTable.prototype._elThead = null;

/**
 * DOM reference to the primary TBODY element for the DataTable instance.
 *
 * @property _elTbody
 * @type HTMLElement
 * @private
 */
YAHOO.widget.DataTable.prototype._elTbody = null;

/**
 * DOM reference to the secondary TBODY element used to display DataTable messages.
 *
 * @property _elMsgTbody
 * @type HTMLElement
 * @private
 */
YAHOO.widget.DataTable.prototype._elMsgTbody = null;

/**
 * DOM reference to the secondary TBODY element's single TR element used to display DataTable messages.
 *
 * @property _elMsgTbody
 * @type HTMLElement
 * @private
 */
YAHOO.widget.DataTable.prototype._elMsgTbodyRow = null;

/**
 * DOM reference to the secondary TBODY element's single TD element used to display DataTable messages.
 *
 * @property _elMsgTbody
 * @type HTMLElement
 * @private
 */
YAHOO.widget.DataTable.prototype._elMsgTbodyCell = null;

/**
 * DataSource instance for the DataTable instance.
 *
 * @property _oDataSource
 * @type YAHOO.util.DataSource
 * @private
 */
YAHOO.widget.DataTable.prototype._oDataSource = null;

/**
 * ColumnSet instance for the DataTable instance.
 *
 * @property _oColumnSet
 * @type YAHOO.widget.ColumnSet
 * @private
 */
YAHOO.widget.DataTable.prototype._oColumnSet = null;

/**
 * RecordSet instance for the DataTable instance.
 *
 * @property _oRecordSet
 * @type YAHOO.widget.RecordSet
 * @private
 */
YAHOO.widget.DataTable.prototype._oRecordSet = null;

/**
 * ID string of first TR element of the current DataTable page.
 *
 * @property _sFirstTrId
 * @type String
 * @private
 */
YAHOO.widget.DataTable.prototype._sFirstTrId = null;

/**
 * ID string of the last TR element of the current DataTable page.
 *
 * @property _sLastTrId
 * @type String
 * @private
 */
YAHOO.widget.DataTable.prototype._sLastTrId = null;

/**
 * Internal variable to track whether the DataTable instance has page focus.
 *
 * @property _bFocused
 * @type Boolean
 * @private
 */
YAHOO.widget.DataTable.prototype._bFocused = false;

































/////////////////////////////////////////////////////////////////////////////
//
// Private methods
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Sets focus on the given element.
 *
 * @method _focusEl
 * @param el {HTMLElement} Element.
 * @private
 */
YAHOO.widget.DataTable.prototype._focusEl = function(el) {
    el = el || this._elTable;
    // http://developer.mozilla.org/en/docs/index.php?title=Key-navigable_custom_DHTML_widgets
    // The timeout is necessary in both IE and Firefox 1.5, to prevent scripts from doing
    // strange unexpected things as the user clicks on buttons and other controls.
    setTimeout(function() { el.focus(); },0);

    //if(!this._bFocused) {
        // http://developer.mozilla.org/en/docs/index.php?title=Key-navigable_custom_DHTML_widgets
        // The timeout is necessary in both IE and Firefox 1.5, to prevent scripts from doing
        // strange unexpected things as the user clicks on buttons and other controls.
        //setTimeout(function() { el.focus(); },0);

        //this._bFocused = true;
        //this.fireEvent("focusEvent");
    //}
};





// INIT FUNCTIONS

/**
 * Initializes container element.
 *
 * @method _initContainerEl
 * @param elContainer {HTMLElement | String} HTML DIV element by reference or ID.
 * @private
 */
YAHOO.widget.DataTable.prototype._initContainerEl = function(elContainer) {
    this._elContainer = null;
    elContainer = YAHOO.util.Dom.get(elContainer);
    if(elContainer && elContainer.tagName && (elContainer.tagName.toLowerCase() == "div")) {
        this._elContainer = elContainer;
    }
};

/**
 * Initializes object literal of config values.
 *
 * @method _initConfigs
 * @param oConfig {Object} Object literal of config values.
 * @private
 */
YAHOO.widget.DataTable.prototype._initConfigs = function(oConfigs) {
    if(oConfigs) {
        if(oConfigs.constructor != Object) {
            oConfigs = null;
            YAHOO.log("Invalid configs", "warn", this.toString());
        }
        // Backward compatibility
        else if(YAHOO.lang.isBoolean(oConfigs.paginator)) {
            YAHOO.log("DataTable's paginator model has been revised" +
            " -- please refer to the documentation for implementation" +
            " details", "warn", this.toString());
        }
        this._oConfigs = oConfigs;
    }
};

/**
 * Initializes ColumnSet.
 *
 * @method _initColumnSet
 * @param aColumnDefs {Object[]} Array of object literal Column definitions.
 * @private
 */
YAHOO.widget.DataTable.prototype._initColumnSet = function(aColumnDefs) {
    if(YAHOO.lang.isArray(aColumnDefs)) {
        this._oColumnSet =  new YAHOO.widget.ColumnSet(aColumnDefs);
    }
    // Backward compatibility
    else if(aColumnDefs instanceof YAHOO.widget.ColumnSet) {
        this._oColumnSet =  aColumnDefs;
        YAHOO.log("DataTable's constructor now requires an array" +
        " of object literal Column definitions instead of a ColumnSet instance",
        "warn", this.toString());
    }
};

/**
 * Initializes DataSource.
 *
 * @method _initDataSource
 * @param oDataSource {YAHOO.util.DataSource} DataSource instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._initDataSource = function(oDataSource) {
    if(oDataSource && (oDataSource instanceof YAHOO.util.DataSource)) {
        this._oDataSource = oDataSource;
    }
    // Backward compatibility
    else {
        var tmpTable = null;
        var tmpContainer = this._elContainer;
        // Peek in container child nodes to see if TABLE already exists
        if(tmpContainer.hasChildNodes()) {
            var tmpChildren = tmpContainer.childNodes;
            for(i=0; i<tmpChildren.length; i++) {
                if(tmpChildren[i].tagName && tmpChildren[i].tagName.toLowerCase() == "table") {
                    tmpTable = tmpChildren[i];
                    break;
                }
            }
            if(tmpTable) {
                var tmpFieldsArray = [];
                for(i=0; i<this._oColumnSet.keys.length; i++) {
                    tmpFieldsArray.push({key:this._oColumnSet.keys[i].key});
                }

                this._oDataSource = new YAHOO.util.DataSource(tmpTable);
                this._oDataSource.responseType = YAHOO.util.DataSource.TYPE_HTMLTABLE;
                this._oDataSource.responseSchema = {fields: tmpFieldsArray};
                YAHOO.log("Null DataSource for progressive enhancement from" +
                " markup has been deprecated", "warn", this.toString());
            }
        }
    }
};

/**
 * Initializes RecordSet.
 *
 * @method _initRecordSet
 * @private
 */
YAHOO.widget.DataTable.prototype._initRecordSet = function() {
    if(this._oRecordSet) {
        this._oRecordSet.reset();
    }
    else {
        this._oRecordSet = new YAHOO.widget.RecordSet();
    }
};

/**
 * Creates HTML markup for TABLE, THEAD and TBODY elements.
 *
 * @method _initTableEl
 * @private
 */
YAHOO.widget.DataTable.prototype._initTableEl = function() {
    // Clear the container
    YAHOO.util.Event.purgeElement(this._elContainer, true);
    this._elContainer.innerHTML = "";

    // Create TABLE
    this._elTable = this._elContainer.appendChild(document.createElement("table"));
    var elTable = this._elTable;
    elTable.tabIndex = -1;
    elTable.id = this.id + "-table";
    YAHOO.util.Dom.addClass(elTable, YAHOO.widget.DataTable.CLASS_TABLE);

    // Create THEAD
    this._initTheadEl(elTable, this._oColumnSet);


    // Create TBODY for messages
    var elMsgTbody = document.createElement("tbody");
    elMsgTbody.tabIndex = -1;
    this._elMsgRow = elMsgTbody.appendChild(document.createElement("tr"));
    var elMsgRow = this._elMsgRow;
    var elMsgCell = elMsgRow.appendChild(document.createElement("td"));
    elMsgCell.colSpan = this._oColumnSet.keys.length;
    this._elMsgTd = elMsgCell;
    this._elMsgTbody = elTable.appendChild(elMsgTbody);
    this.showTableMessage(YAHOO.widget.DataTable.MSG_LOADING, YAHOO.widget.DataTable.CLASS_LOADING);

    // Create TBODY for data
    this._elTbody = elTable.appendChild(document.createElement("tbody"));
    this._elTbody.tabIndex = 0;
    YAHOO.util.Dom.addClass(this._elTbody,YAHOO.widget.DataTable.CLASS_BODY);
};

/**
 * Populates THEAD element with TH cells as defined by ColumnSet.
 *
 * @method _initTheadEl
 * @private
 */
YAHOO.widget.DataTable.prototype._initTheadEl = function() {
    var i,oColumn, colId;
    var oColumnSet = this._oColumnSet;
    
    // Create THEAD
    var elThead = document.createElement("thead");
    elThead.tabIndex = 0;

    // Iterate through each row of Column headers...
    var colTree = oColumnSet.tree;
    for(i=0; i<colTree.length; i++) {
        var elTheadRow = elThead.appendChild(document.createElement("tr"));
        elTheadRow.id = this.id+"-hdrow"+i;

        var elTheadCell;
        // ...and create THEAD cells
        for(var j=0; j<colTree[i].length; j++) {
            oColumn = colTree[i][j];
            colId = oColumn.getId();
            elTheadCell = elTheadRow.appendChild(document.createElement("th"));
            elTheadCell.id = this.id + "-col" + colId;
            this._initThEl(elTheadCell,oColumn,i,j);
        }

        // Set first and last classes on THEAD rows
        if(i === 0) {
            YAHOO.util.Dom.addClass(elTheadRow, YAHOO.widget.DataTable.CLASS_FIRST);
        }
        if(i === (colTree.length-1)) {
            YAHOO.util.Dom.addClass(elTheadRow, YAHOO.widget.DataTable.CLASS_LAST);
        }
    }

    this._elThead = this._elTable.appendChild(elThead);

    // Set first and last classes on THEAD cells using the values in ColumnSet headers array
    var aFirstHeaders = oColumnSet.headers[0].split(" ");
    var aLastHeaders = oColumnSet.headers[oColumnSet.headers.length-1].split(" ");
    for(i=0; i<aFirstHeaders.length; i++) {
        YAHOO.util.Dom.addClass(YAHOO.util.Dom.get(this.id+"-col"+aFirstHeaders[i]), YAHOO.widget.DataTable.CLASS_FIRST);
    }
    for(i=0; i<aLastHeaders.length; i++) {
        YAHOO.util.Dom.addClass(YAHOO.util.Dom.get(this.id+"-col"+aLastHeaders[i]), YAHOO.widget.DataTable.CLASS_LAST);
    }
    
    // Add Resizer only after DOM has been updated
    var foundDD = (YAHOO.util.DD) ? true : false;
    var needDD = false;
    for(i=0; i<this._oColumnSet.keys.length; i++) {
        oColumn = this._oColumnSet.keys[i];
        colId = oColumn.getId();
        var elTheadCellId = YAHOO.util.Dom.get(this.id + "-col" + colId);
        if(oColumn.resizeable) {
            if(foundDD) {
                //TODO: fix fixed width tables
                // Skip the last column for fixed-width tables
                if(!this.fixedWidth || (this.fixedWidth &&
                        (oColumn.getKeyIndex() != this._oColumnSet.keys.length-1))) {
                    // TODO: better way to get elTheadContainer
                    var elThContainer = YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_HEADER,"div",elTheadCellId)[0];
                    var elThResizer = elThContainer.appendChild(document.createElement("span"));
                    elThResizer.id = this.id + "-resizer" + colId;
                    YAHOO.util.Dom.addClass(elThResizer,YAHOO.widget.DataTable.CLASS_RESIZER);
                    oColumn.ddResizer = new YAHOO.util.ColumnResizer(
                            this, oColumn, elTheadCellId, elThResizer.id, elThResizer.id);
                    var cancelClick = function(e) {
                        YAHOO.util.Event.stopPropagation(e);
                    };
                    YAHOO.util.Event.addListener(elThResizer,"click",cancelClick);
                }
                if(this.fixedWidth) {
                    //TODO: fix fixedWidth
                    //elThContainer.style.overflow = "hidden";
                    //TODO: better way to get elTheadText
                    var elThLabel = (YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_LABEL,"span",elTheadCellId))[0];
                    elThLabel.style.overflow = "hidden";
                }
            }
            else {
                needDD = true;
            }
        }
    }
    if(needDD) {
        YAHOO.log("Could not find DragDrop dependancy for resizeable Columns", "warn", this.toString());
    }

    YAHOO.log("Column headers for " + this._oColumnSet.keys.length + " keys created","info",this.toString());
};

/**
 * Populates TH cell as defined by Column.
 *
 * @method _initThEl
 * @param elTheadCell {HTMLElement} TH cell element reference.
 * @param oColumn {YAHOO.widget.Column} Column object.
 * @param row {number} Row index.
 * @param col {number} Column index.
 * @private
 */
YAHOO.widget.DataTable.prototype._initThEl = function(elTheadCell,oColumn,row,col) {
    // Clear out the cell of prior content
    // TODO: purgeListeners and other validation-related things
    var index = this._nIndex;
    var colId = oColumn.getId();
    elTheadCell.yuiColumnId = colId;
    if(oColumn.abbr) {
        elTheadCell.abbr = oColumn.abbr;
    }
    if(oColumn.width) {
        elTheadCell.style.width = oColumn.width;
    }

    var aCustomClasses;
    if(YAHOO.lang.isString(oColumn.className)) {
        aCustomClasses = [oColumn.className];
    }
    else if(YAHOO.lang.isArray(oColumn.className)) {
        aCustomClasses = oColumn.className;
    }
    if(aCustomClasses) {
        for(var i=0; i<aCustomClasses.length; i++) {
            YAHOO.util.Dom.addClass(elTheadCell,aCustomClasses[i]);
        }
    }
    
    YAHOO.util.Dom.addClass(elTheadCell, "yui-dt-col-"+oColumn.key);
    
    //TODO: Apply CSS for sorted tables
    //var sortedBy = this.get("sortedBy");
    //if(sortedBy) {
    //    if(sortedBy.key === oColumn.key) {
    //        var newClass = (sortedBy.dir && (sortedBy.dir != "asc")) ?
    //                YAHOO.widget.DataTable.CLASS_DESC :
    //                YAHOO.widget.DataTable.CLASS_ASC;
    //        YAHOO.util.Dom.addClass(elTheadCell,sortClass);
    //        this.sortedBy._id = elTheadCell.id;
    //    }
    //}

    elTheadCell.innerHTML = "";
    elTheadCell.rowSpan = oColumn.getRowspan();
    elTheadCell.colSpan = oColumn.getColspan();

    var elTheadContainer = elTheadCell.appendChild(document.createElement("div"));
    elTheadContainer.id = this.id + "-container" + colId;
    YAHOO.util.Dom.addClass(elTheadContainer,YAHOO.widget.DataTable.CLASS_HEADER);
    var elTheadLabel = elTheadContainer.appendChild(document.createElement("span"));
    elTheadLabel.id = this.id + "-label" + colId;
    YAHOO.util.Dom.addClass(elTheadLabel,YAHOO.widget.DataTable.CLASS_LABEL);

    // Backward compatibility
    if(oColumn.text) {
        YAHOO.log("The Column property text has been" +
        " deprecated in favor of label", "warn", oColumn.toString());
        oColumn.label = oColumn.text;
    }
    var sLabel = oColumn.label || oColumn.key;
    if(oColumn.sortable) {
        YAHOO.util.Dom.addClass(elTheadLabel,YAHOO.widget.DataTable.CLASS_SORTABLE);
        //TODO: Make sortLink customizeable
        //TODO: Make title configurable
        //TODO: Separate label from an accessibility link that says
        // "Click to sort ascending" and push it offscreen
        var sortLink = "?key=" + oColumn.key;
        elTheadLabel.innerHTML = "<a href=\"" + sortLink + "\" title=\"Click to sort\" class=\"" + YAHOO.widget.DataTable.CLASS_SORTABLE + "\">" + sLabel + "</a>";

    }
    else {
        elTheadLabel.innerHTML = sLabel;
    }
};

/**
 * Creates HTML markup for Cell Editor.
 *
 * @method _initCellEditorEl
 * @private
 */
YAHOO.widget.DataTable.prototype._initCellEditorEl = function() {
    // Attach Cell Editor container element to body
    var elCellEditor = document.createElement("div");
    elCellEditor.id = this.id + "-celleditor";
    elCellEditor.style.display = "none";
    YAHOO.util.Dom.addClass(elCellEditor, YAHOO.widget.DataTable.CLASS_EDITOR);
    elCellEditor = document.body.appendChild(elCellEditor);

    // Internal tracker of Cell Editor values
    var oCellEditor = {};
    oCellEditor.container = elCellEditor;
    oCellEditor.value = null;
    oCellEditor.isActive = false;
    this._oCellEditor = oCellEditor;

    // Handle ESC key
    this.subscribe("editorKeydownEvent", function(oArgs) {
        var e = oArgs.event;
        var elTarget = YAHOO.util.Event.getTarget(e);

        // ESC hides Cell Editor
        if((e.keyCode == 27)) {
            this.cancelCellEditor();
        }
    });
};

/**
 * Initializes Column sorting.
 *
 * @method _initColumnSort
 * @private
 */
YAHOO.widget.DataTable.prototype._initColumnSort = function() {
    this.subscribe("headerLabelClickEvent", this.onEventSortColumn);
};

/**
 * Initializes DOM event listeners.
 *
 * @method _initDomEvents
 * @private
 */
YAHOO.widget.DataTable.prototype._initDomEvents = function() {
    var elTable = this._elTable;
    var elThead = this._elThead;
    var elTbody = this._elTbody;
    var elContainer = this._elContainer;

    YAHOO.util.Event.addListener(document, "click", this._onDocumentClick, this);
    YAHOO.util.Event.addListener(document, "keydown", this._onDocumentKeydown, this);

    //YAHOO.util.Event.addListener(this._elContainer, "focus", this._onContainerFocus, this);
    //YAHOO.util.Event.addListener(this._elContainer, "blur", this._onContainerBlur, this);

    //YAHOO.util.Event.addListener(elTable, "focus", this._onTableFocus, this);
    //YAHOO.util.Event.addListener(elTable, "blur", this._onTableBlur, this);

    YAHOO.util.Event.addListener(elTable, "mouseover", this._onTableMouseover, this);
    YAHOO.util.Event.addListener(elTable, "mouseout", this._onTableMouseout, this);
    YAHOO.util.Event.addListener(elTable, "mousedown", this._onTableMousedown, this);
    //YAHOO.util.Event.addListener(elTable, "mouseup", this._onTableMouseup, this);
    //YAHOO.util.Event.addListener(elTable, "mousemove", this._onTableMousemove, this);

    // Since we can't listen for click and dblclick on the same element...
    YAHOO.util.Event.addListener(elTable, "dblclick", this._onTableDblclick, this);
    YAHOO.util.Event.addListener(elThead, "click", this._onTheadClick, this);
    YAHOO.util.Event.addListener(elTbody, "click", this._onTbodyClick, this);

    YAHOO.util.Event.addListener(elThead, "keydown", this._onTheadKeydown, this);
    YAHOO.util.Event.addListener(elTbody, "keydown", this._onTbodyKeydown, this);
    YAHOO.util.Event.addListener(elTbody, "keyup", this._onTbodyKeyup, this);
    YAHOO.util.Event.addListener(elTbody, "keypress", this._onTbodyKeypress, this);

    YAHOO.util.Event.addListener(elContainer, "scroll", this._onScroll, this); // for IE
    YAHOO.util.Event.addListener(elTbody, "scroll", this._onScroll, this); // for everyone else
};





































// DOM MUTATION FUNCTIONS




/**
 * Adds a TR element to the primary TBODY at the page row index if given, otherwise
 * at the end of the page. Formats TD elements within the TR element using data
 * from the given Record.
 *
 * @method _addTrEl
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param index {Number} (optional) The page row index at which to add the TR
 * element.
 * @return {String} ID of the added TR element, or null.
 * @private
 */
YAHOO.widget.DataTable.prototype._addTrEl = function(oRecord, index) {
    this.hideTableMessage();

    // It's an append if no index provided, or index is negative or too big
    var append = (!YAHOO.lang.isNumber(index) || (index < 0) ||
            index > (this._elTbody.rows.length-2)) ? true : false;
            
    var oColumnSet = this._oColumnSet;
    var oRecordSet = this._oRecordSet;

    var elRow = (append) ? this._elTbody.appendChild(document.createElement("tr")) :
        this._elTbody.insertBefore(document.createElement("tr"),this._elTbody.rows[index]);

    elRow.id = this.id+"-bdrow"+(this._elTbody.rows.length-1);
    elRow.yuiRecordId = oRecord.getId();

    // Create TD cells
    for(var j=0; j<oColumnSet.keys.length; j++) {
        var oColumn = oColumnSet.keys[j];
        var elCell = elRow.appendChild(document.createElement("td"));
        elCell.id = elRow.id+"-cell"+j;
        elCell.yuiColumnId = oColumn.getId();
        elCell.headers = oColumnSet.headers[j];
        // For SF2 cellIndex bug: http://www.webreference.com/programming/javascript/ppk2/3.html
        elCell.yuiCellIndex = j;

        // Update UI
        this.formatCell(elCell, oRecord, oColumn);
        if (j === 0) {
            YAHOO.util.Dom.addClass(elCell, YAHOO.widget.DataTable.CLASS_FIRST);
        }
        else if (j === this._oColumnSet.keys.length-1) {
            YAHOO.util.Dom.addClass(elCell, YAHOO.widget.DataTable.CLASS_LAST);
        }

        /*p.abx {word-wrap:break-word;}
ought to solve the problem for Safari (the long words will wrap in your
tds, instead of overflowing to the next td.
(this is supported by IE win as well, so hide it if needed).

One thing, though: it doesn't work in combination with
'white-space:nowrap'.*/

// need a div wrapper for safari?
        //TODO: fix fixedWidth
        if(this.fixedWidth) {
            elCell.style.overflow = "hidden";
            //elCell.style.width = "20px";
        }
    }

    return elRow.id;
};

/**
 * Formats all TD elements of given TR element with data from the given Record.
 *
 * @method _updateTrEl
 * @param elRow {HTMLElement} The TR element to update.
 * @param oRecord {YAHOO.widget.Record} The associated Record instance.
 * @return {String} ID of the updated TR element, or null.
 * @private
 */
YAHOO.widget.DataTable.prototype._updateTrEl = function(elRow, oRecord) {
    this.hideTableMessage();

    // Update TD elements with new data
    for(var j=0; j<elRow.cells.length; j++) {
        var oColumn = this._oColumnSet.keys[j];
        this.formatCell(elRow.cells[j], oRecord, oColumn);
    }

    // Update Record ID
    elRow.yuiRecordId = oRecord.getId();
    
    return elRow.id;
};


/**
 * Deletes TR element by DOM reference or by DataTable page row index.
 *
 * @method _deleteTrEl
 * @param row {HTMLElement | Number} TR element reference or Datatable page row index.
 * @return {Boolean} Returns true if successful, else returns false.
 * @private
 */
YAHOO.widget.DataTable.prototype._deleteTrEl = function(row) {
    var rowIndex;
    
    // Get page row index for the element
    if(!YAHOO.lang.isNumber(row)) {
        rowIndex = YAHOO.util.Dom.get(row).sectionRowIndex;
    }
    else {
        rowIndex = row;
    }
    if(YAHOO.lang.isNumber(rowIndex) && (rowIndex > -2) && (rowIndex < this._elTbody.rows.length)) {
        this._elTbody.deleteRow(rowIndex);
        return true;
    }
    else {
        return false;
    }
};



























// CSS/STATE FUNCTIONS




/**
 * Assigns the class YAHOO.widget.DataTable.CLASS_FIRST to the first TR element
 * of the DataTable page and updates internal tracker.
 *
 * @method _setFirstRow
 * @private
 */
YAHOO.widget.DataTable.prototype._setFirstRow = function() {
    var rowEl = this.getFirstTrEl();
    if(rowEl) {
        // Unassign previous class
        if(this._sFirstTrId) {
            YAHOO.util.Dom.removeClass(this._sFirstTrId, YAHOO.widget.DataTable.CLASS_FIRST);
        }
        // Assign class
        YAHOO.util.Dom.addClass(rowEl, YAHOO.widget.DataTable.CLASS_FIRST);
        this._sFirstTrId = rowEl.id;
    }
    else {
        this._sFirstTrId = null;
    }
};

/**
 * Assigns the class YAHOO.widget.DataTable.CLASS_LAST to the last TR element
 * of the DataTable page and updates internal tracker.
 *
 * @method _setLastRow
 * @private
 */
YAHOO.widget.DataTable.prototype._setLastRow = function() {
    var rowEl = this.getLastTrEl();
    if(rowEl) {
        // Unassign previous class
        if(this._sLastTrId) {
            YAHOO.util.Dom.removeClass(this._sLastTrId, YAHOO.widget.DataTable.CLASS_LAST);
        }
        // Assign class
        YAHOO.util.Dom.addClass(rowEl, YAHOO.widget.DataTable.CLASS_LAST);
        this._sLastTrId = rowEl.id;
    }
    else {
        this._sLastTrId = null;
    }
};

/**
 * Assigns the classes YAHOO.widget.DataTable.CLASS_EVEN and
 * YAHOO.widget.DataTable.CLASS_ODD to alternating TR elements of the DataTable
 * page. For performance, a subset of rows may be specified.
 *
 * @method _setRowStripes
 * @param row {HTMLElement | String | Number} (optional) HTML TR element reference
 * or string ID, or page row index of where to start striping.
 * @param range {Number} (optional) If given, how many rows to stripe, otherwise
 * stripe all the rows until the end.
 * @private
 */
YAHOO.widget.DataTable.prototype._setRowStripes = function(row, range) {
    // Default values stripe all rows
    var allRows = this._elTbody.rows;
    var nStartIndex = 0;
    var nEndIndex = allRows.length;
    
    // Stripe a subset
    if((row !== null) && (row !== undefined)) {
        // Validate given start row
        var elStartRow = this.getTrEl(row);
        if(elStartRow) {
            nStartIndex = elStartRow.sectionRowIndex;
            
            // Validate given range
            if(YAHOO.lang.isNumber(range) && (range > 1)) {
                nEndIndex = nStartIndex + range;
            }
        }
    }

    for(var i=nStartIndex; i<nEndIndex; i++) {
        if(i%2) {
            YAHOO.util.Dom.removeClass(allRows[i], YAHOO.widget.DataTable.CLASS_EVEN);
            YAHOO.util.Dom.addClass(allRows[i], YAHOO.widget.DataTable.CLASS_ODD);
        }
        else {
            YAHOO.util.Dom.removeClass(allRows[i], YAHOO.widget.DataTable.CLASS_ODD);
            YAHOO.util.Dom.addClass(allRows[i], YAHOO.widget.DataTable.CLASS_EVEN);
        }
    }
};













































/////////////////////////////////////////////////////////////////////////////
//
// Private DOM Event Handlers
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Handles scroll events on the CONTAINER (for IE) and TBODY elements (for everyone else).
 *
 * @method _onScroll
 * @param e {HTMLEvent} The scroll event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onScroll = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.tagName.toLowerCase();
    
    if(oSelf._oCellEditor.isActive) {
        oSelf.fireEvent("editorBlurEvent", {editor:oSelf._oCellEditor});
        oSelf.cancelCellEditor();
    }
    
    oSelf.fireEvent("tableScrollEvent", {event:e, target:elTarget});
};

/**
 * Handles click events on the DOCUMENT.
 *
 * @method _onDocumentClick
 * @param e {HTMLEvent} The click event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onDocumentClick = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.tagName.toLowerCase();

    if(!YAHOO.util.Dom.isAncestor(oSelf._elTable, elTarget)) {
        oSelf._bFocused = false;
        oSelf.fireEvent("tableBlurEvent");

        // Fires editorBlurEvent when click is not within the TABLE.
        // For cases when click is within the TABLE, due to timing issues,
        // the editorBlurEvent needs to get fired by the lower-level DOM click
        // handlers below rather than by the TABLE click handler directly.
        if(oSelf._oCellEditor.isActive) {
            // Only if the click was not within the Cell Editor container
            if(!YAHOO.util.Dom.isAncestor(oSelf._oCellEditor.container, elTarget)) {
                oSelf.fireEvent("editorBlurEvent", {editor:oSelf._oCellEditor});
            }
        }
    }
};

/**
 * Handles keydown events on the DOCUMENT.
 *
 * @method _onDocumentKeydown
 * @param e {HTMLEvent} The keydown event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onDocumentKeydown = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.tagName.toLowerCase();

    if(oSelf._oCellEditor.isActive &&
            YAHOO.util.Dom.isAncestor(oSelf._oCellEditor.container, elTarget)) {
        oSelf.fireEvent("editorKeydownEvent", {event:e});
    }
};

/**
 * Handles mouseover events on the TABLE element.
 *
 * @method _onTableMouseover
 * @param e {HTMLEvent} The mouseover event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onTableMouseover = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.tagName.toLowerCase();

    while(elTarget && (elTag != "table")) {
        switch(elTag) {
            case "body":
                 break;
            case "a":
                break;
            case "td":
                oSelf.fireEvent("cellMouseoverEvent",{target:elTarget,event:e});
                break;
            case "span":
                if(YAHOO.util.Dom.hasClass(elTarget, YAHOO.widget.DataTable.CLASS_LABEL)) {
                    oSelf.fireEvent("headerLabelMouseoverEvent",{target:elTarget,event:e});
                }
                break;
            case "th":
                oSelf.fireEvent("headerCellMouseoverEvent",{target:elTarget,event:e});
                break;
            case "tr":
                if(elTarget.parentNode.tagName.toLowerCase() == "thead") {
                    oSelf.fireEvent("headerRowMouseoverEvent",{target:elTarget,event:e});
                }
                else {
                    oSelf.fireEvent("rowMouseoverEvent",{target:elTarget,event:e});
                }
                break;
            default:
                break;
        }
        elTarget = elTarget.parentNode;
        if(elTarget) {
            elTag = elTarget.tagName.toLowerCase();
        }
    }
    oSelf.fireEvent("tableMouseoverEvent",{target:(elTarget || oSelf._elTable),event:e});
};

/**
 * Handles mouseout events on the TABLE element.
 *
 * @method _onTableMouseout
 * @param e {HTMLEvent} The mouseout event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onTableMouseout = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.tagName.toLowerCase();

    while(elTarget && (elTag != "table")) {
        switch(elTag) {
            case "body":
                break;
            case "a":
                break;
            case "td":
                oSelf.fireEvent("cellMouseoutEvent",{target:elTarget,event:e});
                break;
            case "span":
                if(YAHOO.util.Dom.hasClass(elTarget, YAHOO.widget.DataTable.CLASS_LABEL)) {
                    oSelf.fireEvent("headerLabelMouseoutEvent",{target:elTarget,event:e});
                }
                break;
            case "th":
                oSelf.fireEvent("headerCellMouseoutEvent",{target:elTarget,event:e});
                break;
            case "tr":
                if(elTarget.parentNode.tagName.toLowerCase() == "thead") {
                    oSelf.fireEvent("headerRowMouseoutEvent",{target:elTarget,event:e});
                }
                else {
                    oSelf.fireEvent("rowMouseoutEvent",{target:elTarget,event:e});
                }
                break;
            default:
                break;
        }
        elTarget = elTarget.parentNode;
        if(elTarget) {
            elTag = elTarget.tagName.toLowerCase();
        }
    }
    oSelf.fireEvent("tableMouseoutEvent",{target:(elTarget || oSelf._elTable),event:e});
};

/**
 * Handles mousedown events on the TABLE element.
 *
 * @method _onTableMousedown
 * @param e {HTMLEvent} The mousedown event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onTableMousedown = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.tagName.toLowerCase();

    while(elTarget && (elTag != "table")) {
        switch(elTag) {
            case "body":
                break;
            case "a":
                break;
            case "td":
                oSelf.fireEvent("cellMousedownEvent",{target:elTarget,event:e});
                break;
            case "span":
                if(YAHOO.util.Dom.hasClass(elTarget, YAHOO.widget.DataTable.CLASS_LABEL)) {
                    oSelf.fireEvent("headerLabelMousedownEvent",{target:elTarget,event:e});
                }
                break;
            case "th":
                oSelf.fireEvent("headerCellMousedownEvent",{target:elTarget,event:e});
                break;
            case "tr":
                if(elTarget.parentNode.tagName.toLowerCase() == "thead") {
                    oSelf.fireEvent("headerRowMousedownEvent",{target:elTarget,event:e});
                }
                else {
                    oSelf.fireEvent("rowMousedownEvent",{target:elTarget,event:e});
                }
                break;
            default:
                break;
        }
        elTarget = elTarget.parentNode;
        if(elTarget) {
            elTag = elTarget.tagName.toLowerCase();
        }
    }
    oSelf.fireEvent("tableMousedownEvent",{target:(elTarget || oSelf._elTable),event:e});
};

/**
 * Handles dblclick events on the TABLE element.
 *
 * @method _onTableDblclick
 * @param e {HTMLEvent} The dblclick event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onTableDblclick = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.tagName.toLowerCase();

    while(elTarget && (elTag != "table")) {
        switch(elTag) {
            case "body":
                break;
            case "td":
                oSelf.fireEvent("cellDblclickEvent",{target:elTarget,event:e});
                break;
            case "span":
                if(YAHOO.util.Dom.hasClass(elTarget, YAHOO.widget.DataTable.CLASS_LABEL)) {
                    oSelf.fireEvent("headerLabelDblclickEvent",{target:elTarget,event:e});
                }
                break;
            case "th":
                oSelf.fireEvent("headerCellDblclickEvent",{target:elTarget,event:e});
                break;
            case "tr":
                if(elTarget.parentNode.tagName.toLowerCase() == "thead") {
                    oSelf.fireEvent("headerRowDblclickEvent",{target:elTarget,event:e});
                }
                else {
                    oSelf.fireEvent("rowDblclickEvent",{target:elTarget,event:e});
                }
                break;
            default:
                break;
        }
        elTarget = elTarget.parentNode;
        if(elTarget) {
            elTag = elTarget.tagName.toLowerCase();
        }
    }
    oSelf.fireEvent("tableDblclickEvent",{target:(elTarget || oSelf._elTable),event:e});
};

/**
 * Handles click events on the THEAD element.
 *
 * @method _onTheadClick
 * @param e {HTMLEvent} The click event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onTheadClick = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.tagName.toLowerCase();

    if(oSelf._oCellEditor.isActive) {
        oSelf.fireEvent("editorBlurEvent", {editor:oSelf._oCellEditor});
    }

    while(elTarget && (elTag != "thead")) {
            switch(elTag) {
                case "body":
                    break;
                case "span":
                    if(YAHOO.util.Dom.hasClass(elTarget, YAHOO.widget.DataTable.CLASS_LABEL)) {
                        oSelf.fireEvent("headerLabelClickEvent",{target:elTarget,event:e});
                    }
                    break;
                case "th":
                    oSelf.fireEvent("headerCellClickEvent",{target:elTarget,event:e});
                    break;
                case "tr":
                    oSelf.fireEvent("headerRowClickEvent",{target:elTarget,event:e});
                    break;
                default:
                    break;
            }
            elTarget = elTarget.parentNode;
            if(elTarget) {
                elTag = elTarget.tagName.toLowerCase();
            }
    }
    oSelf.fireEvent("tableClickEvent",{target:(elTarget || oSelf._elTable),event:e});
};

/**
 * Handles keydown events on the THEAD element. Handles arrow selection.
 *
 * @method _onTheadKeydown
 * @param e {HTMLEvent} The key event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onTheadKeydown = function(e, oSelf) {
    // Arrows
    var nKey = YAHOO.util.Event.getCharCode(e);
    if((nKey > 36) && (nKey < 41)) {
        YAHOO.util.Event.stopEvent(e);
    }
};

/**
 * Handles click events on the primary TBODY element.
 *
 * @method _onTbodyDClick
 * @param e {HTMLEvent} The click event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onTbodyClick = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.tagName.toLowerCase();

    if(oSelf._oCellEditor.isActive) {
        oSelf.fireEvent("editorBlurEvent", {editor:oSelf._oCellEditor});
    }

    while(elTarget && (elTag != "table")) {
        switch(elTag) {
            case "body":
                break;
            case "input":
                if(elTarget.type.toLowerCase() == "checkbox") {
                    oSelf.fireEvent("checkboxClickEvent",{target:elTarget,event:e});
                }
                else if(elTarget.type.toLowerCase() == "radio") {
                    oSelf.fireEvent("radioClickEvent",{target:elTarget,event:e});
                }
                break;
            case "a":
                oSelf.fireEvent("linkClickEvent",{target:elTarget,event:e});
                break;
            case "button":
                oSelf.fireEvent("buttonClickEvent",{target:elTarget,event:e});
                break;
            case "td":
                oSelf.fireEvent("cellClickEvent",{target:elTarget,event:e});
                break;
            case "tr":
                oSelf.fireEvent("rowClickEvent",{target:elTarget,event:e});
                break;
            default:
                break;
        }
        elTarget = elTarget.parentNode;
        if(elTarget) {
            elTag = elTarget.tagName.toLowerCase();
        }
    }
    oSelf.fireEvent("tableClickEvent",{target:(elTarget || oSelf._elTable),event:e});
};

/**
 * Handles keydown events on the TBODY element. Handles arrow selection.
 *
 * @method _onTbodyKeydown
 * @param e {HTMLEvent} The key event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onTbodyKeydown = function(e, oSelf) {
    var lastSelectedId = oSelf._sLastSelectedId;
    var lastSelectedEl = YAHOO.util.Dom.get(lastSelectedId);

    // Something is currently selected
    if(lastSelectedEl && oSelf.isSelected(lastSelectedEl)) {
        // Only handle arrow selection
        var nKey = YAHOO.util.Event.getCharCode(e);
        if((nKey > 36) && (nKey < 41)) {
            YAHOO.util.Event.stopEvent(e);
        }
        else {
            return;
        }

        var sMode = oSelf.get("selectionMode");
        var bSHIFT = e.shiftKey;
        var allRows = oSelf._elTbody.rows;
        var anchorId = oSelf._sSelectionAnchorId;
        var anchorEl = YAHOO.util.Dom.get(anchorId);
        var newSelectedEl, trIndex, tdIndex, startIndex, endIndex, i, anchorPos;

        ////////////////////////////////////////////////////////////////////////
        //
        // SHIFT cell block selection
        //
        ////////////////////////////////////////////////////////////////////////
        if(bSHIFT && (sMode == "cellblock")) {
            trIndex = lastSelectedEl.parentNode.sectionRowIndex;
            tdIndex = lastSelectedEl.yuiCellIndex;

            // Arrow DOWN
            if(nKey == 40) {
                // Is the anchor cell above, below, or same row
                if(anchorEl.parentNode.sectionRowIndex > trIndex) {
                    anchorPos = 1;
                }
                else if(anchorEl.parentNode.sectionRowIndex < trIndex) {
                    anchorPos = -1;
                }
                else {
                    anchorPos = 0;
                }
                
                // Is the anchor cell left or right
                startIndex = Math.min(anchorEl.yuiCellIndex, tdIndex);
                endIndex = Math.max(anchorEl.yuiCellIndex, tdIndex);
                
                // Selecting away from anchor cell
                if(anchorPos <= 0) {
                    // Select the horiz block on the next row
                    if(trIndex < allRows.length-1) {
                        for(i=startIndex; i<=endIndex; i++) {
                            newSelectedEl = allRows[trIndex+1].cells[i];
                            oSelf.selectCell(newSelectedEl);
                        }
                        oSelf._sLastSelectedId = allRows[trIndex+1].cells[tdIndex].id;
                    }
                }
                // Unselecting towards anchor cell
                else {
                    // Unselect the horiz block on this row towards the next row
                    for(i=startIndex; i<=endIndex; i++) {
                        oSelf.unselectCell(allRows[trIndex].cells[i]);
                    }
                    oSelf._sLastSelectedId = allRows[trIndex+1].cells[tdIndex].id;
                }
            }
            // Arrow up
            else if(nKey == 38) {
                // Is the anchor cell above, below, or same row
                if(anchorEl.parentNode.sectionRowIndex > trIndex) {
                    anchorPos = 1;
                }
                else if(anchorEl.parentNode.sectionRowIndex < trIndex) {
                    anchorPos = -1;
                }
                else {
                    anchorPos = 0;
                }

                // Is the anchor cell left or right?
                startIndex = Math.min(anchorEl.yuiCellIndex, tdIndex);
                endIndex = Math.max(anchorEl.yuiCellIndex, tdIndex);
                
                // Selecting away from anchor cell
                if(anchorPos >= 0) {
                    // Select the horiz block on the previous row
                    if(trIndex > 0) {
                        for(i=startIndex; i<=endIndex; i++) {
                            newSelectedEl = allRows[trIndex-1].cells[i];
                            oSelf.selectCell(newSelectedEl);
                        }
                        oSelf._sLastSelectedId = allRows[trIndex-1].cells[tdIndex].id;
                    }
                }
                // Unselecting towards anchor cell
                else {
                    // Unselect the horiz block on this row towards the previous row
                    for(i=startIndex; i<=endIndex; i++) {
                        oSelf.unselectCell(allRows[trIndex].cells[i]);
                    }
                    oSelf._sLastSelectedId = allRows[trIndex-1].cells[tdIndex].id;
                }
            }
            // Arrow right
            else if(nKey == 39) {
                // Is the anchor cell left, right, or same column
                if(anchorEl.yuiCellIndex > tdIndex) {
                    anchorPos = 1;
                }
                else if(anchorEl.yuiCellIndex < tdIndex) {
                    anchorPos = -1;
                }
                else {
                    anchorPos = 0;
                }

                // Selecting away from anchor cell
                if(anchorPos <= 0) {
                    //Select the next vert block to the right
                    if(tdIndex < allRows[trIndex].cells.length-1) {
                        startIndex = Math.min(anchorEl.parentNode.sectionRowIndex, trIndex);
                        endIndex = Math.max(anchorEl.parentNode.sectionRowIndex, trIndex);
                        for(i=startIndex; i<=endIndex; i++) {
                            newSelectedEl = allRows[i].cells[tdIndex+1];
                            oSelf.selectCell(newSelectedEl);
                        }
                        oSelf._sLastSelectedId = allRows[trIndex].cells[tdIndex+1].id;
                    }
                }
                // Unselecting towards anchor cell
                else {
                    // Unselect the vert block on this column towards the right
                    startIndex = Math.min(anchorEl.parentNode.sectionRowIndex, trIndex);
                    endIndex = Math.max(anchorEl.parentNode.sectionRowIndex, trIndex);
                    for(i=startIndex; i<=endIndex; i++) {
                        oSelf.unselectCell(allRows[i].cells[tdIndex]);
                    }
                    oSelf._sLastSelectedId = allRows[trIndex].cells[tdIndex+1].id;
                }
            }
            // Arrow left
            else if(nKey == 37) {
                // Is the anchor cell left, right, or same column
                if(anchorEl.yuiCellIndex > tdIndex) {
                    anchorPos = 1;
                }
                else if(anchorEl.yuiCellIndex < tdIndex) {
                    anchorPos = -1;
                }
                else {
                    anchorPos = 0;
                }

                // Selecting away from anchor cell
                if(anchorPos >= 0) {
                    //Select the previous vert block to the left
                    if(tdIndex > 0) {
                        startIndex = Math.min(anchorEl.parentNode.sectionRowIndex, trIndex);
                        endIndex = Math.max(anchorEl.parentNode.sectionRowIndex, trIndex);
                        for(i=startIndex; i<=endIndex; i++) {
                            newSelectedEl = allRows[i].cells[tdIndex-1];
                            oSelf.selectCell(newSelectedEl);
                        }
                        oSelf._sLastSelectedId = allRows[trIndex].cells[tdIndex-1].id;
                    }
                }
                // Unselecting towards anchor cell
                else {
                    // Unselect the vert block on this column towards the left
                    startIndex = Math.min(anchorEl.parentNode.sectionRowIndex, trIndex);
                    endIndex = Math.max(anchorEl.parentNode.sectionRowIndex, trIndex);
                    for(i=startIndex; i<=endIndex; i++) {
                        oSelf.unselectCell(allRows[i].cells[tdIndex]);
                    }
                    oSelf._sLastSelectedId = allRows[trIndex].cells[tdIndex-1].id;
                }
            }
        }
        ////////////////////////////////////////////////////////////////////////
        //
        // SHIFT cell range selection
        //
        ////////////////////////////////////////////////////////////////////////
        else if(bSHIFT && (sMode == "cellrange")) {
            trIndex = lastSelectedEl.parentNode.sectionRowIndex;
            tdIndex = lastSelectedEl.yuiCellIndex;

            // Is the anchor cell above, below, or same row
            if(anchorEl.parentNode.sectionRowIndex > trIndex) {
                anchorPos = 1;
            }
            else if(anchorEl.parentNode.sectionRowIndex < trIndex) {
                anchorPos = -1;
            }
            else {
                anchorPos = 0;
            }

            // Arrow down
            if(nKey == 40) {
                // Selecting away from anchor cell
                if(anchorPos <= 0) {
                    // Select all cells to the end of this row
                    for(i=tdIndex+1; i<allRows[trIndex].cells.length; i++){
                        newSelectedEl = allRows[trIndex].cells[i];
                        oSelf.selectCell(newSelectedEl);
                    }
                    
                    // Select some of the cells on the next row down
                    if(trIndex < allRows.length-1) {
                        for(i=0; i<=tdIndex; i++){
                            newSelectedEl = allRows[trIndex+1].cells[i];
                            oSelf.selectCell(newSelectedEl);
                        }
                    }
                }
                // Unselecting towards anchor cell
                else {
                    // Unselect all cells to the end of this row
                    for(i=tdIndex; i<allRows[trIndex].cells.length; i++){
                        oSelf.unselectCell(allRows[trIndex].cells[i]);
                    }
                    
                    // Unselect some of the cells on the next row down
                    for(i=0; i<tdIndex; i++){
                        oSelf.unselectCell(allRows[trIndex+1].cells[i]);
                    }
                    oSelf._sLastSelectedId = allRows[trIndex+1].cells[tdIndex].id;
                }
            }
            // Arrow up
            else if(nKey == 38) {
                // Selecting away from anchor cell
                if(anchorPos >= 0) {
                    // Select all the cells to the beginning of this row
                    for(i=tdIndex-1; i>-1; i--){
                        newSelectedEl = allRows[trIndex].cells[i];
                        oSelf.selectCell(newSelectedEl);
                    }
                    
                    // Select some of the cells from the end of the previous row
                    if(trIndex > 0) {
                        for(i=allRows[trIndex].cells.length-1; i>=tdIndex; i--){
                            newSelectedEl = allRows[trIndex-1].cells[i];
                            oSelf.selectCell(newSelectedEl);
                        }
                    }
                }
                // Unselecting towards anchor cell
                else {
                    // Unselect all the cells to the beginning of this row
                    for(i=tdIndex; i>-1; i--){
                        oSelf.unselectCell(allRows[trIndex].cells[i]);
                    }

                    // Unselect some of the cells from the end of the previous row
                    for(i=allRows[trIndex].cells.length-1; i>tdIndex; i--){
                        oSelf.unselectCell(allRows[trIndex-1].cells[i]);
                    }
                    oSelf._sLastSelectedId = allRows[trIndex-1].cells[tdIndex].id;
                }
            }
            // Arrow right
            else if(nKey == 39) {
                // Selecting away from anchor cell
                if(anchorPos < 0) {
                    // Select the next cell to the right
                    if(tdIndex < allRows[trIndex].cells.length-1) {
                        newSelectedEl = allRows[trIndex].cells[tdIndex+1];
                        oSelf.selectCell(newSelectedEl);
                    }
                    // Select the first cell of the next row
                    else if(trIndex < allRows.length-1) {
                        newSelectedEl = allRows[trIndex+1].cells[0];
                        oSelf.selectCell(newSelectedEl);
                    }
                }
                // Unselecting towards anchor cell
                else if(anchorPos > 0) {
                    oSelf.unselectCell(allRows[trIndex].cells[tdIndex]);
                    
                    // Unselect this cell towards the right
                    if(tdIndex < allRows[trIndex].cells.length-1) {
                        oSelf._sLastSelectedId = allRows[trIndex].cells[tdIndex+1].id;
                    }
                    // Unselect this cells towards the first cell of the next row
                    else {
                        oSelf._sLastSelectedId = allRows[trIndex+1].cells[0].id;
                    }
                }
                // Anchor is on this row
                else {
                    // Selecting away from anchor
                    if(anchorEl.yuiCellIndex <= tdIndex) {
                        // Select the next cell to the right
                        if(tdIndex < allRows[trIndex].cells.length-1) {
                            newSelectedEl = allRows[trIndex].cells[tdIndex+1];
                            oSelf.selectCell(newSelectedEl);
                        }
                        // Select the first cell on the next row
                        else if(trIndex < allRows.length-1){
                            newSelectedEl = allRows[trIndex+1].cells[0];
                            oSelf.selectCell(newSelectedEl);
                        }
                    }
                    // Unselecting towards anchor
                    else {
                        // Unselect this cell towards the right
                        oSelf.unselectCell(allRows[trIndex].cells[tdIndex]);
                        oSelf._sLastSelectedId = allRows[trIndex].cells[tdIndex+1].id;
                    }
                }
            }
            // Arrow left
            else if(nKey == 37) {
                // Unselecting towards the anchor
                if(anchorPos < 0) {
                    oSelf.unselectCell(allRows[trIndex].cells[tdIndex]);
                    
                    // Unselect this cell towards the left
                    if(tdIndex > 0) {
                        oSelf._sLastSelectedId = allRows[trIndex].cells[tdIndex-1].id;
                    }
                    // Unselect this cell towards the last cell of the previous row
                    else {
                        oSelf._sLastSelectedId = allRows[trIndex-1].cells[allRows[trIndex-1].cells.length-1].id;
                    }
                }
                // Selecting towards the anchor
                else if(anchorPos > 0) {
                    // Select the next cell to the left
                    if(tdIndex > 0) {
                        newSelectedEl = allRows[trIndex].cells[tdIndex-1];
                        oSelf.selectCell(newSelectedEl);
                    }
                    // Select the last cell of the previous row
                    else if(trIndex > 0){
                        newSelectedEl = allRows[trIndex-1].cells[allRows[trIndex-1].cells.length-1];
                        oSelf.selectCell(newSelectedEl);
                    }
                }
                // Anchor is on this row
                else {
                    // Selecting away from anchor cell
                    if(anchorEl.yuiCellIndex >= tdIndex) {
                        // Select the next cell to the left
                        if(tdIndex > 0) {
                            newSelectedEl = allRows[trIndex].cells[tdIndex-1];
                            oSelf.selectCell(newSelectedEl);
                        }
                        // Select the last cell of the previous row
                        else if(trIndex > 0){
                            newSelectedEl = allRows[trIndex-1].cells[allRows[trIndex-1].cells.length-1];
                            oSelf.selectCell(newSelectedEl);
                        }
                    }
                    // Unselecting towards anchor cell
                    else {
                        oSelf.unselectCell(allRows[trIndex].cells[tdIndex]);
                        
                        // Unselect this cell towards the left
                        if(tdIndex > 0) {
                            oSelf._sLastSelectedId = allRows[trIndex].cells[tdIndex-1].id;
                        }
                        // Unselect this cell towards the last cell of the previous row
                        else {
                            oSelf._sLastSelectedId = allRows[trIndex-1].cells[allRows[trIndex-1].cells.length-1].id;
                        }
                    }
                }
            }
        }
        ////////////////////////////////////////////////////////////////////////
        //
        // Simple single cell selection
        //
        ////////////////////////////////////////////////////////////////////////
        else if((sMode == "cellblock") || (sMode == "cellrange") || (sMode == "singlecell")) {
            trIndex = lastSelectedEl.parentNode.sectionRowIndex;
            tdIndex = lastSelectedEl.yuiCellIndex;
            
            // Arrow down
            if(nKey == 40) {
                oSelf.unselectAllCells();
                
                // Select the next cell down
                if(trIndex < allRows.length-1) {
                    newSelectedEl = allRows[trIndex+1].cells[tdIndex];
                    oSelf.selectCell(newSelectedEl);
                }
                // Select only the bottom cell
                else {
                    newSelectedEl = lastSelectedEl;
                    oSelf.selectCell(newSelectedEl);
                }
                
                oSelf._sSelectionAnchorId = newSelectedEl.id;
            }
            // Arrow up
            else if(nKey == 38) {
                oSelf.unselectAllCells();
                
                // Select the next cell up
                if(trIndex > 0) {
                    newSelectedEl = allRows[trIndex-1].cells[tdIndex];
                    oSelf.selectCell(newSelectedEl);
                }
                // Select only the top cell
                else {
                    newSelectedEl = lastSelectedEl;
                    oSelf.selectCell(newSelectedEl);
                }
                
                oSelf._sSelectionAnchorId = newSelectedEl.id;
            }
            // Arrow right
            else if(nKey == 39) {
                oSelf.unselectAllCells();
                
                // Select the next cell to the right
                if(tdIndex < lastSelectedEl.parentNode.cells.length-1) {
                    newSelectedEl = lastSelectedEl.parentNode.cells[tdIndex+1];
                    oSelf.selectCell(newSelectedEl);
                }
                // Select only the right cell
                else {
                    newSelectedEl = lastSelectedEl;
                    oSelf.selectCell(newSelectedEl);
                }
                
                oSelf._sSelectionAnchorId = newSelectedEl.id;
            }
            // Arrow left
            else if(nKey == 37) {
                oSelf.unselectAllCells();
                
                // Select the next cell to the left
                if(tdIndex > 0) {
                    newSelectedEl = lastSelectedEl.parentNode.cells[tdIndex-1];
                    oSelf.selectCell(newSelectedEl);
                }
                // Select only the left cell
                else {
                    newSelectedEl = lastSelectedEl;
                    oSelf.selectCell(newSelectedEl);
                }
                
                oSelf._sSelectionAnchorId = newSelectedEl.id;
            }
        }
        ////////////////////////////////////////////////////////////////////////
        //
        // SHIFT row selection
        //
        ////////////////////////////////////////////////////////////////////////
        else if(bSHIFT && (sMode != "single")) {
            trIndex = lastSelectedEl.sectionRowIndex;
            
            if(anchorEl.sectionRowIndex > trIndex) {
                anchorPos = 1;
            }
            else if(anchorEl.sectionRowIndex < trIndex) {
                anchorPos = -1;
            }
            else {
                anchorPos = 0;
            }

            // Arrow down
            if(nKey == 40) {
                // Selecting away from anchor row
                if(anchorPos <= 0) {
                    // Select the next row down
                    if(trIndex < allRows.length-1) {
                        oSelf.selectRow(trIndex+1);
                    }
                }
                // Unselecting toward anchor row
                else {
                    // Unselect this row towards the anchor row down
                    oSelf.unselectRow(lastSelectedEl);
                    oSelf._sLastSelectedId = allRows[trIndex+1].id;
                }

            }
            // Arrow up
            else if(nKey == 38) {
                // Selecting away from anchor row
                if(anchorPos >= 0) {
                    // Select the next row up
                    if(trIndex > 0) {
                        oSelf.selectRow(trIndex-1);
                    }
                }
                // Unselect this row towards the anchor row up
                else {
                    oSelf.unselectRow(lastSelectedEl);
                    oSelf._sLastSelectedId = allRows[trIndex-1].id;
                }
            }
            // Arrow right
            else if(nKey == 39) {
                // Do nothing
            }
            // Arrow left
            else if(nKey == 37) {
                // Do nothing
            }
        }
        ////////////////////////////////////////////////////////////////////////
        //
        // Simple single row selection
        //
        ////////////////////////////////////////////////////////////////////////
        else {
            trIndex = lastSelectedEl.sectionRowIndex;
            
            // Arrow down
            if(nKey == 40) {
                oSelf.unselectAllRows();
                
                // Select the next row
                if(trIndex < allRows.length-1) {
                    newSelectedEl = allRows[trIndex+1];
                    oSelf.selectRow(newSelectedEl);
                }
                // Select only the last row
                else {
                    newSelectedEl = lastSelectedEl;
                    oSelf.selectRow(lastSelectedEl);
                }
                
                oSelf._sSelectionAnchorId = newSelectedEl.id;
            }
            // Arrow up
            else if(nKey == 38) {
                oSelf.unselectAllRows();
                
                // Select the previous row
                if(trIndex > 0) {
                    newSelectedEl = allRows[trIndex-1];
                    oSelf.selectRow(newSelectedEl);
                }
                // Select only the first row
                else {
                    newSelectedEl = lastSelectedEl;
                    oSelf.selectRow(newSelectedEl);
                }
                
                oSelf._sSelectionAnchorId = newSelectedEl.id;
            }
            // Arrow right
            else if(nKey == 39) {
                // Do nothing
            }
            // Arrow left
            else if(nKey == 37) {
                // Do nothing
            }
        }
    }
};

/**
 * Handles keyup events on the TBODY. Executes deletion.
 *
 * @method _onTbodyKeyup
 * @param e {HTMLEvent} The key event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onTbodyKeyup = function(e, oSelf) {
    var nKey = YAHOO.util.Event.getCharCode(e);
    // delete
    if(nKey == 46) {//TODO: && oSelf.isFocused
        //TODO: delete row
    }
};

/**
 * Handles keypress events on the TBODY. Mainly to support stopEvent on Mac.
 *
 * @method _onTbodyKeypress
 * @param e {HTMLEvent} The key event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onTbodyKeypress = function(e, oSelf) {
    var isMac = (navigator.userAgent.toLowerCase().indexOf("mac") != -1);
    if(isMac) {
        var nKey = YAHOO.util.Event.getCharCode(e);
        // arrow down
        if(nKey == 40) {
            YAHOO.util.Event.stopEvent(e);
        }
        // arrow up
        else if(nKey == 38) {
            YAHOO.util.Event.stopEvent(e);
        }
    }
};

/**
 * Handles click events on paginator links.
 *
 * @method _onPaginatorLinkClick
 * @param e {HTMLEvent} The click event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onPaginatorLinkClick = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var elTag = elTarget.tagName.toLowerCase();

    if(oSelf._oCellEditor.isActive) {
        oSelf.fireEvent("editorBlurEvent", {editor:oSelf._oCellEditor});
    }

    while(elTarget && (elTag != "table")) {
        switch(elTag) {
            case "body":
                return;
            case "a":
                YAHOO.util.Event.stopEvent(e);
                //TODO: after the showPage call, figure out which link
                //TODO: was clicked and reset focus to the new version of it
                switch(elTarget.className) {
                    case YAHOO.widget.DataTable.CLASS_PAGE:
                        oSelf.showPage(parseInt(elTarget.innerHTML,10));
                        return;
                    case YAHOO.widget.DataTable.CLASS_FIRST:
                        oSelf.showPage(1);
                        return;
                    case YAHOO.widget.DataTable.CLASS_LAST:
                        oSelf.showPage(oSelf.get("paginator").totalPages);
                        return;
                    case YAHOO.widget.DataTable.CLASS_PREVIOUS:
                        oSelf.showPage(oSelf.get("paginator").currentPage - 1);
                        return;
                    case YAHOO.widget.DataTable.CLASS_NEXT:
                        oSelf.showPage(oSelf.get("paginator").currentPage + 1);
                        return;
                }
                break;
            default:
                return;
        }
        elTarget = elTarget.parentNode;
        if(elTarget) {
            elTag = elTarget.tagName.toLowerCase();
        }
        else {
            return;
        }
    }
};

/**
 * Handles change events on paginator SELECT element.
 *
 * @method _onPaginatorDropdownChange
 * @param e {HTMLEvent} The change event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onPaginatorDropdownChange = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    var newValue = elTarget[elTarget.selectedIndex].value;

    var newRowsPerPage = YAHOO.lang.isValue(parseInt(newValue,10)) ? parseInt(newValue,10) : null;
    if(newRowsPerPage !== null) {
        var newStartRecordIndex = (oSelf.get("paginator").currentPage-1) * newRowsPerPage;
        oSelf.updatePaginator({rowsPerPage:newRowsPerPage, startRecordIndex:newStartRecordIndex});
        oSelf.refreshView();
    }
    else {
        YAHOO.log("Could not paginate with " + newValue + " rows per page", "error", oSelf.toString());
    }
};

/**
 * Handles change events on SELECT elements within DataTable.
 *
 * @method _onDropdownChange
 * @param e {HTMLEvent} The change event.
 * @param oSelf {YAHOO.widget.DataTable} DataTable instance.
 * @private
 */
YAHOO.widget.DataTable.prototype._onDropdownChange = function(e, oSelf) {
    var elTarget = YAHOO.util.Event.getTarget(e);
    //TODO: pass what args?
    //var value = elTarget[elTarget.selectedIndex].value;
    oSelf.fireEvent("dropdownChangeEvent", {event:e, target:elTarget});
};







































/////////////////////////////////////////////////////////////////////////////
//
// Public member variables
//
/////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////
//
// Public methods
//
/////////////////////////////////////////////////////////////////////////////

// OBJECT ACCESSORS

/**
 * Public accessor to the unique name of the DataSource instance.
 *
 * @method toString
 * @return {String} Unique name of the DataSource instance.
 */

YAHOO.widget.DataTable.prototype.toString = function() {
    return "DataTable " + this._sName;
};

/**
 * Returns the DataTable instance's DataSource instance.
 *
 * @method getDataSource
 * @return {YAHOO.util.DataSource} DataSource instance.
 */
YAHOO.widget.DataTable.prototype.getDataSource = function() {
    return this._oDataSource;
};

/**
 * Returns the DataTable instance's ColumnSet instance.
 *
 * @method getColumnSet
 * @return {YAHOO.widget.ColumnSet} ColumnSet instance.
 */
YAHOO.widget.DataTable.prototype.getColumnSet = function() {
    return this._oColumnSet;
};

/**
 * Returns the DataTable instance's RecordSet instance.
 *
 * @method getRecordSet
 * @return {YAHOO.widget.RecordSet} RecordSet instance.
 */
YAHOO.widget.DataTable.prototype.getRecordSet = function() {
    return this._oRecordSet;
};

/**
 * Returns the DataTable instance's Cell Editor as an object literal.
 *
 * @method getCellEditor
 * @return {Object} Cell Editor object literal values.
 */
YAHOO.widget.DataTable.prototype.getCellEditor = function() {
    return this._oCellEditor;
};











































// DOM ACCESSORS

/**
 * Returns DOM reference to the DataTable's TABLE element.
 *
 * @method getTableEl
 * @return {HTMLElement} Reference to TABLE element.
 */
YAHOO.widget.DataTable.prototype.getTableEl = function() {
    return this._elTable;
};

/**
 * Returns DOM reference to the DataTable's THEAD element.
 *
 * @method getTheadEl
 * @return {HTMLElement} Reference to THEAD element.
 */
YAHOO.widget.DataTable.prototype.getTheadEl = function() {
    return this._elThead;
};

/**
 * Returns DOM reference to the DataTable's primary TBODY element.
 *
 * @method getTbodyEl
 * @return {HTMLElement} Reference to TBODY element.
 */
YAHOO.widget.DataTable.prototype.getTbodyEl = function() {
    return this._elTbody;
};
// Backward compatibility
YAHOO.widget.DataTable.prototype.getBody = function() {
    YAHOO.log("The method getBody() has been deprecated" +
            " in favor of getTbodyEl()", "warn", this.toString());
    return this.getTbodyEl();
};

/**
 * Returns DOM reference to the DataTable's secondary TBODY element that is
 * used to display messages.
 *
 * @method getMsgTbodyEl
 * @return {HTMLElement} Reference to TBODY element.
 */
YAHOO.widget.DataTable.prototype.getMsgTbodyEl = function() {
    return this._elMsgTbody;
};

/**
 * Returns DOM reference to the TD element within the secondary TBODY that is
 * used to display messages.
 *
 * @method getMsgTdEl
 * @return {HTMLElement} Reference to TD element.
 */
YAHOO.widget.DataTable.prototype.getMsgTdEl = function() {
    return this._elMsgTd;
};

/**
 * Returns the corresponding TR reference for a given DOM element, ID string or
 * directly page row index. If the given identifier is a child of a TR element,
 * then DOM tree is traversed until a parent TR element is returned, otherwise
 * null.
 *
 * @method getTrEl
 * @param row {HTMLElement | String | Number | YAHOO.widget.Record} Which row to
 * get: by element reference, ID string, page row index, or Record.
 * @return {HTMLElement} Reference to TR element, or null.
 */
YAHOO.widget.DataTable.prototype.getTrEl = function(row) {
    var allRows = this._elTbody.rows;
    
    // By Record
    if(row instanceof YAHOO.widget.Record) {
        var nTrIndex = this.getTrIndex(row);
        return allRows[nTrIndex];
    }
    // By page row index
    else if(YAHOO.lang.isNumber(row) && (row > -1) && (row < allRows.length)) {
        return allRows[row];
    }
    // By ID string or element reference
    else {
        var elRow;
        var el = YAHOO.util.Dom.get(row);
        
        // Validate HTML element
        if(el && (el.ownerDocument == document)) {
            // Validate TR element
            if(el.tagName.toLowerCase() != "tr") {
                // Traverse up the DOM to find the corresponding TR element
                elRow = YAHOO.util.Dom.getAncestorByTagName(el,"tr");
            }
            else {
                elRow = el;
            }

            // Make sure the TR is in this TBODY
            if(elRow && (elRow.parentNode == this._elTbody)) {
                // Now we can return the TR element
                return elRow;
            }
        }
    }
    
    YAHOO.log("Could not get TR element for row " + row, "warn", this.toString());
    return null;
};
// Backward compatibility
YAHOO.widget.DataTable.prototype.getRow = function(index) {
    YAHOO.log("The method getRow() has been deprecated" +
            " in favor of getTrEl()", "warn", this.toString());
    return this.getTrEl(index);
};

/**
 * Returns DOM reference to the first TR element in the DataTable page, or null.
 *
 * @method getFirstTrEl
 * @return {HTMLElement} Reference to TR element.
 */
YAHOO.widget.DataTable.prototype.getFirstTrEl = function() {
    return this._elTbody.rows[0] || null;
};

/**
 * Returns DOM reference to the last TR element in the DataTable page, or null.
 *
 * @method getLastTrEl
 * @return {HTMLElement} Reference to last TR element.
 */
YAHOO.widget.DataTable.prototype.getLastTrEl = function() {
    var allRows = this._elTbody.rows;
        if(allRows.length > 0) {
            return allRows[allRows.length-1] || null;
        }
};

/**
 * Returns DOM reference to the given TD element.
 *
 * @method getTdEl
 * @param cell {HTMLElement | String} DOM element reference or string ID.
 * @return {HTMLElement} Reference to TD element.
 */
YAHOO.widget.DataTable.prototype.getTdEl = function(cell) {
    var elCell;
    var el = YAHOO.util.Dom.get(cell);

    // Validate HTML element
    if(el && (el.ownerDocument == document)) {
        // Validate TD element
        if(el.tagName.toLowerCase() != "td") {
            // Traverse up the DOM to find the corresponding TR element
            elCell = YAHOO.util.Dom.getAncestorByTagName(el, "td");
        }
        else {
            elCell = el;
        }

        // Make sure the TD is in this TBODY
        if(elCell && (elCell.parentNode.parentNode == this._elTbody)) {
            // Now we can return the TD element
            return elCell;
        }
    }
    
    YAHOO.log("Could not get TD element for cell " + cell, "warn", this.toString());
    return null;
};

/**
 * Returns DOM reference to the TH element at given DataTable page coordinates, or null.
 *
 * @method getThEl
 * @param header {HTMLElement | String | YAHOO.widget.Column} DOM element
 * reference or string ID, or Column instance.
 * @return {HTMLElement} Reference to TH element.
 */
YAHOO.widget.DataTable.prototype.getThEl = function(header) {
    var elHeader;
        
    // Validate Column instance
    if(header instanceof YAHOO.widget.Column) {
        var oColumn = header;
        elHeader = YAHOO.util.Dom.get(this.id + "-col" + oColumn.getId());
        if(elHeader) {
            return elHeader;
        }
    }
    // Validate HTML element
    else {
        var el = YAHOO.util.Dom.get(header);

        if(el && (el.ownerDocument == document)) {
            // Validate TH element
            if(el.tagName.toLowerCase() != "th") {
                // Traverse up the DOM to find the corresponding TR element
                elHeader = YAHOO.util.Dom.getAncestorByTagName(el,"th");
            }
            else {
                elHeader = el;
            }

            // Make sure the TH is in this THEAD
            if(elHeader && (elHeader.parentNode.parentNode == this._elThead)) {
                // Now we can return the TD element
                return elHeader;
            }
        }
    }

    YAHOO.log("Could not get TH element for header " + header, "warn", this.toString());
    return null;
};

/**
 * Returns the page row index of given row. Returns null if the row is not in
 * view on the current DataTable page.
 *
 * @method getTrIndex
 * @param row {HTMLElement | String | YAHOO.widget.Record | Number} DOM or ID
 * string reference to an element within the DataTable page, a Record instance,
 * or a Record's RecordSet index.
 * @return {Number} Page row index, or null if row does not exist or is not in view.
 */
YAHOO.widget.DataTable.prototype.getTrIndex = function(row) {
    var nRecordIndex;
    
    // By Record
    if(row instanceof YAHOO.widget.Record) {
        nRecordIndex = this._oRecordSet.getRecordIndex(row);
    }
    // Calculate page row index from Record index
    else if(YAHOO.lang.isNumber(row)) {
        nRecordIndex = row;
    }
    if(YAHOO.lang.isNumber(nRecordIndex)) {
        // DataTable is paginated
        if(this.get("paginated")) {
            // Get the first and last Record on this page
            var startRecordIndex = this.get("paginator").startRecordIndex;
            var endRecordIndex = startRecordIndex + this.get("paginator").rowsPerPage - 1;
            // This Record is in view
            if((nRecordIndex >= startRecordIndex) && (nRecordIndex <= endRecordIndex)) {
                return nRecordIndex - startRecordIndex;
            }
            // This Record is not in view
            else {
                return null;
            }
        }
        // Not paginated, just return the Record index
        else {
            return nRecordIndex;
        }

    }
    // By element reference or ID string
    else {
        // Validate TR element
        elRow = this.getTrEl(row);
        if(elRow && (elRow.ownerDocument == document) &&
                (elRow.parentNode == this._elTbody)) {
            return elRow.sectionRowIndex;
        }
    }
    
    YAHOO.log("Could not get page row index for row " + row, "warn", this.toString());
    return null;
};














































// TABLE FUNCTIONS

/**
 * Resets a RecordSet with the given data and populates the page view
 * with the new data. Any previous data and selection states are cleared.
 * However, sort states are not cleared, so if the given data is in a particular
 * sort order, implementers should take care to reset the sortedBy property. If
 * pagination is enabled, the currentPage is shown and Paginator UI updated,
 * otherwise all rows are displayed as a single page. For performance, existing
 * DOM elements are reused when possible.
 *
 * @method initializeTable
 * @param oData {Object | Object[]} An object literal of data or an array of
 * object literals containing data.
 */
YAHOO.widget.DataTable.prototype.initializeTable = function(oData) {
    // Initialize RecordSet
    this._initRecordSet();

    // Add data to RecordSet
    var records = this._oRecordSet.addRecords(oData);

    // Clear selections
    this._unselectAllTrEls();
    this._unselectAllTdEls();
    this._aSelections = null;
    this._sLastSelectedId = null;
    this._sSelectionAnchorId = null;

    // Refresh the view
    this.refreshView();
    this.fireEvent("initEvent");
};

/**
 * Refreshes the view with existing Records from the RecordSet while
 * maintaining sort, pagination, and selection states. For performance, reuses
 * existing DOM elements when possible while deleting extraneous elements.
 *
 * @method refreshView
 */
YAHOO.widget.DataTable.prototype.refreshView = function() {
    var i, j, aRecords;
    var oPaginator = this.updatePaginator();

    // Paginator is enabled
    if(this.get("paginated")) {
        var rowsPerPage = oPaginator.rowsPerPage;
        var startRecordIndex = (oPaginator.currentPage - 1) * rowsPerPage;
        aRecords = this._oRecordSet.getRecords(startRecordIndex, rowsPerPage);
        this.formatPaginators();
    }
    // Show all records
    else {
        aRecords = this._oRecordSet.getRecords();
    }

    var elTbody = this._elTbody;
    var elRows = elTbody.rows;

    // Has rows
    if(YAHOO.lang.isArray(aRecords) && (aRecords.length > 0)) {
        this.hideTableMessage();

        // Remove extra rows from the bottom so as to preserve ID order
        while(elTbody.hasChildNodes() && (elRows.length > aRecords.length)) {
            elTbody.deleteRow(-1);
        }

        // Keep track of selected rows
        var aSelectedRows = this.getSelectedRows();

        // Keep track of selected cells
        var aSelectedCells = this.getSelectedCells();

        // Unselect TR elements in the UI
        if(aSelectedRows.length > 0) {
            this._unselectAllTrEls();
        }

        // Unselect TD elements in the UI
        if(aSelectedCells.length > 0) {
            this._unselectAllTdEls();
        }

        // From the top, update in-place existing rows
        for(i=0; i<elRows.length; i++) {
            this._updateTrEl(elRows[i], aRecords[i]);
        }

        // Add TR elements as necessary
        for(i=elRows.length; i<aRecords.length; i++) {
            this._addTrEl(aRecords[i]);
        }

        // Re-select any TR or TD elements as necessary
        var allSelections = aSelectedRows.concat(aSelectedCells);
        var allRows = elTbody.rows;
        for(i=0; i<allSelections.length; i++) {
            for(j=0; j<allRows.length; j++) {
                var thisRow = allRows[j];
                if(allSelections[i] === thisRow.yuiRecordId) {
                    YAHOO.util.Dom.addClass(thisRow, YAHOO.widget.DataTable.CLASS_SELECTED);
                }
                else if(allSelections[i].recordId === thisRow.yuiRecordId) {
                    for(var k=0; k<thisRow.cells.length; k++) {
                        if(thisRow.cells[k].yuiColumnId === allSelections[i].columnId) {
                            YAHOO.util.Dom.addClass(thisRow.cells[k], YAHOO.widget.DataTable.CLASS_SELECTED);
                        }
                    }
                }
            }
        }

        // Set classes
        this._setFirstRow();
        this._setLastRow();
        this._setRowStripes();

        this.fireEvent("refreshEvent");
        YAHOO.log("DataTable showing " + aRecords.length + " of " + this._oRecordSet.getLength() + " rows", "info", this.toString());
    }
    // Empty
    else {
        // Remove all rows
        while(elTbody.hasChildNodes()) {
            elTbody.deleteRow(-1);
        }

        this.showTableMessage(YAHOO.widget.DataTable.MSG_EMPTY, YAHOO.widget.DataTable.CLASS_EMPTY);
    }
};

/**
 * Nulls out the entire DataTable instance and related objects, removes attached
 * event listeners, and clears out DOM elements inside the container. After
 * calling this method, the instance reference should be expliclitly nulled by
 * implementer, as in myDataTable = null. Use with caution!
 *
 * @method destroy
 */
YAHOO.widget.DataTable.prototype.destroy = function() {
    // Destroy Cell Editor
    YAHOO.util.Event.purgeElement(this._oCellEditor.container, true);
    document.body.removeChild(this._oCellEditor.container);
    
    var instanceName = this.toString();
    var elContainer = this._elContainer;

    // Unhook custom events
    this._oRecordSet.unsubscribeAll();
    this.unsubscribeAll();

    // Unhook DOM events
    YAHOO.util.Event.purgeElement(elContainer, true);

    // Remove DOM elements
    elContainer.innerHTML = "";

    // Null out objects
    for(var param in this) {
        if(this.hasOwnProperty(param)) {
            this[param] = null;
        }
    }

    YAHOO.log("DataTable instance destroyed: " + instanceName);
};

/**
 * Displays message within secondary TBODY.
 *
 * @method showTableMessage
 * @param sHTML {String} (optional) Value for innerHTML.
 * @param sClassName {String} (optional) Classname.
 */
YAHOO.widget.DataTable.prototype.showTableMessage = function(sHTML, sClassName) {
    var elCell = this._elMsgTd;
    if(YAHOO.lang.isString(sHTML)) {
        elCell.innerHTML = sHTML;
    }
    if(YAHOO.lang.isString(sClassName)) {
        YAHOO.util.Dom.addClass(elCell, sClassName);
    }
    this._elMsgTbody.style.display = "";
    this.fireEvent("tableMsgShowEvent", {html:sHTML, className:sClassName});
    YAHOO.log("DataTable showing message: " + sHTML, "info", this.toString());
};

/**
 * Hides secondary TBODY.
 *
 * @method hideTableMessage
 */
YAHOO.widget.DataTable.prototype.hideTableMessage = function() {
    if(this._elMsgTbody.style.display != "none") {
        this._elMsgTbody.style.display = "none";
        this.fireEvent("tableMsgHideEvent");
        YAHOO.log("DataTable message hidden", "info", this.toString());
    }
};



































































// RECORDSET FUNCTIONS

/**
 * Returns Record index for given TR element or page row index.
 *
 * @method getRecordIndex
 * @param row {YAHOO.widget.Record | HTMLElement | Number} Record instance, TR
 * element reference or page row index.
 * @return {Number} Record's RecordSet index, or null.
 */
YAHOO.widget.DataTable.prototype.getRecordIndex = function(row) {
    var nTrIndex;

    if(!YAHOO.lang.isNumber(row)) {
        // By Record
        if(row instanceof YAHOO.widget.Record) {
            return this._oRecordSet.getRecordIndex(row);
        }
        // By element reference
        else {
            // Find the TR element
            var el = this.getTrEl(row);
            if(el) {
                nTrIndex = el.sectionRowIndex;
            }
        }
    }
    // By page row index
    else {
        nTrIndex = row;
    }

    if(YAHOO.lang.isNumber(nTrIndex)) {
        if(this.get("paginated")) {
            return this.get("paginator").startRecordIndex + nTrIndex;
        }
        else {
            return nTrIndex;
        }
    }

    YAHOO.log("Could not get Record index for row " + row, "warn", this.toString());
    return null;
};

/**
 * For the given identifier, returns the associated Record instance.
 *
 * @method getRecord
 * @param row {HTMLElement | String | Number} RecordSet position index, DOM
 * reference or ID string to an element within the DataTable page.
 * @return {YAHOO.widget.Record} Record instance.
 */
YAHOO.widget.DataTable.prototype.getRecord = function(row) {
    var nRecordIndex = row;
    
    // By element reference or ID string
    if(!YAHOO.lang.isNumber(nRecordIndex)) {
        // Validate TR element
        var elRow = this.getTrEl(row);
        if(elRow) {
            nRecordIndex = this.getRecordIndex(row);
        }
    }
    // By Record index
    if(YAHOO.lang.isNumber(nRecordIndex)) {
        return this._oRecordSet.getRecord(nRecordIndex);
    }
    
    YAHOO.log("Could not get Record for row at " + row, "warn", this.toString());
    return null;
};














































// COLUMN FUNCTIONS

/**
 * For the given identifier, returns the associated Column instance.
 *
 * @method getColumn
 * @param row {HTMLElement | String | Number} ColumnSet.keys position index, DOM
 * reference or ID string to an element within the DataTable page.
 * @return {YAHOO.widget.Column} Column instance.
 */
 YAHOO.widget.DataTable.prototype.getColumn = function(column) {
    var nColumnIndex = column;

    // By element reference or ID string
    if(!YAHOO.lang.isNumber(nColumnIndex)) {
        // Validate TD element
        var elCell = this.getTdEl(column);
        if(elCell) {
            nColumnIndex = elCell.yuiColumnId;
        }
        // Validate TH element
        else {
            elCell = this.getThEl(column);
            if(elCell) {
                nColumnIndex = elCell.yuiColumnId;
            }
        }
    }
    
    // By Record index
    if(YAHOO.lang.isNumber(nColumnIndex)) {
        return this._oColumnSet.getColumn(nColumnIndex);
    }

    YAHOO.log("Could not get Column for column at " + column, "warn", this.toString());
    return null;
 };

/**
 * Sorts given Column.
 *
 * @method sortColumn
 * @param oColumn {YAHOO.widget.Column} Column instance.
 */
YAHOO.widget.DataTable.prototype.sortColumn = function(oColumn) {
    if(!oColumn) {
        return;
    }
    if(!oColumn instanceof YAHOO.widget.Column) {
        //TODO: accept the TH or TH.key
        //TODO: Get the column based on TH.yuiColumnId
        return;
    }
    if(oColumn.sortable) {
        // What is the default sort direction?
        var sortDir = (oColumn.sortOptions && oColumn.sortOptions.defaultOrder) ? oColumn.sortOptions.defaultOrder : "asc";

        // Already sorted?
        var oSortedBy = this.get("sortedBy");
        if(oSortedBy && (oSortedBy.key === oColumn.key)) {
            if(oSortedBy.dir) {
                sortDir = (oSortedBy.dir == "asc") ? "desc" : "asc";
            }
            else {
                sortDir = (sortDir == "asc") ? "desc" : "asc";
            }
        }

        // Is there a custom sort handler function defined?
        var sortFnc = (oColumn.sortOptions && YAHOO.lang.isFunction(oColumn.sortOptions.sortFunction)) ?
                oColumn.sortOptions.sortFunction : function(a, b, desc) {
                    var sorted = YAHOO.util.Sort.compare(a.getData(oColumn.key),b.getData(oColumn.key), desc);
                    if(sorted === 0) {
                        return YAHOO.util.Sort.compare(a.getId(),b.getId(), desc);
                    }
                    else {
                        return sorted;
                    }
        };

        // Do the actual sort
        var desc = (sortDir == "desc") ? true : false;
        this._oRecordSet.sortRecords(sortFnc, desc);

        // Update sortedBy tracker
        this.set("sortedBy", {key:oColumn.key, dir:sortDir, column:oColumn});

        // Update the UI
        this.refreshView();

        this.fireEvent("columnSortEvent",{column:oColumn,dir:sortDir});
        YAHOO.log("Column \"" + oColumn.key + "\" sorted \"" + sortDir + "\"", "info", this.toString());
    }
    else {
        //TODO
        YAHOO.log("Column is not sortable", "info", this.toString());
    }
};













































// ROW FUNCTIONS


/**
 * Adds one new Record of data into the RecordSet at the index if given,
 * otherwise at the end. If the new Record is in page view, the
 * corresponding DOM elements are also updated.
 *
 * @method addRow
 * @param oData {Object} Object literal of data for the row.
 * @param index {Number} (optional) RecordSet position index at which to add data.
 */
YAHOO.widget.DataTable.prototype.addRow = function(oData, index) {
    if(oData && (oData.constructor == Object)) {
        var oRecord = this._oRecordSet.addRecord(oData, index);
        if(oRecord) {
            var nTrIndex = this.getTrIndex(oRecord);

            // Row is in view
            if(YAHOO.lang.isNumber(nTrIndex)) {
                // Paginated so just refresh the view to keep pagination state
                if(this.get("paginated")) {
                    this.refreshView();
                }
                // Add the TR element
                else {
                    var newTrId = this._addTrEl(oRecord, nTrIndex);
                    if(newTrId) {
                        // Is this an insert or an append?
                        var append = (YAHOO.lang.isNumber(nTrIndex) && (nTrIndex > -1)
                                && (nTrIndex < this._elTbody.rows.length)) ? false : true;

                        // Stripe the one new row
                        if(append) {
                            if((this._elTbody.rows.length-1)%2) {
                                YAHOO.util.Dom.addClass(newTrId, YAHOO.widget.DataTable.CLASS_ODD);
                            }
                            else {
                                YAHOO.util.Dom.addClass(newTrId, YAHOO.widget.DataTable.CLASS_EVEN);
                            }
                        }
                        // Restripe all the rows after the new one
                        else {
                            this._setRowStripes(nTrIndex);
                        }

                        // If new row is at the bottom
                        if(append) {
                            this._setLastRow();
                        }
                        // If new row is at the top
                        else if(YAHOO.lang.isNumber(index) && (nTrIndex === 0)) {
                            this._setFirstRow();
                        }
                    }
                }
            }
            // Record is not in view so just update pagination UI
            else {
                this.updatePaginator();
            }

            // TODO: what args to pass?
            this.fireEvent("rowAddEvent", {newData:oData, trElId:newTrId});

            // For log message
            nTrIndex = (YAHOO.lang.isValue(nTrIndex))? nTrIndex : "n/a";

            YAHOO.log("Added row: Record ID = " + oRecord.getId() +
                    ", Record index = " + this.getRecordIndex(oRecord) +
                    ", page row index = " + nTrIndex, "info", this.toString());
            return;
        }
    }
    YAHOO.log("Could not add row with " + YAHOO.lang.dump(oData), "error", this.toString());
};

/**
 * Convenience method to add multiple rows.
 *
 * @method addRows
 * @param aData {Object[]} Array of object literal data for the rows.
 * @param index {Number} (optional) RecordSet position index at which to add data.
 */
YAHOO.widget.DataTable.prototype.addRows = function(aData, index) {
    if(YAHOO.lang.isArray(aData)) {
        var i;
        if(YAHOO.lang.isNumber(index)) {
            for(i=aData.length-1; i>-1; i--) {
                this.addRow(aData[i], index);
            }
        }
        else {
            for(i=0; i<aData.length; i++) {
                this.addRow(aData[i]);
            }
        }
    }
    else {
        YAHOO.log("Could not add rows " + YAHOO.lang.dump(aData));
    }
};

/**
 * For the given row, updates the associated Record with the given data. If the
 * row is in view, the corresponding DOM elements are also updated.
 *
 * @method updateRow
 * @param row {YAHOO.widget.Record | Number | HTMLElement | String}
 * Which row to update: By Record instance, by Record's RecordSet
 * position index, by HTMLElement reference to the TR element, or by ID string
 * of the TR element.
 * @param oData {Object} Object literal of data for the row.
 */
YAHOO.widget.DataTable.prototype.updateRow = function(row, oData) {
    var oldRecord, updatedRecord, elRow;

    // Get the Record directly
    if((row instanceof YAHOO.widget.Record) || (YAHOO.lang.isNumber(row))) {
            // Get the Record directly
            oldRecord = this._oRecordSet.getRecord(row);
            
            // Is this row in view?
            elRow = this.getTrEl(oldRecord);
    }
    // Get the Record by TR element
    else {
        elRow = this.getTrEl(row);
        if(elRow) {
            oldRecord = this._oRecordSet.getRecord(this.getRecordIndex(elRow));
        }
    }

    // Update the Record
    if(oldRecord) {
        // Copy data from the Record for the event that gets fired later
        var oRecordData = oldRecord.getData();
        var oldData = {};
        for(var param in oRecordData) {
            oldData[param] = oRecordData[param];
        }

        updatedRecord = this._oRecordSet.updateRecord(oldRecord, oData);
    }
    else {
        YAHOO.log("Could not update row " + row + " with the data : " +
                YAHOO.lang.dump(oData), "error", this.toString());
        return;

    }
    
    // Update the TR only if row is in view
    if(elRow) {
        this._updateTrEl(elRow, updatedRecord);
    }

    //TODO: Event passes TR ID old data, new data.
    this.fireEvent("rowUpdateEvent", {newData:oData, oldData:oldData, trElId:elRow.id});
    YAHOO.log("DataTable row updated: Record ID = " + updatedRecord.getId() +
            ", Record index = " + this.getRecordIndex(updatedRecord) +
            ", page row index = " + this.getTrIndex(updatedRecord), "info", this.toString());
};

/**
 * Deletes the given row's Record from the RecordSet. If the row is in view, the
 * corresponding DOM elements are also deleted.
 *
 * @method deleteRow
 * @param row {HTMLElement | String | Number} DOM element reference or ID string
 * to DataTable page element or RecordSet index.
 */
YAHOO.widget.DataTable.prototype.deleteRow = function(row) {
    // Get the Record index...
    var nRecordIndex = null;
    // ...by Record index
    if(YAHOO.lang.isNumber(row)) {
        nRecordIndex = row;
    }
    // ...by element reference
    else {
        var elRow = YAHOO.util.Dom.get(row);
        elRow = this.getTrEl(elRow);
        if(elRow) {
            nRecordIndex = this.getRecordIndex(elRow);
        }
    }
    if(nRecordIndex !== null) {
        var oRecord = this._oRecordSet.getRecord(nRecordIndex);
        if(oRecord) {
            var nRecordId = oRecord.getId();
            
            // Remove from selection tracker if there
            var tracker = this._aSelections || [];
            for(var j=0; j<tracker.length; j++) {
                if((YAHOO.lang.isNumber(tracker[j]) && (tracker[j] === nRecordId)) ||
                        ((tracker[j].constructor == Object) && (tracker[j].recordId === nRecordId))) {
                    tracker.splice(j,1);
                }
            }

            // Copy data from the Record for the event that gets fired later
            var oRecordData = oRecord.getData();
            var oData = {};
            for(var param in oRecordData) {
                oData[param] = oRecordData[param];
            }

            // Delete Record from RecordSet
            this._oRecordSet.deleteRecord(nRecordIndex);

            // If row is in view, delete the TR element
            var nTrIndex = this.getTrIndex(nRecordIndex);
            if(YAHOO.lang.isNumber(nTrIndex)) {
                var isLast = (nTrIndex == this.getLastTrEl().sectionRowIndex) ?
                        true : false;
                this._deleteTrEl(nTrIndex);

                // Empty body
                if(this._elTbody.rows.length === 0) {
                    this.showTableMessage(YAHOO.widget.DataTable.MSG_EMPTY, YAHOO.widget.DataTable.CLASS_EMPTY);
                }
                // Update UI
                else {
                    // Set first-row and last-row trackers
                    if(nTrIndex === 0) {
                        this._setFirstRow();
                    }
                    if(isLast) {
                        this._setLastRow();
                    }
                    // Restripe the rows
                    if(nTrIndex != this._elTbody.rows.length) {
                        this._setRowStripes(nTrIndex);
                    }
                }
            }

            this.fireEvent("rowDeleteEvent", {recordIndex:nRecordIndex,
                    oldData:oData, trElIndex:nTrIndex});
            YAHOO.log("DataTable row deleted: Record ID = " + nRecordId +
                    ", Record index = " + nRecordIndex +
                    ", page row index = " + nTrIndex, "info", this.toString());
        }
    }
    else {
        YAHOO.log("Could not delete row: " + row, "warn", this.toString());
    }
};

/**
 * Convenience method to delete multiple rows.
 *
 * @method deleteRows
 * @param row {HTMLElement | String | Number} DOM element reference or ID string
 * to DataTable page element or RecordSet index.
 * @param count {Number} (optional) How many rows to delete. A negative value
 * will delete towards the beginning.
 */
YAHOO.widget.DataTable.prototype.deleteRows = function(row, count) {
    // Get the Record index...
    var nRecordIndex = null;
    // ...by Record index
    if(YAHOO.lang.isNumber(row)) {
        nRecordIndex = row;
    }
    // ...by element reference
    else {
        var elRow = YAHOO.util.Dom.get(row);
        elRow = this.getTrEl(elRow);
        if(elRow) {
            nRecordIndex = this.getRecordIndex(elRow);
        }
    }
    if(nRecordIndex !== null) {
        if(count && YAHOO.lang.isNumber(count)) {
            // Start with highest index and work down
            var startIndex = (count > 0) ? nRecordIndex + count -1 : nRecordIndex;
            var endIndex = (count > 0) ? nRecordIndex : nRecordIndex + count + 1;
            for(var i=startIndex; i>endIndex-1; i--) {
                this.deleteRow(i);
            }
        }
        else {
            this.deleteRow(nRecordIndex);
        }
    }
    else {
        YAHOO.log("Could not delete row " + row, "info", this.toString());
    }
};














































// CELL FUNCTIONS

/**
 * Outputs markup into the given TD based on given Record.
 *
 * @method formatCell
 * @param elCell {HTMLElement} TD Element.
 * @param oRecord {YAHOO.widget.Record} (Optional) Record instance.
 * @param oColumn {YAHOO.widget.Column} (Optional) Column instance.
 * @return {HTML} Markup.
 */
YAHOO.widget.DataTable.prototype.formatCell = function(elCell, oRecord, oColumn) {
    if(!(oRecord instanceof YAHOO.widget.Record)) {
        oRecord = this.getRecord(elCell);
    }
    if(!(oColumn instanceof YAHOO.widget.Column)) {
        oColumn = this._oColumnSet.getColumn(elCell.yuiColumnId);
    }
    
    if(oRecord && oColumn) {
        var oData = oRecord.getData(oColumn.key);

        // Backward compatibility
        if(oColumn.type && !oColumn.formatter) {
            YAHOO.log("The Column property type has been" +
            " deprecated in favor of formatter", "warn", oColumn.toString());
            oColumn.formatter = oColumn.type;
        }
        
        var fnFormatter;
        if(YAHOO.lang.isString(oColumn.formatter)) {
            switch(oColumn.formatter) {
                case "button":
                    fnFormatter = YAHOO.widget.DataTable.formatButton;
                    break;
                case "checkbox":
                    fnFormatter = YAHOO.widget.DataTable.formatCheckbox;
                    break;
                case "currency":
                    fnFormatter = YAHOO.widget.DataTable.formatCurrency;
                    break;
                case "date":
                    fnFormatter = YAHOO.widget.DataTable.formatDate;
                    break;
                case "dropdown":
                    fnFormatter = YAHOO.widget.DataTable.formatDropdown;
                    break;
                case "email":
                    fnFormatter = YAHOO.widget.DataTable.formatEmail;
                    break;
                case "link":
                    fnFormatter = YAHOO.widget.DataTable.formatLink;
                    break;
                case "number":
                    fnFormatter = YAHOO.widget.DataTable.formatNumber;
                    break;
                case "radio":
                    fnFormatter = YAHOO.widget.DataTable.formatRadio;
                    break;
                case "text":
                    fnFormatter = YAHOO.widget.DataTable.formatText;
                    break;
                case "textarea":
                    fnFormatter = YAHOO.widget.DataTable.formatTextarea;
                    break;
                case "textbox":
                    fnFormatter = YAHOO.widget.DataTable.formatTextbox;
                    break;
                case "html":
                    // This is the default
                    break;
                default:
                    YAHOO.log("Could not find formatter function \"" +
                            oColumn.formatter + "\"", "warn", this.toString());
                    fnFormatter = null;
            }
        }
        else if(YAHOO.lang.isFunction(oColumn.formatter)) {
            fnFormatter = oColumn.formatter;
        }

        // Apply special formatter
        if(fnFormatter) {
            fnFormatter(elCell, oRecord, oColumn, oData);
        }
        else {
            elCell.innerHTML = (YAHOO.lang.isValue(oData)) ? oData.toString() : "";
        }

        // Add custom classNames
        var aCustomClasses = null;
        if(YAHOO.lang.isString(oColumn.className)) {
            aCustomClasses = [oColumn.className];
        }
        else if(YAHOO.lang.isArray(oColumn.className)) {
            aCustomClasses = oColumn.className;
        }
        if(aCustomClasses) {
            for(var i=0; i<aCustomClasses.length; i++) {
                YAHOO.util.Dom.addClass(elCell, aCustomClasses[i]);
            }
        }
        
        YAHOO.util.Dom.addClass(elCell, "yui-dt-col-"+oColumn.key);

        // Is editable?
        if(oColumn.editor) {
            YAHOO.util.Dom.addClass(elCell,YAHOO.widget.DataTable.CLASS_EDITABLE);
        }
        
        this.fireEvent("cellFormatEvent", {record:oRecord, key:oColumn.key, el:elCell});
    }
    else {
        YAHOO.log("Could not format cell " + elCell, "error", this.toString());
    }
};


/**
 * Formats a BUTTON element.
 *
 * @method DataTable.formatButton
 * @param elCell {HTMLElement} Table cell element.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oData {Object | Boolean} Data value for the cell. By default, the value
 * is what gets written to the BUTTON.
 * @static
 */
YAHOO.widget.DataTable.formatButton= function(elCell, oRecord, oColumn, oData) {
    var sValue = YAHOO.lang.isValue(oData) ? oData : "Click";
    //TODO: support YAHOO.widget.Button
    //if(YAHOO.widget.Button) {
    
    //}
    //else {
        elCell.innerHTML = "<button type=\"button\" class=\""+
                YAHOO.widget.DataTable.CLASS_BUTTON + "\">" + sValue + "</button>";
    //}
};

/**
 * Formats a CHECKBOX element.
 *
 * @method DataTable.formatCheckbox
 * @param elCell {HTMLElement} Table cell element.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oData {Object | Boolean} Data value for the cell. Can be a simple
 * Boolean to indicate whether checkbox is checked or not. Can be object literal
 * {checked:bBoolean, label:sLabel}. Other forms of oData require a custom
 * formatter.
 * @static
 */
YAHOO.widget.DataTable.formatCheckbox = function(elCell, oRecord, oColumn, oData) {
    var bChecked = oData;
    bChecked = (bChecked) ? " checked" : "";
    elCell.innerHTML = "<input type=\"checkbox\"" + bChecked +
            " class=\"" + YAHOO.widget.DataTable.CLASS_CHECKBOX + "\">";
};

/**
 * Formats currency. Default unit is USD.
 *
 * @method DataTable.formatCurrency
 * @param elCell {HTMLElement} Table cell element.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oData {Number} Data value for the cell.
 * @static
 */
YAHOO.widget.DataTable.formatCurrency = function(elCell, oRecord, oColumn, oData) {
    if(YAHOO.lang.isNumber(oData)) {
        var nAmount = oData;
        var markup;

        // Round to the penny
        nAmount = Math.round(nAmount*100)/100;

        // Default currency is USD
        markup = "$"+nAmount;

        // Normalize digits
        var dotIndex = markup.indexOf(".");
        if(dotIndex < 0) {
            markup += ".00";
        }
        else {
            while(dotIndex > markup.length-3) {
                markup += "0";
            }
        }
        elCell.innerHTML = markup;
    }
    else {
        elCell.innerHTML = YAHOO.lang.isValue(oData) ? oData : "";
    }
};

/**
 * Formats JavaScript Dates.
 *
 * @method DataTable.formatDate
 * @param elCell {HTMLElement} Table cell element.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oData {Object} Data value for the cell, or null.
 * @static
 */
YAHOO.widget.DataTable.formatDate = function(elCell, oRecord, oColumn, oData) {
    var oDate = oData;
    if(oDate instanceof Date) {
        elCell.innerHTML = (oDate.getMonth()+1) + "/" + oDate.getDate()  + "/" + oDate.getFullYear();
    }
    else {
        elCell.innerHTML = YAHOO.lang.isValue(oData) ? oData : "";
    }
};

/**
 * Formats SELECT elements.
 *
 * @method DataTable.formatDropdown
 * @param el {HTMLElement} The element to format.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oData {Object} Data value for the cell, or null.
 * @static
 */
YAHOO.widget.DataTable.formatDropdown = function(el, oRecord, oColumn, oData) {
    var selectedValue = (YAHOO.lang.isValue(oData)) ? oData : oRecord.getData(oColumn.key);
    var options = (YAHOO.lang.isArray(oColumn.dropdownOptions)) ?
            oColumn.dropdownOptions : null;

    var selectEl;
    var collection = el.getElementsByTagName("select");
    
    // Create the form element only once, so we can attach the onChange listener
    if(collection.length === 0) {
        // Create SELECT element
        selectEl = document.createElement("select");
        YAHOO.util.Dom.addClass(selectEl, YAHOO.widget.DataTable.CLASS_DROPDOWN);
        selectEl = el.appendChild(selectEl);

        // Add event listener
        //TODO: static method doesn't have access to the datatable instance...
        YAHOO.util.Event.addListener(selectEl,"change",oDataTable._onDropdownChange,oDataTable);
    }

    selectEl = collection[0];

    // Update the form element
    if(selectEl) {
        // Clear out previous options
        selectEl.innerHTML = "";
        
        // We have options to populate
        if(options) {
            // Create OPTION elements
            for(var i=0; i<options.length; i++) {
                var option = options[i];
                var optionEl = document.createElement("option");
                optionEl.value = (YAHOO.lang.isValue(option.value)) ?
                        option.value : option;
                optionEl.innerHTML = (YAHOO.lang.isValue(option.text)) ?
                        option.text : option;
                optionEl = selectEl.appendChild(optionEl);
            }
        }
        // Selected value is our only option
        else {
            selectEl.innerHTML = "<option value=\"" + selectedValue + "\">" + selectedValue + "</option>";
        }
    }
    else {
        el.innerHTML = YAHOO.lang.isValue(oData) ? oData : "";
    }
};

/**
 * Formats emails.
 *
 * @method DataTable.formatEmail
 * @param elCell {HTMLElement} Table cell element.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oData {Object} Data value for the cell, or null
 * @static
 */
YAHOO.widget.DataTable.formatEmail = function(elCell, oRecord, oColumn, oData) {
    if(YAHOO.lang.isString(oData)) {
        elCell.innerHTML = "<a href=\"mailto:" + oData + "\">" + oData + "</a>";
    }
    else {
        elCell.innerHTML = YAHOO.lang.isValue(oData) ? oData : "";
    }
};

/**
 * Formats links.
 *
 * @method DataTable.formatLink
 * @param elCell {HTMLElement} Table cell element.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oData {Object} Data value for the cell, or null
 * @static
 */
YAHOO.widget.DataTable.formatLink = function(elCell, oRecord, oColumn, oData) {
    if(YAHOO.lang.isString(oData)) {
        elCell.innerHTML = "<a href=\"" + oData + "\">" + oData + "</a>";
    }
    else {
        elCell.innerHTML = YAHOO.lang.isValue(oData) ? oData : "";
    }
};

/**
 * Formats numbers.
 *
 * @method DataTable.formatNumber
 * @param elCell {HTMLElement} Table cell element.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oData {Object} Data value for the cell, or null
 * @static
 */
YAHOO.widget.DataTable.formatNumber = function(elCell, oRecord, oColumn, oData) {
    if(YAHOO.lang.isNumber(oData)) {
        elCell.innerHTML = oData;
    }
    else {
        elCell.innerHTML = YAHOO.lang.isValue(oData) ? oData : "";
    }
};

YAHOO.widget.DataTable.formatRadio = function(elCell, oRecord, oColumn, oData) {
    var bChecked = oData;
    bChecked = (bChecked) ? " checked" : "";
    elCell.innerHTML = "<input type=\"radio\"" + bChecked +
            " name=\"" + oColumn.getId() + "-radio\"" +
            " class=\"" + YAHOO.widget.DataTable.CLASS_CHECKBOX + "\">";
};

/**
 * Formats text strings.
 *
 * @method DataTable.formatText
 * @param elContainer {HTMLElement} Container element.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oData {Object} (Optional) Data value for the cell.
 * @static
 */
YAHOO.widget.DataTable.formatText = function(elContainer, oRecord, oColumn, oData) {
    var value = (YAHOO.lang.isValue(oRecord.getData(oColumn.key))) ?
            oRecord.getData(oColumn.key) : "";
    //TODO: move to util function
    elContainer.innerHTML = value.toString().replace(/&/g, "&#38;").replace(/</g, "&#60;").replace(/>/g, "&#62;");
};

/**
 * Formats TEXTAREA elements.
 *
 * @method DataTable.formatTextarea
 * @param elContainer {HTMLElement} Container element.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oData {Object} (Optional) Data value for the cell.
 * @static
 */
YAHOO.widget.DataTable.formatTextarea = function(elContainer, oRecord, oColumn, oData) {
    var value = (YAHOO.lang.isValue(oRecord.getData(oColumn.key))) ?
            oRecord.getData(oColumn.key) : "";
    var markup = "<textarea>" + value + "</textarea>";
    elContainer.innerHTML = markup;
};

/**
 * Formats INPUT TYPE=TEXT elements.
 *
 * @method DataTable.formatTextbox
 * @param elContainer {HTMLElement} Container element.
 * @param oRecord {YAHOO.widget.Record} Record instance.
 * @param oColumn {YAHOO.widget.Column} Column instance.
 * @param oData {Object} (Optional) Data value for the cell.
 * @static
 */
YAHOO.widget.DataTable.formatTextbox = function(elContainer, oRecord, oColumn, oData) {
    var value = (YAHOO.lang.isValue(oRecord.getData(oColumn.key))) ?
            oRecord.getData(oColumn.key) : "";
    var markup = "<input type=\"text\" value=\"" + value + "\">";
    elContainer.innerHTML = markup;
};
















































// PAGINATION

/**
 * Updates Paginator values in response to RecordSet changes and/or DOM events.
 * Pass in all, a subset, or no values.
 *
 * @method updatePaginator
 * @param oNewValues {Object} (Optional) Object literal of Paginator values, or
 * a subset of Paginator values.
 * @param {Object} Object literal of all Paginator values.
 */

YAHOO.widget.DataTable.prototype.updatePaginator = function(oNewValues) {
    // Complete the set
    var oValidPaginator = this.get("paginator");
    for(var param in oNewValues) {
        if(oValidPaginator.hasOwnProperty(param)) {
            oValidPaginator[param] = oNewValues[param];
        }
    }
    
    oValidPaginator.totalRecords = this._oRecordSet.getLength();
    oValidPaginator.rowsThisPage = Math.min(oValidPaginator.rowsPerPage, oValidPaginator.totalRecords);
    oValidPaginator.totalPages = Math.ceil(oValidPaginator.totalRecords / oValidPaginator.rowsThisPage);

    this.set("paginator", oValidPaginator);
    return this.get("paginator");
};

/**
 * Displays given page of a paginated DataTable.
 *
 * @method showPage
 * @param nPage {Number} Which page.
 */
YAHOO.widget.DataTable.prototype.showPage = function(nPage) {
    // Validate input
    if(!YAHOO.lang.isNumber(nPage) || (nPage < 1) || (nPage > this.get("paginator").totalPages)) {
        nPage = 1;
    }
    this.updatePaginator({currentPage:nPage});
    this.refreshView();
};

/**
 * Updates Paginator containers with markup. Override this method to customize pagination UI.
 *
 * @method formatPaginators
 */
 YAHOO.widget.DataTable.prototype.formatPaginators = function() {
    var pag = this.get("paginator");

    // For Opera workaround
    var dropdownEnabled = false;

    // Links are enabled
    if(pag.pageLinks > -1) {
        for(var i=0; i<pag.links.length; i++) {
            this.formatPaginatorLinks(pag.links[i], pag.currentPage, pag.pageLinksStart, pag.pageLinks, pag.totalPages);
        }
    }

    // Dropdown is enabled
    if(pag.dropdownOptions) {
        dropdownEnabled = true;
        for(i=0; i<pag.dropdowns.length; i++) {
            this.formatPaginatorDropdown(pag.dropdowns[i]);
        }
    }

    // For Opera artifacting in dropdowns
    if(dropdownEnabled && navigator.userAgent.toLowerCase().indexOf("opera") != -1) {
        document.body.style += '';
    }
    YAHOO.log("Paginators formatted", "info", this.toString());
};

/**
 * Updates Paginator dropdown. If dropdown doesn't exist, the markup is created.
 * Sets dropdown elements's "selected" value.
 *
 * @method formatPaginatorDropdown
 * @param elDropdown {HTMLElement} The SELECT element.
 */
YAHOO.widget.DataTable.prototype.formatPaginatorDropdown = function(elDropdown) {
    if(elDropdown && (elDropdown.ownerDocument == document) && elDropdown.options) {
        var options = elDropdown.options;
        // Update dropdown's "selected" value
        if(options.length) {
            for(var i=options.length-1; i>-1; i--) {
                if((this.get("paginator").rowsPerPage + "") === options[i].value) {
                    options[i].selected = true;
                }
            }
            return;
        }
    }
    YAHOO.log("Could not update Paginator dropdown " + elDropdown, "error", this.toString());
};

/**
 * Updates Paginator links container with markup.
 *
 * @method formatPaginatorLinks
 * @param elContainer {HTMLElement} The link container element.
 * @param nCurrentPage {Number} Current page.
 * @param nPageLinksStart {Number} First page link to display.
 * @param nPageLinksLength {Number} How many page links to display.
 * @param nTotalPages {Number} Total number of pages.
 */
YAHOO.widget.DataTable.prototype.formatPaginatorLinks = function(elContainer, nCurrentPage, nPageLinksStart, nPageLinksLength, nTotalPages) {
    if(elContainer && (elContainer.ownerDocument == document) &&
            YAHOO.lang.isNumber(nCurrentPage) && YAHOO.lang.isNumber(nPageLinksStart) &&
            YAHOO.lang.isNumber(nTotalPages)) {
        // Markup for page links
        var isFirstPage = (nCurrentPage == 1) ? true : false;
        var isLastPage = (nCurrentPage == nTotalPages) ? true : false;
        var firstPageLink = (isFirstPage) ?
                " <span class=\"" + YAHOO.widget.DataTable.CLASS_DISABLED + "\">&lt;&lt;</span> " :
                " <a href=\"#\" class=\"" + YAHOO.widget.DataTable.CLASS_FIRST + "\">&lt;&lt;</a> ";
        var prevPageLink = (isFirstPage) ?
                " <span class=\"" + YAHOO.widget.DataTable.CLASS_DISABLED + "\">&lt;</span> " :
                " <a href=\"#\" class=\"" + YAHOO.widget.DataTable.CLASS_PREVIOUS + "\">&lt;</a> " ;
        var nextPageLink = (isLastPage) ?
                " <span class=\"" + YAHOO.widget.DataTable.CLASS_DISABLED + "\">&gt;</span> " :
                " <a href=\"#\" class=\"" + YAHOO.widget.DataTable.CLASS_NEXT + "\">&gt;</a> " ;
        var lastPageLink = (isLastPage) ?
                " <span class=\"" + YAHOO.widget.DataTable.CLASS_DISABLED + "\">&gt;&gt;</span> " :
                " <a href=\"#\" class=\"" + YAHOO.widget.DataTable.CLASS_LAST + "\">&gt;&gt;</a> ";
        var markup = firstPageLink + prevPageLink;
        var maxLinks = (nPageLinksStart+nPageLinksLength < nTotalPages) ?
            nPageLinksStart+nPageLinksLength-1 : nTotalPages;
        // Special case for pageLinksLength 0 => show all links
        if(nPageLinksLength === 0) {
            maxLinks = nTotalPages;
        }
        for(var i=nPageLinksStart; i<=maxLinks; i++) {
             if(i != nCurrentPage) {
                markup += " <a href=\"#\" class=\"" + YAHOO.widget.DataTable.CLASS_PAGE + "\">" + i + "</a> ";
            }
            else {
                markup += " <span class=\"" + YAHOO.widget.DataTable.CLASS_SELECTED + "\">" + i + "</span>";
            }
        }
        markup += nextPageLink + lastPageLink;
        elContainer.innerHTML = markup;
        return;
    }
    YAHOO.log("Could not format Paginator links", "error", this.toString());
};

















































// SELECTION/HIGHLIGHTING

/**
 * Array of selections: {recordId:nRecordId, cellIndex:nCellIndex}
 *
 * @property _aSelections
 * @type Object[]
 * @private
 */
YAHOO.widget.DataTable.prototype._aSelections = null;

/**
 * ID string of last selected element
 *
 * @property _sLastSelectedId
 * @type String
 * @private
 */
YAHOO.widget.DataTable.prototype._sLastSelectedId = null;

/**
 * ID string of the selection anchor element.
 *
 * @property _sSelectionAnchorId
 * @type String
 * @private
 */
YAHOO.widget.DataTable.prototype._sSelectionAnchorId = null;

/**
 * Convenience method to remove the class YAHOO.widget.DataTable.CLASS_SELECTED
 * from all TR elements on the page.
 *
 * @method _unselectAllTrEls
 * @private
 */
YAHOO.widget.DataTable.prototype._unselectAllTrEls = function() {
    var selectedRows = YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_SELECTED,"tr",this._elTbody);
    YAHOO.util.Dom.removeClass(selectedRows, YAHOO.widget.DataTable.CLASS_SELECTED);
};

/**
 * Returns array of selected TR elements on the page.
 *
 * @method getSelectedTrEls
 * @return {HTMLElement[]} Array of selected TR elements.
 */
YAHOO.widget.DataTable.prototype.getSelectedTrEls = function() {
    return YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_SELECTED,"tr",this._elTbody);
};

/**
 * Sets given row to the selected state.
 *
 * @method selectRow
 * @param row {HTMLElement | String} HTML element reference or ID.
 */
YAHOO.widget.DataTable.prototype.selectRow = function(row) {
    // Validate the row
    var elRow = this.getTrEl(row);
    if(elRow) {
        var oRecord = this.getRecord(elRow);
        if(oRecord) {
            // Get Record ID
            var tracker = this._aSelections || [];
            var id = oRecord.getId();
            // Remove if already there

            // Use Array.indexOf if available...
            if(tracker.indexOf && (tracker.indexOf(id) >  -1)) {
                tracker.splice(tracker.indexOf(id),1);
            }
            // ...or do it the old-fashioned way
            else {
                for(var j=0; j<tracker.length; j++) {
                   if(tracker[j] === id){
                        tracker.splice(j,1);
                    }
                }
            }
            // Add to the end
            tracker.push(id);

            // Update trackers
            this._sLastSelectedId = elRow.id;
            if(!this._sSelectionAnchorId) {
                this._sSelectionAnchorId = elRow.id;
            }
            this._aSelections = tracker;
        
            // Update UI
            YAHOO.util.Dom.addClass(elRow, YAHOO.widget.DataTable.CLASS_SELECTED);
            this._focusEl(this._elTbody);

            this.fireEvent("rowSelectEvent", {record:oRecord, el:elRow});
            YAHOO.log("Selected " + elRow, "info", this.toString());

            return;
        }
    }
    YAHOO.log("Could not select " + row, "warn", this.toString());
};
// Backward compatibility
YAHOO.widget.DataTable.prototype.select = function(els) {
    YAHOO.log("The method select() has been deprecated" +
            " in favor of selectRow()", "warn", this.toString());
    if(!YAHOO.lang.isArray(els)) {
        els = [els];
    }
    for(var i=0; i<els.length; i++) {
        this.selectRow(els[i]);
    }
};

/**
 * Sets given row to the unselected state.
 *
 * @method unselectRow
 * @param row {HTMLElement | String} HTML TR element reference or ID.
 */
YAHOO.widget.DataTable.prototype.unselectRow = function(row) {
    // Validate the row
    var elRow = this.getTrEl(row);
    if(elRow) {
        var oRecord = this.getRecord(elRow);
        if(oRecord) {
            // Get Record ID
            var tracker = this._aSelections || [];
            var id = oRecord.getId();

            // Remove if there
            var bFound = false;
            
            // Use Array.indexOf if available...
            if(tracker.indexOf && (tracker.indexOf(id) >  -1)) {
                tracker.splice(tracker.indexOf(id),1);
                bFound = true;
            }
            // ...or do it the old-fashioned way
            else {
                for(var j=0; j<tracker.length; j++) {
                   if(tracker[j] === id){
                        tracker.splice(j,1);
                        bFound = true;
                    }
                }
            }

            if(bFound) {
                // Update tracker
                this._aSelections = tracker;

                // Update the UI
                YAHOO.util.Dom.removeClass(elRow, YAHOO.widget.DataTable.CLASS_SELECTED);

                this.fireEvent("rowUnselectEvent", {record:oRecord, el:elRow});
                YAHOO.log("Unselected " + elRow, "info", this.toString());

                return;
            }
        }
    }
    YAHOO.log("Could not unselect row " + row, "warn", this.toString());
};

/**
 * Clears out all row selections.
 *
 * @method unselectAllRows
 */
YAHOO.widget.DataTable.prototype.unselectAllRows = function() {
    // Remove from tracker
    var tracker = this._aSelections || [];
    for(var j=0; j<tracker.length; j++) {
       if(YAHOO.lang.isNumber(tracker[j])){
            tracker.splice(j,1);
        }
    }

    // Update tracker
    this._aSelections = tracker;

    // Update UI
    this._unselectAllTrEls();

    //TODO: send an array of [{el:el,record:record}]
    //TODO: or convert this to an unselectRows method
    //TODO: that takes an array of rows or unselects all if none given
    this.fireEvent("unselectAllRowsEvent");
    YAHOO.log("Unselected all rows", "info", this.toString());
};

/**
 * Convenience method to remove the class YAHOO.widget.DataTable.CLASS_SELECTED
 * from all TD elements in the internal tracker.
 *
 * @method _unselectAllTdEls
 * @private
 */
YAHOO.widget.DataTable.prototype._unselectAllTdEls = function() {
    var selectedCells = YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_SELECTED,"td",this._elTbody);
    YAHOO.util.Dom.removeClass(selectedCells, YAHOO.widget.DataTable.CLASS_SELECTED);
};

/**
 * Returns array of selected TD elements on the page.
 *
 * @method getSelectedTdEls
 * @return {HTMLElement[]} Array of selected TD elements.
 */
YAHOO.widget.DataTable.prototype.getSelectedTdEls = function() {
    return YAHOO.util.Dom.getElementsByClassName(YAHOO.widget.DataTable.CLASS_SELECTED,"td",this._elTbody);
};

/**
 * Sets given cell to the selected state.
 *
 * @method selectCell
 * @param cell {HTMLElement | String} DOM element reference or ID string
 * to DataTable page element or RecordSet index.
 */
YAHOO.widget.DataTable.prototype.selectCell = function(cell) {
    var elCell = this.getTdEl(cell);
    
    if(elCell) {
        var oRecord = this.getRecord(elCell);
        var nColumnId = elCell.yuiColumnId;

        if(oRecord && YAHOO.lang.isNumber(nColumnId)) {
            // Get Record ID
            var tracker = this._aSelections || [];
            var id = oRecord.getId();

            // Remove if there
            for(var j=0; j<tracker.length; j++) {
               if((tracker[j].recordId === id) && (tracker[j].columnId === nColumnId)){
                    tracker.splice(j,1);
                }
            }

            // Add to the end
            tracker.push({recordId:id, columnId:nColumnId});

            // Update trackers
            this._aSelections = tracker;
            this._sLastSelectedId = elCell.id;
            if(!this._sSelectionAnchorId) {
                this._sSelectionAnchorId = elRow.id;
            }

            // Update the UI
            YAHOO.util.Dom.addClass(elCell, YAHOO.widget.DataTable.CLASS_SELECTED);

            this.fireEvent("cellSelectEvent", {record:oRecord,
                    key: this._oColumnSet.getColumn(nColumnId).key, el:elCell});
            YAHOO.log("Selected " + elCell, "info", this.toString());

            return;
        }
    }
    YAHOO.log("Could not select " + cell, "warn", this.toString());
};

/**
 * Sets given cell to the unselected state.
 *
 * @method unselectCell
 * @param cell {HTMLElement | String} DOM element reference or ID string
 * to DataTable page element or RecordSet index.
 */
YAHOO.widget.DataTable.prototype.unselectCell = function(cell) {
    var elCell = this.getTdEl(cell);

    if(elCell) {
        var oRecord = this.getRecord(elCell);
        var nColumnId = elCell.yuiColumnId;

        if(oRecord && YAHOO.lang.isNumber(nColumnId)) {
            // Get Record ID
            var tracker = this._aSelections || [];
            var id = oRecord.getId();

            // Is it selected?
            for(var j=0; j<tracker.length; j++) {
                if((tracker[j].recordId === id) && (tracker[j].columnId === nColumnId)){
                    // Remove from tracker
                    tracker.splice(j,1);
                    
                    // Update tracker
                    this._aSelections = tracker;

                    // Update the UI
                    YAHOO.util.Dom.removeClass(elCell, YAHOO.widget.DataTable.CLASS_SELECTED);

                    this.fireEvent("cellUnselectEvent", {record:oRecord,
                            key:this._oColumnSet.getColumn(nColumnId).key, el:elCell});
                    YAHOO.log("Unselected " + elCell, "info", this.toString());

                    return;
                }
            }
        }
    }
    YAHOO.log("Could not unselect " + cell, "warn", this.toString());
};

/**
 * Clears out all cell selections.
 *
 * @method unselectAllCells
 */
YAHOO.widget.DataTable.prototype.unselectAllCells= function() {
    // Remove from tracker
    var tracker = this._aSelections || [];
    for(var j=0; j<tracker.length; j++) {
       if(tracker[j].constructor == Object){
            tracker.splice(j,1);
        }
    }

    // Update tracker
    this._aSelections = tracker;

    // Update UI
    this._unselectAllTdEls();
    
    //TODO: send an array of [{el:el,record:record}]
    //TODO: or convert this to an unselectRows method
    //TODO: that takes an array of rows or unselects all if none given
    this.fireEvent("unselectAllCellsEvent");
    YAHOO.log("Unselected all cells", "info", this.toString());
};

/**
 * Returns true if given element is select, false otherwise.
 *
 * @method isSelected
 * @param el {HTMLElement} HTML element reference or ID.
 * @return {Boolean} True if element is selected.
 */
YAHOO.widget.DataTable.prototype.isSelected = function(el) {
    return YAHOO.util.Dom.hasClass(el,YAHOO.widget.DataTable.CLASS_SELECTED);
};

/**
 * Returns selected rows as an array of Record IDs.
 *
 * @method getSelectedRows
 * @return {HTMLElement[]} Array of selected TR elements.
 */
YAHOO.widget.DataTable.prototype.getSelectedRows = function() {
//TODO: is this better as returning an array of Records?
    var aSelectedRows = [];
    var tracker = this._aSelections || [];
    for(var j=0; j<tracker.length; j++) {
       if(YAHOO.lang.isNumber(tracker[j])){
            aSelectedRows.push(tracker[j]);
        }
    }
    return aSelectedRows;
};

/**
 * Returns selected cells as an array of object literals:
 *     {recordId:nRecordID, columnId:sColumnId}.
 *
 * @method getSelectedRows
 * @return {HTMLElement[]} Array of selected TR elements.
 */
YAHOO.widget.DataTable.prototype.getSelectedCells = function() {
//TODO: is this better as returning an array of Records and keys?
    var aSelectedCells = [];
    var tracker = this._aSelections || [];
    for(var j=0; j<tracker.length; j++) {
       if(tracker[j] && (tracker[j].constructor == Object)){
            aSelectedCells.push({recordId:tracker[j].recordId, columnId:tracker[j].columnId});
        }
    }
    return aSelectedCells;
};

/**
 * Assigns the class YAHOO.widget.DataTable.CLASS_HIGHLIGHTED to the given row.
 *
 * @method highlightRow
 * @param row {HTMLElement | String} DOM element reference or ID string.
 */
YAHOO.widget.DataTable.prototype.highlightRow = function(row) {
    var elRow = this.getTrEl(row);

    if(elRow) {
        var oRecord = this.getRecord(elRow);
        YAHOO.util.Dom.addClass(elRow,YAHOO.widget.DataTable.CLASS_HIGHLIGHTED);
        this.fireEvent("rowHighlightEvent", {record:oRecord, el:elRow});
        YAHOO.log("Highlighted " + elRow, "info", this.toString());
        return;
    }
    YAHOO.log("Could not highlight " + row, "warn", this.toString());
};

/**
 * Removes the class YAHOO.widget.DataTable.CLASS_HIGHLIGHTED from the given row.
 *
 * @method unhighlightRow
 * @param row {HTMLElement | String} DOM element reference or ID string.
 */
YAHOO.widget.DataTable.prototype.unhighlightRow = function(row) {
    var elRow = this.getTrEl(row);

    if(elRow) {
        var oRecord = this.getRecord(elRow);
        YAHOO.util.Dom.removeClass(elRow,YAHOO.widget.DataTable.CLASS_HIGHLIGHTED);
        this.fireEvent("rowUnhighlightEvent", {record:oRecord, el:elRow});
        YAHOO.log("Unhighlighted " + elRow, "info", this.toString());
        return;
    }
    YAHOO.log("Could not unhighlight " + row, "warn", this.toString());
};

/**
 * Assigns the class YAHOO.widget.DataTable.CLASS_HIGHLIGHTED to the given cell.
 *
 * @method highlightCell
 * @param cell {HTMLElement | String} DOM element reference or ID string.
 */
YAHOO.widget.DataTable.prototype.highlightCell = function(cell) {
    var elCell = this.getTdEl(cell);

    if(elCell) {
        var oRecord = this.getRecord(elCell);
        YAHOO.util.Dom.addClass(elCell,YAHOO.widget.DataTable.CLASS_HIGHLIGHTED);
        this.fireEvent("cellHighlightEvent", {record:oRecord,
                    key:this._oColumnSet.getColumn(elCell.yuiColumnId).key, el:elCell});
        YAHOO.log("Highlighted " + elCell, "info", this.toString());
        return;
    }
    YAHOO.log("Could not highlight " + cell, "warn", this.toString());
};

/**
 * Removes the class YAHOO.widget.DataTable.CLASS_HIGHLIGHTED from the given cell.
 *
 * @method unhighlightCell
 * @param cell {HTMLElement | String} DOM element reference or ID string.
 */
YAHOO.widget.DataTable.prototype.unhighlightCell = function(cell) {
    var elCell = this.getTdEl(cell);

    if(elCell) {
        var oRecord = this.getRecord(elCell);
        YAHOO.util.Dom.removeClass(elCell,YAHOO.widget.DataTable.CLASS_HIGHLIGHTED);
        this.fireEvent("cellUnhighlightEvent", {record:oRecord,
                    key:this._oColumnSet.getColumn(elCell.yuiColumnId).key, el:elCell});
        YAHOO.log("Unhighlighted " + elCell, "info", this.toString());
        return;
    }
    YAHOO.log("Could not unhighlight " + cell, "warn", this.toString());
};













































// INLINE EDITING

/*TODO: for TAB handling
 * Shows Cell Editor for next cell.
 *
 * @method editNextCell
 * @param elCell {HTMLElement} Cell element from which to edit next cell.
 */
//YAHOO.widget.DataTable.prototype.editNextCell = function(elCell) {
//};

/**
 * Shows Cell Editor for given cell.
 *
 * @method showCellEditor
 * @param elCell {HTMLElement | String} Cell element to edit.
 * @param oRecord {YAHOO.widget.Record} (Optional) Record instance.
 * @param oColumn {YAHOO.widget.Column} (Optional) Column instance.
 */
YAHOO.widget.DataTable.prototype.showCellEditor = function(elCell, oRecord, oColumn) {
    elCell = YAHOO.util.Dom.get(elCell);
    
    if(elCell && (elCell.ownerDocument === document)) {
        if(!oRecord || !(oRecord instanceof YAHOO.widget.Record)) {
            oRecord = this.getRecord(elCell);
        }
        if(!oColumn || !(oColumn instanceof YAHOO.widget.Column)) {
            oColumn = this.getColumn(elCell);
        }
        if(oRecord && oColumn) {
            var oCellEditor = this._oCellEditor;
            var elContainer = oCellEditor.container;

            // Clear previous Editor
            if(oCellEditor.isActive) {
                this.cancelCellEditor();
            }
            
            oCellEditor.cell = elCell;
            oCellEditor.record = oRecord;
            oCellEditor.column = oColumn;
            oCellEditor.validator = (oColumn.editorOptions &&
                    YAHOO.lang.isFunction(oColumn.editorOptions.validator)) ?
                    oColumn.editorOptions.validator : null;
            oCellEditor.value = oRecord.getData(oColumn.key);

            // Move to be aligned with cell
            var x, y, offsetEl, scrollEl;

            x = elCell.offsetLeft;
            y = elCell.offsetTop;
            offsetEl = elCell;
            while(offsetEl.offsetParent) {
                x += offsetEl.offsetParent.offsetLeft;
                y += offsetEl.offsetParent.offsetTop;
                offsetEl = offsetEl.offsetParent;
            }
            scrollEl = elCell;
            while(scrollEl.tagName.toLowerCase() !== "body") {
                x -= scrollEl.scrollLeft;
                y -= scrollEl.scrollTop;
                scrollEl = scrollEl.parentNode;
            }

            elContainer.style.left = x + "px";
            elContainer.style.top = y + "px";

            // Show Editor
            elContainer.style.display = "";
            
            // Render Editor markup
            var fnEditor;
            if(YAHOO.lang.isString(oColumn.editor)) {
                switch(oColumn.editor) {
                    case "checkbox":
                        fnEditor = YAHOO.widget.DataTable.editCheckbox;
                        break;
                    case "date":
                        fnEditor = YAHOO.widget.DataTable.editDate;
                        break;
                    case "dropdown":
                        fnEditor = YAHOO.widget.DataTable.editDropdown;
                        break;
                    case "radio":
                        fnEditor = YAHOO.widget.DataTable.editRadio;
                        break;
                    case "textarea":
                        fnEditor = YAHOO.widget.DataTable.editTextarea;
                        break;
                    case "textbox":
                        fnEditor = YAHOO.widget.DataTable.editTextbox;
                        break;
                    default:
                        fnEditor = null;
                }
            }
            else if(YAHOO.lang.isFunction(oColumn.editor)) {
                fnEditor = oColumn.editor;
            }

            if(fnEditor) {
                // Create DOM input elements
                fnEditor(this._oCellEditor, this);
                
                // Show Save/Cancel buttons
                if(!oColumn.editorOptions || !oColumn.editorOptions.disableBtns) {
                    this.showCellEditorBtns(elContainer);
                }

                // Hook to customize the UI
                this.doBeforeShowCellEditor(this._oCellEditor);

                oCellEditor.isActive = true;
                
                //TODO: verify which args to pass
                this.fireEvent("editorShowEvent", {editor:oCellEditor});
                YAHOO.log("Cell Editor shown for " + elCell, "info", this.toString());
                return;
            }
        }
    }
    YAHOO.log("Could not show Cell Editor for " + elCell, "warn", this.toString());
};

/**
 * Overridable abstract method to customize Cell Editor UI.
 *
 * @method doBeforeShowCellEditor
 * @param oCellEditor {Object} Cell Editor object literal.
 */
YAHOO.widget.DataTable.prototype.doBeforeShowCellEditor = function(oCellEditor) {
};

/**
 * Adds Save/Cancel buttons to Cell Editor.
 *
 * @method showCellEditorBtns
 * @param elContainer {HTMLElement} Cell Editor container.
 */
YAHOO.widget.DataTable.prototype.showCellEditorBtns = function(elContainer) {
    // Buttons
    var elBtnsDiv = elContainer.appendChild(document.createElement("div"));
    YAHOO.util.Dom.addClass(elBtnsDiv, YAHOO.widget.DataTable.CLASS_BUTTON);

    // Save button
    var elSaveBtn = elBtnsDiv.appendChild(document.createElement("button"));
    elSaveBtn.innerHTML = "Save";
    YAHOO.util.Event.addListener(elSaveBtn, "click", this.saveCellEditor, this, true);

    // Cancel button
    var elCancelBtn = elBtnsDiv.appendChild(document.createElement("button"));
    elCancelBtn.innerHTML = "Cancel";
    YAHOO.util.Event.addListener(elCancelBtn, "click", this.cancelCellEditor, this, true);
};

/**
 * Clears Cell Editor of all state and UI.
 *
 * @method saveCellEditor
 */

YAHOO.widget.DataTable.prototype.resetCellEditor = function() {
    var elContainer = this._oCellEditor.container;
    elContainer.style.display = "none";
    YAHOO.util.Event.purgeElement(elContainer, true);
    elContainer.innerHTML = "";
    this._oCellEditor.value = null;
    this._oCellEditor.isActive = false;
};

/**
 * Saves Cell Editor input to Record.
 *
 * @method saveCellEditor
 */
YAHOO.widget.DataTable.prototype.saveCellEditor = function() {
    //TODO: Copy the editor's values to pass to the event
    if(this._oCellEditor.isActive) {
        // Validate input data
        if(this._oCellEditor.validator) {
            var newData = this._oCellEditor.value;
            var oldData = this._oCellEditor.record.getData(this._oCellEditor.column.key);
            this._oCellEditor.value = this._oCellEditor.validator(newData, oldData);
            if(this._oCellEditor.value === null ) {
                this.resetCellEditor();
                this.fireEvent("editorRevertEvent",
                        {editor:this._oCellEditor, oldData:oldData, newData:newData});
                YAHOO.log("Could not save Cell Editor input due to invalid data " +
                        YAHOO.lang.dump(newData), "warn", this.toString());
                return;
            }
        }

        // Update the Record
        this._oRecordSet.updateKey(this._oCellEditor.record, this._oCellEditor.column.key, this._oCellEditor.value);

        // Update the UI
        this.formatCell(this._oCellEditor.cell);

        // Clear out the Cell Editor
        this.resetCellEditor();

        this.fireEvent("editorSaveEvent",
                {editor:this._oCellEditor, oldData:oldData, newData:newData});
        YAHOO.log("Cell Editor input saved", "info", this.toString());
    }
    else {
        YAHOO.log("Cell Editor not active to save input", "warn", this.toString());
    }
};

/**
 * Cancels Cell Editor.
 *
 * @method cancelCellEditor
 */
YAHOO.widget.DataTable.prototype.cancelCellEditor = function() {
    if(this._oCellEditor.isActive) {
        this.resetCellEditor();
        //TODO: preserve values for the event?
        this.fireEvent("editorCancelEvent", {editor:this._oCellEditor});
        YAHOO.log("Cell Editor input canceled", "info", this.toString());
    }
    else {
        YAHOO.log("Cell Editor not active to cancel input", "warn", this.toString());
    }
};

/**
 * Enables CHECKBOX Editor.
 *
 * @method editCheckbox
 */
//YAHOO.widget.DataTable.editCheckbox = function(elContainer, oRecord, oColumn, oEditor, oSelf) {
YAHOO.widget.DataTable.editCheckbox = function(oEditor, oSelf) {
    var elCell = oEditor.cell;
    var oRecord = oEditor.record;
    var oColumn = oEditor.column;
    var elContainer = oEditor.container;
    var aCheckedValues = oRecord.getData(oColumn.key);
    if(!YAHOO.lang.isArray(aCheckedValues)) {
        aCheckedValues = [aCheckedValues];
    }

    // Checkboxes
    var checkboxOptions = (oColumn.editorOptions && YAHOO.lang.isArray(oColumn.editorOptions.checkboxOptions)) ?
            oColumn.editorOptions.checkboxOptions : [];
    var aCheckboxes = [];
    var aLabels = [];
    for(var j=0; j<checkboxOptions.length; j++) {
        var checkboxOption = checkboxOptions[j];
        aCheckboxes[j] = elContainer.appendChild(document.createElement("input"));
        aCheckboxes[j].type = "checkbox";
        aCheckboxes[j].id = "yui-dt-" + oSelf._nIndex + "-col" + oColumn.getKeyIndex() + "-chkbox" + j;
        aCheckboxes[j].value = (YAHOO.lang.isValue(checkboxOption.value)) ?
                checkboxOption.value : checkboxOption;
        for(var k=0; k<aCheckedValues.length; k++) {
            if(aCheckboxes[j].value === aCheckedValues[k]) {
                aCheckboxes[j].checked = true;
            }
        }
        aLabels[j] = elContainer.appendChild(document.createElement("label"));
        aLabels[j].htmlFor = aCheckboxes[j].id;
        aLabels[j].innerHTML += (YAHOO.lang.isValue(checkboxOption.label)) ?
                checkboxOption.label : checkboxOption;

        // Set up a listener on each check box to track the input value
        YAHOO.util.Event.addListener(aCheckboxes[j], "click",function(){
            aCheckedValues = [];
            for(var m=0; m<aCheckboxes.length; m++) {
                if(aCheckboxes[m].checked) {
                    aCheckedValues.push(aCheckboxes[m].value);
                }
            }
            oSelf._oCellEditor.value = aCheckedValues;
        });

    }
    
    // Focus the first checkbox
    oSelf._focusEl(aCheckboxes[0]);
};

/**
 * Enables Date Editor.
 *
 * @method editDate
 */
YAHOO.widget.DataTable.editDate = function(oEditor, oSelf) {
    var elCell = oEditor.cell;
    var oRecord = oEditor.record;
    var oColumn = oEditor.column;
    var elContainer = oEditor.container;
    var value = oRecord.getData(oColumn.key);

    // Calendar widget
    if(YAHOO.widget.Calendar) {
        var selectedValue = (value.getMonth()+1)+"/"+value.getDate()+"/"+value.getFullYear();
        var calContainer = elContainer.appendChild(document.createElement("div"));
        calContainer.id = "yui-dt-" + oSelf._nIndex + "-col" + oColumn.getKeyIndex() + "-dateContainer";
        var calendar =
                new YAHOO.widget.Calendar("yui-dt-" + oSelf._nIndex + "-col" + oColumn.getKeyIndex() + "-date",
                calContainer.id,
                {selected:selectedValue, pagedate:value});
        calendar.render();
        calContainer.style.cssFloat = "none";

        //var calFloatClearer = elContainer.appendChild(document.createElement("br"));
        //calFloatClearer.style.clear = "both";
        
        var myDateHandler = function(type, args, obj) {
            oSelf._oCellEditor.value = new Date(args[0][0][0], args[0][0][1]-1, args[0][0][2]);
        };
        calendar.selectEvent.subscribe(myDateHandler);
    }
    else {
        //TODO;
    }
};

/**
 * Enables SELECT Editor.
 *
 * @method editDropdown
 */
YAHOO.widget.DataTable.editDropdown = function(oEditor, oSelf) {
    var elCell = oEditor.cell;
    var oRecord = oEditor.record;
    var oColumn = oEditor.column;
    var elContainer = oEditor.container;
    var value = oRecord.getData(oColumn.key);

    // Textbox
    var elDropdown = elContainer.appendChild(document.createElement("select"));
    var dropdownOptions = (oColumn.editorOptions && YAHOO.lang.isArray(oColumn.editorOptions.dropdownOptions)) ?
            oColumn.editorOptions.dropdownOptions : [];
    for(var j=0; j<dropdownOptions.length; j++) {
        var dropdownOption = dropdownOptions[j];
        var elOption = document.createElement("option");
        elOption.value = (YAHOO.lang.isValue(dropdownOption.value)) ?
                dropdownOption.value : dropdownOption;
        elOption.innerHTML = (YAHOO.lang.isValue(dropdownOption.text)) ?
                dropdownOption.text : dropdownOption;
        elOption = elDropdown.appendChild(elOption);
        if(value === elDropdown.options[j].value) {
            elDropdown.options[j].selected = true;
        }
    }
    
    // Set up a listener on each check box to track the input value
    YAHOO.util.Event.addListener(elDropdown, "change",
        function(){
            oSelf._oCellEditor.value = elDropdown[elDropdown.selectedIndex].value;
            //TODO: fire customevent so implementers can save on change
    });
            
    // Focus the dropdown
    oSelf._focusEl(elDropdown);
};

/**
 * Enables INPUT TYPE=RADIO Editor.
 *
 * @method editRadio
 */
YAHOO.widget.DataTable.editRadio = function(oEditor, oSelf) {
    var elCell = oEditor.cell;
    var oRecord = oEditor.record;
    var oColumn = oEditor.column;
    var elContainer = oEditor.container;
    var value = oRecord.getData(oColumn.key);

    // Radio
    if(oColumn.editorOptions && YAHOO.lang.isArray(oColumn.editorOptions.radioOptions)) {
        var radioOptions = oColumn.editorOptions.radioOptions;
        var elForm = elContainer.appendChild(document.createElement("form"));
        elForm.name = "yui-dt-" + oSelf._nIndex + "-col" + oColumn.getKeyIndex() + "-form";
        var aLabels = [];
        var aRadios = [];
        for(var j=0; j<radioOptions.length; j++) {
            var radioOption = radioOptions[j];
            aRadios[j] = elForm.appendChild(document.createElement("input"));
            aRadios[j].type = "radio";
            aRadios[j].id = "yui-dt-" + oSelf._nIndex + "-col" + oColumn.getKeyIndex() + "-radiobtn" + j;
            aRadios[j].name = oSelf._nIndex + oColumn.key;
            aRadios[j].value = (YAHOO.lang.isValue(radioOption.value)) ?
                    radioOption.value : radioOption;
            if(value === aRadios[j].value) {
                aRadios[j].checked = true;
                oSelf._focusEl(aRadios[j]);
            }
            aLabels[j] = elForm.appendChild(document.createElement("label"));
            aLabels[j].htmlFor = aRadios[j].id;
            aLabels[j].innerHTML += (YAHOO.lang.isValue(radioOption.label)) ?
                    radioOption.label : radioOption;
            
            // Set up a listener on each radio btn to track the input value
            YAHOO.util.Event.addListener(aRadios[j], "click",
                function(){
                    oSelf._oCellEditor.value = this.value;
            });
        }
    }
};

/**
 * Enables TEXTAREA Editor.
 *
 * @method editTextarea
 */
YAHOO.widget.DataTable.editTextarea = function(oEditor, oSelf) {
   var elCell = oEditor.cell;
   var oRecord = oEditor.record;
   var oColumn = oEditor.column;
   var elContainer = oEditor.container;
   var value = oRecord.getData(oColumn.key);

    // Textarea
    var elTextarea = elContainer.appendChild(document.createElement("textarea"));
    elTextarea.style.width = elCell.offsetWidth + "px"; //(parseInt(elCell.offsetWidth,10)) + "px";
    elTextarea.style.height = (4*elCell.offsetHeight) + "px"; //(parseInt(elCell.offsetHeight,10)) + "px";
    elTextarea.value = YAHOO.lang.isValue(value) ? value : "";
    
    // Set up a listener on each check box to track the input value
    YAHOO.util.Event.addListener(elTextarea, "keyup", function(){
        oSelf._oCellEditor.value = elTextarea.value;
    });
    
    // Select the text
    elTextarea.select();
};

/**
 * Enables INPUT TYPE=TEXT Editor.
 *
 * @method editTextbox
 */
YAHOO.widget.DataTable.editTextbox = function(oEditor, oSelf) {
   var elCell = oEditor.cell;
   var oRecord = oEditor.record;
   var oColumn = oEditor.column;
   var elContainer = oEditor.container;
   var value = oRecord.getData(oColumn.key);

    // Textbox
    var elTextbox = elContainer.appendChild(document.createElement("input"));
    elTextbox.type = "text";
    elTextbox.style.width = elCell.offsetWidth + "px"; //(parseInt(elCell.offsetWidth,10)) + "px";
    elTextbox.style.height = elCell.offsetHeight + "px"; //(parseInt(elCell.offsetHeight,10)) + "px";
    elTextbox.value = YAHOO.lang.isValue(value) ? value : "";

    // Set up a listener on each textbox to track the input value
    YAHOO.util.Event.addListener(elTextbox, "keyup", function(){oSelf._oCellEditor.value = elTextbox.value;});

    // Select the text
    elTextbox.select();
};

/*
 * Validates Editor input value for type Number. If input value does not
 * validate, the old value is returned.
 *
 * @method validateNumber
*/
YAHOO.widget.DataTable.validateNumber = function(oData) {
    //Convert to number
    var number = oData * 1;

    // Validate
    if(YAHOO.lang.isNumber(number)) {
        return number;
    }
    else {
        YAHOO.log("Could not validate data " + YAHOO.lang.dump(oData) + " to type Number", "warn", "YAHOO.widget.DataTable.validateNumber");
        return null;
    }
};

/*TODO: is this dupe?
 * Hides active ColumnEditor.
 *
 * @method hideColumnEditor
 */
/*YAHOO.widget.DataTable.prototype.hideColumnEditor = function() {
    if(this.activeColumnEditor) {
        var oColumnEditor = this.activeColumnEditor;
        oColumnEditor.hide();
        this.activeColumnEditor = null;

        // Return focus to TBODY
        //this._focusEl(this._elTbody);

        this.fireEvent("editorHideEvent", {columnEditor:oColumnEditor});
        YAHOO.log("Editor hidden", "info", this.toString());
        return;
    }
};*/

/*TODO: is this dupe?
 * Saves data input from active ColumnEditor.
 *
 * @method saveColumnEditorInput
 */
/*YAHOO.widget.DataTable.prototype.saveColumnEditor = function() {
    if(this.activeColumnEditor) {
        var elCell = this.activeColumnEditor.cell;
        var oColumn = this.activeColumnEditor.column;
        var oRecord = this.activeColumnEditor.record;
        var oldValue = oRecord.getData(oColumn.key);
        var newValue = this.activeColumnEditor.getInputValue();
        //TODO: need to convert string value into proper type for RecordSet

        // Update Record data
        this._oRecordSet.updateKey(oRecord,oColumn.key,newValue);

        //Update TD element
        this.formatCell(elCell, oRecord, oColumn);

        // Hide ColumnEditor
        this.hideColumnEditor();

        //TODO: Return focus to TBODY
        //this._focusEl(this._elTbody);
        
        this.fireEvent("columnEditorSaveEvent",
                {columnEditor:this.activeColumnEditor, oldData:oldValue, newData:newValue});
        YAHOO.log("Saved ColumnEditor input", "info", this.toString());
    }
};*/





































// ABSTRACT METHODS

/**
 * Overridable method gives implementers a hook to access data before
 * it gets added to RecordSet and rendered to the TBODY.
 *
 * @method doBeforeLoadData
 * @param sRequest {String} Original request.
 * @param oResponse {Object} Response object.
 * @return {Boolean} Return true to continue loading data into RecordSet and
 * updating DataTable with new Records, false to cancel.
 */
YAHOO.widget.DataTable.prototype.doBeforeLoadData = function(sRequest, oResponse) {
    return true;
};































































/////////////////////////////////////////////////////////////////////////////
//
// Public Custom Event Handlers
//
/////////////////////////////////////////////////////////////////////////////

/**
 * Overridable custom event handler to sort Column.
 *
 * @method onEventSortColumn
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventSortColumn = function(oArgs) {
//TODO: support nested header column sorting
    var evt = oArgs.event;
    var target = oArgs.target;
    YAHOO.util.Event.stopEvent(evt);
    
    var el = this.getThEl(target) || this.getTdEl(target);
    if(el && YAHOO.lang.isNumber(el.yuiColumnId)) {
        this.sortColumn(this._oColumnSet.getColumn(el.yuiColumnId));
    }
    else {
        YAHOO.log("Could not sort column " + target, "warn", this.toString());
    }
};

/**
 * Overridable custom event handler to manage selection according to desktop paradigm.
 *
 * @method onEventSelectRow
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventSelectRow = function(oArgs) {
    var sMode = this.get("selectionMode");
    if ((sMode == "singlecell") || (sMode == "cellblock") || (sMode == "cellrange")) {
        return;
    }

    var evt = oArgs.event;
    var elTarget = oArgs.target;

    var bSHIFT = evt.shiftKey;
    var bCTRL = evt.ctrlKey;
    var i, nAnchorTrIndex;

    // Validate target row
    var elTargetRow = this.getTrEl(elTarget);
    if(elTargetRow) {
        var allRows = this._elTbody.rows;
        var nTargetTrIndex = elTargetRow.sectionRowIndex;
        var elAnchorRow = YAHOO.util.Dom.get(this._sSelectionAnchorId);
        
        // Both SHIFT and CTRL
        if((sMode != "single") && bSHIFT && bCTRL) {
            // Validate anchor row
            if(elAnchorRow && YAHOO.lang.isNumber(elAnchorRow.sectionRowIndex)) {
                nAnchorTrIndex = elAnchorRow.sectionRowIndex;
                if(this.isSelected(elAnchorRow)) {
                    // Select all rows between anchor row and target row, including target row
                    if(nAnchorTrIndex < nTargetTrIndex) {
                        for(i=nAnchorTrIndex+1; i<=nTargetTrIndex; i++) {
                            if(!this.isSelected(allRows[i])) {
                                this.selectRow(allRows[i]);
                            }
                        }
                    }
                    // Select all rows between target row and anchor row, including target row
                    else {
                        for(i=nAnchorTrIndex-1; i>=nTargetTrIndex; i--) {
                            if(!this.isSelected(allRows[i])) {
                                this.selectRow(allRows[i]);
                            }
                        }
                    }
                }
                else {
                    // Unselect all rows between anchor row and target row
                    if(nAnchorTrIndex < nTargetTrIndex) {
                        for(i=nAnchorTrIndex+1; i<=nTargetTrIndex-1; i++) {
                            if(this.isSelected(allRows[i])) {
                                this.unselectRow(allRows[i]);
                            }
                        }
                    }
                    // Unselect all rows between target row and anchor row
                    else {
                        for(i=nTargetTrIndex+1; i<=nAnchorTrIndex-1; i++) {
                            if(this.isSelected(allRows[i])) {
                                this.unselectRow(allRows[i]);
                            }
                        }
                    }
                    // Select the target row
                    this.selectRow(elTargetRow);
                }
            }
            // Invalid anchor
            else {
                // Set anchor
                this._sSelectionAnchorId = elTargetRow.id;

                // Toggle selection of target
                if(this.isSelected(elTargetRow)) {
                    this.unselectRow(elTargetRow);
                }
                else {
                    this.selectRow(elTargetRow);
                }
            }
        }
        // Only SHIFT
        else if((sMode != "single") && bSHIFT) {
            this.unselectAllRows();

            // Validate anchor
            if(elAnchorRow && YAHOO.lang.isNumber(elAnchorRow.sectionRowIndex)) {
                nAnchorTrIndex = elAnchorRow.sectionRowIndex;

                // Select all rows between anchor row and target row,
                // including the anchor row and target row
                if(nAnchorTrIndex < nTargetTrIndex) {
                    for(i=nAnchorTrIndex; i<=nTargetTrIndex; i++) {
                        this.selectRow(allRows[i]);
                    }
                }
                // Select all rows between target row and anchor row,
                // including the target row and anchor row
                else {
                    for(i=nAnchorTrIndex; i>=nTargetTrIndex; i--) {
                        this.selectRow(allRows[i]);
                    }
                }
            }
            // Invalid anchor
            else {
                // Set anchor
                this._sSelectionAnchorId = elTargetRow.id;

                // Select target row only
                this.selectRow(elTargetRow);
            }
        }
        // Only CTRL
        else if((sMode != "single") && bCTRL) {
            // Set anchor
            this._sSelectionAnchorId = elTargetRow.id;

            // Toggle selection of target
            if(this.isSelected(elTargetRow)) {
                this.unselectRow(elTargetRow);
            }
            else {
                this.selectRow(elTargetRow);
            }
        }
        // Neither SHIFT nor CTRL
        else if(sMode == "single") {
            this.unselectAllRows();
            this.selectRow(elTargetRow);
        }
        // Neither SHIFT nor CTRL
        else {
            // Set anchor
            this._sSelectionAnchorId = elTargetRow.id;

            // Select only target
            this.unselectAllRows();
            this.selectRow(elTargetRow);
        }
        YAHOO.util.Event.stopEvent(evt);

        // Clear any selections that are a byproduct of the click or dblclick
        var sel;
        if(window.getSelection) {
        	sel = window.getSelection();
        }
        else if(document.getSelection) {
        	sel = document.getSelection();
        }
        else if(document.selection) {
        	sel = document.selection;
        }
        if(sel) {
            if(sel.empty) {
                sel.empty();
            }
            else if (sel.removeAllRanges) {
                sel.removeAllRanges();
            }
            else if(sel.collapse) {
                sel.collapse();
            }
        }
    }
    else {
        YAHOO.log("Could not select row " + elTarget, "warn", this.toString());
    }
};

/**
 * Overridable custom event handler to select cell.
 *
 * @method onEventSelectCell
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventSelectCell = function(oArgs) {
    var sMode = this.get("selectionMode");
    if ((sMode == "standard") || (sMode == "single")) {
        return;
    }

    var evt = oArgs.event;
    var elTarget = oArgs.target;

    var bSHIFT = evt.shiftKey;
    var bCTRL = evt.ctrlKey;
    var i, j, nAnchorTrIndex, nAnchorTdIndex, currentRow, startIndex, endIndex;
    
    var elTargetCell = this.getTdEl(elTarget);
    if(elTargetCell) {
        var elTargetRow = this.getTrEl(elTargetCell);
        var allRows = this._elTbody.rows;
        var nTargetTrIndex = elTargetRow.sectionRowIndex;
        var nTargetTdIndex = elTarget.yuiCellIndex;
        var elAnchorCell = YAHOO.util.Dom.get(this._sSelectionAnchorId);

        // Both SHIFT and CTRL
        if((sMode != "singlecell") && bSHIFT && bCTRL) {
            // Validate anchor
            if(elAnchorCell && YAHOO.lang.isNumber(elAnchorCell.yuiCellIndex)) {
                nAnchorTrIndex = elAnchorCell.parentNode.sectionRowIndex;
                nAnchorTdIndex = elAnchorCell.yuiCellIndex;
                
                // Anchor is selected
                if(this.isSelected(elAnchorCell)) {
                    // All cells are on the same row
                    if(nAnchorTrIndex == nTargetTrIndex) {
                        // Select all cells between anchor cell and target cell, including target cell
                        if(nAnchorTdIndex < nTargetTdIndex) {
                            for(i=nAnchorTdIndex+1; i<=nTargetTdIndex; i++) {
                                this.selectCell(allRows[nTargetTrIndex].cells[i]);
                            }
                        }
                        // Select all cells between target cell and anchor cell, including target cell
                        else if(nTargetTdIndex < nAnchorTdIndex) {
                            for(i=nTargetTdIndex; i<nAnchorTdIndex; i++) {
                                this.selectCell(allRows[nTargetTrIndex].cells[i]);
                            }
                        }
                    }
                    // Anchor row is above target row
                    else if(nAnchorTrIndex < nTargetTrIndex) {
                        if(sMode == "cellrange") {
                            // Select all cells on anchor row from anchor cell to the end of the row
                            for(i=nAnchorTdIndex+1; i<allRows[nAnchorTrIndex].cells.length; i++) {
                                this.selectCell(allRows[nAnchorTrIndex].cells[i]);
                            }
                            
                            // Select all cells on all rows between anchor row and target row
                            for(i=nAnchorTrIndex+1; i<nTargetTrIndex; i++) {
                                for(j=0; j<allRows[i].cells.length; j++){
                                    this.selectCell(allRows[i].cells[j]);
                                }
                            }

                            // Select all cells on target row from first cell to the target cell
                            for(i=0; i<=nTargetTdIndex; i++) {
                                this.selectCell(allRows[nTargetTrIndex].cells[i]);
                            }
                        }
                        else if(sMode == "cellblock") {
                            startIndex = Math.min(nAnchorTdIndex, nTargetTdIndex);
                            endIndex = Math.max(nAnchorTdIndex, nTargetTdIndex);
                            
                            // Select all cells from startIndex to endIndex on rows between anchor row and target row
                            for(i=nAnchorTrIndex; i<=nTargetTrIndex; i++) {
                                for(j=startIndex; j<=endIndex; j++) {
                                    this.selectCell(allRows[i].cells[j]);
                                }
                            }
                        }
                    }
                    // Anchor row is below target row
                    else {
                        if(sMode == "cellrange") {
                            // Select all cells on target row from target cell to the end of the row
                            for(i=nTargetTdIndex; i<allRows[nTargetTrIndex].cells.length; i++) {
                                this.selectCell(allRows[nTargetTrIndex].cells[i]);
                            }

                            // Select all cells on all rows between target row and anchor row
                            for(i=nTargetTrIndex+1; i<nAnchorTrIndex; i++) {
                                for(j=0; j<allRows[i].cells.length; j++){
                                    this.selectCell(allRows[i].cells[j]);
                                }
                            }

                            // Select all cells on anchor row from first cell to the anchor cell
                            for(i=0; i<nAnchorTdIndex; i++) {
                                this.selectCell(allRows[nAnchorTrIndex].cells[i]);
                            }
                        }
                        else if(sMode == "cellblock") {
                            startIndex = Math.min(nAnchorTdIndex, nTargetTdIndex);
                            endIndex = Math.max(nAnchorTdIndex, nTargetTdIndex);

                            // Select all cells from startIndex to endIndex on rows between target row and anchor row
                            for(i=nAnchorTrIndex; i>=nTargetTrIndex; i--) {
                                for(j=endIndex; j>=startIndex; j--) {
                                    this.selectCell(allRows[i].cells[j]);
                                }
                            }
                        }
                    }
                }
                // Anchor cell is unselected
                else {
                    // All cells are on the same row
                    if(nAnchorTrIndex == nTargetTrIndex) {
                        // Unselect all cells between anchor cell and target cell
                        if(nAnchorTdIndex < nTargetTdIndex) {
                            for(i=nAnchorTdIndex+1; i<nTargetTdIndex; i++) {
                                this.unselectCell(allRows[nTargetTrIndex].cells[i]);
                            }
                        }
                        // Select all cells between target cell and anchor cell
                        else if(nTargetTdIndex < nAnchorTdIndex) {
                            for(i=nTargetTdIndex+1; i<nAnchorTdIndex; i++) {
                                this.unselectCell(allRows[nTargetTrIndex].cells[i]);
                            }
                        }
                    }
                    // Anchor row is above target row
                    if(nAnchorTrIndex < nTargetTrIndex) {
                        // Unselect all cells from anchor cell to target cell
                        for(i=nAnchorTrIndex; i<=nTargetTrIndex; i++) {
                            currentRow = allRows[i];
                            for(j=0; j<currentRow.cells.length; j++) {
                                // This is the anchor row, only unselect cells after the anchor cell
                                if(currentRow.sectionRowIndex == nAnchorTrIndex) {
                                    if(j>nAnchorTdIndex) {
                                        this.unselectCell(currentRow.cells[j]);
                                    }
                                }
                                // This is the target row, only unelect cells before the target cell
                                else if(currentRow.sectionRowIndex == nTargetTrIndex) {
                                    if(j<nTargetTdIndex) {
                                        this.unselectCell(currentRow.cells[j]);
                                    }
                                }
                                // Unselect all cells on this row
                                else {
                                    this.unselectCell(currentRow.cells[j]);
                                }
                            }
                        }
                    }
                    // Anchor row is below target row
                    else {
                        // Unselect all cells from target cell to anchor cell
                        for(i=nTargetTrIndex; i<=nAnchorTrIndex; i++) {
                            currentRow = allRows[i];
                            for(j=0; j<currentRow.cells.length; j++) {
                                // This is the target row, only unselect cells after the target cell
                                if(currentRow.sectionRowIndex == nTargetTrIndex) {
                                    if(j>nTargetTdIndex) {
                                        this.unselectCell(currentRow.cells[j]);
                                    }
                                }
                                // This is the anchor row, only unselect cells before the anchor cell
                                else if(currentRow.sectionRowIndex == nAnchorTrIndex) {
                                    if(j<nAnchorTdIndex) {
                                        this.unselectCell(currentRow.cells[j]);
                                    }
                                }
                                // Unselect all cells on this row
                                else {
                                    this.unselectCell(currentRow.cells[j]);
                                }
                            }
                        }
                    }

                    // Select the target cell
                    this.selectCell(elTargetCell);
                }
            }
            // Invalid anchor
            else {
                // Set anchor
                this._sSelectionAnchorId = elTargetCell.id;

                // Toggle selection of target
                if(this.isSelected(elTargetCell)) {
                    this.unselectCell(elTargetCell);
                }
                else {
                    this.selectCell(elTargetCell);
                }
            }
        }
        // Only SHIFT
        else if((sMode != "singlecell") && bSHIFT) {
            this.unselectAllCells();

            // Validate anchor
            if(elAnchorCell && YAHOO.lang.isNumber(elAnchorCell.yuiCellIndex)) {
                nAnchorTrIndex = elAnchorCell.parentNode.sectionRowIndex;
                nAnchorTdIndex = elAnchorCell.yuiCellIndex;
                
                // All cells are on the same row
                if(nAnchorTrIndex == nTargetTrIndex) {
                    // Select all cells between anchor cell and target cell,
                    // including the anchor cell and target cell
                    if(nAnchorTdIndex < nTargetTdIndex) {
                        for(i=nAnchorTdIndex; i<=nTargetTdIndex; i++) {
                            this.selectCell(allRows[nTargetTrIndex].cells[i]);
                        }
                    }
                    // Select all cells between target cell and anchor cell
                    // including the target cell and anchor cell
                    else if(nTargetTdIndex < nAnchorTdIndex) {
                        for(i=nTargetTdIndex; i<=nAnchorTdIndex; i++) {
                            this.selectCell(allRows[nTargetTrIndex].cells[i]);
                        }
                    }
                }
                // Anchor row is above target row
                else if(nAnchorTrIndex < nTargetTrIndex) {
                    if(sMode == "cellrange") {
                        // Select all cells from anchor cell to target cell
                        // including the anchor cell and target cell
                        for(i=nAnchorTrIndex; i<=nTargetTrIndex; i++) {
                            currentRow = allRows[i];
                            for(j=0; j<currentRow.cells.length; j++) {
                                // This is the anchor row, only select the anchor cell and after
                                if(currentRow.sectionRowIndex == nAnchorTrIndex) {
                                    if(j>=nAnchorTdIndex) {
                                        this.selectCell(currentRow.cells[j]);
                                    }
                                }
                                // This is the target row, only select the target cell and before
                                else if(currentRow.sectionRowIndex == nTargetTrIndex) {
                                    if(j<=nTargetTdIndex) {
                                        this.selectCell(currentRow.cells[j]);
                                    }
                                }
                                // Select all cells on this row
                                else {
                                    this.selectCell(currentRow.cells[j]);
                                }
                            }
                        }
                    }
                    else if(sMode == "cellblock") {
                        // Select the cellblock from anchor cell to target cell
                        // including the anchor cell and the target cell
                        startIndex = Math.min(nAnchorTdIndex, nTargetTdIndex);
                        endIndex = Math.max(nAnchorTdIndex, nTargetTdIndex);

                        for(i=nAnchorTrIndex; i<=nTargetTrIndex; i++) {
                            for(j=startIndex; j<=endIndex; j++) {
                                this.selectCell(allRows[i].cells[j]);
                            }
                        }
                        
                        this._sLastSelectedId = allRows[nTargetTrIndex].cells[nTargetTdIndex].id;
                    }
                }
                // Anchor row is below target row
                else {
                    if(sMode == "cellrange") {
                        // Select all cells from target cell to anchor cell,
                        // including the target cell and anchor cell
                        for(i=nTargetTrIndex; i<=nAnchorTrIndex; i++) {
                            currentRow = allRows[i];
                            for(j=0; j<currentRow.cells.length; j++) {
                                // This is the target row, only select the target cell and after
                                if(currentRow.sectionRowIndex == nTargetTrIndex) {
                                    if(j>=nTargetTdIndex) {
                                        this.selectCell(currentRow.cells[j]);
                                    }
                                }
                                // This is the anchor row, only select the anchor cell and before
                                else if(currentRow.sectionRowIndex == nAnchorTrIndex) {
                                    if(j<=nAnchorTdIndex) {
                                        this.selectCell(currentRow.cells[j]);
                                    }
                                }
                                // Select all cells on this row
                                else {
                                    this.selectCell(currentRow.cells[j]);
                                }
                            }
                        }
                    }
                    else if(sMode == "cellblock") {
                        // Select the cellblock from target cell to anchor cell
                        // including the target cell and the anchor cell
                        startIndex = Math.min(nAnchorTdIndex, nTargetTdIndex);
                        endIndex = Math.max(nAnchorTdIndex, nTargetTdIndex);

                        for(i=nTargetTrIndex; i<=nAnchorTrIndex; i++) {
                            for(j=startIndex; j<=endIndex; j++) {
                                this.selectCell(allRows[i].cells[j]);
                            }
                        }
                        
                        this._sLastSelectedId = allRows[nTargetTrIndex].cells[nTargetTdIndex].id;
                    }
                }
            }
            // Invalid anchor
            else {
                // Set anchor
                this._sSelectionAnchorId = elTargetCell.id;

                // Select target only
                this.selectCell(elTargetCell);
            }
        }
        // Only CTRL
        else if((sMode != "singlecell") && bCTRL) {
            // Set anchor
            this._sSelectionAnchorId = elTargetCell.id;

            // Toggle selection of target
            if(this.isSelected(elTargetCell)) {
                this.unselectCell(elTargetCell);
            }
            else {
                this.selectCell(elTargetCell);
            }
        }
        // Neither SHIFT nor CTRL, or multi-selection has been disabled
        else {
            // Set anchor
            this._sSelectionAnchorId = elTargetCell.id;

            // Select only target
            this.unselectAllCells();
            this.selectCell(elTargetCell);
        }

        YAHOO.util.Event.stopEvent(evt);

        // Clear any selections that are a byproduct of the click or dblclick
        var sel;
        if(window.getSelection) {
        	sel = window.getSelection();
        }
        else if(document.getSelection) {
        	sel = document.getSelection();
        }
        else if(document.selection) {
        	sel = document.selection;
        }
        if(sel) {
            if(sel.empty) {
                sel.empty();
            }
            else if (sel.removeAllRanges) {
                sel.removeAllRanges();
            }
            else if(sel.collapse) {
                sel.collapse();
            }
        }
    }
    else {
        YAHOO.log("Could not select cell " + elTarget, "warn", this.toString());
    }
};











/**
 * Overridable custom event handler to highlight row.
 *
 * @method onEventHighlightRow
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventHighlightRow = function(oArgs) {
    var evt = oArgs.event;
    var elTarget = oArgs.target;
    this.highlightRow(elTarget);
};

/**
 * Overridable custom event handler to unhighlight row.
 *
 * @method onEventUnhighlightRow
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventUnhighlightRow = function(oArgs) {
    var evt = oArgs.event;
    var elTarget = oArgs.target;
    this.unhighlightRow(elTarget);
};

/**
 * Overridable custom event handler to highlight cell.
 *
 * @method onEventHighlightCell
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventHighlightCell = function(oArgs) {
    var evt = oArgs.event;
    var elTarget = oArgs.target;
    this.highlightCell(elTarget);
};

/**
 * Overridable custom event handler to unhighlight cell.
 *
 * @method onEventUnhighlightCell
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventUnhighlightCell = function(oArgs) {
    var evt = oArgs.event;
    var elTarget = oArgs.target;
    this.unhighlightCell(elTarget);
};

/**
 * Overridable custom event handler to format cell.
 *
 * @method onEventFormatCell
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventFormatCell = function(oArgs) {
    var evt = oArgs.event;
    var target = oArgs.target;
    var elTag = target.tagName.toLowerCase();

    var elCell = this.getTdEl(target);
    if(elCell && YAHOO.lang.isNumber(elCell.yuiColumnId)) {
        var oColumn = this._oColumnSet.getColumn(elCell.yuiColumnId);
        this.formatCell(elCell, this.getRecord(elCell), oColumn);
    }
    else {
        YAHOO.log("Could not format cell " + target, "warn", this.toString());
    }
};

/**
 * Overridable custom event handler to edit cell.
 *
 * @method onEventShowCellEditor
 * @param oArgs.event {HTMLEvent} Event object.
 * @param oArgs.target {HTMLElement} Target element.
 */
YAHOO.widget.DataTable.prototype.onEventShowCellEditor = function(oArgs) {
    var evt = oArgs.event;
    var target = oArgs.target;
    var elTag = target.tagName.toLowerCase();

    var elCell = this.getTdEl(target);
    if(elCell) {
        this.showCellEditor(elCell);
    }
    else {
        YAHOO.log("Could not edit cell " + target, "warn", this.toString());
    }
};
// Backward compatibility
YAHOO.widget.DataTable.prototype.onEventEditCell = function(oArgs) {
    YAHOO.log("The method onEventEditCell() has been deprecated" +
        " in favor of onEventShowCellEditor()", "warn", this.toString());
    this.onEventShowCellEditor(oArgs);
};

/**
 * Overridable custom event handler to save Cell Editor input.
 *
 * @method onEventSaveCellEditor
 * @param oArgs.editor {Object} Cell Editor object literal.
 */
YAHOO.widget.DataTable.prototype.onEventSaveCellEditor = function(oArgs) {
    this.saveCellEditor();
};

/**
 * Callback function receives data from DataSource and populates an entire
 * DataTable with Records and TR elements, clearing previous Records, if any.
 *
 * @method onDataReturnInitializeTable
 * @param sRequest {String} Original request.
 * @param oResponse {Object} Response object.
 * @param bError {Boolean} (optional) True if there was a data error.
 */
YAHOO.widget.DataTable.prototype.onDataReturnInitializeTable = function(sRequest, oResponse) {
    this.fireEvent("dataReturnEvent", {request:sRequest,response:oResponse});

    // Pass data through abstract method for any transformations
    var ok = this.doBeforeLoadData(sRequest, oResponse);

    // Data ok to populate
    if(ok && oResponse && !oResponse.error && YAHOO.lang.isArray(oResponse.results)) {
        this.initializeTable(oResponse.results);
    }
    // Error
    else if(ok && oResponse.error) {
        this.showTableMessage(YAHOO.widget.DataTable.MSG_ERROR, YAHOO.widget.DataTable.CLASS_ERROR);
    }
    // Empty
    else if(ok){
        this.showTableMessage(YAHOO.widget.DataTable.MSG_EMPTY, YAHOO.widget.DataTable.CLASS_EMPTY);
    }
};
// Backward compatibility
YAHOO.widget.DataTable.prototype.onDataReturnReplaceRows = function(sRequest, oResponse) {
    YAHOO.log("The method onDataReturnReplaceRows() has been deprecated" +
            " in favor of onDataReturnInitializeTable()", "warn", this.toString());
    this.onDataReturnInitializeTable(sRequest, oResponse);
};

/**
 * Callback function receives data from DataSource and appends to an existing
 * DataTable new Records and, if applicable, creates or updates
 * corresponding TR elements.
 *
 * @method onDataReturnAppendRows
 * @param sRequest {String} Original request.
 * @param oResponse {Object} Response object.
 * @param bError {Boolean} (optional) True if there was a data error.
 */
YAHOO.widget.DataTable.prototype.onDataReturnAppendRows = function(sRequest, oResponse) {
    this.fireEvent("dataReturnEvent", {request:sRequest,response:oResponse});
    
    // Pass data through abstract method for any transformations
    var ok = this.doBeforeLoadData(sRequest, oResponse);
    
    // Data ok to append
    if(ok && oResponse && !oResponse.error && YAHOO.lang.isArray(oResponse.results)) {
        this.addRows(oResponse.results);
    }
    // Error
    else if(ok && oResponse.error) {
        this.showTableMessage(YAHOO.widget.DataTable.MSG_ERROR, YAHOO.widget.DataTable.CLASS_ERROR);
    }
};

/**
 * Callback function receives data from DataSource and inserts into top of an
 * existing DataTable new Records and, if applicable, creates or updates
 * corresponding TR elements.
 *
 * @method onDataReturnInsertRows
 * @param sRequest {String} Original request.
 * @param oResponse {Object} Response object.
 * @param bError {Boolean} (optional) True if there was a data error.
 */
YAHOO.widget.DataTable.prototype.onDataReturnInsertRows = function(sRequest, oResponse) {
    this.fireEvent("dataReturnEvent", {request:sRequest,response:oResponse});
    
    // Pass data through abstract method for any transformations
    var ok = this.doBeforeLoadData(sRequest, oResponse);
    
    // Data ok to append
    if(ok && oResponse && !oResponse.error && YAHOO.lang.isArray(oResponse.results)) {
        this.addRows(oResponse.results, 0);
    }
    // Error
    else if(ok && oResponse.error) {
        this.showTableMessage(YAHOO.widget.DataTable.MSG_ERROR, YAHOO.widget.DataTable.CLASS_ERROR);
    }
};



































    /////////////////////////////////////////////////////////////////////////////
    //
    // Custom Events
    //
    /////////////////////////////////////////////////////////////////////////////

    /**
     * Fired when the DataTable instance's initialization is complete.
     *
     * @event initEvent
     */

    /**
     * Fired when the DataTable's view is refreshed.
     *
     * @event refreshEvent
     */

    /**
     * Fired when data is returned from DataSource.
     *
     * @event dataReturnEvent
     * @param oArgs.request {String} Original request.
     * @param oArgs.response {Object} Response object.
     */

    /**
     * Fired when the DataTable has a focus.
     *
     * @event tableFocusEvent
     */

    /**
     * Fired when the DataTable has a blur.
     *
     * @event tableBlurEvent
     */

    /**
     * Fired when the DataTable has a mouseover.
     *
     * @event tableMouseoverEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The DataTable's TABLE element.
     *
     */

    /**
     * Fired when the DataTable has a mouseout.
     *
     * @event tableMouseoutEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The DataTable's TABLE element.
     *
     */

    /**
     * Fired when the DataTable has a mousedown.
     *
     * @event tableMousedownEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The DataTable's TABLE element.
     *
     */

    /**
     * Fired when the DataTable has a click.
     *
     * @event tableClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The DataTable's TABLE element.
     *
     */

    /**
     * Fired when the DataTable has a dblclick.
     *
     * @event tableDblclickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The DataTable's TABLE element.
     *
     */

    /**
     * Fired when a fixed scrolling DataTable has a scroll.
     *
     * @event tableScrollEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The DataTable's CONTAINER element (in IE)
     * or the DataTable's TBODY element (everyone else).
     *
     */

    /**
     * Fired when a message is shown in the DataTable's message element.
     *
     * @event tableMsgShowEvent
     * @param oArgs.html {String} The HTML displayed.
     * @param oArgs.className {String} The className assigned.
     *
     */

    /**
     * Fired when the DataTable's message element is hidden.
     *
     * @event tableMsgHideEvent
     */

    /**
     * Fired when a header row has a mouseover.
     *
     * @event headerRowMouseoverEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TR element.
     */

    /**
     * Fired when a header row has a mouseout.
     *
     * @event headerRowMouseoutEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TR element.
     */

    /**
     * Fired when a header row has a mousedown.
     *
     * @event headerRowMousedownEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TR element.
     */

    /**
     * Fired when a header row has a click.
     *
     * @event headerRowClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TR element.
     */

    /**
     * Fired when a header row has a dblclick.
     *
     * @event headerRowDblclickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TR element.
     */

    /**
     * Fired when a header cell has a mouseover.
     *
     * @event headerCellMouseoverEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TH element.
     *
     */

    /**
     * Fired when a header cell has a mouseout.
     *
     * @event headerCellMouseoutEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TH element.
     *
     */

    /**
     * Fired when a header cell has a mousedown.
     *
     * @event headerCellMousedownEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TH element.
     */

    /**
     * Fired when a header cell has a click.
     *
     * @event headerCellClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TH element.
     */

    /**
     * Fired when a header cell has a dblclick.
     *
     * @event headerCellDblclickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TH element.
     */

    /**
     * Fired when a header label has a mouseover.
     *
     * @event headerLabelMouseoverEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The SPAN element.
     *
     */

    /**
     * Fired when a header label has a mouseout.
     *
     * @event headerLabelMouseoutEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The SPAN element.
     *
     */

    /**
     * Fired when a header label has a mousedown.
     *
     * @event headerLabelMousedownEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The SPAN element.
     */

    /**
     * Fired when a header label has a click.
     *
     * @event headerLabelClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The SPAN element.
     */

    /**
     * Fired when a header label has a dblclick.
     *
     * @event headerLabelDblclickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The SPAN element.
     */

    /**
     * Fired when a column is sorted.
     *
     * @event columnSortEvent
     * @param oArgs.column {YAHOO.widget.Column} The Column instance.
     * @param oArgs.dir {String} Sort direction "asc" or "desc".
     */

    /**
     * Fired when a column is resized.
     *
     * @event columnResizeEvent
     * @param oArgs.column {YAHOO.widget.Column} The Column instance.
     * @param oArgs.target {HTMLElement} The TH element.
     */

    /**
     * Fired when a row has a mouseover.
     *
     * @event rowMouseoverEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TR element.
     */

    /**
     * Fired when a row has a mouseout.
     *
     * @event rowMouseoutEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TR element.
     */

    /**
     * Fired when a row has a mousedown.
     *
     * @event rowMousedownEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TR element.
     */

    /**
     * Fired when a row has a click.
     *
     * @event rowClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TR element.
     */

    /**
     * Fired when a row has a dblclick.
     *
     * @event rowDblclickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TR element.
     */

    /**
     * Fired when a row is added.
     *
     * @event rowAddEvent
     * @param oArgs.newData {Object} Object literal of the added data.
     * @param oArgs.trElId {String} The ID of the added TR element, if in view.
     */

    /**
     * Fired when a row is updated.
     *
     * @event rowUpdateEvent
     * @param oArgs.newData {Object} Object literal of the new data.
     * @param oArgs.oldData {Object} Object literal of the old data.
     * @param oArgs.trElId {String} The ID of the updated TR element, if in view.
     */

    /**
     * Fired when one or more TR elements are deleted.
     *
     * @event rowDeleteEvent
     * @param oArgs.oldData {Object} Object literal of the deleted data.
     * @param oArgs.recordIndex {Number} Index of the deleted Record.
     * @param oArgs.trElIndex {Number} Index of the deleted TR element, if in view.
     */

    /**
     * Fired when a row is selected.
     *
     * @event rowSelectEvent
     * @param oArgs.el {HTMLElement} The selected TR element, if applicable.
     * @param oArgs.record {YAHOO.widget.Record} The selected Record.
     */

    /**
     * Fired when a row is unselected.
     *
     * @event rowUnselectEvent
     * @param oArgs.el {HTMLElement} The unselected TR element, if applicable.
     * @param oArgs.record {YAHOO.widget.Record} The unselected Record.
     */

    /*TODO: delete and use rowUnselectEvent?
     * Fired when all row selections are cleared.
     *
     * @event unselectAllRowsEvent
     */

    /*
     * Fired when a row is highlighted.
     *
     * @event rowHighlightEvent
     * @param oArgs.el {HTMLElement} The highlighted TR element.
     * @param oArgs.record {YAHOO.widget.Record} The highlighted Record.
     */

    /*
     * Fired when a row is unhighlighted.
     *
     * @event rowUnhighlightEvent
     * @param oArgs.el {HTMLElement} The highlighted TR element.
     * @param oArgs.record {YAHOO.widget.Record} The highlighted Record.
     */

    /**
     * Fired when a cell has a mouseover.
     *
     * @event cellMouseoverEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TD element.
     */

    /**
     * Fired when a cell has a mouseout.
     *
     * @event cellMouseoutEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TD element.
     */

    /**
     * Fired when a cell has a mousedown.
     *
     * @event cellMousedownEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TD element.
     */

    /**
     * Fired when a cell has a click.
     *
     * @event cellClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TD element.
     */

    /**
     * Fired when a cell has a dblclick.
     *
     * @event cellDblclickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The TD element.
     */

    /**
     * Fired when a cell is formatted.
     *
     * @event cellFormatEvent
     * @param oArgs.el {HTMLElement} The formatted TD element.
     * @param oArgs.record {YAHOO.widget.Record} The formatted Record.
     * @param oArgs.key {String} The key of the formatted cell.
     */

    /**
     * Fired when a cell is selected.
     *
     * @event cellSelectEvent
     * @param oArgs.el {HTMLElement} The selected TD element.
     * @param oArgs.record {YAHOO.widget.Record} The selected Record.
     * @param oArgs.key {String} The key of the selected cell.
     */

    /**
     * Fired when a cell is unselected.
     *
     * @event cellUnselectEvent
     * @param oArgs.el {HTMLElement} The unselected TD element.
     * @param oArgs.record {YAHOO.widget.Record} The unselected Record.
     * @param oArgs.key {String} The key of the unselected cell.
     */

    /**
     * Fired when a cell is highlighted.
     *
     * @event cellHighlightEvent
     * @param oArgs.el {HTMLElement} The highlighted TD element.
     * @param oArgs.record {YAHOO.widget.Record} The highlighted Record.
     * @param oArgs.key {String} The key of the highlighted cell.
     */

    /**
     * Fired when a cell is unhighlighted.
     *
     * @event cellUnhighlightEvent
     * @param oArgs.el {HTMLElement} The unhighlighted TD element.
     * @param oArgs.record {YAHOO.widget.Record} The unhighlighted Record.
     * @param oArgs.key {String} The key of the unhighlighted cell.
     */

    /*TODO: delete and use cellUnselectEvent?
     * Fired when all cell selections are cleared.
     *
     * @event unselectAllCellsEvent
     */

    /**
     * Fired when DataTable paginator is updated.
     *
     * @event paginatorUpdateEvent
     * @param paginator {Object} Object literal of Paginator values.
     */

    /**
     * Fired when an Editor is activated.
     *
     * @event editorShowEvent
     * @param oArgs.editor {Object} The Editor object literal.
     */

    /**
     * Fired when an active Editor has a keydown.
     *
     * @event editorKeydownEvent
     * @param oArgs.editor {Object} The Editor object literal.
     * @param oArgs.event {HTMLEvent} The event object.
     */

    /**
     * Fired when Editor input is reverted.
     *
     * @event editorRevertEvent
     * @param oArgs.editor {Object} The Editor object literal.
     * @param oArgs.newData {Object} New data value. //TODO
     * @param oArgs.oldData {Object} Old data value. //TODO
     */

    /**
     * Fired when Editor input is saved.
     *
     * @event editorSaveEvent
     * @param oArgs.editor {Object} The Editor object literal.
     * @param oArgs.newData {Object} New data value.
     * @param oArgs.oldData {Object} Old data value.
     */

    /**
     * Fired when Editor input is canceled.
     *
     * @event editorCancelEvent
     * @param oArgs.editor {Object} The Editor object literal.
     * @param oArgs.newData {Object} New data value. //TODO
     * @param oArgs.oldData {Object} Old data value. //TODO
     */

    /**
     * Fired when an active Editor has a blur.
     *
     * @event editorBlurEvent
     * @param oArgs.editor {Object} The Editor object literal.
     */







    /**
     * Fired when a link is clicked.
     *
     * @event linkClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The A element.
     */

    /**
     * Fired when a BUTTON element is clicked.
     *
     * @event buttonClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The BUTTON element.
     */

    /**
     * Fired when a CHECKBOX element is clicked.
     *
     * @event checkboxClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The CHECKBOX element.
     */

    /*TODO
     * Fired when a SELECT element is changed.
     *
     * @event dropdownChangeEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The SELECT element.
     */

    /**
     * Fired when a RADIO element is clicked.
     *
     * @event radioClickEvent
     * @param oArgs.event {HTMLEvent} The event object.
     * @param oArgs.target {HTMLElement} The RADIO element.
     */

