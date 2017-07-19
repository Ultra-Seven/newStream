/**
 * @fileoverview
 * @enhanceable
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

goog.exportSymbol('proto.ProgressiveTable', null, global);
goog.exportSymbol('proto.ProgressiveTable.Block', null, global);
goog.exportSymbol('proto.ProgressiveTable.Schema', null, global);
goog.exportSymbol('proto.Table', null, global);
goog.exportSymbol('proto.Table.Col', null, global);
goog.exportSymbol('proto.Table.Schema', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.Table = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.Table.repeatedFields_, null);
};
goog.inherits(proto.Table, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.Table.displayName = 'proto.Table';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.Table.repeatedFields_ = [2];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.Table.prototype.toObject = function(opt_includeInstance) {
  return proto.Table.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.Table} msg The msg instance to transform.
 * @return {!Object}
 */
proto.Table.toObject = function(includeInstance, msg) {
  var f, obj = {
    schema: (f = msg.getSchema()) && proto.Table.Schema.toObject(includeInstance, f),
    colsList: jspb.Message.toObjectList(msg.getColsList(),
    proto.Table.Col.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.Table}
 */
proto.Table.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.Table;
  return proto.Table.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.Table} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.Table}
 */
proto.Table.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.Table.Schema;
      reader.readMessage(value,proto.Table.Schema.deserializeBinaryFromReader);
      msg.setSchema(value);
      break;
    case 2:
      var value = new proto.Table.Col;
      reader.readMessage(value,proto.Table.Col.deserializeBinaryFromReader);
      msg.addCols(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.Table.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.Table.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.Table} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.Table.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getSchema();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.Table.Schema.serializeBinaryToWriter
    );
  }
  f = message.getColsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      2,
      f,
      proto.Table.Col.serializeBinaryToWriter
    );
  }
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.Table.Col = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.Table.Col.repeatedFields_, null);
};
goog.inherits(proto.Table.Col, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.Table.Col.displayName = 'proto.Table.Col';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.Table.Col.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.Table.Col.prototype.toObject = function(opt_includeInstance) {
  return proto.Table.Col.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.Table.Col} msg The msg instance to transform.
 * @return {!Object}
 */
proto.Table.Col.toObject = function(includeInstance, msg) {
  var f, obj = {
    valList: jspb.Message.getField(msg, 1)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.Table.Col}
 */
proto.Table.Col.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.Table.Col;
  return proto.Table.Col.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.Table.Col} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.Table.Col}
 */
proto.Table.Col.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {!Array.<number>} */ (reader.readPackedInt32());
      msg.setValList(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.Table.Col.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.Table.Col.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.Table.Col} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.Table.Col.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getValList();
  if (f.length > 0) {
    writer.writePackedInt32(
      1,
      f
    );
  }
};


/**
 * repeated int32 val = 1;
 * If you change this array by adding, removing or replacing elements, or if you
 * replace the array itself, then you must call the setter to update it.
 * @return {!Array.<number>}
 */
proto.Table.Col.prototype.getValList = function() {
  return /** @type {!Array.<number>} */ (jspb.Message.getField(this, 1));
};


/** @param {!Array.<number>} value */
proto.Table.Col.prototype.setValList = function(value) {
  jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {!number} value
 * @param {number=} opt_index
 */
proto.Table.Col.prototype.addVal = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


proto.Table.Col.prototype.clearValList = function() {
  this.setValList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.Table.Schema = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.Table.Schema.repeatedFields_, null);
};
goog.inherits(proto.Table.Schema, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.Table.Schema.displayName = 'proto.Table.Schema';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.Table.Schema.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.Table.Schema.prototype.toObject = function(opt_includeInstance) {
  return proto.Table.Schema.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.Table.Schema} msg The msg instance to transform.
 * @return {!Object}
 */
proto.Table.Schema.toObject = function(includeInstance, msg) {
  var f, obj = {
    nameList: jspb.Message.getField(msg, 1)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.Table.Schema}
 */
proto.Table.Schema.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.Table.Schema;
  return proto.Table.Schema.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.Table.Schema} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.Table.Schema}
 */
proto.Table.Schema.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.addName(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.Table.Schema.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.Table.Schema.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.Table.Schema} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.Table.Schema.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getNameList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      1,
      f
    );
  }
};


/**
 * repeated string name = 1;
 * If you change this array by adding, removing or replacing elements, or if you
 * replace the array itself, then you must call the setter to update it.
 * @return {!Array.<string>}
 */
proto.Table.Schema.prototype.getNameList = function() {
  return /** @type {!Array.<string>} */ (jspb.Message.getField(this, 1));
};


/** @param {!Array.<string>} value */
proto.Table.Schema.prototype.setNameList = function(value) {
  jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.Table.Schema.prototype.addName = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


proto.Table.Schema.prototype.clearNameList = function() {
  this.setNameList([]);
};


/**
 * optional Schema schema = 1;
 * @return {?proto.Table.Schema}
 */
proto.Table.prototype.getSchema = function() {
  return /** @type{?proto.Table.Schema} */ (
    jspb.Message.getWrapperField(this, proto.Table.Schema, 1));
};


/** @param {?proto.Table.Schema|undefined} value */
proto.Table.prototype.setSchema = function(value) {
  jspb.Message.setWrapperField(this, 1, value);
};


proto.Table.prototype.clearSchema = function() {
  this.setSchema(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.Table.prototype.hasSchema = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * repeated Col cols = 2;
 * If you change this array by adding, removing or replacing elements, or if you
 * replace the array itself, then you must call the setter to update it.
 * @return {!Array.<!proto.Table.Col>}
 */
proto.Table.prototype.getColsList = function() {
  return /** @type{!Array.<!proto.Table.Col>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.Table.Col, 2));
};


/** @param {!Array.<!proto.Table.Col>} value */
proto.Table.prototype.setColsList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 2, value);
};


/**
 * @param {!proto.Table.Col=} opt_value
 * @param {number=} opt_index
 * @return {!proto.Table.Col}
 */
proto.Table.prototype.addCols = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 2, opt_value, proto.Table.Col, opt_index);
};


proto.Table.prototype.clearColsList = function() {
  this.setColsList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ProgressiveTable = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.ProgressiveTable.repeatedFields_, null);
};
goog.inherits(proto.ProgressiveTable, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.ProgressiveTable.displayName = 'proto.ProgressiveTable';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.ProgressiveTable.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ProgressiveTable.prototype.toObject = function(opt_includeInstance) {
  return proto.ProgressiveTable.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ProgressiveTable} msg The msg instance to transform.
 * @return {!Object}
 */
proto.ProgressiveTable.toObject = function(includeInstance, msg) {
  var f, obj = {
    blocksList: jspb.Message.toObjectList(msg.getBlocksList(),
    proto.ProgressiveTable.Block.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ProgressiveTable}
 */
proto.ProgressiveTable.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ProgressiveTable;
  return proto.ProgressiveTable.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ProgressiveTable} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ProgressiveTable}
 */
proto.ProgressiveTable.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.ProgressiveTable.Block;
      reader.readMessage(value,proto.ProgressiveTable.Block.deserializeBinaryFromReader);
      msg.addBlocks(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ProgressiveTable.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ProgressiveTable.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ProgressiveTable} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.ProgressiveTable.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getBlocksList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.ProgressiveTable.Block.serializeBinaryToWriter
    );
  }
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ProgressiveTable.Block = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.ProgressiveTable.Block.repeatedFields_, null);
};
goog.inherits(proto.ProgressiveTable.Block, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.ProgressiveTable.Block.displayName = 'proto.ProgressiveTable.Block';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.ProgressiveTable.Block.repeatedFields_ = [5];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ProgressiveTable.Block.prototype.toObject = function(opt_includeInstance) {
  return proto.ProgressiveTable.Block.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ProgressiveTable.Block} msg The msg instance to transform.
 * @return {!Object}
 */
proto.ProgressiveTable.Block.toObject = function(includeInstance, msg) {
  var f, obj = {
    schema: (f = msg.getSchema()) && proto.ProgressiveTable.Schema.toObject(includeInstance, f),
    lower: jspb.Message.getFieldWithDefault(msg, 2, 0),
    higher: jspb.Message.getFieldWithDefault(msg, 3, 0),
    id: jspb.Message.getFieldWithDefault(msg, 4, 0),
    valList: jspb.Message.getField(msg, 5)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ProgressiveTable.Block}
 */
proto.ProgressiveTable.Block.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ProgressiveTable.Block;
  return proto.ProgressiveTable.Block.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ProgressiveTable.Block} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ProgressiveTable.Block}
 */
proto.ProgressiveTable.Block.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.ProgressiveTable.Schema;
      reader.readMessage(value,proto.ProgressiveTable.Schema.deserializeBinaryFromReader);
      msg.setSchema(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setLower(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setHigher(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setId(value);
      break;
    case 5:
      var value = /** @type {!Array.<number>} */ (reader.readPackedInt32());
      msg.setValList(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ProgressiveTable.Block.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ProgressiveTable.Block.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ProgressiveTable.Block} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.ProgressiveTable.Block.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getSchema();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.ProgressiveTable.Schema.serializeBinaryToWriter
    );
  }
  f = message.getLower();
  if (f !== 0) {
    writer.writeInt32(
      2,
      f
    );
  }
  f = message.getHigher();
  if (f !== 0) {
    writer.writeInt32(
      3,
      f
    );
  }
  f = message.getId();
  if (f !== 0) {
    writer.writeInt32(
      4,
      f
    );
  }
  f = message.getValList();
  if (f.length > 0) {
    writer.writePackedInt32(
      5,
      f
    );
  }
};


/**
 * optional Schema schema = 1;
 * @return {?proto.ProgressiveTable.Schema}
 */
proto.ProgressiveTable.Block.prototype.getSchema = function() {
  return /** @type{?proto.ProgressiveTable.Schema} */ (
    jspb.Message.getWrapperField(this, proto.ProgressiveTable.Schema, 1));
};


/** @param {?proto.ProgressiveTable.Schema|undefined} value */
proto.ProgressiveTable.Block.prototype.setSchema = function(value) {
  jspb.Message.setWrapperField(this, 1, value);
};


proto.ProgressiveTable.Block.prototype.clearSchema = function() {
  this.setSchema(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.ProgressiveTable.Block.prototype.hasSchema = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional int32 lower = 2;
 * @return {number}
 */
proto.ProgressiveTable.Block.prototype.getLower = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/** @param {number} value */
proto.ProgressiveTable.Block.prototype.setLower = function(value) {
  jspb.Message.setField(this, 2, value);
};


/**
 * optional int32 higher = 3;
 * @return {number}
 */
proto.ProgressiveTable.Block.prototype.getHigher = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.ProgressiveTable.Block.prototype.setHigher = function(value) {
  jspb.Message.setField(this, 3, value);
};


/**
 * optional int32 id = 4;
 * @return {number}
 */
proto.ProgressiveTable.Block.prototype.getId = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.ProgressiveTable.Block.prototype.setId = function(value) {
  jspb.Message.setField(this, 4, value);
};


/**
 * repeated int32 val = 5;
 * If you change this array by adding, removing or replacing elements, or if you
 * replace the array itself, then you must call the setter to update it.
 * @return {!Array.<number>}
 */
proto.ProgressiveTable.Block.prototype.getValList = function() {
  return /** @type {!Array.<number>} */ (jspb.Message.getField(this, 5));
};


/** @param {!Array.<number>} value */
proto.ProgressiveTable.Block.prototype.setValList = function(value) {
  jspb.Message.setField(this, 5, value || []);
};


/**
 * @param {!number} value
 * @param {number=} opt_index
 */
proto.ProgressiveTable.Block.prototype.addVal = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 5, value, opt_index);
};


proto.ProgressiveTable.Block.prototype.clearValList = function() {
  this.setValList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.ProgressiveTable.Schema = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.ProgressiveTable.Schema.repeatedFields_, null);
};
goog.inherits(proto.ProgressiveTable.Schema, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.ProgressiveTable.Schema.displayName = 'proto.ProgressiveTable.Schema';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.ProgressiveTable.Schema.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.ProgressiveTable.Schema.prototype.toObject = function(opt_includeInstance) {
  return proto.ProgressiveTable.Schema.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.ProgressiveTable.Schema} msg The msg instance to transform.
 * @return {!Object}
 */
proto.ProgressiveTable.Schema.toObject = function(includeInstance, msg) {
  var f, obj = {
    nameList: jspb.Message.getField(msg, 1)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.ProgressiveTable.Schema}
 */
proto.ProgressiveTable.Schema.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.ProgressiveTable.Schema;
  return proto.ProgressiveTable.Schema.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.ProgressiveTable.Schema} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.ProgressiveTable.Schema}
 */
proto.ProgressiveTable.Schema.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.addName(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.ProgressiveTable.Schema.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.ProgressiveTable.Schema.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.ProgressiveTable.Schema} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.ProgressiveTable.Schema.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getNameList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      1,
      f
    );
  }
};


/**
 * repeated string name = 1;
 * If you change this array by adding, removing or replacing elements, or if you
 * replace the array itself, then you must call the setter to update it.
 * @return {!Array.<string>}
 */
proto.ProgressiveTable.Schema.prototype.getNameList = function() {
  return /** @type {!Array.<string>} */ (jspb.Message.getField(this, 1));
};


/** @param {!Array.<string>} value */
proto.ProgressiveTable.Schema.prototype.setNameList = function(value) {
  jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.ProgressiveTable.Schema.prototype.addName = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


proto.ProgressiveTable.Schema.prototype.clearNameList = function() {
  this.setNameList([]);
};


/**
 * repeated Block blocks = 1;
 * If you change this array by adding, removing or replacing elements, or if you
 * replace the array itself, then you must call the setter to update it.
 * @return {!Array.<!proto.ProgressiveTable.Block>}
 */
proto.ProgressiveTable.prototype.getBlocksList = function() {
  return /** @type{!Array.<!proto.ProgressiveTable.Block>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.ProgressiveTable.Block, 1));
};


/** @param {!Array.<!proto.ProgressiveTable.Block>} value */
proto.ProgressiveTable.prototype.setBlocksList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.ProgressiveTable.Block=} opt_value
 * @param {number=} opt_index
 * @return {!proto.ProgressiveTable.Block}
 */
proto.ProgressiveTable.prototype.addBlocks = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.ProgressiveTable.Block, opt_index);
};


proto.ProgressiveTable.prototype.clearBlocksList = function() {
  this.setBlocksList([]);
};


goog.object.extend(exports, proto);
